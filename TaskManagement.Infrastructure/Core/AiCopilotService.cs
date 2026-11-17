using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

public sealed partial class AiCopilotService(
    ApplicationDbContext db,
    ProjectAccess access,
    ITaskService taskService,
    IHttpClientFactory httpClientFactory,
    IConfiguration config,
    IClock clock,
    ILogger<AiCopilotService> log) : IAiCopilotService
{
    [GeneratedRegex(@"\b([A-Z]{2,6}-\d+)\b", RegexOptions.IgnoreCase)]
    private static partial Regex IssueKeyPattern();

    public async Task<AiChatResponse> ChatAsync(int userId, AiChatRequest request, CancellationToken ct = default)
    {
        var prompt = request.Message.Trim();
        var lower = prompt.ToLowerInvariant();
        var toolCalls = new List<AiToolTraceDto>();

        var accessibleProjectIds = await db.Projects.AsNoTracking()
            .Where(p => p.IsActive && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId && m.IsActive)))
            .Select(p => p.ProjectId)
            .ToListAsync(ct);

        var targetProjectId = request.ProjectId is int pid && accessibleProjectIds.Contains(pid)
            ? pid
            : accessibleProjectIds.FirstOrDefault();

        if (targetProjectId > 0)
            await access.RequireAsync(targetProjectId, userId, ProjectAction.View, ct);

        // 1. Transition issue tool: e.g. "Move ATL-1 to InReview" / "Chuyển LAY-104 sang Done"
        var keyMatch = IssueKeyPattern().Match(prompt);
        if (keyMatch.Success && (lower.Contains("move ") || lower.Contains("transition ") || lower.Contains("chuyển ") || lower.Contains("sang ")))
        {
            var rawKey = keyMatch.Groups[1].Value.ToUpperInvariant();
            var nextStatus = ParseTargetStatus(lower);
            if (nextStatus.HasValue)
            {
                var parts = rawKey.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out var num))
                {
                    var found = await db.ProjectTasks.AsNoTracking()
                        .Where(t => t.IsActive && accessibleProjectIds.Contains(t.ProjectId) && t.Project.Key == parts[0] && t.Number == num)
                        .Select(t => new { t.ProjectId, t.TaskId, t.Version })
                        .FirstOrDefaultAsync(ct);

                    if (found is not null)
                    {
                        var updated = await taskService.UpdateAsync(
                            userId,
                            found.ProjectId,
                            found.TaskId,
                            new UpdateTaskRequest(found.Version, Status: nextStatus.Value),
                            ct);
                        toolCalls.Add(new AiToolTraceDto(
                            "transition_issue",
                            new { issueKey = rawKey, nextStatus = nextStatus.Value.ToString() },
                            new { updated = updated.Key, status = updated.Status.ToString(), version = updated.Version }));
                        return new AiChatResponse(
                            $"Transitioned **{updated.Key}** to **{updated.Status}** (v{updated.Version}).",
                             ResolveEngineName(),
                            toolCalls,
                            Issues: [updated]);
                    }
                }
            }
        }

        // 2. Sprint health diagnostic tool
        if (targetProjectId > 0 && (lower.Contains("health") || lower.Contains("bottleneck") || lower.Contains("sprint") || lower.Contains("sức khỏe") || lower.Contains("tắc nghẽn")))
        {
            var project = await db.Projects.AsNoTracking().FirstAsync(p => p.ProjectId == targetProjectId, ct);
            var tasks = await db.ProjectTasks.AsNoTracking()
                .Where(t => t.ProjectId == targetProjectId && t.IsActive && t.Status != ProjectTaskStatus.Cancelled)
                .SelectDto()
                .ToListAsync(ct);

            var now = clock.UtcNow;
            var total = tasks.Count;
            var done = tasks.Count(t => t.Status == ProjectTaskStatus.Done);
            var inProg = tasks.Count(t => t.Status == ProjectTaskStatus.InProgress);
            var inRev = tasks.Count(t => t.Status == ProjectTaskStatus.InReview);
            var overdue = tasks.Count(t => t.DueDate.HasValue && t.DueDate.Value < now && t.Status != ProjectTaskStatus.Done);
            var unassignedBugs = tasks.Count(t => t.Type == ProjectTaskType.Bug && t.Assignee is null && t.Priority is ProjectTaskPriority.High or ProjectTaskPriority.Urgent && t.Status != ProjectTaskStatus.Done);

            var warnings = new List<string>();
            if (inProg > 3) warnings.Add($"In Progress WIP limit exceeded ({inProg}/3 active items).");
            if (inRev > 2) warnings.Add($"In Review queue bottleneck ({inRev}/2 items awaiting review).");
            if (overdue > 0) warnings.Add($"{overdue} open issue(s) past their due date.");
            if (unassignedBugs > 0) warnings.Add($"{unassignedBugs} high-priority bug(s) unassigned.");

            var score = Math.Clamp(100 - (overdue * 10) - (Math.Max(0, inProg - 3) * 12) - (unassignedBugs * 15), 25, 100);
            var health = new AiSprintHealthDto(targetProjectId, project.Key, score, total, done, inProg, inRev, overdue, unassignedBugs, warnings);

            toolCalls.Add(new AiToolTraceDto("analyze_sprint_health", new { projectId = targetProjectId }, new { healthScore = score, warnings = warnings.Count }));
            var reply = await TryAugmentWithGeminiAsync(prompt, $"Project {project.Name} ({project.Key}) health score {score}/100. Done {done}/{total}, InProgress {inProg}, Overdue {overdue}.", ct)
                        ?? $"Sprint diagnostic for **{project.Name} ({project.Key})**: Health score **{score}/100** ({done}/{total} done, {inProg} in progress, {overdue} overdue).";
            return new AiChatResponse(reply, ResolveEngineName(), toolCalls, SprintHealth: health);
        }

        // 3. Decompose epic / goal into subtasks
        if (lower.Contains("decompose") || lower.Contains("subtask") || lower.Contains("break down") || lower.Contains("chia nhỏ") || lower.Contains("tách"))
        {
            var proposed = new List<AiSubtaskProposalItemDto>
            {
                new("Define domain contract, schema & validation rules", "Story", "High", 3),
                new("Implement idempotent API endpoint & optimistic concurrency guard", "Task", "High", 5),
                new("Build interactive UI state, optimistic cache & keyboard flow", "Story", "Medium", 3),
                new("Add edge-case regression & concurrency conflict test suite", "Task", "Medium", 2),
            };
            toolCalls.Add(new AiToolTraceDto("decompose_epic_to_subtasks", new { goal = prompt }, new { count = proposed.Count }));
            return new AiChatResponse(
                $"Proposed **{proposed.Count} actionable sprint stories/tasks** (13 Story Points total). Review and approve below to insert directly into the workspace.",
                ResolveEngineName(),
                toolCalls,
                ProposedSubtasks: proposed);
        }

        // 4. Hybrid lexical + facet search across workspace issues
        var candidates = await db.ProjectTasks.AsNoTracking()
            .Where(t => t.IsActive && accessibleProjectIds.Contains(t.ProjectId))
            .OrderByDescending(t => t.UpdatedAt)
            .Take(80)
            .SelectDto()
            .ToListAsync(ct);

        var filtered = FilterAndRankHybrid(candidates, lower).Take(6).ToList();
        toolCalls.Add(new AiToolTraceDto("search_issues_hybrid", new { query = prompt, projectId = targetProjectId }, new { matched = filtered.Count }));

        var geminiSummary = await TryAugmentWithGeminiAsync(
            prompt,
            string.Join("; ", filtered.Select(t => $"{t.Key} [{t.Type}/{t.Priority}/{t.Status}] {t.Title}")),
            ct);

        var text = geminiSummary ?? (filtered.Count > 0
            ? $"Found **{filtered.Count} matching issue(s)** across your workspace. You can transition status directly from the cards below."
            : "No matching issues found for those criteria. Try broadening your query or ask me to decompose a new feature.");

        return new AiChatResponse(text, ResolveEngineName(), toolCalls, Issues: filtered);
    }

    private string ResolveEngineName() =>
        !string.IsNullOrWhiteSpace(GetGeminiKey()) ? "Gemini 2.5 + Hybrid RAG" : "Local Hybrid BM25 + Tool Engine";

    private string? GetGeminiKey() =>
        config["GEMINI_API_KEY"] ?? config["Ai:GeminiApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

    private async Task<string?> TryAugmentWithGeminiAsync(string userPrompt, string groundedContext, CancellationToken ct)
    {
        var apiKey = GetGeminiKey();
        if (string.IsNullOrWhiteSpace(apiKey)) return null;

        try
        {
            var client = httpClientFactory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = $"You are Layers Agile Sprint Copilot. Grounded workspace data: {groundedContext}\n\nUser request: {userPrompt}\nRespond concisely in the user's language (2-3 sentences max)." } }
                    }
                }
            };
            using var res = await client.PostAsJsonAsync(url, payload, ct);
            if (!res.IsSuccessStatusCode) return null;
            using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            return doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Gemini enrichment failed; using deterministic hybrid engine response.");
            return null;
        }
    }

    private static ProjectTaskStatus? ParseTargetStatus(string lower)
    {
        if (lower.Contains("in review") || lower.Contains("inreview") || lower.Contains("review")) return ProjectTaskStatus.InReview;
        if (lower.Contains("in progress") || lower.Contains("inprogress") || lower.Contains("đang làm")) return ProjectTaskStatus.InProgress;
        if (lower.Contains("done") || lower.Contains("hoàn thành") || lower.Contains("xong")) return ProjectTaskStatus.Done;
        if (lower.Contains("backlog")) return ProjectTaskStatus.Backlog;
        if (lower.Contains("todo") || lower.Contains("to do")) return ProjectTaskStatus.Todo;
        return null;
    }

    private static IEnumerable<TaskDto> FilterAndRankHybrid(IReadOnlyList<TaskDto> tasks, string lower)
    {
        var wantBug = lower.Contains("bug") || lower.Contains("lỗi");
        var wantStory = lower.Contains("story") || lower.Contains("stories");
        var wantHigh = lower.Contains("high") || lower.Contains("urgent") || lower.Contains("highest") || lower.Contains("ưu tiên cao");
        var wantReview = lower.Contains("in review") || lower.Contains("review");
        var wantProgress = lower.Contains("in progress") || lower.Contains("đang làm");

        var tokens = lower.Split([' ', ',', '.', '?', '!', ':', ';', '-'], StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2)
            .ToArray();

        return tasks
            .Select(t =>
            {
                double score = 0;
                if (wantBug && t.Type == ProjectTaskType.Bug) score += 5;
                if (wantStory && t.Type == ProjectTaskType.Story) score += 5;
                if (wantHigh && t.Priority is ProjectTaskPriority.High or ProjectTaskPriority.Urgent) score += 4;
                if (wantReview && t.Status == ProjectTaskStatus.InReview) score += 4;
                if (wantProgress && t.Status == ProjectTaskStatus.InProgress) score += 4;

                var hay = $"{t.Key} {t.Title} {t.Description} {t.Assignee?.FullName}".ToLowerInvariant();
                foreach (var tok in tokens)
                    if (hay.Contains(tok)) score += 2.5;

                return (Task: t, Score: score);
            })
            .Where(x => x.Score > 0 || tokens.Length == 0)
            .OrderByDescending(x => x.Score)
            .Select(x => x.Task);
    }
}

namespace TaskManagement.Application.Contracts;

public record AiChatTurnDto(string Role, string Content);

public record AiChatRequest(
    string Message,
    int? ProjectId = null,
    IReadOnlyList<AiChatTurnDto>? History = null);

public record AiToolTraceDto(
    string Name,
    object Arguments,
    object Summary);

public record AiSubtaskProposalItemDto(
    string Title,
    string Type,
    string Priority,
    int StoryPoints);

public record AiSprintHealthDto(
    int ProjectId,
    string ProjectKey,
    int HealthScore,
    int TotalIssues,
    int DoneIssues,
    int InProgressIssues,
    int InReviewIssues,
    int OverdueIssues,
    int UnassignedHighPriorityBugs,
    IReadOnlyList<string> Warnings);

public record AiChatResponse(
    string Reply,
    string Engine,
    IReadOnlyList<AiToolTraceDto> ToolCalls,
    IReadOnlyList<TaskDto>? Issues = null,
    IReadOnlyList<AiSubtaskProposalItemDto>? ProposedSubtasks = null,
    AiSprintHealthDto? SprintHealth = null);

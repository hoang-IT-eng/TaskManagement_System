using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.API.Http;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;

namespace TaskManagement.API.Controllers.V1;

[ApiController]
[Authorize]
[ApiExplorerSettings(GroupName = "v1")]
[Produces("application/json")]
[Route("api/v1")]
public sealed class ProjectsController(IProjectService projects, IMemberService members, ILabelService labels, IActivityService activity, IUserDirectory users) : ControllerBase
{
    /// <summary>Projects you belong to, most recently active first.</summary>
    [HttpGet("projects")]
    public Task<PagedResult<ProjectDto>> List([FromQuery] ProjectQuery query, CancellationToken ct) => projects.ListAsync(User.UserId(), query, ct);

    /// <summary>Create a project. You become its owner; four starter labels are added.</summary>
    [HttpPost("projects")]
    [ProducesResponseType<ProjectDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var created = await projects.CreateAsync(User.UserId(), request, ct);
        return CreatedAtAction(nameof(Get), new { projectId = created.Id }, created);
    }

    [HttpGet("projects/{projectId:int}")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public Task<ProjectDto> Get(int projectId, CancellationToken ct) => projects.GetAsync(User.UserId(), projectId, ct);

    /// <summary>Rename, recolor or change status. Requires project Admin.</summary>
    [HttpPatch("projects/{projectId:int}")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public Task<ProjectDto> Update(int projectId, UpdateProjectRequest request, CancellationToken ct) => projects.UpdateAsync(User.UserId(), projectId, request, ct);

    /// <summary>Archive the project and its tasks. Owner only.</summary>
    [HttpDelete("projects/{projectId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int projectId, CancellationToken ct)
    {
        await projects.DeleteAsync(User.UserId(), projectId, ct);
        return NoContent();
    }

    // ---- members

    [HttpGet("projects/{projectId:int}/members")]
    public Task<IReadOnlyList<MemberDto>> Members(int projectId, CancellationToken ct) => members.ListAsync(User.UserId(), projectId, ct);

    /// <summary>Add an existing user by email. Requires project Admin.</summary>
    [HttpPost("projects/{projectId:int}/members")]
    [ProducesResponseType<MemberDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MemberDto>> AddMember(int projectId, AddMemberRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await members.AddAsync(User.UserId(), projectId, request, ct));

    [HttpPatch("projects/{projectId:int}/members/{userId:int}")]
    public Task<MemberDto> UpdateMember(int projectId, int userId, UpdateMemberRequest request, CancellationToken ct) =>
        members.UpdateAsync(User.UserId(), projectId, userId, request, ct);

    /// <summary>Remove a member (or leave, when userId is you). Their open tasks become unassigned in the same transaction.</summary>
    [HttpDelete("projects/{projectId:int}/members/{userId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveMember(int projectId, int userId, CancellationToken ct)
    {
        await members.RemoveAsync(User.UserId(), projectId, userId, ct);
        return NoContent();
    }

    // ---- labels

    [HttpGet("projects/{projectId:int}/labels")]
    public Task<IReadOnlyList<LabelDto>> Labels(int projectId, CancellationToken ct) => labels.ListAsync(User.UserId(), projectId, ct);

    [HttpPost("projects/{projectId:int}/labels")]
    [ProducesResponseType<LabelDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<LabelDto>> CreateLabel(int projectId, CreateLabelRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await labels.CreateAsync(User.UserId(), projectId, request, ct));

    [HttpPatch("projects/{projectId:int}/labels/{labelId:int}")]
    public Task<LabelDto> UpdateLabel(int projectId, int labelId, UpdateLabelRequest request, CancellationToken ct) =>
        labels.UpdateAsync(User.UserId(), projectId, labelId, request, ct);

    [HttpDelete("projects/{projectId:int}/labels/{labelId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteLabel(int projectId, int labelId, CancellationToken ct)
    {
        await labels.DeleteAsync(User.UserId(), projectId, labelId, ct);
        return NoContent();
    }

    // ---- activity

    /// <summary>Project activity feed, newest first.</summary>
    [HttpGet("projects/{projectId:int}/activity")]
    public Task<PagedResult<ActivityDto>> Activity(int projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 30, CancellationToken ct = default) =>
        activity.ProjectFeedAsync(User.UserId(), projectId, new PageQuery(page, pageSize), ct);

    // ---- people directory (for the add-member picker)

    [HttpGet("users")]
    public Task<PagedResult<UserSummary>> Users([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        users.SearchAsync(search, new PageQuery(page, pageSize), ct);
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.API.Http;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Contracts;

namespace TaskManagement.API.Controllers.V1;

[ApiController]
[Authorize]
[ApiExplorerSettings(GroupName = "v1")]
[Route("api/v1/ai")]
public sealed class AiCopilotController(IAiCopilotService copilot) : ControllerBase
{
    /// <summary>
    /// Layers AI Sprint Copilot: executes hybrid search, sprint health diagnostics, subtask decomposition, and issue transitions.
    /// Enriches responses with Gemini 2.5 Flash when GEMINI_API_KEY is configured.
    /// </summary>
    [HttpPost("chat")]
    [ProducesResponseType<AiChatResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<AiChatResponse> Chat(AiChatRequest request, CancellationToken ct) =>
        copilot.ChatAsync(User.UserId(), request, ct);
}

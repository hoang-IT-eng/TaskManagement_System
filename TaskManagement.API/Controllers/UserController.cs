using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.API.Controllers;

[ApiController]
[ApiExplorerSettings(GroupName = "legacy")]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        var result = await _userService.GetProfileAsync(userId);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Message });
        }

        return Ok(new { data = result.Data });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _userService.UpdateProfileAsync(userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        var userId = GetCurrentUserId();
        
        using var stream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, stream, file.FileName);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, avatarUrl = result.Data });
    }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
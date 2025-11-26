using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Infrastructure.Data;
using System;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/admin/positions")]
[Authorize] // All authenticated users can access
public class PositionController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PositionController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách tất cả positions
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPositions()
    {
        var positions = await _context.Positions
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                p.PositionId,
                p.Name,
                p.Code,
                p.WorkflowGroup,
                p.IsActive
            })
            .ToListAsync();

        return Ok(new { data = positions, count = positions.Count });
    }

    /// <summary>
    /// Lấy position theo ID
    /// </summary>
    [HttpGet("{positionId}")]
    public async Task<IActionResult> GetPosition(int positionId)
    {
        var position = await _context.Positions
            .FirstOrDefaultAsync(p => p.PositionId == positionId);

        if (position == null)
        {
            return NotFound(new { message = "Position not found" });
        }

        return Ok(new { data = new { position.PositionId, position.Name, position.Code, position.WorkflowGroup, position.IsActive } });
    }
}

[ApiController]
[Route("api/admin/positions")]
[Authorize(Roles = "Admin")] // Only Admin can modify
public class PositionAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PositionAdminController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Tạo position mới
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePosition([FromBody] CreatePositionRequest request)
    {
        var existingPosition = await _context.Positions
            .FirstOrDefaultAsync(p => p.Code.ToLower() == request.Code.ToLower() && p.IsActive);

        if (existingPosition != null)
        {
            return BadRequest(new { message = "Position code already exists" });
        }

        var position = new Domain.Entities.Position
        {
            Name = request.Name,
            Code = request.Code.ToUpper(),
            WorkflowGroup = request.WorkflowGroup,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Positions.Add(position);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Position created successfully", data = new { position.PositionId, position.Name, position.Code, position.WorkflowGroup } });
    }

    /// <summary>
    /// Cập nhật position
    /// </summary>
    [HttpPut("{positionId}")]
    public async Task<IActionResult> UpdatePosition(int positionId, [FromBody] UpdatePositionRequest request)
    {
        var position = await _context.Positions.FindAsync(positionId);
        if (position == null)
        {
            return NotFound(new { message = "Position not found" });
        }

        // Check if code is being changed and if new code already exists
        if (position.Code.ToLower() != request.Code.ToLower())
        {
            var existingPosition = await _context.Positions
                .FirstOrDefaultAsync(p => p.Code.ToLower() == request.Code.ToLower() && p.PositionId != positionId && p.IsActive);

            if (existingPosition != null)
            {
                return BadRequest(new { message = "Position code already exists" });
            }
        }

        position.Name = request.Name;
        position.Code = request.Code.ToUpper();
        position.WorkflowGroup = request.WorkflowGroup;
        position.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Position updated successfully", data = new { position.PositionId, position.Name, position.Code, position.WorkflowGroup } });
    }

    /// <summary>
    /// Xóa position
    /// </summary>
    [HttpDelete("{positionId}")]
    public async Task<IActionResult> DeletePosition(int positionId)
    {
        var position = await _context.Positions.FindAsync(positionId);
        if (position == null)
        {
            return NotFound(new { message = "Position not found" });
        }

        // Check if position is being used by any users
        var usersWithPosition = await _context.Users.AnyAsync(u => u.PositionId == positionId);
        if (usersWithPosition)
        {
            return BadRequest(new { message = "Cannot delete position that is assigned to users" });
        }

        position.IsActive = false;
        position.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Position deleted successfully" });
    }
}

public class CreatePositionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string WorkflowGroup { get; set; } = string.Empty;
}

public class UpdatePositionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string WorkflowGroup { get; set; } = string.Empty;
}




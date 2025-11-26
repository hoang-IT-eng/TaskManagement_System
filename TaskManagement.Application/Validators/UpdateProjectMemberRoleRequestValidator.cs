using FluentValidation;
using TaskManagement.Application.DTOs.ProjectMember;

namespace TaskManagement.Application.Validators;

public class UpdateProjectMemberRoleRequestValidator : AbstractValidator<UpdateProjectMemberRoleRequest>
{
    private static readonly string[] ValidRoles = { "Owner", "Admin", "Member", "Viewer" };

    public UpdateProjectMemberRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty()
            .WithMessage("Role is required")
            .Must(role => ValidRoles.Contains(role))
            .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}");
    }
}


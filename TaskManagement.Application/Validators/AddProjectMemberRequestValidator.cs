using FluentValidation;
using TaskManagement.Application.DTOs.ProjectMember;

namespace TaskManagement.Application.Validators;

public class AddProjectMemberRequestValidator : AbstractValidator<AddProjectMemberRequest>
{
    private static readonly string[] ValidRoles = { "Owner", "Admin", "Member", "Viewer" };

    public AddProjectMemberRequestValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThan(0)
            .WithMessage("User ID must be greater than 0");

        RuleFor(x => x.Role)
            .NotEmpty()
            .WithMessage("Role is required")
            .Must(role => ValidRoles.Contains(role))
            .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}");
    }
}


using FluentValidation;
using TaskManagement.Application.DTOs.Project;

namespace TaskManagement.Application.Validators;

public class UpdateProjectRequestValidator : AbstractValidator<UpdateProjectRequest>
{
    private static readonly string[] ValidStatuses = { "Planning", "InProgress", "Completed", "OnHold", "Cancelled" };
    private static readonly string[] ValidPriorities = { "Low", "Medium", "High", "Critical" };

    public UpdateProjectRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Project name is required")
            .MaximumLength(255).WithMessage("Project name must not exceed 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters");

        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required")
            .Must(status => ValidStatuses.Contains(status))
            .WithMessage($"Status must be one of: {string.Join(", ", ValidStatuses)}");

        RuleFor(x => x.Priority)
            .NotEmpty().WithMessage("Priority is required")
            .Must(priority => ValidPriorities.Contains(priority))
            .WithMessage($"Priority must be one of: {string.Join(", ", ValidPriorities)}");

        RuleFor(x => x.StartDate)
            .LessThanOrEqualTo(x => x.EndDate)
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue)
            .WithMessage("Start date must be before or equal to end date");

        RuleFor(x => x.Budget)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Budget.HasValue)
            .WithMessage("Budget must be greater than or equal to 0");
    }
}


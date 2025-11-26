using FluentValidation;
using TaskManagement.Application.DTOs.Task;

namespace TaskManagement.Application.Validators;

public class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    private static readonly string[] ValidStatuses = { "Todo", "InProgress", "InReview", "Done", "Cancelled" };
    private static readonly string[] ValidPriorities = { "Low", "Medium", "High", "Urgent" };

    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Task title is required")
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters");

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must not exceed 5000 characters");

        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required")
            .Must(status => ValidStatuses.Contains(status))
            .WithMessage($"Status must be one of: {string.Join(", ", ValidStatuses)}");

        RuleFor(x => x.Priority)
            .NotEmpty().WithMessage("Priority is required")
            .Must(priority => ValidPriorities.Contains(priority))
            .WithMessage($"Priority must be one of: {string.Join(", ", ValidPriorities)}");

        RuleFor(x => x.AssigneeId)
            .GreaterThan(0)
            .When(x => x.AssigneeId.HasValue)
            .WithMessage("Assignee ID must be greater than 0");

        RuleFor(x => x.EstimatedHours)
            .GreaterThan(0)
            .When(x => x.EstimatedHours.HasValue)
            .WithMessage("Estimated hours must be greater than 0");

        RuleFor(x => x.ActualHours)
            .GreaterThan(0)
            .When(x => x.ActualHours.HasValue)
            .WithMessage("Actual hours must be greater than 0");
    }
}


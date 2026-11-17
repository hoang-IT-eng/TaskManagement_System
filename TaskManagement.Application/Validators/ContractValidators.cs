using FluentValidation;
using TaskManagement.Application.Contracts;

namespace TaskManagement.Application.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8).WithMessage("Use at least 8 characters.")
            .MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Include at least one letter.")
            .Matches("[0-9]").WithMessage("Include at least one digit.");
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class UpdateMeRequestValidator : AbstractValidator<UpdateMeRequest>
{
    public UpdateMeRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Bio).MaximumLength(1000);
    }
}

internal static class Rules
{
    public const string HexColor = "^#[0-9A-Fa-f]{6}$";
    public static readonly string[] ProjectStatuses = ["Planning", "InProgress", "OnHold", "Completed", "Cancelled"];
}

public sealed class CreateProjectRequestValidator : AbstractValidator<CreateProjectRequest>
{
    public CreateProjectRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Key).Matches("^[A-Za-z][A-Za-z0-9]{1,5}$")
            .WithMessage("Key must be 2–6 letters or digits and start with a letter.")
            .When(x => !string.IsNullOrWhiteSpace(x.Key));
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Color).Matches(Rules.HexColor).When(x => x.Color is not null);
    }
}

public sealed class UpdateProjectRequestValidator : AbstractValidator<UpdateProjectRequest>
{
    public UpdateProjectRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120).When(x => x.Name is not null);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Status).Must(s => Rules.ProjectStatuses.Contains(s))
            .WithMessage($"Status must be one of: {string.Join(", ", Rules.ProjectStatuses)}.")
            .When(x => x.Status is not null);
        RuleFor(x => x.Color).Matches(Rules.HexColor).When(x => x.Color is not null);
    }
}

public sealed class AddMemberRequestValidator : AbstractValidator<AddMemberRequest>
{
    public AddMemberRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Role).IsInEnum().NotEqual(Domain.Enums.ProjectRole.Owner)
            .WithMessage("A project has exactly one owner; add the person as Admin instead.");
    }
}

public sealed class UpdateMemberRequestValidator : AbstractValidator<UpdateMemberRequest>
{
    public UpdateMemberRequestValidator()
    {
        RuleFor(x => x.Role).IsInEnum().NotEqual(Domain.Enums.ProjectRole.Owner)
            .WithMessage("Ownership cannot be assigned through a role change.");
    }
}

public sealed class CreateLabelRequestValidator : AbstractValidator<CreateLabelRequest>
{
    public CreateLabelRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Color).NotEmpty().Matches(Rules.HexColor);
    }
}

public sealed class UpdateLabelRequestValidator : AbstractValidator<UpdateLabelRequest>
{
    public UpdateLabelRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(40).When(x => x.Name is not null);
        RuleFor(x => x.Color).Matches(Rules.HexColor).When(x => x.Color is not null);
    }
}

public sealed class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(10_000);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.EstimatedHours).InclusiveBetween(0, 1000).When(x => x.EstimatedHours.HasValue);
        RuleFor(x => x.LabelIds).Must(l => l!.Count <= 10).WithMessage("A task can carry at most 10 labels.")
            .When(x => x.LabelIds is not null);
    }
}

public sealed class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x.Version).GreaterThan(0).WithMessage("Send the version you last read.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200).When(x => x.Title is not null);
        RuleFor(x => x.Description).MaximumLength(10_000);
        RuleFor(x => x.Priority).IsInEnum().When(x => x.Priority.HasValue);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
        RuleFor(x => x.Type).IsInEnum().When(x => x.Type.HasValue);
        RuleFor(x => x.EstimatedHours).InclusiveBetween(0, 1000).When(x => x.EstimatedHours.HasValue);
        RuleFor(x => x.LabelIds).Must(l => l!.Count <= 10).WithMessage("A task can carry at most 10 labels.")
            .When(x => x.LabelIds is not null);
    }
}

public sealed class MoveTaskRequestValidator : AbstractValidator<MoveTaskRequest>
{
    public MoveTaskRequestValidator()
    {
        RuleFor(x => x.Version).GreaterThan(0);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x).Must(x => x.BeforeTaskId is null || x.BeforeTaskId != x.AfterTaskId)
            .WithName("afterTaskId").WithMessage("Before and after neighbours must differ.");
    }
}

public sealed class CreateCommentRequestValidator : AbstractValidator<CreateCommentRequest>
{
    public CreateCommentRequestValidator() => RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
}

public sealed class UpdateCommentRequestValidator : AbstractValidator<UpdateCommentRequest>
{
    public UpdateCommentRequestValidator() => RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
}

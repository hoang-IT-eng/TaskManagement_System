using FluentValidation;
using TaskManagement.Application.DTOs;

namespace TaskManagement.Application.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required")
            .MaximumLength(255).WithMessage("Full name must not exceed 255 characters");

        RuleFor(x => x.Bio)
            .MaximumLength(1000).WithMessage("Bio must not exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Bio));

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Phone number must not exceed 20 characters")
            .Matches(@"^[0-9+\-\s()]*$").When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage("Invalid phone number format");

        RuleFor(x => x.Timezone)
            .MaximumLength(50).WithMessage("Timezone must not exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Timezone));
    }
}


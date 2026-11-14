using TaskManagement.Application.Contracts;
using TaskManagement.Application.Validators;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Tests.Unit;

public class ValidatorTests
{
    [Theory]
    [InlineData("short1", false)]
    [InlineData("longenough", false)]
    [InlineData("12345678", false)]
    [InlineData("longenough1", true)]
    public void Register_password_rules(string password, bool valid) =>
        Assert.Equal(valid, new RegisterRequestValidator().Validate(new RegisterRequest("a@b.dev", password, "A B")).IsValid);

    [Fact]
    public void Register_requires_email_format() =>
        Assert.False(new RegisterRequestValidator().Validate(new RegisterRequest("not-an-email", "Passw0rd", "A")).IsValid);

    [Theory]
    [InlineData(null, true)]
    [InlineData("AB", true)]
    [InlineData("ATL", true)]
    [InlineData("A", false)]
    [InlineData("1AB", false)]
    [InlineData("TOOLONG", false)]
    public void Project_key_rules(string? key, bool valid) =>
        Assert.Equal(valid, new CreateProjectRequestValidator().Validate(new CreateProjectRequest("Name", key, null, null)).IsValid);

    [Fact]
    public void Project_color_must_be_hex() =>
        Assert.False(new CreateProjectRequestValidator().Validate(new CreateProjectRequest("Name", null, null, "green")).IsValid);

    [Fact]
    public void Update_project_status_must_be_known() =>
        Assert.False(new UpdateProjectRequestValidator().Validate(new UpdateProjectRequest(null, null, "Paused", null)).IsValid);

    [Fact]
    public void Task_title_required_and_bounded()
    {
        var v = new CreateTaskRequestValidator();
        Assert.False(v.Validate(new CreateTaskRequest("")).IsValid);
        Assert.False(v.Validate(new CreateTaskRequest(new string('x', 201))).IsValid);
        Assert.True(v.Validate(new CreateTaskRequest("Ship it")).IsValid);
    }

    [Fact]
    public void Task_rejects_undefined_enum_values() =>
        Assert.False(new CreateTaskRequestValidator().Validate(new CreateTaskRequest("x", Priority: (ProjectTaskPriority)42)).IsValid);

    [Fact]
    public void Task_label_count_is_capped() =>
        Assert.False(new CreateTaskRequestValidator().Validate(new CreateTaskRequest("x", LabelIds: Enumerable.Range(1, 11).ToList())).IsValid);

    [Fact]
    public void Update_requires_a_version() =>
        Assert.False(new UpdateTaskRequestValidator().Validate(new UpdateTaskRequest(0, Title: "x")).IsValid);

    [Fact]
    public void Move_neighbours_must_differ() =>
        Assert.False(new MoveTaskRequestValidator().Validate(new MoveTaskRequest(1, ProjectTaskStatus.Done, 5, 5)).IsValid);

    [Fact]
    public void Members_cannot_be_added_as_owner() =>
        Assert.False(new AddMemberRequestValidator().Validate(new AddMemberRequest("a@b.dev", ProjectRole.Owner)).IsValid);

    [Fact]
    public void Role_change_cannot_assign_owner() =>
        Assert.False(new UpdateMemberRequestValidator().Validate(new UpdateMemberRequest(ProjectRole.Owner)).IsValid);

    [Fact]
    public void Label_needs_hex_color() =>
        Assert.False(new CreateLabelRequestValidator().Validate(new CreateLabelRequest("bug", "red")).IsValid);

    [Fact]
    public void Comment_content_required() =>
        Assert.False(new CreateCommentRequestValidator().Validate(new CreateCommentRequest(" ")).IsValid);
}

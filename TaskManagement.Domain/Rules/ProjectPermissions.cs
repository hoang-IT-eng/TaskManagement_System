using TaskManagement.Domain.Enums;

namespace TaskManagement.Domain.Rules;

public enum ProjectAction
{
    View,
    EditTasks,
    Comment,
    DeleteAnyTask,
    ManageLabels,
    ManageMembers,
    EditProject,
    DeleteProject,
}

/// <summary>Single source of truth for what each project role may do. Lower enum value = more power.</summary>
public static class ProjectPermissions
{
    public static ProjectRole MinimumRole(ProjectAction action) => action switch
    {
        ProjectAction.View => ProjectRole.Viewer,
        ProjectAction.EditTasks => ProjectRole.Member,
        ProjectAction.Comment => ProjectRole.Member,
        ProjectAction.DeleteAnyTask => ProjectRole.Admin,
        ProjectAction.ManageLabels => ProjectRole.Admin,
        ProjectAction.ManageMembers => ProjectRole.Admin,
        ProjectAction.EditProject => ProjectRole.Admin,
        ProjectAction.DeleteProject => ProjectRole.Owner,
        _ => throw new ArgumentOutOfRangeException(nameof(action)),
    };

    public static bool Can(ProjectRole role, ProjectAction action) => (int)role <= (int)MinimumRole(action);
}

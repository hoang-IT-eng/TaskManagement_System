using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskManagement.Infrastructure.Migrations.Sqlite
{
    /// <inheritdoc />
    public partial class AddTaskType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "ProjectTasks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1); // ProjectTaskType.Task for rows that predate issue types
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "ProjectTasks");
        }
    }
}

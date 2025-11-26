// Script to create Admin User
// Run this in a C# interactive window or create a simple console app
// Or copy this code into a temporary console application

using System;
using BCrypt.Net;

class Program
{
    static void Main()
    {
        // Generate BCrypt hash for password "Admin123!"
        string password = "Admin123!";
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(password, 11);
        
        Console.WriteLine("=== Admin User SQL Script ===");
        Console.WriteLine();
        Console.WriteLine("Run this SQL in your database:");
        Console.WriteLine();
        Console.WriteLine("USE TaskManagementDB;");
        Console.WriteLine("GO");
        Console.WriteLine();
        Console.WriteLine("-- Create or update admin user");
        Console.WriteLine("IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@smartwork.com')");
        Console.WriteLine("BEGIN");
        Console.WriteLine("    INSERT INTO Users (");
        Console.WriteLine("        Email,");
        Console.WriteLine("        PasswordHash,");
        Console.WriteLine("        FullName,");
        Console.WriteLine("        Role,");
        Console.WriteLine("        IsActive,");
        Console.WriteLine("        EmailConfirmed,");
        Console.WriteLine("        CreatedAt,");
        Console.WriteLine("        UpdatedAt");
        Console.WriteLine("    )");
        Console.WriteLine("    VALUES (");
        Console.WriteLine("        'admin@smartwork.com',");
        Console.WriteLine($"        '{passwordHash}',");
        Console.WriteLine("        'Admin User',");
        Console.WriteLine("        'Admin',");
        Console.WriteLine("        1,");
        Console.WriteLine("        1,");
        Console.WriteLine("        GETDATE(),");
        Console.WriteLine("        GETDATE()");
        Console.WriteLine("    );");
        Console.WriteLine("END");
        Console.WriteLine("ELSE");
        Console.WriteLine("BEGIN");
        Console.WriteLine("    UPDATE Users");
        Console.WriteLine("    SET Role = 'Admin',");
        Console.WriteLine("        IsActive = 1,");
        Console.WriteLine("        EmailConfirmed = 1,");
        Console.WriteLine("        UpdatedAt = GETDATE()");
        Console.WriteLine("    WHERE Email = 'admin@smartwork.com';");
        Console.WriteLine("END");
        Console.WriteLine("GO");
        Console.WriteLine();
        Console.WriteLine("Password Hash Generated:");
        Console.WriteLine(passwordHash);
    }
}


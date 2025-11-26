-- Script to create Admin User in TaskManagementDB
-- Run this script in SQL Server Management Studio or via sqlcmd
-- 
-- IMPORTANT: First, you need to generate the BCrypt hash for password "Admin123!"
-- You can use the CreateAdminUser.cs script or any BCrypt hash generator
-- 
-- Default credentials:
-- Email: admin@smartwork.com
-- Password: Admin123!

USE TaskManagementDB;
GO

-- Check if admin user already exists
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@smartwork.com')
BEGIN
    -- Insert Admin User
    -- Password: Admin123! (BCrypt hash with cost factor 11)
    -- NOTE: Replace the PasswordHash below with the actual BCrypt hash generated
    -- You can generate it using: BCrypt.Net.BCrypt.HashPassword("Admin123!", 11)
    
    -- Example hash (you need to generate your own):
    -- $2a$11$KIXxZxZxZxZxZxZxZxZxOuZxZxZxZxZxZxZxZxZxZxZxZxZxZxZxZxZ
    
    DECLARE @PasswordHash NVARCHAR(MAX) = '$2a$11$KIXxZxZxZxZxZxZxZxZxOuZxZxZxZxZxZxZxZxZxZxZxZxZxZxZxZxZ'; -- REPLACE THIS WITH ACTUAL HASH
    
    INSERT INTO Users (
        Email,
        PasswordHash,
        FullName,
        Role,
        IsActive,
        EmailConfirmed,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        'admin@smartwork.com',
        @PasswordHash,
        'Admin User',
        'Admin',
        1, -- IsActive
        1, -- EmailConfirmed
        GETDATE(),
        GETDATE()
    );
    
    PRINT 'Admin user created successfully!';
    PRINT 'Email: admin@smartwork.com';
    PRINT 'Password: Admin123!';
END
ELSE
BEGIN
    PRINT 'Admin user already exists!';
    -- Update existing user to Admin role
    UPDATE Users 
    SET Role = 'Admin',
        IsActive = 1,
        EmailConfirmed = 1,
        UpdatedAt = GETDATE()
    WHERE Email = 'admin@smartwork.com';
    
    PRINT 'Existing user updated to Admin role!';
    PRINT 'Email: admin@smartwork.com';
    PRINT 'If you forgot the password, you can reset it via the forgot password feature.';
END
GO

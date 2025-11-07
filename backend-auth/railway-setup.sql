-- Railway MySQL Initialization Script
-- Run this script after deploying to Railway if needed
-- Note: The Node.js app will auto-create the users table on startup

-- Create users table (will be created by app, but here for reference)
-- CREATE TABLE IF NOT EXISTS users (
--     email VARCHAR(255) PRIMARY KEY,
--     password VARCHAR(255) NOT NULL,
--     user_type ENUM('admin', 'teacher', 'student') NOT NULL,
--     api_token_uses INT DEFAULT 20,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create frontend_client user with limited permissions
-- Replace 'secure_password_here' with a strong password
CREATE USER IF NOT EXISTS 'frontend_client'@'%' IDENTIFIED BY 'secure_password_here';

-- Grant only SELECT and INSERT on the users table
-- Replace 'railway' with your actual database name if different
GRANT SELECT, INSERT ON railway.users TO 'frontend_client'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify the user was created
SELECT user, host FROM mysql.user WHERE user = 'frontend_client';

-- Verify permissions
SHOW GRANTS FOR 'frontend_client'@'%';

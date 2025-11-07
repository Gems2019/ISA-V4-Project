-- Initialize the database schema and users

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('admin', 'teacher', 'student') NOT NULL,
    api_token_uses INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index on user_type for faster queries
CREATE INDEX idx_user_type ON users(user_type);

-- Create frontend-client user with limited permissions (SELECT and INSERT only)
-- This user is for the frontend application
CREATE USER IF NOT EXISTS 'frontend_client'@'%' IDENTIFIED BY 'frontend_password';
GRANT SELECT, INSERT ON auth_db.users TO 'frontend_client'@'%';

-- Grant full permissions to backend_admin (already created by docker-compose)
GRANT ALL PRIVILEGES ON auth_db.* TO 'backend_admin'@'%';

-- Apply permission changes
FLUSH PRIVILEGES;

-- Note: Seed users will be inserted by the Node.js application on startup
-- This ensures passwords are properly hashed with bcrypt

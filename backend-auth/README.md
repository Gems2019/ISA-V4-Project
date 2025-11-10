# Backend Auth Service - MySQL Migration

This authentication microservice has been migrated from SQLite to MySQL and is ready for deployment on Railway.

## 🚀 Features

- User registration and authentication
- Password hashing with bcrypt
- MySQL database with proper user permissions
- Docker containerization
- Railway deployment ready
- CORS configuration for multiple origins

## 📦 Database Users

The system creates two MySQL users:

1. **backend_admin** (Full access)
   - Used by the backend service
   - Has ALL PRIVILEGES on the auth_db database

2. **frontend_client** (Limited access)
   - Used by frontend applications
   - Has only SELECT and INSERT permissions
   - Cannot UPDATE, DELETE, or modify schema

## 🛠️ Local Development

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (if running without Docker)

### Using Docker Compose (Recommended)

```bash
# Start MySQL and backend service
docker-compose up -d

# View logs
docker-compose logs -f backend-auth

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

The service will be available at `http://localhost:8000`

### Manual Setup (Without Docker)

1. Install dependencies:
```bash
npm install
```

2. Set up MySQL database manually and run `init.sql`

3. Create `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=backend_admin
DB_PASSWORD=backend_password
DB_NAME=auth_db
PORT=8000
```

4. Start the server:
```bash
npm start
```

## 🚂 Railway Deployment

### Step 1: Create MySQL Database

1. Go to your Railway project
2. Click "New" → "Database" → "Add MySQL"
3. Note the connection details provided by Railway

### Step 2: Deploy the Backend Service

1. Click "New" → "GitHub Repo" (or "Empty Service" to deploy manually)

2. Set the following environment variables in Railway:
   ```
   DB_HOST=<Railway MySQL host>
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=<Railway MySQL password>
   DB_NAME=railway
   PORT=8000
   ```

3. Railway will automatically detect the Dockerfile and build your service

### Step 3: Initialize Database

After deployment, the service will automatically:
- Create the `users` table
- Insert seed users (admin, teacher, student)

### Step 4: Create frontend_client User (Optional)

Connect to your Railway MySQL database and run:

```sql
CREATE USER IF NOT EXISTS 'frontend_client'@'%' IDENTIFIED BY 'your_secure_password';
GRANT SELECT, INSERT ON railway.users TO 'frontend_client'@'%';
FLUSH PRIVILEGES;
```

**Note:** Replace `railway` with your database name if different.

## 📡 API Endpoints

### POST /register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "user_type": "student"
}
```

### POST /login
Authenticate user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "role": "student",
  "api_token": 19
}
```

### GET /admin/all-users
Get all users (admin endpoint)

Response:
```json
{
  "success": true,
  "users": [
    {
      "email": "user@example.com",
      "user_type": "student",
      "api_token_uses": 19
    }
  ]
}
```

## 🔐 Seed Users

Default users created on first startup:

| Email | Password | Role |
|-------|----------|------|
| admin@admin.com | 111 | admin |
| teacher@teacher.com | 123 | teacher |
| john@john.com | 123 | student |

**⚠️ Change these passwords in production!**

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_USER | Database user | backend_admin |
| DB_PASSWORD | Database password | backend_password |
| DB_NAME | Database name | auth_db |
| PORT | Service port | 8000 |

## 🐳 Docker Build

Build the image manually:
```bash
docker build -t backend-auth .
```

Run the container:
```bash
docker run -p 8000:8000 \
  -e DB_HOST=your-mysql-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=your-db-name \
  backend-auth
```

## 🔍 Troubleshooting

### Cannot connect to MySQL
- Verify environment variables are correct
- Check MySQL service is running
- Ensure network connectivity between services

### Permission denied errors
- Verify the user has correct privileges
- Run `FLUSH PRIVILEGES;` after granting permissions

### Table already exists error
- The service handles this automatically
- Check logs for actual error message

## 📝 Migration Notes

Changes from SQLite to MySQL:
- Replaced `sqlite3` with `mysql2`
- Updated SQL syntax (TEXT → VARCHAR, INTEGER → INT, etc.)
- Added connection pooling
- Added ENUM type for user_type
- Added timestamps (created_at, updated_at)
- Removed file system dependencies

## 🤝 Frontend Integration

Update your frontend to use the `frontend_client` credentials when connecting directly to the database (if applicable), or continue using the REST API endpoints as before.

The `frontend_client` user can:
- ✅ SELECT users (read)
- ✅ INSERT users (register)
- ❌ UPDATE users (must use backend API)
- ❌ DELETE users (must use backend API)

This ensures security by limiting frontend access to critical operations.

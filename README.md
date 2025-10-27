# ISA-V4-Project

A full-stack web application with role-based authentication built with React, TypeScript, and Vite.

## 📋 Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Available Routes](#available-routes)
- [Technologies Used](#technologies-used)

## ✨ Features

- **Role-Based Authentication**: Support for three user roles (Student, Teacher, Admin)
- **Protected Routes**: Route guards based on user roles
- **JWT Token Authentication**: Secure token-based authentication
- **Responsive UI**: Built with Bootstrap
- **TypeScript**: Full type safety throughout the application

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn**
- A backend API server running (required for authentication)

## 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gems2019/ISA-V4-Project.git
   cd ISA-V4-Project/frontend-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run dev
   npm install react-router-dom@6.21.1
   npm install bootstrap@5.3.3 -D
   npm install jwt-decode
   npm install axios
   npm install styled-components
   ```

   This will install all required packages including:
   - React & React DOM
   - React Router DOM (for routing)
   - Axios (for HTTP requests)
   - JWT Decode (for token decoding)
   - Bootstrap (for styling)
   - TypeScript & Vite (development tools)

## ⚙️ Configuration

1. **Environment Variables**
   
   Create a `.env` file in the `frontend-react` directory (already created):
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:3000
   
   # Environment
   VITE_APP_ENV=development
   ```

2. **Update API Base URL**
   
   If your backend API is running on a different URL, update the `VITE_API_URL` in your `.env` file or modify `src/services/apiClient.ts`:
   ```typescript
   baseURL: 'http://your-backend-url.com'
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   
   Navigate to `http://localhost:5173` (Vite's default port)

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the production build**
   ```bash
   npm run preview
   ```

### Other Commands

- **Lint the code**
  ```bash
  npm run lint
  ```

## 📁 Project Structure

```
frontend-react/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, fonts, etc.
│   ├── components/        # Reusable components
│   │   ├── NavBar.tsx
│   │   └── UserCheck.tsx  # Protected route wrapper
│   ├── config/            # Configuration files
│   │   └── index.ts
│   ├── context/           # React Context
│   │   └── AuthTokenRole.tsx  # Authentication context
│   ├── pages/             # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── AdminLandingPage.tsx
│   │   ├── TeacherLandingPage.tsx
│   │   └── StudentLandingPage.tsx
│   ├── routes/            # Routing configuration
│   │   └── Routes.tsx
│   ├── services/          # API services
│   │   └── apiClient.ts   # Axios instance
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
└── vite.config.ts        # Vite configuration
```

## 🛣️ Available Routes

### Public Routes
- `/` - Login page (Home)
- `/login` - Login page
- `/register` - Registration page
- `/unauthorized` - Unauthorized access page

### Protected Routes
- `/student` or `/student-dashboard` - Student dashboard (Student role only)
- `/teacher` or `/teacher-dashboard` - Teacher dashboard (Teacher role only)
- `/admin` - Admin dashboard (Admin role only)

## 🛠️ Technologies Used

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Bootstrap 5** - CSS framework

### Authentication & API
- **Axios** - HTTP client
- **JWT Decode** - Token decoding
- **Local Storage** - Token persistence

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript linting rules

## 🔐 Authentication Flow

1. User enters email and password on the login page
2. Credentials are sent to the backend API (`POST /login`)
3. Backend returns a JWT token containing user role
4. Token is decoded and stored in localStorage
5. User is redirected to their role-specific dashboard
6. Protected routes check user role before allowing access

## 📝 Backend Requirements

Your backend API must provide:

- **POST /login**
  - Request: `{ email: string, password: string }`
  - Response: `{ token: string }`
  
- **JWT Token Structure**:
  ```json
  {
    "role": "student" | "teacher" | "admin",
    "iat": 1234567890,
    "exp": 1234567890
  }
  ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Gems2019** - [GitHub Profile](https://github.com/Gems2019)

## 🐛 Troubleshooting

### Common Issues

1. **"useAuth must be used within an AuthProvider"**
   - Make sure `AuthProvider` wraps your `RouterProvider` in `main.tsx`

2. **Module not found errors**
   - Run `npm install` to ensure all dependencies are installed

3. **API connection errors**
   - Verify your backend server is running
   - Check the `VITE_API_URL` in your `.env` file

4. **Port already in use**
   - Vite default port is 5173. Change it in `vite.config.ts` if needed

---

For more information or support, please open an issue on GitHub.

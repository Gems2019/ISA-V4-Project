import { createBrowserRouter } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import AdminLandingPage from "../pages/AdminLandingPage";
import RegisterPage from "../pages/RegisterPage";
import StudentLandingPage from "../pages/StudentLandingPage";
import TeacherLandingPage from "../pages/TeacherLandingPage";
import { UserCheck } from "../components/UserCheck";

/**
 * The router configuration for the application.
 */
export const router = createBrowserRouter([
  // --- Public Routes ---
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/unauthorized",
    element: <h1>Unauthorized Access</h1>
  },

  // --- Protected Student Routes ---
  { 
    element: <UserCheck allowedRoles={['student']} />,
    children: [
 
      {
        path: "/student",
        element: <StudentLandingPage />
      }
    ],
  },

  // --- Protected Teacher Routes ---
  {
    element: <UserCheck allowedRoles={['teacher']} />,
    children: [
 
      {
        path: "/teacher",
        element: <TeacherLandingPage />
      }
    ],
  },

  // --- Protected Admin Routes ---
  {
    element: <UserCheck allowedRoles={['admin']} />,
    children: [
      {
        path: "/admin",
        element: <AdminLandingPage />
      }
    ],
  },
]);

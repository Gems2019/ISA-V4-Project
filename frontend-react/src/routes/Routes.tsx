import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/LoginPage";
import AdminLandingPage from "../pages/AdminLandingPage";
import RegisterPage from "../pages/RegisterPage";
import StudentLandingPage from "../pages/StudentLandingPage";
import TeacherLandingPage from "../pages/TeacherLandingPage";
// Temporarily disabled for development
// import { UserCheck } from "../components/UserCheck";

/**
 * The router configuration for the application.
 * 
 * NOTE: Authentication is TEMPORARILY DISABLED for development
 * Uncomment UserCheck imports and wrappers when ready to enable auth
 */
export const router = createBrowserRouter([
  // --- Public Routes ---
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/unauthorized",
        element: <h1>Unauthorized Access</h1>
      },

      // --- TEMPORARILY PUBLIC Student Routes (AUTH DISABLED) ---
      // {
      //   element: <UserCheck allowedRoles={['student']} />,
      //   children: [
      //     {
      //       path: "/student",
      //       element: <StudentLandingPage />
      //     }
      //   ],
      // },
      {
        path: "/student",
        element: <StudentLandingPage />
      },

      // --- TEMPORARILY PUBLIC Teacher Routes (AUTH DISABLED) ---
      // {
      //   element: <UserCheck allowedRoles={['teacher']} />,
      //   children: [
      //     {
      //       path: "/teacher",
      //       element: <TeacherLandingPage />
      //     }
      //   ],
      // },
      {
        path: "/teacher",
        element: <TeacherLandingPage />
      },

      // --- TEMPORARILY PUBLIC Admin Routes (AUTH DISABLED) ---
      // {
      //   element: <UserCheck allowedRoles={['admin']} />,
      //   children: [
      //     {
      //       path: "/admin",
      //       element: <AdminLandingPage />
      //     }
      //   ],
      // },
      {
        path: "/admin",
        element: <AdminLandingPage />
      },
    ]
  },
]);

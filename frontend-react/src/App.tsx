import "bootstrap/dist/css/bootstrap.css";
import { Outlet } from "react-router";
import NavBar, { type NavItem } from "./components/NavBar"; // <-- Import NavBar and the new NavItem type
import reactLogo from "./assets/react.svg"; // <-- Make sure path is correct

function App() {

  // Define your nav items using the new structure
  // These paths match your Routes.tsx file
  const navItemsForPublic: NavItem[] = [
    { text: "Login", path: "/login" },
    { text: "Register", path: "/register" },
    { text: "Student", path: "/student" },
    { text: "Teacher", path: "/teacher" },
    { text: "Admin", path: "/admin" },
  ];

  return (
    <>
      <NavBar
        brandName="AI Subtitle App"
        imageSrcPath={reactLogo}
        navItems={navItemsForPublic} // <-- Pass in the new array of objects
      />
      <br></br>
      
      <div className="container">
        <Outlet />
      </div>
    </>
  );
}

export default App;
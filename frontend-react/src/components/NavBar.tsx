import { Link } from "react-router-dom";
import reactLogo from "../assets/react.svg";
import { useState } from "react";
import "../index.css"

export interface NavItem {
  text: string;
  path: string;
}

interface NavBarProps {
  brandName: string;
  imageSrcPath: string;
  navItems: NavItem[]; // <-- This was string[]
}

function NavBar({ brandName, imageSrcPath, navItems }: NavBarProps) {

  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <nav className="navbar navbar-expand-md navbar-light bg-white shadow">
      <div className="container-fluid">
        {/* ... (your brand/logo code is fine) ... */}
        <a className="navbar-brand" href="#">
          <img
            src={imageSrcPath}
            width="30"
            height="30"
            className="d-inline-block align-center"
            alt=""
          />
          <span className="fw-bolder fs-4">{brandName}</span>
        </a>
        
        {/* ... (your navbar-toggler button is fine) ... */}

        <div
          className="collapse
         navbar-collapse"
        id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-md-1">
            
            {/* --- CHANGE 2: Update your .map() loop --- */}
            {navItems.map(({ text, path }, index) => (
              <li
                key={path} // <-- Use path as the key
                className="nav-item"
                onClick={() => setSelectedIndex(index)}
              >
                {/* Replace <a> with <Link> */}
                <Link
                  className={
                    selectedIndex == index
                      ? "nav-link active fw-bold"
                      : "nav-link"
                  }
                  to={path} // <-- Use 'to' instead of 'href'
                >
                  {text} {/* <-- Use the text from the object */}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* ... (your search form is fine) ... */}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
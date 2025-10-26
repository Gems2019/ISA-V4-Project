import { Link } from "react-router-dom";
import reactLogo from "../assets/react.svg";

const NavBar = () => {
  return (
    <nav className="navbar navbar-expand-sm bg-primary navbar-dark">
      <a className="navbar-brand" href="#">
        <img src={reactLogo} width="30" height="30" alt="" />
        School
      </a>
      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item active">
            <Link className="nav-link" to="/">
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/about">
              About
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/list">
              Student List
            </Link>
          </li>
        </ul>
      </div>
      <a className="navbar-brand" href="/">
        TypeScript version
      </a>
    </nav>
  );
};

export default NavBar;

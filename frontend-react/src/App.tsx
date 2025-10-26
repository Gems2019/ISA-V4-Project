import "bootstrap/dist/css/bootstrap.css";
import NavBar from './components/NavBar';
import { Outlet } from "react-router"

function App() {

  return (
    <>
      <div className="container">
        <NavBar /> 
        <Outlet />
      </div>
    </>
  );
}

export default App;

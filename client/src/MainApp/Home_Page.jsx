import { useState } from "react";
import "./HP_styles.css";
import globeLogo from "../assets/Globe_LogoB.png";
import { useNavigate } from "react-router-dom";

function LoadingScreen({ logo}) {
  return (
    <div className="loading-overlay">
      <div className="spinner-box">
        <div className="spinner-ripple"></div>
        <div className="spinner-ring"></div>
        <img src={logo} alt="Loading..." className="loading-logo" />
      </div>
      <p className="loading-text">Loading...</p>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => {
      navigate(path);
    }, 1000); // simulate loading
  };

  return (
    <div className="homepage">
      {isLoading && <LoadingScreen logo={globeLogo} />}

      <div className="card">
        <div className="logoSection">
          <img src={globeLogo} className="logo" alt="Globe Logo"/>
        </div>

        <div className="dropdown">
          <button 
            className={`dropdownBtn ${open ? "active" : ""}`}
            onClick={() => setOpen(!open)}
          >
            Services ▾
          </button>

          <div className={`dropdownMenu ${open ? "show" : ""}`}>
            <button className="choice" onClick={() => handleNavigate("/Storm_Master_List")}>
              Storm Master List
            </button>
            <button className="choice" onClick={() => handleNavigate("/Site_Alert_Isolation")}>
              Site Alert Isolation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
import HomePage from './Home_Page';
import SMDashboard from './SMDashboard';
import SADashboard from './SADashboard';
import { HashRouter as Router, Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/Storm_Master_List" element={<SMDashboard/>}/>
            <Route path="/Site_Alert_Isolation" element={<SADashboard/>}/>
        </Routes>
    </Router>
  );
}
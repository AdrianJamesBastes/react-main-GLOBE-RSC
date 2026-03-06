import HomePage from './Home_Page';
import SMDashboard from './SMDashboard';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/Storm_Master_List" element={<SMDashboard/>}/>
        </Routes>
    </Router>
  );
}
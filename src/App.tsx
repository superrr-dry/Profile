import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import QRCodeGenerator from "./components/QRCodeGenerator";
import ProfilePage from "./page/ProfilePage";
import "./components/QRCode.css";
import "./page/ProfilePage.css";

const App = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route path="/qr-generator" element={<QRCodeGenerator />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

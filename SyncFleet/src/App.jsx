import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import { Toaster } from 'react-hot-toast';
import RoomMap from './components/RoomMap';
import About from "./pages/About";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import Blog from "./pages/Blog";
import FAQ from "./pages/FAQ";
import Members from "./pages/Members";
import Community from "./pages/Community.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/join-room" element={<JoinRoom />} />      
        <Route path="/contact" element={<Contact />} />      
        <Route path="/help" element={<Help />} />      
        <Route path="/faq" element={<FAQ />} />      
        <Route path="/blog" element={<Blog />} />      
        <Route path="/members" element={<Members />} />      
        <Route path="/community" element={<Community />} />      
        <Route path="/room/:code/map" element={<RoomMap />} />
      </Routes>
        <Toaster position="top-right" reverseOrder={false} />
    </BrowserRouter>
  );
}

export default App;

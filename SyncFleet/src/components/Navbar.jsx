import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

const Navbar = () => {
  const { user, logout } = useAuthStore(); // Zustand state
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-tr from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter sticky top-0 z-50 shadow-md">
      <div className="flex justify-between items-center px-6 md:px-10 py-4 md:py-6">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl md:text-3xl font-orbitron tracking-wide text-cyan-400 drop-shadow-md"
        >
          SyncFleet
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex  items-center space-x-6 font-medium">     
          <Link to="/" className="hover:text-cyan-400 transition flex ">
            Home
          </Link>
          <Link to="/about" className="hover:text-cyan-400 transition">
            About
          </Link>
          <Link to="/contact" className="hover:text-cyan-400 transition">
            Contact
          </Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="bg-[#FFD369] text-black px-5 py-2 rounded-lg shadow-lg hover:bg-[#b38c33] transition"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-cyan-500 px-5 py-2 rounded-lg shadow-lg hover:bg-cyan-400 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="border border-cyan-400 px-5 py-2 rounded-lg hover:bg-cyan-900 transition"
              >
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white text-3xl focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <HiX /> : <HiMenu />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <nav className="md:hidden bg-[#0f172a]/95 backdrop-blur-md px-6 pb-6 space-y-4 flex flex-col items-center">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="hover:text-cyan-400 transition"
          >
            Home
          </Link>
          <Link
            to="/about"
            onClick={() => setMenuOpen(false)}
            className="hover:text-cyan-400 transition"
          >
            About
          </Link>
          <Link
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className="hover:text-cyan-400 transition"
          >
            Contact
          </Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="bg-[#FFD369] text-black px-5 py-2 rounded-lg shadow-lg hover:bg-[#b38c33] transition"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="bg-cyan-500 px-5 py-2 rounded-lg shadow-lg hover:bg-cyan-400 transition w-full text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="border border-cyan-400 px-5 py-2 rounded-lg hover:bg-cyan-900 transition w-full text-center"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;

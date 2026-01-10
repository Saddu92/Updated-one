import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <header className="bg-white sticky top-0 z-50 border-b shadow-sm font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-orbitron text-sky-600 tracking-wide"
        >
          SyncFleet
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6 font-medium">
          <Link to="/" className="text-gray-700 hover:text-sky-600">
            Home
          </Link>
          <Link to="/about" className="text-gray-700 hover:text-sky-600">
            About
          </Link>
          <Link to="/contact" className="text-gray-700 hover:text-sky-600">
            Contact
          </Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="bg-amber-400 text-black px-4 py-2 rounded-lg hover:bg-amber-300 transition"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-500"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="border px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Button */}
        <button
          className="md:hidden text-gray-700 text-3xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <HiX /> : <HiMenu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t px-6 py-4 flex flex-col gap-4">
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="bg-amber-400 py-2 rounded-lg"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="bg-sky-600 text-white py-2 rounded-lg text-center">
                Login
              </Link>
              <Link to="/register" className="border py-2 rounded-lg text-center">
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

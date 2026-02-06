import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import logo from "@/assets/car.png";

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
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">

        {/* Logo */}
     <Link
  to="/"
  className="flex items-center gap-3 font-semibold tracking-wide text-[#2563EB]"
>
  <img
    src={logo}
    alt="SyncFleet logo"
    className="
      h-11 w-auto
      object-contain
      rounded-md
    "
  />
  <span className="text-xl leading-none">
    SyncFleet
  </span>
</Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {["Home", "About", "Contact"].map((item) => (
            <Link
              key={item}
              to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
              className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
            >
              {item}
            </Link>
          ))}

          {user ? (
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition"
            >
              Logout
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-4">
              <Link
                to="/login"
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-md text-sm font-medium border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition"
              >
                Register
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#374151] p-2 rounded-md hover:bg-[#F3F4F6] transition"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <HiX size={22} /> : <HiMenu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="px-6 py-4 flex flex-col gap-3 bg-white border-t border-[#E5E7EB]">
          {["Home", "About", "Contact"].map((item) => (
            <Link
              key={item}
              to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#374151]"
            >
              {item}
            </Link>
          ))}

          <div className="pt-2 border-t border-[#E5E7EB] mt-2" />

          {user ? (
            <button
              onClick={handleLogout}
              className="mt-2 py-2 rounded-md text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Logout
            </button>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="py-2 rounded-md text-center text-sm font-medium text-white bg-[#2563EB]"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="py-2 rounded-md text-center text-sm font-medium border border-[#E5E7EB]"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

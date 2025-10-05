import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const Contact = () => {
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can integrate email API or backend logic
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter"> 
      <Navbar/>
      {/* Hero Section */}
      <header className="py-20 text-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-orbitron font-extrabold text-white mb-6 drop-shadow-md">
            Contact Us
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Have questions or feedback? Reach out to us, and we’ll get back to you as soon as possible.
          </p>
        </div>
      </header>

      {/* Contact Form Section */}
      <section className="max-w-3xl mx-auto py-16 px-6">
        <div className="backdrop-blur-md p-10 rounded-3xl shadow-lg border border-[#00C2FF]/30">
          {submitted ? (
            <div className="text-center text-cyan-400 font-semibold text-xl">
              Thank you! Your message has been sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
                className="p-4 rounded-xl bg-[#0D1B2A]/50 border border-[#415A77]/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Your Email"
                required
                className="p-4 rounded-xl bg-[#0D1B2A]/50 border border-[#415A77]/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message"
                rows="5"
                required
                className="p-4 rounded-xl bg-[#0D1B2A]/50 border border-[#415A77]/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
              />
              <button
                type="submit"
                className="bg-[#00C2FF] text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#009EDC] hover:scale-105 shadow-md transition"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
     <Footer/>
    </div>
  );
};

export default Contact;

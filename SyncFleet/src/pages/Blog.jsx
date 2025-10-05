import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Blog = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-12 text-blue-400 text-center md:text-left">
          Blog
        </h1>

        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((post) => (
            <div
              key={post}
              className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-blue-500/50 transition flex flex-col justify-between"
            >
              <h2 className="text-xl font-semibold mb-2">Blog Post {post}</h2>
              <p className="text-gray-300 text-sm mb-4">
                A short summary of the blog post goes here to entice users to read more.
              </p>
              <button className="self-start px-4 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition">
                Read More
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;

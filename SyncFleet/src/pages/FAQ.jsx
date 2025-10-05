import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const faqs = [
  {
    question: "How do I create a room?",
    answer: "Go to the 'Create Room' page, select source and destination, and click 'Create Room'."
  },
  {
    question: "Can I join an existing room?",
    answer: "Yes, use the 'Join Room' page and enter the room code to join."
  },
  {
    question: "How do I mark hazards on the map?",
    answer: "Click the hazard buttons on the right panel and mark Potholes or Accidents at your location."
  },
  {
    question: "Can I chat with members in real-time?",
    answer: "Yes, open the chat panel to communicate with other members in the same room."
  },
  {
    question: "What happens if I leave a room?",
    answer: "You will be disconnected from the room and removed from the member list. You can rejoin anytime using the room code."
  },
  {
    question: "How do SOS alerts work?",
    answer: "Click the SOS button on your map mockup to notify all active members of an emergency."
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-12 text-cyan-400 text-center md:text-left">
          Frequently Asked Questions
        </h1>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = idx === openIndex;
            return (
              <div
                key={idx}
                className="bg-gray-900/70 p-4 rounded-2xl shadow-md hover:shadow-cyan-500/50 transition"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  {isOpen ? (
                    <FiChevronUp className="text-cyan-400 text-xl" />
                  ) : (
                    <FiChevronDown className="text-cyan-400 text-xl" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-gray-300 text-sm">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;

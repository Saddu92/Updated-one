// components/ChatPanel.jsx
import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { IoMdSend } from "react-icons/io";

const ChatPanel = ({ isOpen, onClose, messages, newMessage, setNewMessage, onSend, currentUser }) => {
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-2 w-[18%] min-w-[280px] max-w-[500px] max-h-[60%] flex flex-col z-[9999]">
      <div className="flex flex-col h-full rounded-2xl shadow-2xl bg-gray-900/95 border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-3 bg-green-600 border-b border-gray-700">
          <span className="text-white font-semibold text-md">Chatbox</span>
          <button
            onClick={onClose}
            className="text-white hover:text-red-500 transition-all text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800">
          {messages.map((msg, idx) => {
            const isSelf =
              msg.sender?.trim().toLowerCase() === currentUser?.trim().toLowerCase();

            return (
              <div
                key={idx}
                className={`flex flex-col p-2 rounded-2xl max-w-[75%] ${
                  isSelf
                    ? "self-end bg-green-500 text-white"
                    : "self-start bg-white text-gray-900 border border-gray-300"
                } shadow`}
              >
                {!isSelf && (
                  <span className="text-xs font-semibold text-gray-400 mb-1">
                    {msg.sender}
                  </span>
                )}
                <span className="text-sm break-words">{msg.content}</span>
                <span
                  className={`text-[9px] mt-1 flex justify-end ${
                    isSelf ? "text-green-100" : "text-gray-500"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center p-2 bg-gray-800 border-t border-gray-700">
          <input
            ref={chatInputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            className="flex-1 px-3 py-2 rounded-full bg-gray-700 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 transition"
          />
          <button
            onClick={onSend}
            className="ml-2 px-3 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md transition"
          >
            <IoMdSend className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

ChatPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string,
      content: PropTypes.string,
      timestamp: PropTypes.string,
      type: PropTypes.string,
    })
  ).isRequired,
  newMessage: PropTypes.string.isRequired,
  setNewMessage: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
};

export default ChatPanel;
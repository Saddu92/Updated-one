// components/ChatPanel.jsx
import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { IoMdSend } from "react-icons/io";

const ChatPanel = ({ isOpen, onClose, messages, newMessage, setNewMessage, onSend, currentUser, inline = false, className = "" }) => {
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const rootClassFixed = `${className} fixed bottom-4 right-4 md:right-8 w-full md:w-[360px] max-w-md max-h-[60%] flex flex-col z-[9999]`;
  const rootClassInline = `${className} flex flex-col h-full w-full`;

  return (
    <div className={inline ? rootClassInline : rootClassFixed}>
      <div className="flex flex-col h-full rounded-2xl shadow-lg bg-white border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-3 bg-sky-600 border-b border-gray-100">
          <span className="text-white font-semibold text-md">Chatbox</span>
          <button
            onClick={onClose}
            className="text-white hover:text-sky-100 transition-all text-xl font-bold"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-3 bg-white">
          {messages.map((msg, idx) => {
            const isSelf =
              msg.sender?.trim().toLowerCase() === currentUser?.trim().toLowerCase();

            return (
              <div
                key={idx}
                className={`flex flex-col p-3 rounded-2xl max-w-[85%] ${
                  isSelf
                    ? "self-end bg-sky-600 text-white"
                    : "self-start bg-gray-100 text-gray-800"
                } shadow-sm`}
              >
                {!isSelf && (
                  <span className="text-xs font-semibold text-gray-600 mb-1">
                    {msg.sender}
                  </span>
                )}
                <span className="text-sm break-words">{msg.content}</span>
                <span
                  className={`text-[11px] mt-2 flex justify-end ${
                    isSelf ? "text-sky-100" : "text-gray-500"
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
        <div className="flex items-center p-3 bg-white border-t border-gray-100">
          <input
            ref={chatInputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            className="flex-1 px-3 py-2 rounded-full bg-gray-50 text-gray-800 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-sky-300 transition"
          />
          <button
            onClick={onSend}
            className="ml-2 px-3 py-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition"
            aria-label="Send message"
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
  inline: PropTypes.bool,
  className: PropTypes.string,
};

export default ChatPanel;
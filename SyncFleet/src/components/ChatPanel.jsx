// components/ChatPanel.jsx
import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { IoMdSend } from "react-icons/io";

const ChatPanel = ({
  isOpen,
  onClose,
  messages,
  newMessage,
  setNewMessage,
  onSend,
  currentUser,
  inline = false,
  className = "",
}) => {
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const rootClassFixed = `${className} fixed bottom-4 right-4 md:right-8 w-full md:w-[380px] max-w-md max-h-[65%] flex flex-col z-[9999] animate-slideUpFade`;
  const rootClassInline = `${className} flex flex-col h-full w-full`;

  return (
    <div className={inline ? rootClassInline : rootClassFixed}>
      <div className="flex flex-col h-full rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-[#2563EB]">
          <span className="text-white font-semibold text-sm tracking-wide">
            Team Chat
          </span>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition text-xl leading-none"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3 bg-white">
          {messages.map((msg, idx) => {
            const isSelf =
              msg.sender?.trim().toLowerCase() ===
              currentUser?.trim().toLowerCase();

            return (
              <div
                key={idx}
                className={`flex flex-col gap-1 p-3 rounded-2xl max-w-[80%] text-sm shadow-sm animate-messageIn ${
                  isSelf
                    ? "self-end bg-[#2563EB] text-white"
                    : "self-start bg-gray-100 text-[#111827]"
                }`}
              >
                {!isSelf && (
                  <span className="text-[11px] font-semibold text-[#6B7280]">
                    {msg.sender}
                  </span>
                )}

                <span className="break-words leading-relaxed">
                  {msg.content}
                </span>

                <span
                  className={`text-[10px] mt-1 self-end ${
                    isSelf ? "text-blue-100" : "text-[#9CA3AF]"
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
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#E5E7EB] bg-white">
          <input
            ref={chatInputRef}
            type="text"
            placeholder="Type a message…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newMessage.trim() && onSend()}
            className="flex-1 px-4 py-2 rounded-full bg-[#F5F7FA] text-[#111827] placeholder-[#9CA3AF] border border-[#E5E7EB] focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition active:scale-95"
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
  messages: PropTypes.array.isRequired,
  newMessage: PropTypes.string.isRequired,
  setNewMessage: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
  inline: PropTypes.bool,
  className: PropTypes.string,
};

export default ChatPanel;

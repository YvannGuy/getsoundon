"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputComposerProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInputComposer({ onSendMessage, disabled = false }: ChatInputComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="p-4">
      <div className="flex items-end gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Décrivez votre événement..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder-gray-500 disabled:opacity-50 min-h-[20px] max-h-[120px]"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-3 py-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2 px-1">
        Appuyez sur Entrée pour envoyer, Maj + Entrée pour une nouvelle ligne
      </p>
    </div>
  );
}
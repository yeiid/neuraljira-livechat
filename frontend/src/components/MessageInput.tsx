import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { REACTIONS } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendReaction: (reaction: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendReaction,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;

    onSendMessage(text.trim());
    setText('');
    setShowEmojiBar(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Mantener foco si no es un dispositivo estrictamente touch
  useEffect(() => {
    if (!disabled && window.matchMedia('(min-width: 768px)').matches) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <div className="shrink-0 p-3 bg-neural-900 border-t border-neural-800 select-none">
      {/* Botonera de reacciones rápidas de directos */}
      <div className="flex items-center justify-between pb-2.5 px-1 border-b border-neural-850/60 mb-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => onSendReaction(r.type)}
              title={r.label}
              className="p-1.5 px-2 rounded-xl bg-neural-950 hover:bg-neural-800 active:scale-90 border border-neural-850 transition-all text-sm flex items-center justify-center shadow-sm"
            >
              <span>{r.emoji}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowEmojiBar(!showEmojiBar)}
          className={`p-1.5 rounded-xl border transition-colors ${
            showEmojiBar
              ? 'bg-neural-purple/20 text-neural-cyan border-neural-purple'
              : 'bg-neural-950 text-slate-400 hover:text-white border-neural-850'
          }`}
          title="Emoticonos"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {/* Selector desplegable de emojis rápidos */}
      {showEmojiBar && (
        <div className="mb-2 p-2 bg-neural-950 rounded-xl border border-neural-800 grid grid-cols-8 gap-1 text-base animate-in fade-in">
          {['😎', '🎉', '🤖', '👾', '✨', '⚡', '💻', '🔮', '👀', '🙌', '🤯', '💀', '🦾', '🕹️', '💎', '🔥'].map(
            (emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setText((prev) => prev + emoji)}
                className="p-1 hover:bg-neural-850 rounded-lg transition-colors flex items-center justify-center"
              >
                {emoji}
              </button>
            )
          )}
        </div>
      )}

      {/* Input principal de texto */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Conectando...' : 'Escribe en el live...'}
            maxLength={300}
            className="w-full px-4 py-2.5 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="p-2.5 rounded-xl bg-gradient-to-r from-neural-purple to-neural-cyan hover:from-purple-600 hover:to-cyan-500 text-white shadow-lg shadow-purple-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 shrink-0"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

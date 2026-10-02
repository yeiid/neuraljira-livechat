import React, { useState } from 'react';
import { MessageCircle, X, Maximize2, Send } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';

interface FloatingChatBubbleProps {
  currentRoomId: string;
  messages: ChatMessage[];
  user: UserProfile | null;
  onSendMessage: (text: string) => void;
  onOpenFullChat?: () => void;
  unreadCount?: number;
}

export const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  currentRoomId,
  messages,
  user,
  onSendMessage,
  onOpenFullChat,
  unreadCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const recentMessages = messages.slice(-15);
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
      {/* Ventana flotante emergente al expandir la burbuja */}
      {isExpanded && (
        <div className="mb-3 w-80 sm:w-96 h-[440px] bg-neural-900/95 border border-neural-750 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Cabecera de la burbuja */}
          <div className="px-3.5 py-2.5 bg-neural-950/80 border-b border-neural-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan animate-pulse" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white font-mono block truncate">
                  #{currentRoomId}
                </span>
                <span className="text-[10px] text-slate-400">Burbuja flotante</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenFullChat && (
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenFullChat();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neural-800"
                  title="Abrir chat completo"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neural-800"
                title="Minimizar burbuja"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de mensajes en miniatura */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {recentMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-500 text-[11px]">
                Sin mensajes recientes en #{currentRoomId}
              </div>
            ) : (
              recentMessages.map((m) => {
                const isMe = m.sender === user?.username;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                      {isMe ? 'Tú' : m.sender}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words text-[11px] leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-neural-purple text-white rounded-tr-none'
                          : 'bg-neural-850 border border-neural-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input rápido en la burbuja */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-neural-950/80 border-t border-neural-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Escribir en #${currentRoomId}...`}
              className="flex-1 bg-neural-900 border border-neural-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neural-cyan"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-neural-cyan hover:bg-neural-cyan/80 text-neural-950 font-bold disabled:opacity-30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Botón Circular Flotante (Burbuja) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative group w-13 h-13 p-3.5 rounded-full bg-gradient-to-tr from-neural-purple to-neural-cyan shadow-xl shadow-purple-500/25 text-white hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20 flex items-center justify-center cursor-pointer"
        title={`Chat en vivo (#${currentRoomId})`}
      >
        <MessageCircle className="w-6 h-6" />

        {/* Contador de no leídos */}
        {unreadCount > 0 && !isExpanded && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-neural-950 shadow-md animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Tooltip con preview del último mensaje si la burbuja está cerrada */}
        {!isExpanded && lastMessage && lastMessage.text && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neural-900 border border-neural-800 shadow-xl whitespace-nowrap text-xs text-slate-200 pointer-events-none">
            <span className="font-semibold text-neural-cyan font-mono">
              #{currentRoomId}:
            </span>
            <span className="truncate max-w-[150px] text-slate-400">
              {lastMessage.text}
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

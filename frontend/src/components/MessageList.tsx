import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown, Crown, Shield, Star, MessageSquare, Trash2 } from 'lucide-react';
import { ChatMessage, AVATARS, UserRole } from '../types';
import { FileAttachmentView } from './FileAttachmentView';

interface MessageListProps {
  messages: ChatMessage[];
  currentUsername: string;
  currentUserRole?: UserRole;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUsername,
  currentUserRole,
  onDeleteMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Detectar scroll manual del usuario
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    setShouldAutoScroll(isAtBottom);
    setShowScrollBottomBtn(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShouldAutoScroll(true);
      setShowScrollBottomBtn(false);
    }
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  const getAvatarEmoji = (avatarId?: string) => {
    const found = AVATARS.find((a) => a.id === avatarId);
    return found ? found.emoji : '👤';
  };

  const renderRoleBadge = (role?: UserRole) => {
    if (!role || role === 'viewer') return null;

    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Shield className="w-2.5 h-2.5 text-amber-400" />
          ADMIN
        </span>
      );
    }
    if (role === 'host') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30">
          <Crown className="w-2.5 h-2.5 text-amber-400" />
          HOST
        </span>
      );
    }
    if (role === 'mod') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Shield className="w-2.5 h-2.5 text-emerald-400" />
          MOD
        </span>
      );
    }
    if (role === 'vip') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neural-cyan/20 text-neural-cyan border border-neural-cyan/30">
          <Star className="w-2.5 h-2.5 text-neural-cyan" />
          VIP
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative flex-1 min-h-0 bg-neural-950 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-4 space-y-3 overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-neural-900 border border-neural-800 flex items-center justify-center mb-3 text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-medium text-slate-300 text-sm">¡Comienza la conversación!</p>
            <p className="text-xs text-slate-500 mt-1">Sé el primero en enviar un mensaje en este directo.</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Eventos de entrada/salida del sistema
            if (msg.type === 'user_join' || msg.type === 'user_leave' || msg.type === 'system') {
              return (
                <div key={msg.id} className="flex items-center justify-center my-1.5 text-xs text-slate-500">
                  <span className="px-3 py-1 rounded-full bg-neural-900/60 border border-neural-850 font-mono text-[11px] flex items-center gap-1.5">
                    <span>{getAvatarEmoji(msg.avatar)}</span>
                    <span className="font-semibold text-slate-300">{msg.sender}</span>
                    <span>{msg.text || 'se unió al directo'}</span>
                  </span>
                </div>
              );
            }

            // Mensajes normales de chat
            const isMe = msg.sender === currentUsername;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 text-sm group transition-opacity ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-xl bg-neural-850 border border-neural-800 flex items-center justify-center text-base shrink-0 mt-0.5 select-none shadow-sm">
                    {getAvatarEmoji(msg.avatar)}
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[82%] sm:max-w-[70%] ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Encabezado del mensaje */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`text-xs font-semibold ${
                        isMe
                          ? 'text-neural-cyan'
                          : msg.role === 'host'
                          ? 'text-amber-400'
                          : msg.role === 'mod'
                          ? 'text-emerald-400'
                          : msg.role === 'vip'
                          ? 'text-neural-cyan'
                          : 'text-slate-300'
                      }`}
                    >
                      {isMe ? 'Tú' : msg.sender}
                    </span>
                    {renderRoleBadge(msg.role)}
                    <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                  </div>

                  {/* Burbuja del mensaje y acción de moderación */}
                  <div className="flex items-center gap-1 group/bubble">
                    {isMe && (currentUserRole === 'admin' || currentUserRole === 'mod') && onDeleteMessage && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-neural-900"
                        title="Eliminar mensaje (Moderación)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div
                      className={`px-3.5 py-2 rounded-2xl break-words text-[13px] leading-relaxed select-text shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-neural-purple to-purple-600 text-white rounded-tr-none'
                          : 'bg-neural-900 border border-neural-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                      {msg.attachment && <FileAttachmentView attachment={msg.attachment} />}
                    </div>

                    {!isMe && (currentUserRole === 'admin' || currentUserRole === 'mod') && onDeleteMessage && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-neural-900"
                        title="Eliminar mensaje (Moderación)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-neural-purple to-neural-cyan flex items-center justify-center text-base shrink-0 mt-0.5 select-none shadow-sm">
                    {getAvatarEmoji(msg.avatar)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botón flotante para volver abajo */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-neural-850 hover:bg-neural-800 border border-neural-700 text-xs font-medium text-slate-200 shadow-xl flex items-center gap-1.5 transition-all animate-bounce select-none"
        >
          <ArrowDown className="w-3.5 h-3.5 text-neural-cyan" />
          <span>Nuevos mensajes</span>
        </button>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Maximize2, Send, ExternalLink, Layers } from 'lucide-react';
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
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final en nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isExpanded, pipWindow]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Abrir ventana PiP nativa siempre visible SOBREPUESTA sobre todas las apps
  const openPipWindow = async () => {
    try {
      let win: Window | null = null;
      if ('documentPictureInPicture' in window) {
        // Document Picture-in-Picture API oficial de W3C / Chromium (Always-on-top del sistema operativo)
        win = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 540,
        });
      } else {
        // Fallback como ventana emergente flotante compacta
        const width = 380;
        const height = 540;
        const left = window.screen.availWidth - width - 20;
        const top = 80;
        win = window.open(
          '',
          'neuraljira_chat_pip',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
        );
      }

      if (!win) {
        alert('No se pudo abrir la ventana flotante. Asegúrate de permitir ventanas emergentes.');
        return;
      }

      // Clonar estilos Tailwind y CSS de la app a la ventana PiP
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        win!.document.head.appendChild(node.cloneNode(true));
      });

      win.document.title = `💬 #${currentRoomId} - Neuraljira Live`;
      win.document.body.className =
        'bg-neural-950 text-slate-100 font-sans antialiased m-0 p-0 h-screen w-screen overflow-hidden select-none';

      const handleClose = () => {
        setPipWindow(null);
      };
      win.addEventListener('pagehide', handleClose);
      win.addEventListener('beforeunload', handleClose);

      setPipWindow(win);
      setIsExpanded(false);
    } catch (err) {
      console.error('[PiP Error]', err);
    }
  };

  const closePipWindow = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  const recentMessages = messages.slice(-25);
  const lastMessage = messages[messages.length - 1];

  // Renderizador del contenido del chat (reutilizado tanto en burbuja integrada como en ventana PiP sobrepuesta)
  const renderChatBody = (inPip: boolean) => (
    <div className="flex flex-col h-full w-full bg-neural-950/95 text-slate-100 select-none">
      {/* Cabecera */}
      <div className="px-3.5 py-2.5 bg-neural-900 border-b border-neural-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan animate-pulse" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-white font-mono block truncate">
              #{currentRoomId}
            </span>
            <span className="text-[10px] text-slate-400">
              {inPip ? 'Sobrepuesto encima de tus apps (PiP)' : 'Burbuja flotante'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!inPip && (
            <button
              onClick={openPipWindow}
              className="p-1.5 rounded-lg text-neural-cyan hover:bg-neural-800 transition-colors"
              title="Sobreponer sobre las demás aplicaciones (Siempre visible en pantalla)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenFullChat && !inPip && (
            <button
              onClick={() => {
                setIsExpanded(false);
                onOpenFullChat();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neural-800 transition-colors"
              title="Abrir chat completo"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              if (inPip) {
                closePipWindow();
              } else {
                setIsExpanded(false);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neural-800 transition-colors"
            title="Cerrar / Minimizar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs bg-neural-950/60">
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
                <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold flex items-center gap-1">
                  {isMe ? 'Tú' : m.sender}
                  {m.role === 'admin' && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                  {m.role === 'mod' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded border border-purple-500/30">
                      MOD
                    </span>
                  )}
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input de envío rápido */}
      <form
        onSubmit={handleSend}
        className="p-2.5 bg-neural-900 border-t border-neural-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Escribir en #${currentRoomId}...`}
          className="flex-1 bg-neural-950 border border-neural-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neural-cyan"
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
  );

  return (
    <>
      {/* Si PiP está activo, se proyecta la UI en la ventana nativa sobrepuesta */}
      {pipWindow && createPortal(renderChatBody(true), pipWindow.document.body)}

      {/* Burbuja en la interfaz principal */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
        {/* Ventana flotante emergente dentro de la pestaña */}
        {isExpanded && !pipWindow && (
          <div className="mb-3 w-80 sm:w-96 h-[460px] bg-neural-900/95 border border-neural-750 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {renderChatBody(false)}
          </div>
        )}

        {/* Botón Circular Flotante (Burbuja) */}
        <button
          onClick={() => {
            if (pipWindow) {
              pipWindow.focus();
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`relative group w-13 h-13 p-3.5 rounded-full shadow-xl text-white hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20 flex items-center justify-center cursor-pointer ${
            pipWindow
              ? 'bg-gradient-to-tr from-emerald-600 to-neural-cyan shadow-cyan-500/30 animate-pulse'
              : 'bg-gradient-to-tr from-neural-purple to-neural-cyan shadow-purple-500/25'
          }`}
          title={
            pipWindow
              ? 'Chat sobrepuesto sobre tus apps activo (Clic para enfocar ventana)'
              : `Chat en vivo (#${currentRoomId}) - Clic para abrir`
          }
        >
          {pipWindow ? <Layers className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}

          {/* Contador de no leídos */}
          {unreadCount > 0 && !isExpanded && !pipWindow && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-neural-950 shadow-md animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Tooltip con preview del último mensaje si la burbuja está cerrada */}
          {!isExpanded && !pipWindow && lastMessage && lastMessage.text && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neural-900 border border-neural-800 shadow-xl whitespace-nowrap text-xs text-slate-200 pointer-events-none">
              <span className="font-semibold text-neural-cyan font-mono">
                #{currentRoomId}:
              </span>
              <span className="truncate max-w-[150px] text-slate-400">
                {lastMessage.text}
              </span>
            </div>
          )}

          {/* Tooltip cuando PiP está activo */}
          {pipWindow && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-800 shadow-xl whitespace-nowrap text-xs text-emerald-200 pointer-events-none">
              <span>Sobrepuesto encima de tus apps (PiP)</span>
            </div>
          )}
        </button>
      </div>
    </>
  );
};


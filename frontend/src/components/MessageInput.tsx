import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Loader2, HardDrive } from 'lucide-react';
import { REACTIONS } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendReaction: (reaction: string) => void;
  roomId: string;
  token?: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendReaction,
  roomId,
  token,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Manejo de subida de archivos a Google Drive
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        // El archivo se subió y el backend lo difundió por WebSocket automáticamente
      } else {
        let errorMsg = 'Error subiendo archivo. Por favor reintenta.';
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errorMsg = res.error;
        } catch {
          if (xhr.status === 413) {
            errorMsg = 'El archivo supera el tamaño permitido.';
          }
        }
        alert(errorMsg);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      alert('Error de conexión al subir archivo');
    };

    xhr.send(formData);
  };

  useEffect(() => {
    if (!disabled && window.matchMedia('(min-width: 768px)').matches) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <div className="shrink-0 p-2 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-neural-900 border-t border-neural-800 select-none">
      {/* Barra de progreso de subida a Google Drive */}
      {uploading && (
        <div className="mb-2 p-2 bg-neural-950 rounded-xl border border-neural-purple/40 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5 text-neural-cyan font-medium">
              <HardDrive className="w-3.5 h-3.5 animate-pulse" />
              Subiendo a Google Drive (5TB)...
            </span>
            <span className="font-mono text-purple-400 font-bold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-neural-850 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-neural-purple to-neural-cyan h-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Botonera de reacciones rápidas de directos */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 px-1 border-b border-neural-850/60 mb-1.5 sm:mb-2">
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
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

        <div className="flex items-center gap-1">
          {/* Botón para compartir archivos pesados (Drive) */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="p-1.5 rounded-xl bg-neural-950 text-slate-400 hover:text-neural-cyan hover:bg-neural-800 border border-neural-850 transition-colors disabled:opacity-50"
            title="Compartir archivo pesado (Google Drive 5TB)"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neural-cyan" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          {/* Selector de emojis */}
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
      </div>

      {/* Selector desplegable de emojis */}
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
            maxLength={400}
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

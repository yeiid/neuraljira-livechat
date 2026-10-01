import React, { useState } from 'react';
import { Users, Radio, Share2, Check, LogOut, Wifi, WifiOff } from 'lucide-react';
import { UserProfile } from '../types';
import { HostStreamControls } from './HostStreamControls';

interface HeaderProps {
  user: UserProfile;
  viewers: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  onLeave: () => void;
  // Propiedades de Live Streaming
  isStreaming?: boolean;
  onStartScreen?: () => void;
  onStartCamera?: () => void;
  onStopStream?: () => void;
  isMuted?: boolean;
  onToggleMic?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  viewers,
  connectionStatus,
  onLeave,
  isStreaming = false,
  onStartScreen,
  onStartCamera,
  onStopStream,
  isMuted,
  onToggleMic,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStream = user.role === 'host' || user.role === 'mod';

  return (
    <header className="h-16 px-4 bg-neural-900/90 backdrop-blur-md border-b border-neural-800 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Sala */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-neural-purple to-neural-cyan p-[2px] shadow-lg shadow-purple-500/10">
          <div className="w-full h-full bg-neural-950 rounded-[10px] flex items-center justify-center">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neural-purple to-neural-cyan text-lg">
              NJ
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
              NEURALJIRA
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse mr-1"></span>
                LIVE
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Radio className="w-3 h-3 text-neural-cyan" />
            <span className="font-mono text-slate-300 font-medium truncate max-w-[100px] sm:max-w-[160px]">
              #{user.roomId}
            </span>
          </div>
        </div>
      </div>

      {/* Viewers, Host Controls & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Botón de Transmisión para Host */}
        {canStream && onStartScreen && onStartCamera && onStopStream && (
          <HostStreamControls
            isStreaming={isStreaming}
            onStartScreen={onStartScreen}
            onStartCamera={onStartCamera}
            onStopStream={onStopStream}
            isMuted={isMuted}
            onToggleMic={onToggleMic}
          />
        )}

        {/* Contador de Espectadores */}
        <div className="flex items-center space-x-1.5 bg-neural-850 px-2.5 py-1.5 rounded-lg border border-neural-800 text-xs font-mono font-medium text-slate-200">
          <Users className="w-3.5 h-3.5 text-neural-cyan" />
          <span>{viewers}</span>
        </div>

        {/* Estado de conexión */}
        <div
          title={`Conexión: ${connectionStatus}`}
          className="flex items-center justify-center p-2 rounded-lg bg-neural-850 border border-neural-800"
        >
          {connectionStatus === 'connected' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : connectionStatus === 'reconnecting' || connectionStatus === 'connecting' ? (
            <Wifi className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>

        {/* Compartir enlace */}
        <button
          onClick={handleShare}
          className="p-2 rounded-lg bg-neural-850 hover:bg-neural-800 border border-neural-800 text-slate-300 hover:text-white transition-colors"
          title="Copiar enlace de la sala"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Salir / Cambiar sesión */}
        <button
          onClick={onLeave}
          className="p-2 rounded-lg bg-neural-850 hover:bg-rose-950/40 border border-neural-800 hover:border-rose-800/40 text-slate-400 hover:text-rose-400 transition-colors"
          title="Cerrar sesión / Salir"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

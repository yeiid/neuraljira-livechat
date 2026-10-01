import React, { useState } from 'react';
import { ScreenShare, Video, StopCircle, Mic, MicOff, Radio, ChevronDown } from 'lucide-react';

interface HostStreamControlsProps {
  isStreaming: boolean;
  onStartScreen: () => void;
  onStartCamera: () => void;
  onStopStream: () => void;
  isMuted?: boolean;
  onToggleMic?: () => void;
}

export const HostStreamControls: React.FC<HostStreamControlsProps> = ({
  isStreaming,
  onStartScreen,
  onStartCamera,
  onStopStream,
  isMuted = false,
  onToggleMic,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative select-none">
      {!isStreaming ? (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all active:scale-95"
            title="Emitir directo a los espectadores"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Transmitir</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 p-1.5 bg-neural-900 border border-neural-800 rounded-xl shadow-2xl z-50 animate-in fade-in">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-neural-800 mb-1">
                Elegir Fuente de Transmisión
              </div>

              {/* Opción Compartir Pantalla */}
              <button
                onClick={() => { setShowMenu(false); onStartScreen(); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neural-850 text-slate-200 hover:text-neural-cyan text-xs font-medium transition-colors text-left"
              >
                <ScreenShare className="w-4 h-4 text-neural-cyan shrink-0" />
                <div>
                  <div className="font-semibold">Compartir Pantalla</div>
                  <div className="text-[10px] text-slate-400">Pantalla de PC, ventana o app</div>
                </div>
              </button>

              {/* Opción Cámara Web */}
              <button
                onClick={() => { setShowMenu(false); onStartCamera(); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neural-850 text-slate-200 hover:text-neural-purple text-xs font-medium transition-colors text-left"
              >
                <Video className="w-4 h-4 text-neural-purple shrink-0" />
                <div>
                  <div className="font-semibold">Cámara Web</div>
                  <div className="text-[10px] text-slate-400">Cámara y micrófono directo</div>
                </div>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Controles activos durante la transmisión */
        <div className="flex items-center gap-1.5 bg-neural-850 px-2 py-1 rounded-xl border border-rose-500/30">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>

          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mr-1 hidden sm:inline">
            EN VIVO
          </span>

          {onToggleMic && (
            <button
              onClick={onToggleMic}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-neural-900 text-slate-300 hover:text-white border-neural-800'
              }`}
              title={isMuted ? 'Activar Micrófono' : 'Silenciar Micrófono'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onStopStream}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all"
            title="Finalizar transmisión"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Detener</span>
          </button>
        </div>
      )}
    </div>
  );
};

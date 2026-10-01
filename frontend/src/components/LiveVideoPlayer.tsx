import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Tv, Radio, Monitor } from 'lucide-react';

interface LiveVideoPlayerProps {
  stream: MediaStream | null;
  isLive: boolean;
  streamMode?: string;
  hostName?: string;
}

export const LiveVideoPlayer: React.FC<LiveVideoPlayerProps> = ({
  stream,
  isLive,
  streamMode = 'screen',
  hostName = 'Streamer',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsPiP, setSupportsPiP] = useState(false);

  useEffect(() => {
    if ('pictureInPictureEnabled' in document) {
      setSupportsPiP(true);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.log('[Video Play Error]', e));
    }
  }, [stream]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('[PiP Error]', err);
    }
  };

  if (!isLive) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-b-2xl sm:rounded-2xl overflow-hidden border-b sm:border border-neural-800 shadow-2xl shrink-0 group z-20"
    >
      {/* Elemento de Video WebRTC nativo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-contain bg-neural-950"
      />

      {/* Badges superiores de directo */}
      <div className="absolute top-3 left-3 flex items-center gap-2 select-none z-10">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600/90 text-white shadow-md animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>
          EN VIVO
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neural-900/80 backdrop-blur-md text-neural-cyan border border-neural-700/50">
          {streamMode === 'screen' ? <Monitor className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
          <span>{streamMode === 'screen' ? 'Pantalla de PC' : 'Cámara Web'}</span>
        </span>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-slate-300 backdrop-blur-sm">
          {hostName}
        </span>
      </div>

      {/* Barra de Controles flotante (aparece al pasar el cursor o hacer tap) */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none z-10">
        <div className="flex items-center gap-2">
          {/* Silenciar / Activar Audio */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            title={isMuted ? 'Activar Sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Picture-in-Picture */}
          {supportsPiP && (
            <button
              onClick={togglePiP}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              title="Ventana flotante (PiP)"
            >
              <Tv className="w-4 h-4" />
            </button>
          )}

          {/* Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

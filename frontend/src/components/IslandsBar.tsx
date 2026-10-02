import React, { useState, useEffect } from 'react';
import { Island, UserProfile } from '../types';
import {
  Terminal,
  GraduationCap,
  Globe,
  Hash,
  ShieldAlert,
  CreditCard,
  Key,
  Cpu,
  BookOpen,
  HelpCircle,
  Video,
  MessageSquare,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  Lock,
} from 'lucide-react';

interface IslandsBarProps {
  currentRoomId: string;
  onSelectChannel: (slug: string) => void;
  user: UserProfile | null;
  onOpenAdminModal?: () => void;
}

// Mapeo seguro de iconos dinámicos
const getIconComponent = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'terminal':
      return <Terminal className="w-3.5 h-3.5" />;
    case 'graduationcap':
      return <GraduationCap className="w-3.5 h-3.5" />;
    case 'globe':
      return <Globe className="w-3.5 h-3.5" />;
    case 'creditcard':
      return <CreditCard className="w-3 h-3" />;
    case 'key':
      return <Key className="w-3 h-3" />;
    case 'cpu':
      return <Cpu className="w-3 h-3" />;
    case 'shieldalert':
      return <ShieldAlert className="w-3 h-3" />;
    case 'bookopen':
      return <BookOpen className="w-3 h-3" />;
    case 'helpcircle':
      return <HelpCircle className="w-3 h-3" />;
    case 'video':
      return <Video className="w-3 h-3" />;
    case 'messagesquare':
      return <MessageSquare className="w-3 h-3" />;
    case 'sparkles':
      return <Sparkles className="w-3 h-3" />;
    default:
      return <Hash className="w-3 h-3" />;
  }
};

export const IslandsBar: React.FC<IslandsBarProps> = ({
  currentRoomId,
  onSelectChannel,
  user,
  onOpenAdminModal,
}) => {
  const [islands, setIslands] = useState<Island[]>([]);
  const [selectedIslandId, setSelectedIslandId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchIslands = async () => {
    try {
      const res = await fetch('/api/islands');
      if (res.ok) {
        const data: Island[] = await res.json();
        setIslands(data);

        // Encontrar en qué isla está el canal actual
        let currentIsland = data.find((isl) =>
          isl.channels.some((ch) => ch.slug === currentRoomId)
        );

        if (!currentIsland && data.length > 0) {
          currentIsland = data[0];
        }

        if (currentIsland) {
          setSelectedIslandId((prev) => (prev ? prev : currentIsland.id));
        }
      }
    } catch (e) {
      console.error('[IslandsBar] Error cargando islas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIslands();
    const interval = setInterval(fetchIslands, 15000); // Refrescar espectadores cada 15s
    return () => clearInterval(interval);
  }, [currentRoomId]);

  // Si cambia currentRoomId externamente, sincronizar la isla seleccionada
  useEffect(() => {
    const parentIsland = islands.find((isl) =>
      isl.channels.some((ch) => ch.slug === currentRoomId)
    );
    if (parentIsland && parentIsland.id !== selectedIslandId) {
      setSelectedIslandId(parentIsland.id);
    }
  }, [currentRoomId, islands]);

  const activeIsland = islands.find((isl) => isl.id === selectedIslandId) || islands[0];
  const isAdmin = user?.role === 'admin';

  if (loading && islands.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-slate-500 animate-pulse flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        <span>Cargando islas de chat...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-neural-950/90 border-b border-neural-850 backdrop-blur-md px-3 py-2 gap-1.5 z-20">
      {/* 1. Selector de Islas Superiores */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0 pl-0.5">
            <Layers className="w-3 h-3 text-neural-cyan" />
            Islas
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {islands.map((island) => {
              const isSelected = island.id === activeIsland?.id;
              const hasActiveChannel = island.channels.some((c) => c.slug === currentRoomId);

              return (
                <button
                  key={island.id}
                  onClick={() => setSelectedIslandId(island.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-r from-neural-purple/30 to-neural-cyan/30 text-white border border-neural-cyan/40 shadow-sm shadow-neural-cyan/10'
                      : 'bg-neural-900/80 text-slate-400 hover:text-slate-200 hover:bg-neural-850 border border-neural-800/80'
                  }`}
                >
                  <span className={isSelected ? 'text-neural-cyan' : 'text-slate-400'}>
                    {getIconComponent(island.icon)}
                  </span>
                  <span>{island.name}</span>
                  {hasActiveChannel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan shadow-sm shadow-neural-cyan animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón de Administración para Super Admins */}
        {onOpenAdminModal && (
          <button
            onClick={onOpenAdminModal}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 shrink-0 transition-colors ${
              isAdmin
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-neural-900 border-neural-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isAdmin ? 'Panel de Super Admin' : 'Reclamar Super Admin'}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Admin Key'}</span>
          </button>
        )}
      </div>

      {/* 2. Sub-barra de Canales de la Isla Activa */}
      {activeIsland && activeIsland.channels && activeIsland.channels.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-0.5">
            <ChevronRight className="w-3 h-3 text-slate-600" />
            {activeIsland.name}:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {activeIsland.channels.map((channel) => {
              const isCurrent = channel.slug === currentRoomId;
              const isLocked =
                (channel.minRole === 'admin' && user?.role !== 'admin') ||
                (channel.minRole === 'mod' && user?.role !== 'admin' && user?.role !== 'mod');

              return (
                <button
                  key={channel.id}
                  disabled={isLocked}
                  onClick={() => onSelectChannel(channel.slug)}
                  title={isLocked ? `Canal restringido (${channel.minRole})` : channel.description}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-all whitespace-nowrap ${
                    isCurrent
                      ? 'bg-neural-cyan/20 text-neural-cyan border border-neural-cyan/40 font-bold'
                      : isLocked
                      ? 'opacity-40 bg-neural-900/50 text-slate-600 border border-neural-900 cursor-not-allowed'
                      : 'bg-neural-900/60 text-slate-400 hover:text-slate-200 hover:bg-neural-850 border border-neural-800'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="w-2.5 h-2.5 text-rose-400" />
                  ) : (
                    <span>#</span>
                  )}
                  <span>{channel.name}</span>

                  {/* Indicador de transmisión en vivo o espectadores */}
                  {channel.isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                  {typeof channel.liveViewers === 'number' && channel.liveViewers > 0 && (
                    <span className="text-[9px] px-1 rounded bg-black/40 text-slate-400 font-sans">
                      {channel.liveViewers}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

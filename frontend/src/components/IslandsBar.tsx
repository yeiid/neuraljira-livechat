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
  Plus,
  Edit3,
  X,
  Check,
  Pin,
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

  // Estados para moderador agregando información / anuncios al canal (estilo Telegram)
  const [showModInfoModal, setShowModInfoModal] = useState(false);
  const [modTab, setModTab] = useState<'announcement' | 'topic'>('announcement');
  const [modInputText, setModInputText] = useState('');
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);
  const [modStatusMsg, setModStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
  const currentChannel = activeIsland?.channels?.find((ch) => ch.slug === currentRoomId);
  const isAdmin = user?.role === 'admin';
  const isModOrAdmin = user?.role === 'admin' || user?.role === 'mod';

  const handleModSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modInputText.trim() || !user?.token || !currentRoomId) return;
    setIsSubmittingMod(true);
    setModStatusMsg(null);

    try {
      if (modTab === 'announcement') {
        const res = await fetch(`/api/channels/${encodeURIComponent(currentRoomId)}/announcement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ text: modInputText.trim() }),
        });
        if (res.ok) {
          setModStatusMsg({ ok: true, text: '¡Información publicada en el chat!' });
          setTimeout(() => {
            setShowModInfoModal(false);
            setModInputText('');
            setModStatusMsg(null);
          }, 1000);
        } else {
          const err = await res.json();
          setModStatusMsg({ ok: false, text: err.error || 'Error al publicar' });
        }
      } else {
        const res = await fetch(`/api/channels/${encodeURIComponent(currentRoomId)}/topic`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ description: modInputText.trim() }),
        });
        if (res.ok) {
          setModStatusMsg({ ok: true, text: '¡Tema del canal actualizado!' });
          fetchIslands();
          setTimeout(() => {
            setShowModInfoModal(false);
            setModInputText('');
            setModStatusMsg(null);
          }, 1000);
        } else {
          const err = await res.json();
          setModStatusMsg({ ok: false, text: err.error || 'Error al actualizar tema' });
        }
      }
    } catch (e) {
      setModStatusMsg({ ok: false, text: 'Error de conexión con el servidor' });
    } finally {
      setIsSubmittingMod(false);
    }
  };

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

      {/* 3. Tópico e Información del Canal (Estilo Telegram Grupos/Temas) */}
      {currentChannel && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-neural-900/40 rounded-lg border border-neural-850/80 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-amber-400 font-bold flex items-center gap-1 shrink-0 text-[11px]">
              📌
            </span>
            <div className="truncate text-[11px] text-slate-300">
              <span className="font-semibold text-neural-cyan font-mono mr-1.5">
                #{currentChannel.name}
              </span>
              <span className="text-slate-400">
                {currentChannel.description || 'Tema oficial de discusión e intercambio técnico.'}
              </span>
            </div>
          </div>

          {isModOrAdmin && (
            <button
              onClick={() => {
                setShowModInfoModal(true);
                setModInputText(modTab === 'topic' ? currentChannel.description || '' : '');
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
              title="Agregar información o fijar anuncio como moderador"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir Info</span>
            </button>
          )}
        </div>
      )}

      {/* Modal para que el Moderador publique información o edite el tema */}
      {showModInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-neural-900 border border-neural-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-neural-800 flex items-center justify-between bg-neural-950/60">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-neural-cyan" />
                <h3 className="text-xs font-bold text-white">
                  Moderación: #{currentChannel?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowModInfoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-neural-800 px-4 bg-neural-950/30">
              <button
                type="button"
                onClick={() => {
                  setModTab('announcement');
                  setModInputText('');
                }}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  modTab === 'announcement'
                    ? 'border-neural-cyan text-neural-cyan'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Publicar Info / Anuncio
              </button>
              <button
                type="button"
                onClick={() => {
                  setModTab('topic');
                  setModInputText(currentChannel?.description || '');
                }}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  modTab === 'topic'
                    ? 'border-neural-cyan text-neural-cyan'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Editar Descripción del Tema
              </button>
            </div>

            <form onSubmit={handleModSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {modTab === 'announcement'
                    ? 'Información o notas técnicas que se publicarán en el chat:'
                    : 'Descripción o reglas del canal (Tema):'}
                </label>
                <textarea
                  value={modInputText}
                  onChange={(e) => setModInputText(e.target.value)}
                  placeholder={
                    modTab === 'announcement'
                      ? 'Escribe recursos, enlaces, comandos o avisos oficiales...'
                      : 'Breve descripción o temática de este canal...'
                  }
                  rows={4}
                  required
                  className="w-full bg-neural-950 border border-neural-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-neural-cyan"
                />
              </div>

              {modStatusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    modStatusMsg.ok
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {modStatusMsg.ok ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{modStatusMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModInfoModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-neural-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMod}
                  className="px-4 py-1.5 bg-gradient-to-r from-neural-purple to-neural-cyan text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmittingMod ? 'Guardando...' : 'Guardar y Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

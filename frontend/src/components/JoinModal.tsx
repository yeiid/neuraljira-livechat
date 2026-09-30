import React, { useState } from 'react';
import { Sparkles, Radio, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { UserProfile, AVATARS, UserRole } from '../types';

interface JoinModalProps {
  initialRoomId: string;
  onJoin: (profile: UserProfile) => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ initialRoomId, onJoin }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [roomId, setRoomId] = useState(initialRoomId || 'general');
  const [role, setRole] = useState<UserRole>('viewer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    onJoin({
      username: username.trim(),
      avatar: selectedAvatar,
      role,
      roomId: roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'general',
    });
  };

  const handleRandomName = () => {
    const prefixes = ['Neo', 'Cyber', 'Neural', 'Quantum', 'Pixel', 'Aura', 'Byte', 'Vortex'];
    const suffixes = ['Runner', 'Coder', 'Hacker', 'Pilot', 'Surfer', 'Mind', 'Spark', 'Flow'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    setUsername(`${p}${s}${num}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neural-950/80 backdrop-blur-md">
      <div className="w-full max-w-md p-6 bg-neural-900 border border-neural-800 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-neural-purple/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-neural-cyan/20 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-neural-purple to-neural-cyan p-[2px] mb-3 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-neural-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-7 h-7 text-neural-cyan" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Unirse a <span className="text-transparent bg-clip-text bg-gradient-to-r from-neural-purple to-neural-cyan">Neuraljira</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Chat en vivo ultra rápido para directos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Sala de chat */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-neural-cyan" />
              Sala de Directo
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">#</span>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ej: live-ia, general, lanzamientos"
                required
                className="w-full pl-8 pr-4 py-2.5 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all"
              />
            </div>
          </div>

          {/* Nickname */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tu Nickname
              </label>
              <button
                type="button"
                onClick={handleRandomName}
                className="text-xs text-neural-cyan hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Aleatorio
              </button>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="¿Cómo te llamas en el live?"
              maxLength={24}
              required
              autoFocus
              className="w-full px-4 py-2.5 bg-neural-950 border border-neural-800 focus:border-neural-purple rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-purple transition-all"
            />
          </div>

          {/* Selector de Avatar */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Elige tu Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`h-12 rounded-xl flex items-center justify-center text-xl transition-all relative ${
                      isSelected
                        ? 'bg-gradient-to-tr ' + av.color + ' ring-2 ring-white scale-105 shadow-md'
                        : 'bg-neural-850 hover:bg-neural-800 text-slate-300 border border-neural-850'
                    }`}
                    title={av.name}
                  >
                    <span>{av.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rol (opcional para pruebas de moderación/host) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neural-purple" />
              Rol en el chat
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(['viewer', 'vip', 'mod', 'host'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-1.5 px-2 rounded-lg font-mono uppercase tracking-wider font-semibold border transition-all ${
                    role === r
                      ? 'bg-neural-purple/20 text-neural-cyan border-neural-purple shadow-sm'
                      : 'bg-neural-950 text-slate-500 border-neural-850 hover:text-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Botón de Entrada */}
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-neural-purple to-neural-cyan hover:from-purple-600 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <span>Entrar al Directo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

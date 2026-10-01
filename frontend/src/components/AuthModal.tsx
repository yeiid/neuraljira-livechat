import React, { useState } from 'react';
import { Sparkles, Lock, User, ShieldCheck, Zap, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { UserProfile, AVATARS, UserRole } from '../types';

interface AuthModalProps {
  initialRoomId: string;
  onSuccess: (profile: UserProfile) => void;
  onContinueAsGuest: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialRoomId,
  onSuccess,
  onContinueAsGuest,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [roomId, setRoomId] = useState(initialRoomId || 'general');

  // Formulario Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Formulario Registro
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAvatar, setRegAvatar] = useState(AVATARS[0].id);
  const [regRole, setRegRole] = useState<UserRole>('viewer');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manejo de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      onSuccess({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar,
        role: data.user.role,
        token: data.token,
        roomId: roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'general',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          avatar: regAvatar,
          role: regRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      onSuccess({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar,
        role: data.user.role,
        token: data.token,
        roomId: roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'general',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Continuar como invitado rápido
  const handleGuestQuick = () => {
    const randomGuest = `Guest_${Math.floor(Math.random() * 9000 + 1000)}`;
    onContinueAsGuest({
      username: randomGuest,
      avatar: regAvatar,
      role: 'viewer',
      roomId: roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'general',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neural-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md my-8 p-6 bg-neural-900 border border-neural-800 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-neural-purple/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-neural-cyan/20 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="text-center mb-5 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-neural-purple to-neural-cyan p-[2px] mb-2 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-neural-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-neural-cyan" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neural-purple to-neural-cyan">
              Neuraljira Live
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming de Ultra Baja Latencia & Chat en Vivo
          </p>
        </div>

        {/* Selector de Sala */}
        <div className="mb-4 relative z-10">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-neural-cyan" />
            Sala de Directo
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">#</span>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="general, lanzamientos, live-ia"
              className="w-full pl-7 pr-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all"
            />
          </div>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neural-950 rounded-xl border border-neural-800 mb-4 relative z-10">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'login'
                ? 'bg-neural-800 text-white shadow-sm border border-neural-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'register'
                ? 'bg-neural-purple/20 text-neural-cyan shadow-sm border border-neural-purple/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear Cuenta
          </button>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 relative z-10 animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Formulario LOGIN */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3 relative z-10">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Usuario o Correo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="tu_usuario o tu@correo.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-purple rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-purple transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-purple rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-purple transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !loginPassword}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-neural-purple to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          /* Formulario REGISTRO */
          <form onSubmit={handleRegisterSubmit} className="space-y-3 relative z-10">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="ej: neo_stream"
                  maxLength={24}
                  required
                  className="w-full px-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Correo
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                className="w-full px-3 py-2 bg-neural-950 border border-neural-800 focus:border-neural-cyan rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-neural-cyan transition-all"
              />
            </div>

            {/* Selector de Avatar */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Elige tu Avatar
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setRegAvatar(av.id)}
                    className={`h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      regAvatar === av.id
                        ? 'bg-gradient-to-tr ' + av.color + ' ring-2 ring-white scale-105 shadow-md'
                        : 'bg-neural-950 hover:bg-neural-850 text-slate-300 border border-neural-850'
                    }`}
                    title={av.name}
                  >
                    <span>{av.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-neural-cyan" />
                Rol en la plataforma
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {(['viewer', 'vip', 'mod', 'host'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegRole(r)}
                    className={`py-1 rounded-lg font-mono uppercase tracking-wider font-semibold border transition-all ${
                      regRole === r
                        ? 'bg-neural-cyan/20 text-neural-cyan border-neural-cyan shadow-sm'
                        : 'bg-neural-950 text-slate-500 border-neural-850 hover:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !regUsername || !regEmail || regPassword.length < 6}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-neural-cyan to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <span>{loading ? 'Creando cuenta...' : 'Crear Cuenta e Ingresar'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Separador o Invitado rápido */}
        <div className="mt-4 pt-3 border-t border-neural-800 text-center relative z-10">
          <button
            type="button"
            onClick={handleGuestQuick}
            className="text-xs text-slate-400 hover:text-white transition-colors underline"
          >
            Continuar como invitado sin cuenta →
          </button>
        </div>
      </div>
    </div>
  );
};

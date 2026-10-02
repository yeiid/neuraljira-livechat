import React, { useState, useEffect } from 'react';
import { UserProfile, Island, UserRole } from '../types';
import {
  Shield,
  Users,
  Layers,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  KeyRound,
  Hash,
} from 'lucide-react';

interface AdminModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (updated: UserProfile) => void;
  onIslandsUpdated?: () => void;
}

interface UserListItem {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: UserRole;
  createdAt: string;
}

export const AdminModerationModal: React.FC<AdminModerationModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onIslandsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'islands' | 'secret'>(
    user.role === 'admin' ? 'users' : 'secret'
  );

  // Estados para lista de usuarios
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Estados para gestión de islas
  const [islands, setIslands] = useState<Island[]>([]);
  const [newIslandName, setNewIslandName] = useState('');
  const [newIslandIcon, setNewIslandIcon] = useState('Terminal');
  const [newIslandDesc, setNewIslandDesc] = useState('');

  // Estados para creación de canal
  const [selectedIslandForChannel, setSelectedIslandForChannel] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelSlug, setNewChannelSlug] = useState('');
  const [newChannelRole, setNewChannelRole] = useState<UserRole>('viewer');

  // Estados para reclamo de Super Admin
  const [adminSecretInput, setAdminSecretInput] = useState('');
  const [claimStatus, setClaimStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user.role === 'admin';

  // Cargar usuarios
  const loadUsers = async () => {
    if (!isAdmin || !user.token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Cargar islas
  const loadIslands = async () => {
    try {
      const res = await fetch('/api/islands');
      if (res.ok) {
        const data = await res.json();
        setIslands(data);
        if (data.length > 0 && !selectedIslandForChannel) {
          setSelectedIslandForChannel(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        loadUsers();
        loadIslands();
      } else {
        setActiveTab('secret');
      }
    }
  }, [isOpen, isAdmin]);

  // Cambiar rol de usuario
  const handleChangeRole = async (targetUserId: string, newRole: UserRole) => {
    if (!user.token) return;
    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ userId: targetUserId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reclamar Super Admin con Clave Maestra
  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecretInput.trim() || !user.token) return;
    setIsSubmitting(true);
    setClaimStatus(null);

    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ secret: adminSecretInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setClaimStatus({ ok: true, msg: '¡Privilegios de Super Admin activados!' });
        const updatedProfile: UserProfile = {
          ...user,
          role: 'admin',
          token: data.token,
        };
        onUserUpdated(updatedProfile);
        setActiveTab('users');
      } else {
        setClaimStatus({ ok: false, msg: data.error || 'Clave maestra inválida' });
      }
    } catch (err) {
      setClaimStatus({ ok: false, msg: 'Error al contactar con el servidor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Crear nueva Isla
  const handleCreateIsland = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIslandName.trim() || !user.token) return;

    try {
      const res = await fetch('/api/islands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: newIslandName.trim(),
          icon: newIslandIcon,
          description: newIslandDesc.trim(),
        }),
      });

      if (res.ok) {
        setNewIslandName('');
        setNewIslandDesc('');
        loadIslands();
        onIslandsUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Eliminar Isla
  const handleDeleteIsland = async (islandId: string) => {
    if (!window.confirm('¿Eliminar esta isla y todos sus canales?') || !user.token) return;
    try {
      const res = await fetch(`/api/islands/${islandId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        loadIslands();
        onIslandsUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Crear Canal
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !selectedIslandForChannel || !user.token) return;

    try {
      const res = await fetch(`/api/islands/${selectedIslandForChannel}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          slug: newChannelSlug.trim() || undefined,
          minRole: newChannelRole,
        }),
      });

      if (res.ok) {
        setNewChannelName('');
        setNewChannelSlug('');
        loadIslands();
        onIslandsUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Eliminar Canal
  const handleDeleteChannel = async (channelId: string) => {
    if (!window.confirm('¿Eliminar este canal de chat?') || !user.token) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        loadIslands();
        onIslandsUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-neural-900 border border-neural-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-neural-800 flex items-center justify-between bg-neural-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Panel de Super Admin y Moderación
                {isAdmin && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Super Admin Activo
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Gestiona islas temáticas, canales de chat y permisos de moderación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neural-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-neural-800 px-5 bg-neural-950/30">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'users'
                    ? 'border-neural-cyan text-neural-cyan'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuarios y Roles</span>
              </button>
              <button
                onClick={() => setActiveTab('islands')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'islands'
                    ? 'border-neural-cyan text-neural-cyan'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Islas y Canales</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('secret')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'secret'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Clave Maestra</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: GESTIÓN DE USUARIOS Y ROLES */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Buscar por usuario o correo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="flex-1 bg-neural-950 border border-neural-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neural-cyan"
                />
                <button
                  onClick={loadUsers}
                  className="px-3 py-2 bg-neural-800 hover:bg-neural-750 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
                >
                  Refrescar
                </button>
              </div>

              {loadingUsers ? (
                <div className="text-center py-8 text-xs text-slate-500">Cargando usuarios...</div>
              ) : (
                <div className="border border-neural-800 rounded-xl overflow-hidden divide-y divide-neural-850">
                  {filteredUsers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-neural-850/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">
                              {u.username}
                            </span>
                            {u.id === user.id && (
                              <span className="text-[10px] text-neural-cyan bg-neural-cyan/10 px-1.5 py-0.5 rounded">
                                Tú
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {u.email}
                          </span>
                        </div>

                        {/* Selector de rol */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={u.role}
                            disabled={u.id === user.id}
                            onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                            className="bg-neural-950 border border-neural-750 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-neural-cyan cursor-pointer"
                          >
                            <option value="viewer">Viewer (Normal)</option>
                            <option value="vip">⭐ VIP</option>
                            <option value="mod">🛡️ Moderador</option>
                            <option value="host">🎥 Streamer/Host</option>
                            <option value="admin">👑 Super Admin</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GESTIÓN DE ISLAS Y CANALES */}
          {activeTab === 'islands' && isAdmin && (
            <div className="space-y-6">
              {/* Formulario Crear Isla */}
              <div className="bg-neural-950/60 border border-neural-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-neural-cyan" />
                  Crear Nueva Isla (Categoría)
                </h3>
                <form onSubmit={handleCreateIsland} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Gaming, Python)"
                    value={newIslandName}
                    onChange={(e) => setNewIslandName(e.target.value)}
                    required
                    className="bg-neural-900 border border-neural-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan"
                  />
                  <select
                    value={newIslandIcon}
                    onChange={(e) => setNewIslandIcon(e.target.value)}
                    className="bg-neural-900 border border-neural-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan"
                  >
                    <option value="Terminal">Terminal (Hacking/Dev)</option>
                    <option value="GraduationCap">GraduationCap (Cursos)</option>
                    <option value="Globe">Globe (General)</option>
                    <option value="Cpu">Cpu (Hardware/Tech)</option>
                    <option value="Sparkles">Sparkles (Creatividad)</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-neural-purple hover:bg-neural-purple/80 text-white rounded-lg text-xs font-bold py-1.5 transition-colors"
                  >
                    + Agregar Isla
                  </button>
                </form>
              </div>

              {/* Formulario Crear Canal */}
              <div className="bg-neural-950/60 border border-neural-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-neural-cyan" />
                  Crear Canal en una Isla
                </h3>
                <form onSubmit={handleCreateChannel} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={selectedIslandForChannel}
                    onChange={(e) => setSelectedIslandForChannel(e.target.value)}
                    className="bg-neural-900 border border-neural-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan"
                  >
                    {islands.map((isl) => (
                      <option key={isl.id} value={isl.id}>
                        {isl.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Nombre (ej. exploits)"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    required
                    className="bg-neural-900 border border-neural-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan"
                  />
                  <select
                    value={newChannelRole}
                    onChange={(e) => setNewChannelRole(e.target.value as UserRole)}
                    className="bg-neural-900 border border-neural-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan"
                  >
                    <option value="viewer">Público (Todos)</option>
                    <option value="mod">Sólo Moderadores</option>
                    <option value="admin">Sólo Super Admins</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-neural-cyan/20 border border-neural-cyan/40 hover:bg-neural-cyan/30 text-neural-cyan rounded-lg text-xs font-bold py-1.5 transition-colors"
                  >
                    + Agregar Canal
                  </button>
                </form>
              </div>

              {/* Lista actual de islas y sus canales */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Islas y Canales Existentes
                </h3>
                <div className="space-y-3">
                  {islands.map((isl) => (
                    <div
                      key={isl.id}
                      className="bg-neural-950 border border-neural-800 rounded-xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{isl.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({isl.channels?.length || 0} canales)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteIsland(isl.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Eliminar Isla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Canales dentro de la isla */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {isl.channels?.map((ch) => (
                          <div
                            key={ch.id}
                            className="flex items-center gap-1.5 bg-neural-900 border border-neural-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono"
                          >
                            <span>#{ch.name}</span>
                            {ch.minRole !== 'viewer' && (
                              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {ch.minRole}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteChannel(ch.id)}
                              className="text-slate-500 hover:text-rose-400 ml-1"
                              title="Eliminar Canal"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLAVE MAESTRA / RECLAMAR SUPER ADMIN */}
          {activeTab === 'secret' && (
            <div className="space-y-4 max-w-md mx-auto py-4">
              <div className="bg-neural-950 border border-neural-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Reclamar Super Admin</h3>
                    <p className="text-xs text-slate-400">
                      Introduce la clave maestra configurada en el servidor para obtener control total de la plataforma.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleClaimAdmin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Clave Maestra (ADMIN_SECRET)
                    </label>
                    <input
                      type="password"
                      placeholder="neuraladmin2026"
                      value={adminSecretInput}
                      onChange={(e) => setAdminSecretInput(e.target.value)}
                      required
                      className="w-full bg-neural-900 border border-neural-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {claimStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        claimStatus.ok
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {claimStatus.ok ? (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{claimStatus.msg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Verificando clave...' : 'Reclamar Rol de Super Admin'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

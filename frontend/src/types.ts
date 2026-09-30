export type EventType =
  | 'chat'
  | 'reaction'
  | 'presence'
  | 'system'
  | 'history'
  | 'user_join'
  | 'user_leave';

export type UserRole = 'host' | 'mod' | 'vip' | 'viewer';

export interface ChatMessage {
  id: string;
  type: EventType;
  roomId: string;
  sender?: string;
  avatar?: string;
  role?: UserRole;
  text?: string;
  reaction?: string;
  count?: number;
  createdAt: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  left: number; // Porcentaje horizontal para variedad visual
}

export interface UserProfile {
  username: string;
  avatar: string;
  role: UserRole;
  roomId: string;
}

export const AVATARS = [
  { id: 'cyber-1', emoji: '🤖', name: 'Nexus', color: 'from-purple-500 to-indigo-600' },
  { id: 'cyber-2', emoji: '⚡', name: 'Spark', color: 'from-cyan-400 to-blue-600' },
  { id: 'cyber-3', emoji: '🦊', name: 'Vulpis', color: 'from-amber-400 to-orange-600' },
  { id: 'cyber-4', emoji: '🔮', name: 'Oracle', color: 'from-pink-500 to-purple-600' },
  { id: 'cyber-5', emoji: '🧬', name: 'Helix', color: 'from-emerald-400 to-teal-600' },
  { id: 'cyber-6', emoji: '👑', name: 'Prime', color: 'from-rose-500 to-red-600' },
];

export const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'Amor' },
  { type: 'fire', emoji: '🔥', label: 'Fuego' },
  { type: 'rocket', emoji: '🚀', label: 'Despegue' },
  { type: 'clap', emoji: '👏', label: 'Aplauso' },
  { type: 'bulb', emoji: '💡', label: 'Idea' },
  { type: '100', emoji: '💯', label: 'Top' },
];

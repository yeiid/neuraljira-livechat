export type EventType =
  | 'chat'
  | 'reaction'
  | 'presence'
  | 'system'
  | 'history'
  | 'user_join'
  | 'user_leave'
  | 'file'
  | 'webrtc_offer'
  | 'webrtc_answer'
  | 'webrtc_candidate'
  | 'stream_start'
  | 'stream_stop'
  | 'stream_status';

export type UserRole = 'host' | 'mod' | 'vip' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: UserRole;
  createdAt?: string;
}

export interface Attachment {
  id: string;
  messageId?: string;
  userId: string;
  senderName?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  driveFileId: string;
  viewLink: string;
  downloadLink: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  type: EventType;
  roomId: string;
  userId?: string;
  sender?: string;
  avatar?: string;
  role?: UserRole;
  text?: string;
  reaction?: string;
  count?: number;
  attachment?: Attachment;
  payload?: string; // Para señales SDP / ICE de WebRTC
  createdAt: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  left: number;
}

// ============ RED SOCIAL ============
export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text?: string;
  mediaUrl?: string;
  mediaType: string;
  views: number;
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  userId: string;
  username: string;
  avatar: string;
  items: StoryItem[];
}

export interface SocialProfile {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
  createdAt: string;
  postsCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface UserProfile {
  id?: string;
  username: string;
  email?: string;
  avatar: string;
  role: UserRole;
  token?: string;
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

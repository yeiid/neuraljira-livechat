import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SocialProfile, SocialPost, UserProfile } from '../types';
import { FollowButton } from './FollowButton';

interface Props {
  userId: string;
  currentUser: UserProfile | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ userId, currentUser, onClose }) => {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (currentUser?.token) headers['Authorization'] = `Bearer ${currentUser.token}`;
    fetch(`/api/social/users/${encodeURIComponent(userId)}/profile`, { headers })
      .then((r) => r.json())
      .then((d) => { if (d.id) setProfile(d); });
    fetch(`/api/social/users/${encodeURIComponent(userId)}/posts?limit=10`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []));
  }, [userId, currentUser?.token]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-neural-900 border border-neural-700 rounded-2xl p-5 relative max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        {!profile ? (
          <div className="text-xs text-slate-400 py-8 text-center">Cargando perfil...</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-neural-purple to-neural-cyan flex items-center justify-center text-2xl shrink-0">
                {profile.avatar?.startsWith('cyber') ? '🤖' : profile.avatar || '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white">@{profile.username}</div>
                <div className="text-[11px] text-slate-500 font-mono uppercase">{profile.role}</div>
              </div>
              <FollowButton targetUserId={profile.id} currentUser={currentUser} onChange={() => {}} />
            </div>
            <div className="flex gap-4 mt-4 text-center">
              <div><div className="font-bold text-white font-mono">{profile.postsCount}</div><div className="text-[10px] text-slate-500 uppercase">posts</div></div>
              <div><div className="font-bold text-white font-mono">{profile.followers}</div><div className="text-[10px] text-slate-500 uppercase">seguidores</div></div>
              <div><div className="font-bold text-white font-mono">{profile.following}</div><div className="text-[10px] text-slate-500 uppercase">seguidos</div></div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Últimos posts</div>
              {posts.map((p) => (
                <div key={p.id} className="text-xs bg-neural-950 border border-neural-850 rounded-lg p-2.5">
                  <div className="text-slate-100 whitespace-pre-wrap break-words">{p.text}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">♥ {p.likeCount} · 💬 {p.commentCount} · {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
              {posts.length === 0 && <div className="text-[11px] text-slate-500">Sin posts aún.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

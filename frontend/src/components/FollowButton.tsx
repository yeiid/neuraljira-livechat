import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface Props {
  targetUserId: string;
  currentUser: UserProfile | null;
  compact?: boolean;
  onChange?: (following: boolean) => void;
}

export const FollowButton: React.FC<Props> = ({ targetUserId, currentUser, compact, onChange }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSelf = currentUser?.id === targetUserId;

  useEffect(() => {
    if (!currentUser?.token || isSelf) return;
    fetch(`/api/social/follow/status/${targetUserId}`, {
      headers: { Authorization: `Bearer ${currentUser.token}` },
    })
      .then((r) => r.json())
      .then((d) => setIsFollowing(!!d.isFollowing))
      .catch(() => {});
  }, [targetUserId, currentUser?.token, isSelf]);

  if (!currentUser?.token || isSelf) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/social/follow/${targetUserId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      if (res.ok) {
        const next = !isFollowing;
        setIsFollowing(next);
        onChange?.(next);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-lg font-semibold transition-all disabled:opacity-40 ${
        isFollowing
          ? 'bg-neural-800 text-slate-300 border border-neural-700'
          : 'bg-gradient-to-r from-neural-purple to-neural-cyan text-white'
      }`}
    >
      {busy ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
    </button>
  );
};

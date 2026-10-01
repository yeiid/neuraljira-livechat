import { useState, useEffect, useCallback } from 'react';
import { StoryGroup, UserProfile } from '../types';

export function useStories(user: UserProfile | null) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/stories/feed');
      const data = await res.json();
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createStory = useCallback(async (text: string, mediaUrl?: string, mediaType?: string) => {
    const res = await fetch('/api/social/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      },
      body: JSON.stringify({ text, mediaUrl, mediaType: mediaType || 'image' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo publicar story');
    }
    await load();
  }, [user?.token, load]);

  const viewStory = useCallback(async (id: string) => {
    await fetch(`/api/social/stories/${id}/view`, { method: 'POST' }).catch(() => {});
  }, []);

  return { groups, loading, reload: load, createStory, viewStory };
}

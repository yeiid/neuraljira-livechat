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

  const deleteStory = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/social/stories/${id}`, {
        method: 'DELETE',
        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
      });
      if (res.ok) {
        await load();
      }
    },
    [user?.token, load]
  );

  useEffect(() => {
    load();
    const handleStoryUpdate = () => {
      load();
    };
    window.addEventListener('neuraljira_story_update', handleStoryUpdate);

    // Sondeo suave cada 45 segundos para renovar expiradas
    const interval = setInterval(load, 45000);

    return () => {
      window.removeEventListener('neuraljira_story_update', handleStoryUpdate);
      clearInterval(interval);
    };
  }, [load]);

  const createStory = useCallback(
    async (text: string, mediaUrl?: string, mediaType?: string) => {
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
      window.dispatchEvent(new CustomEvent('neuraljira_story_update'));
    },
    [user?.token, load]
  );

  const viewStory = useCallback(async (id: string) => {
    await fetch(`/api/social/stories/${id}/view`, { method: 'POST' }).catch(() => {});
  }, []);

  return { groups, loading, reload: load, createStory, deleteStory, viewStory };
}

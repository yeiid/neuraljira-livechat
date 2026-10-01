import { useState, useEffect, useCallback } from 'react';
import { SocialPost, SocialComment, UserProfile } from '../types';

function authHeaders(user: UserProfile | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user?.token) h['Authorization'] = `Bearer ${user.token}`;
  return h;
}

export function useSocialFeed(user: UserProfile | null) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const off = reset ? 0 : offset;
      const res = await fetch(`/api/social/feed?filter=${filter}&limit=${limit}&offset=${off}`, {
        headers: authHeaders(user),
      });
      const data = await res.json();
      const list: SocialPost[] = data.posts || [];
      setPosts((prev) => (reset ? list : [...prev, ...list]));
      setOffset(off + list.length);
    } catch (e) {
      console.error('[Social] feed error', e);
    } finally {
      setLoading(false);
    }
  }, [filter, offset, user?.token]);

  useEffect(() => {
    setOffset(0);
    setPosts([]);
    // carga inicial al cambiar filtro
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/social/feed?filter=${filter}&limit=${limit}&offset=0`, {
          headers: authHeaders(user),
        });
        const data = await res.json();
        setPosts(data.posts || []);
        setOffset((data.posts || []).length);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const createPost = useCallback(async (text: string, mediaUrl?: string, mediaType?: string) => {
    const res = await fetch('/api/social/posts', {
      method: 'POST',
      headers: authHeaders(user),
      body: JSON.stringify({ text, mediaUrl, mediaType: mediaType || (mediaUrl ? 'image' : undefined) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo publicar');
    }
    const post: SocialPost = await res.json();
    setPosts((prev) => [post, ...prev]);
    return post;
  }, [user?.token]);

  const toggleLike = useCallback(async (postId: string) => {
    const res = await fetch(`/api/social/posts/${postId}/like`, {
      method: 'POST',
      headers: authHeaders(user),
    });
    if (!res.ok) return;
    const updated: SocialPost = await res.json();
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  }, [user?.token]);

  const loadComments = useCallback(async (postId: string): Promise<SocialComment[]> => {
    const res = await fetch(`/api/social/posts/${postId}/comments`);
    const data = await res.json();
    return data.comments || [];
  }, []);

  const addComment = useCallback(async (postId: string, text: string) => {
    const res = await fetch(`/api/social/posts/${postId}/comments`, {
      method: 'POST',
      headers: authHeaders(user),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('No se pudo comentar');
    const c: SocialComment = await res.json();
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    return c;
  }, [user?.token]);

  return { posts, loading, filter, setFilter, loadMore: () => load(false), reload: () => load(true), createPost, toggleLike, loadComments, addComment };
}

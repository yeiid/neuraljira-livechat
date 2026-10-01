import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useSocialFeed } from '../hooks/useSocialFeed';
import { useStories } from '../hooks/useStories';
import { CreatePost } from './CreatePost';
import { PostCard } from './PostCard';
import { StoryBar } from './StoryBar';
import { UserProfileModal } from './UserProfileModal';

export const SocialFeed: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { posts, loading, filter, setFilter, loadMore, reload, createPost, toggleLike, loadComments, addComment } = useSocialFeed(user);
  const { groups, createStory, viewStory, reload: reloadStories } = useStories(user);
  const [profileId, setProfileId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar publicación?')) return;
    await fetch(`/api/social/posts/${id}`, {
      method: 'DELETE',
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    });
    reload();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      <StoryBar
        groups={groups}
        user={user}
        onCreate={async (t) => { await createStory(t); reloadStories(); }}
        onView={viewStory}
        onReload={reloadStories}
      />

      <CreatePost onPublish={createPost} user={user} />

      <div className="flex gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === 'all' ? 'bg-gradient-to-r from-neural-purple to-neural-cyan text-white' : 'bg-neural-900 text-slate-400 border border-neural-800'}`}
        >
          🌐 Global (FB/X)
        </button>
        <button
          onClick={() => setFilter('following')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === 'following' ? 'bg-gradient-to-r from-neural-purple to-neural-cyan text-white' : 'bg-neural-900 text-slate-400 border border-neural-800'}`}
        >
          👥 Seguidos
        </button>
        <button onClick={() => { reload(); reloadStories(); }} className="ml-auto px-2.5 py-1.5 rounded-lg text-xs bg-neural-900 text-slate-400 border border-neural-800">
          ↻
        </button>
      </div>

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          currentUser={user}
          canDelete={!!user?.token && (user.id === p.userId || user.username === p.username)}
          onLike={() => toggleLike(p.id)}
          onLoadComments={() => loadComments(p.id)}
          onComment={(t) => addComment(p.id, t)}
          onDelete={() => handleDelete(p.id)}
          onOpenProfile={(uid) => setProfileId(uid)}
        />
      ))}

      {posts.length === 0 && !loading && (
        <div className="text-center text-xs text-slate-500 py-8">Sin publicaciones todavía. ¡Sé el primero!</div>
      )}

      {posts.length > 0 && (
        <button onClick={loadMore} disabled={loading} className="w-full py-2 rounded-xl bg-neural-900 border border-neural-800 text-xs text-slate-300 disabled:opacity-40">
          {loading ? 'Cargando...' : 'Cargar más'}
        </button>
      )}

      {profileId && (
        <UserProfileModal userId={profileId} currentUser={user} onClose={() => setProfileId(null)} />
      )}
    </div>
  );
};

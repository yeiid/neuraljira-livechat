import React, { useState } from 'react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { SocialPost, SocialComment, UserProfile } from '../types';
import { FollowButton } from './FollowButton';

interface Props {
  post: SocialPost;
  currentUser: UserProfile | null;
  canDelete: boolean;
  onLike: () => void;
  onLoadComments: () => Promise<SocialComment[]>;
  onComment: (text: string) => Promise<any>;
  onDelete?: () => void;
  onOpenProfile: (userId: string) => void;
}

export const PostCard: React.FC<Props> = ({ post, currentUser, canDelete, onLike, onLoadComments, onComment, onDelete, onOpenProfile }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [draft, setDraft] = useState('');

  const toggleComments = async () => {
    if (!showComments) {
      const list = await onLoadComments();
      setComments(list);
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft.trim()) return;
    await onComment(draft.trim());
    setDraft('');
    const list = await onLoadComments();
    setComments(list);
  };

  return (
    <article className="p-3.5 bg-neural-900 border border-neural-800 rounded-xl">
      <div className="flex items-center gap-2.5">
        <button onClick={() => onOpenProfile(post.userId)} className="w-9 h-9 rounded-full bg-gradient-to-tr from-neural-purple to-neural-cyan flex items-center justify-center text-lg shrink-0 hover:scale-105 transition-transform">
          {post.avatar?.startsWith('cyber') ? '🤖' : post.avatar || '👤'}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => onOpenProfile(post.userId)} className="text-sm font-semibold text-white truncate hover:text-cyan-300">@{post.username}</button>
          <div className="text-[11px] text-slate-500">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        <FollowButton targetUserId={post.userId} currentUser={currentUser} compact />
        {canDelete && onDelete && (
          <button onClick={onDelete} className="p-1.5 text-slate-500 hover:text-rose-400" title="Borrar">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="mt-2.5 text-sm text-slate-100 whitespace-pre-wrap break-words">{post.text}</p>
      {post.mediaUrl && (post.mediaType === 'video' ? (
        <video src={post.mediaUrl} controls className="mt-2.5 rounded-lg max-h-80 w-full bg-black border border-neural-800" />
      ) : (
        <img src={post.mediaUrl} alt="" className="mt-2.5 rounded-lg max-h-80 w-full object-cover border border-neural-800" loading="lazy" />
      ))}

      <div className="flex items-center gap-4 mt-3 text-xs">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${post.likedByMe ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-rose-300'}`}
        >
          <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
          <span className="font-mono">{post.likeCount}</span>
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 px-2 py-1 text-slate-400 hover:text-cyan-300">
          <MessageCircle className="w-4 h-4" />
          <span className="font-mono">{post.commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-neural-800">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="text-xs bg-neural-950 rounded-lg p-2 border border-neural-850">
                <span className="font-semibold text-cyan-300">@{c.username}</span>
                <span className="text-slate-200 ml-1.5">{c.text}</span>
              </div>
            ))}
            {comments.length === 0 && <div className="text-[11px] text-slate-500">Sé el primero en comentar.</div>}
          </div>
          <form onSubmit={submitComment} className="flex gap-1.5 mt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Comenta..."
              maxLength={500}
              className="flex-1 bg-neural-950 border border-neural-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neural-cyan"
            />
            <button type="submit" disabled={!draft.trim()} className="px-2.5 py-1.5 rounded-lg bg-neural-800 text-cyan-300 text-xs font-semibold disabled:opacity-40">Enviar</button>
          </form>
        </div>
      )}
    </article>
  );
};

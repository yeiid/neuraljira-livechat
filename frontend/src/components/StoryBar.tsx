import React, { useState, useRef } from 'react';
import { StoryGroup, UserProfile } from '../types';
import { Plus, Eye, X, ImagePlus, Loader2 } from 'lucide-react';

interface Props {
  groups: StoryGroup[];
  user: UserProfile | null;
  onCreate: (text: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  onView: (id: string) => void;
  onReload: () => void;
}

async function uploadStoryFile(file: File, token?: string): Promise<{ url: string; mediaType: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('roomId', 'social');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Error subiendo archivo');
  const data = await res.json();
  const att = data.attachment || {};
  const url: string = att.viewLink || att.downloadLink || '';
  const mime: string = att.mimeType || file.type || '';
  return { url, mediaType: mime.startsWith('video') ? 'video' : 'image' };
}

export const StoryBar: React.FC<Props> = ({ groups, user, onCreate, onView }) => {
  const [draft, setDraft] = useState('');
  const [viewer, setViewer] = useState<{ group: StoryGroup; idx: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const publish = async (mediaUrl?: string, mediaType?: string) => {
    if (!draft.trim() && !mediaUrl) return;
    setPublishing(true);
    try {
      await onCreate(draft.trim(), mediaUrl, mediaType);
      setDraft('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const pickAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPublishing(true);
    try {
      const up = await uploadStoryFile(f, user?.token);
      await onCreate(draft.trim(), up.url, up.mediaType);
      setDraft('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openViewer = (group: StoryGroup, idx: number) => {
    setViewer({ group, idx });
    onView(group.items[idx].id);
  };

  const current = viewer ? viewer.group.items[viewer.idx] : null;

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Crear */}
        <div className="shrink-0 w-16 text-center">
          <button
            onClick={() => document.getElementById('story-draft')?.focus()}
            className="w-14 h-14 rounded-full border-2 border-dashed border-neural-purple/60 bg-neural-900 flex items-center justify-center text-neural-cyan mx-auto"
            title="Nueva story"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="text-[10px] text-slate-400 mt-1 truncate">Tu story</div>
        </div>
        {groups.map((g) => (
          <button key={g.userId} onClick={() => openViewer(g, 0)} className="shrink-0 w-16 text-center group">
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 mx-auto">
              <div className="w-full h-full rounded-full bg-neural-950 flex items-center justify-center text-xl">
                {g.avatar?.startsWith('cyber') ? '🤖' : g.avatar || '👤'}
              </div>
            </div>
            <div className="text-[10px] text-slate-300 mt-1 truncate">@{g.username}</div>
            <div className="text-[9px] text-slate-500 font-mono">{g.items.length} clips</div>
          </button>
        ))}
        {groups.length === 0 && (
          <div className="text-[11px] text-slate-500 self-center">Sin stories activas (24h). ¡Publica la primera!</div>
        )}
      </div>

      {user?.token && (
        <div className="flex gap-1.5 mt-1">
          <input
            id="story-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nuevo clip / story (texto)..."
            maxLength={500}
            className="flex-1 bg-neural-950 border border-neural-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pickAndUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={publishing}
            className="p-1.5 rounded-lg bg-neural-900 border border-neural-800 text-slate-300 disabled:opacity-40"
            title="Foto / video"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <button
            onClick={() => publish()}
            disabled={!draft.trim() || publishing}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-semibold disabled:opacity-40"
          >
            {publishing ? '...' : 'Clip'}
          </button>
        </div>
      )}

      {/* Visor simple */}
      {current && viewer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="w-full max-w-sm bg-neural-900 border border-neural-700 rounded-2xl p-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewer(null)} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            <div className="text-xs text-slate-400">@{viewer.group.username} · clip {viewer.idx + 1}/{viewer.group.items.length}</div>
            {current.mediaUrl && (current.mediaType === 'video' ? (
              <video src={current.mediaUrl} controls className="mt-2 rounded-xl max-h-72 w-full bg-black" />
            ) : (
              <img src={current.mediaUrl} className="mt-2 rounded-xl max-h-72 w-full object-cover" alt="" />
            ))}
            {current.text && <p className="mt-2 text-sm text-white whitespace-pre-wrap">{current.text}</p>}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{current.views} vistas</span>
              <div className="flex gap-1.5">
                <button
                  disabled={viewer.idx === 0}
                  onClick={() => { const ni = viewer.idx - 1; setViewer({ ...viewer, idx: ni }); onView(viewer.group.items[ni].id); }}
                  className="px-2.5 py-1 rounded-lg bg-neural-800 text-xs disabled:opacity-30"
                >◀</button>
                <button
                  disabled={viewer.idx >= viewer.group.items.length - 1}
                  onClick={() => { const ni = viewer.idx + 1; setViewer({ ...viewer, idx: ni }); onView(viewer.group.items[ni].id); }}
                  className="px-2.5 py-1 rounded-lg bg-neural-800 text-xs disabled:opacity-30"
                >▶</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

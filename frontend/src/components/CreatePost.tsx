import React, { useState, useRef } from 'react';
import { Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

async function uploadFile(file: File, token?: string): Promise<{ url: string; mediaType: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('roomId', 'social');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error subiendo archivo');
  }
  const data = await res.json();
  const att = data.attachment || {};
  const url: string = att.viewLink || att.downloadLink || '';
  const mime: string = att.mimeType || file.type || '';
  const mediaType = mime.startsWith('video') ? 'video' : 'image';
  return { url, mediaType };
}

export const CreatePost: React.FC<{ onPublish: (text: string, mediaUrl?: string, mediaType?: string) => Promise<any>; user: UserProfile | null }> = ({ onPublish, user }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasToken = !!user?.token;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !file) || busy) return;
    setBusy(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        setUploading(true);
        const up = await uploadFile(file, user?.token);
        mediaUrl = up.url;
        mediaType = up.mediaType;
        setUploading(false);
      }
      await onPublish(text.trim() || (file ? `📎 ${file.name}` : ''), mediaUrl, mediaType);
      setText('');
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
      setUploading(false);
    }
  };

  if (!hasToken) {
    return <div className="p-3 text-xs text-slate-400 bg-neural-900 border border-neural-800 rounded-xl">Inicia sesión con cuenta para publicar (invitados solo leen).</div>;
  }

  return (
    <form onSubmit={submit} className="p-3 bg-neural-900 border border-neural-800 rounded-xl">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="¿Qué está pasando en Neuraljira?"
        maxLength={2000}
        rows={2}
        className="w-full bg-neural-950 border border-neural-800 rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neural-cyan resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pickFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-lg bg-neural-950 border border-neural-800 text-slate-400 hover:text-cyan-300"
            title="Foto / video"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <span className="text-[11px] text-slate-500 font-mono">{text.length}/2000</span>
        </div>
        <button
          type="submit"
          disabled={(!text.trim() && !file) || busy}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-neural-purple to-neural-cyan text-white text-sm font-semibold disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" /> {busy ? (uploading ? 'Subiendo...' : '...') : 'Publicar'}
        </button>
      </div>
      {preview && file && (
        <div className="mt-2 relative inline-block">
          {file.type.startsWith('video') ? (
            <video src={preview} className="max-h-40 rounded-lg border border-neural-800" controls />
          ) : (
            <img src={preview} className="max-h-40 rounded-lg border border-neural-800" alt="" />
          )}
          <button
            type="button"
            onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </form>
  );
};

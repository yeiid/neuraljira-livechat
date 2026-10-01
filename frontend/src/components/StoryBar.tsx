import React, { useState, useRef, useEffect } from 'react';
import { StoryGroup, UserProfile } from '../types';
import { Plus, Eye, X, ImagePlus, Loader2, Trash2, ChevronLeft, ChevronRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  groups: StoryGroup[];
  user: UserProfile | null;
  onCreate: (text: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onView: (id: string) => void;
  onReload: () => void;
}

const GRADIENTS = [
  { id: 'neon', name: 'Cyber Neon', class: 'from-fuchsia-600 via-purple-600 to-cyan-500' },
  { id: 'sunset', name: 'Sunset', class: 'from-amber-500 via-rose-500 to-purple-700' },
  { id: 'emerald', name: 'Matrix', class: 'from-emerald-500 via-teal-600 to-cyan-700' },
  { id: 'fire', name: 'Inferno', class: 'from-red-600 via-orange-500 to-amber-400' },
  { id: 'dark', name: 'Midnight', class: 'from-slate-900 via-purple-950 to-neural-950' },
];

export const StoryBar: React.FC<Props> = ({ groups, user, onCreate, onDelete, onView }) => {
  const [viewer, setViewer] = useState<{ group: StoryGroup; idx: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Estados del creador de story
  const [storyMode, setStoryMode] = useState<'media' | 'text'>('media');
  const [storyText, setStoryText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados del visor de stories (progreso estilo Instagram)
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const openViewer = (group: StoryGroup, idx: number) => {
    setViewer({ group, idx });
    setProgress(0);
    setIsPaused(false);
    if (group.items[idx]) {
      onView(group.items[idx].id);
    }
  };

  const closeViewer = () => {
    setViewer(null);
    setProgress(0);
    setIsPaused(false);
  };

  const nextClip = () => {
    if (!viewer) return;
    const currentGroup = viewer.group;
    if (viewer.idx < currentGroup.items.length - 1) {
      openViewer(currentGroup, viewer.idx + 1);
    } else {
      // Buscar siguiente usuario con stories
      const currentGroupIdx = groups.findIndex((g) => g.userId === currentGroup.userId);
      if (currentGroupIdx !== -1 && currentGroupIdx < groups.length - 1) {
        openViewer(groups[currentGroupIdx + 1], 0);
      } else {
        closeViewer();
      }
    }
  };

  const prevClip = () => {
    if (!viewer) return;
    if (viewer.idx > 0) {
      openViewer(viewer.group, viewer.idx - 1);
    } else {
      const currentGroupIdx = groups.findIndex((g) => g.userId === viewer.group.userId);
      if (currentGroupIdx > 0) {
        const prevGroup = groups[currentGroupIdx - 1];
        openViewer(prevGroup, prevGroup.items.length - 1);
      }
    }
  };

  // Temporizador de 5 segundos estilo Instagram
  useEffect(() => {
    if (!viewer || isPaused) return;

    const interval = 50; // cada 50ms
    const step = 100 / (5000 / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextClip();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [viewer, isPaused, viewer?.idx, viewer?.group]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!user?.token) {
      alert('Debes iniciar sesión para publicar historias.');
      return;
    }

    if (storyMode === 'text' && !storyText.trim()) {
      alert('Escribe un mensaje para tu historia.');
      return;
    }

    if (storyMode === 'media' && !mediaFile && !storyText.trim()) {
      alert('Selecciona una imagen/video o escribe texto.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let finalMediaUrl = '';
      let finalMediaType = mediaType;

      if (mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('roomId', 'social');

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.open('POST', '/api/upload', true);
          if (user?.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);
          }

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                const att = res.attachment || {};
                finalMediaUrl = att.viewLink || att.downloadLink || '';
                finalMediaType = (att.mimeType || mediaFile.type || '').startsWith('video') ? 'video' : 'image';
                resolve();
              } catch (e) {
                reject(new Error('Respuesta inválida del servidor'));
              }
            } else {
              reject(new Error('Error subiendo archivo de historia'));
            }
          };

          xhr.onerror = () => reject(new Error('Fallo de red al subir archivo'));
          xhr.send(formData);
        });
      }

      const textPayload = storyMode === 'text'
        ? JSON.stringify({ text: storyText.trim(), gradient: selectedGradient.class })
        : storyText.trim();

      await onCreate(textPayload, finalMediaUrl || undefined, finalMediaType);

      // Limpiar estados
      setStoryText('');
      setMediaFile(null);
      setMediaPreview(null);
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al publicar historia');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteCurrent = async (id: string) => {
    if (!confirm('¿Eliminar esta historia?')) return;
    if (onDelete) {
      await onDelete(id);
      closeViewer();
    }
  };

  const currentClip = viewer ? viewer.group.items[viewer.idx] : null;

  // Comprobar si el clip de texto tiene formato JSON con degradado
  const parseClipText = (raw?: string) => {
    if (!raw) return { text: '', gradient: '' };
    try {
      const parsed = JSON.parse(raw);
      if (parsed.gradient) {
        return { text: parsed.text || '', gradient: parsed.gradient };
      }
    } catch {
      // Formato texto plano tradicional
    }
    return { text: raw, gradient: '' };
  };

  const activeStoriesCount = groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="shrink-0 bg-neural-950/80 backdrop-blur-md border-b border-neural-850/80 transition-all select-none">
      {/* Barra superior de encabezado de historias */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Historias de la Comunidad</span>
          {activeStoriesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-mono">
              {activeStoriesCount}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-neural-900 transition-colors"
          title={isCollapsed ? 'Mostrar historias' : 'Ocultar historias'}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Carrusel de historias */}
      {!isCollapsed && (
        <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 pt-1 no-scrollbar">
          {/* Botón "+ Tu historia" */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 flex flex-col items-center group focus:outline-none"
          >
            <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-neural-purple/50 to-neural-cyan/50 hover:from-neural-purple hover:to-neural-cyan transition-all">
              <div className="w-full h-full rounded-full bg-neural-900 flex items-center justify-center text-xl overflow-hidden border border-neural-800">
                {user?.avatar?.startsWith('cyber') ? '🤖' : user?.avatar || '👤'}
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white border-2 border-neural-950 shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-300 mt-1 truncate max-w-[60px]">Tu historia</span>
          </button>

          {/* Lista de usuarios con historias */}
          {groups.map((group) => {
            const isUserGroup = user && (user.id === group.userId || user.username === group.username);
            return (
              <button
                key={group.userId}
                onClick={() => openViewer(group, 0)}
                className="shrink-0 flex flex-col items-center group focus:outline-none transition-transform active:scale-95"
              >
                <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md group-hover:shadow-rose-500/20 transition-all">
                  <div className="w-full h-full rounded-full bg-neural-950 p-[1.5px] flex items-center justify-center overflow-hidden">
                    <span className="text-xl">
                      {group.avatar?.startsWith('cyber') ? '🤖' : group.avatar || '👤'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-200 mt-1 truncate max-w-[62px]">
                  {isUserGroup ? 'Tú' : group.username}
                </span>
                <span className="text-[8px] font-mono text-rose-400 font-bold -mt-0.5">
                  {group.items.length} {group.items.length === 1 ? 'clip' : 'clips'}
                </span>
              </button>
            );
          })}

          {/* Mensaje sutil si no hay historias adicionales */}
          {groups.length === 0 && (
            <div className="flex items-center gap-2 pl-2 text-xs text-slate-400">
              <span>¡Sé el primero en compartir un momento (24h)!</span>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: Creador de Historia Estilo Instagram / TikTok */}
      {/* ==================================================== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
          onClick={() => !isSubmitting && setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-sm bg-neural-900 border border-neural-800 rounded-3xl p-4 shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-neural-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-white">Crear Historia (24 Horas)</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-neural-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de modo: Multimedia vs Texto */}
            <div className="flex gap-1.5 p-1 bg-neural-950 rounded-xl my-3 border border-neural-800/80">
              <button
                type="button"
                onClick={() => setStoryMode('media')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  storyMode === 'media'
                    ? 'bg-gradient-to-r from-neural-purple to-neural-cyan text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📸 Foto / Video
              </button>
              <button
                type="button"
                onClick={() => setStoryMode('text')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  storyMode === 'text'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✍️ Frase / Texto
              </button>
            </div>

            {/* Contenido según modo */}
            {storyMode === 'media' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {mediaPreview ? (
                  <div className="relative aspect-[9/12] w-full rounded-2xl overflow-hidden bg-black border border-neural-800 group">
                    {mediaType === 'video' ? (
                      <video src={mediaPreview} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[9/10] w-full rounded-2xl border-2 border-dashed border-neural-700/80 hover:border-neural-cyan bg-neural-950/60 flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-neural-950 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-neural-850 flex items-center justify-center text-neural-cyan mb-2 group-hover:scale-110 transition-transform">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">Toca para elegir foto o video</p>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">Sube desde tu galería o cámara (Guardado en Drive 5TB)</p>
                  </div>
                )}

                <input
                  type="text"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Añade un pie de foto o comentario..."
                  maxLength={250}
                  className="w-full px-3 py-2 bg-neural-950 border border-neural-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neural-cyan"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Vista previa en vivo del texto con degradado */}
                <div
                  className={`aspect-[9/11] w-full rounded-2xl p-5 flex items-center justify-center text-center shadow-inner relative overflow-hidden bg-gradient-to-br ${selectedGradient.class}`}
                >
                  <p className="text-white font-extrabold text-lg sm:text-xl drop-shadow-md whitespace-pre-wrap leading-relaxed">
                    {storyText.trim() || 'Escribe tu mensaje aquí...'}
                  </p>
                </div>

                {/* Paleta de gradientes tipo Instagram */}
                <div className="flex items-center justify-center gap-2 py-1">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGradient(g)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${g.class} transition-transform ${
                        selectedGradient.id === g.id ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-neural-900' : 'hover:scale-110'
                      }`}
                      title={g.name}
                    />
                  ))}
                </div>

                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="¿Qué está pasando hoy?..."
                  rows={2}
                  maxLength={300}
                  className="w-full px-3 py-2 bg-neural-950 border border-neural-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            )}

            {/* Barra de progreso de subida */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Subiendo contenido a Drive (5TB)...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-neural-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Botón de publicar */}
            <div className="mt-4 pt-2 border-t border-neural-800/80 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-neural-850 hover:bg-neural-800 text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting || (storyMode === 'text' && !storyText.trim()) || (storyMode === 'media' && !mediaFile && !storyText.trim())}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/20 hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <span>Compartir Story</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Visor de Historia Pantalla Completa (IG Style) */}
      {/* ==================================================== */}
      {viewer && currentClip && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
          onClick={closeViewer}
        >
          <div
            className="relative w-full max-w-sm h-full max-h-[92vh] sm:max-h-[85vh] bg-neural-950 sm:border border-neural-800 sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* 1. Barras de progreso segmentadas estilo Instagram en la parte superior */}
            <div className="absolute top-2 inset-x-3 z-30 flex gap-1">
              {viewer.group.items.map((item, idx) => (
                <div key={item.id} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{
                      width:
                        idx < viewer.idx
                          ? '100%'
                          : idx === viewer.idx
                          ? `${progress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* 2. Cabecera del autor de la historia */}
            <div className="absolute top-5 inset-x-3 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-neural-950 flex items-center justify-center text-sm">
                    {viewer.group.avatar?.startsWith('cyber') ? '🤖' : viewer.group.avatar || '👤'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight drop-shadow-md">@{viewer.group.username}</p>
                  <p className="text-[9px] text-slate-300 drop-shadow-sm font-mono">
                    Clip {viewer.idx + 1} de {viewer.group.items.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Botón de borrar si es el autor */}
                {user && (user.id === currentClip.userId || user.username === currentClip.username) && (
                  <button
                    onClick={() => handleDeleteCurrent(currentClip.id)}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-rose-600/80 text-white backdrop-blur-md transition-colors"
                    title="Borrar historia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={closeViewer}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Contenido de la historia (Media o Texto Estilizado) */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              {currentClip.mediaUrl ? (
                currentClip.mediaType === 'video' ? (
                  <video
                    src={currentClip.mediaUrl}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onEnded={nextClip}
                  />
                ) : (
                  <img
                    src={currentClip.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                (() => {
                  const { text, gradient } = parseClipText(currentClip.text);
                  return (
                    <div
                      className={`w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br ${
                        gradient || 'from-fuchsia-600 via-purple-600 to-cyan-500'
                      }`}
                    >
                      <p className="text-white font-extrabold text-xl sm:text-2xl drop-shadow-lg leading-relaxed whitespace-pre-wrap">
                        {text}
                      </p>
                    </div>
                  );
                })()
              )}

              {/* Si hay media con pie de texto superpuesto */}
              {currentClip.mediaUrl && currentClip.text && (
                <div className="absolute bottom-12 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <p className="text-sm text-white font-medium drop-shadow-md text-center">
                    {currentClip.text}
                  </p>
                </div>
              )}

              {/* Zonas de pulsación táctil (izquierda: retroceder, derecha: avanzar) */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                onClick={prevClip}
              />
              <div
                className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
                onClick={nextClip}
              />
            </div>

            {/* 4. Pie de la historia con vistas */}
            <div className="p-3 bg-gradient-to-t from-black via-black/60 to-transparent flex items-center justify-between text-xs text-slate-300 z-30">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentClip.views || 0} vistas</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevClip}
                  disabled={viewer.idx === 0 && groups.findIndex((g) => g.userId === viewer.group.userId) === 0}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextClip}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


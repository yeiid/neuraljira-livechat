import React from 'react';
import { FileText, Download, ExternalLink, HardDrive, Image as ImageIcon, Film, Music, Archive } from 'lucide-react';
import { Attachment } from '../types';

interface FileAttachmentViewProps {
  attachment: Attachment;
}

export const FileAttachmentView: React.FC<FileAttachmentViewProps> = ({ attachment }) => {
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isAudio = attachment.mimeType.startsWith('audio/');
  const isZip = attachment.mimeType.includes('zip') || attachment.mimeType.includes('tar') || attachment.fileName.endsWith('.zip') || attachment.fileName.endsWith('.rar');

  return (
    <div className="mt-2 rounded-xl overflow-hidden bg-neural-950 border border-neural-800 shadow-md max-w-[260px] sm:max-w-sm">
      {/* Vista previa para Imágenes */}
      {isImage && (
        <div className="relative max-h-36 sm:max-h-48 overflow-hidden bg-neural-900 flex items-center justify-center">
          <img
            src={attachment.viewLink}
            alt={attachment.fileName}
            className="w-full h-auto object-cover max-h-36 sm:max-h-48 hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Reproductor en línea para Videos */}
      {isVideo && (
        <div className="bg-black rounded-t-xl overflow-hidden">
          <video
            src={attachment.viewLink}
            controls
            className="w-full max-h-36 sm:max-h-48 object-contain"
            preload="metadata"
          />
        </div>
      )}

      {/* Reproductor de Audio */}
      {isAudio && (
        <div className="p-2 bg-neural-900 border-b border-neural-800">
          <audio src={attachment.viewLink} controls className="w-full h-8" />
        </div>
      )}

      {/* Información del archivo y botones de acción */}
      <div className="p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neural-850 border border-neural-700/50 flex items-center justify-center shrink-0 text-neural-cyan">
            {isImage ? (
              <ImageIcon className="w-4 h-4" />
            ) : isVideo ? (
              <Film className="w-4 h-4 text-purple-400" />
            ) : isAudio ? (
              <Music className="w-4 h-4 text-amber-400" />
            ) : isZip ? (
              <Archive className="w-4 h-4 text-rose-400" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate" title={attachment.fileName}>
              {attachment.fileName}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="font-mono">{formatSize(attachment.fileSize)}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-400">
                <HardDrive className="w-2.5 h-2.5" />
                Drive (5TB)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {attachment.viewLink && (
            <a
              href={attachment.viewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-neural-850 hover:bg-neural-800 text-slate-300 hover:text-white transition-colors"
              title="Abrir en Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {attachment.downloadLink && (
            <a
              href={attachment.downloadLink}
              download={attachment.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-gradient-to-r from-neural-purple to-neural-cyan hover:from-purple-600 hover:to-cyan-500 text-white shadow-sm transition-all"
              title="Descargar archivo"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

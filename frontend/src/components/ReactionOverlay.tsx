import React from 'react';
import { FloatingReaction } from '../types';

interface ReactionOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-16 text-3xl animate-float-up drop-shadow-md select-none"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};

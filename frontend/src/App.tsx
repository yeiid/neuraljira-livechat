import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { useLiveChat } from './hooks/useLiveChat';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ReactionOverlay } from './components/ReactionOverlay';
import { JoinModal } from './components/JoinModal';
import { Download } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('neuraljira_live_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Prompt de instalación PWA
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  // Obtener sala inicial desde la URL (?room=xxx o #xxx)
  const getInitialRoom = () => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) return roomParam;
    if (window.location.hash) return window.location.hash.replace('#', '');
    return user?.roomId || 'general';
  };

  const handleJoin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('neuraljira_live_user', JSON.stringify(profile));

    // Actualizar URL sin recargar para compartir fácilmente
    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(profile.roomId)}`;
    window.history.replaceState(null, '', newUrl);
  };

  const handleLeave = () => {
    setUser(null);
    localStorage.removeItem('neuraljira_live_user');
  };

  const {
    messages,
    viewers,
    floatingReactions,
    connectionStatus,
    sendMessage,
    sendReaction,
  } = useLiveChat(user);

  return (
    <div className="flex justify-center h-screen w-screen bg-neural-950 text-slate-100 overflow-hidden">
      {/* Contenedor principal con ancho máximo para mantener estética de chat mobile-first en escritorio */}
      <div className="w-full max-w-xl h-full flex flex-col bg-neural-950 border-x border-neural-900 shadow-2xl relative">
        {/* Banner de instalación PWA opcional */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-neural-purple to-neural-cyan px-4 py-2 flex items-center justify-between text-xs font-semibold text-white z-30 shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>Instala Neuraljira Live en tu dispositivo</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg backdrop-blur-sm transition-colors text-white"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="opacity-70 hover:opacity-100 px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Modal de Onboarding si el usuario no ha ingresado */}
        {!user ? (
          <JoinModal initialRoomId={getInitialRoom()} onJoin={handleJoin} />
        ) : (
          <>
            <Header
              user={user}
              viewers={viewers}
              connectionStatus={connectionStatus}
              onLeave={handleLeave}
            />

            <div className="relative flex-1 flex flex-col min-h-0">
              <ReactionOverlay reactions={floatingReactions} />
              <MessageList messages={messages} currentUsername={user.username} />
            </div>

            <MessageInput
              onSendMessage={sendMessage}
              onSendReaction={sendReaction}
              disabled={connectionStatus !== 'connected'}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default App;

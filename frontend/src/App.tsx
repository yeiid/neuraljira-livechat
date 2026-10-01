import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { useLiveChat } from './hooks/useLiveChat';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ReactionOverlay } from './components/ReactionOverlay';
import { AuthModal } from './components/AuthModal';
import { LiveVideoPlayer } from './components/LiveVideoPlayer';
import { SocialFeed } from './components/SocialFeed';
import { StoryBar } from './components/StoryBar';
import { useStories } from './hooks/useStories';
import { Download } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'social'>('live');
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

  const getInitialRoom = () => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) return roomParam;
    if (window.location.hash) return window.location.hash.replace('#', '');
    return user?.roomId || 'general';
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('neuraljira_live_user', JSON.stringify(profile));

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
    // Live Streaming
    isLive,
    streamMode,
    liveStream,
    isStreaming,
    isMicMuted,
    startScreenStream,
    startCameraStream,
    stopStream,
    toggleMic,
  } = useLiveChat(user);

  const {
    groups: storyGroups,
    createStory,
    deleteStory,
    viewStory,
    reload: reloadStories,
  } = useStories(user);

  return (
    <div className="flex justify-center h-[100dvh] max-h-[100dvh] w-screen bg-neural-950 text-slate-100 overflow-hidden">
      {/* Contenedor adaptativo: en PC con live activo se expande a dos columnas */}
      <div
        className={`w-full h-full flex flex-col bg-neural-950 border-x border-neural-900 shadow-2xl relative transition-all duration-300 ${
          isLive ? 'max-w-5xl' : 'max-w-xl'
        }`}
      >
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

        {/* Modal de Autenticación / Registro / Invitado */}
        {!user ? (
          <AuthModal
            initialRoomId={getInitialRoom()}
            onSuccess={handleAuthSuccess}
            onContinueAsGuest={handleAuthSuccess}
          />
        ) : (
          <>
            <Header
              user={user}
              viewers={viewers}
              connectionStatus={connectionStatus}
              onLeave={handleLeave}
              isStreaming={isStreaming}
              onStartScreen={startScreenStream}
              onStartCamera={startCameraStream}
              onStopStream={stopStream}
              isMuted={isMicMuted}
              onToggleMic={toggleMic}
            />

            {/* Barra de Historias de la Comunidad (Stories 24h) */}
            <StoryBar
              groups={storyGroups}
              user={user}
              onCreate={createStory}
              onDelete={deleteStory}
              onView={viewStory}
              onReload={reloadStories}
            />

            {/* Tabs Live / Social */}
            <div className="flex gap-1.5 px-3 pt-1.5 shrink-0">
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white' : 'bg-neural-900 text-slate-400 border border-neural-800'}`}
              >
                🔴 LIVE
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'social' ? 'bg-gradient-to-r from-neural-purple to-neural-cyan text-white' : 'bg-neural-900 text-slate-400 border border-neural-800'}`}
              >
                🌐 SOCIAL
              </button>
            </div>

            {/* Layout adaptable para Video + Chat */}
            {activeTab === 'live' ? (
            <div
              className={`relative flex-1 flex min-h-0 overflow-hidden ${
                isLive ? 'flex-col md:flex-row' : 'flex-col'
              }`}
            >
              {/* Sección de Video WebRTC en Vivo */}
              {isLive && (
                <div className="w-full md:w-3/5 p-2 md:p-3 flex items-center justify-center bg-black/40 border-b md:border-b-0 md:border-r border-neural-850 shrink-0">
                  <LiveVideoPlayer
                    stream={liveStream}
                    isLive={isLive}
                    streamMode={streamMode}
                    hostName={user.username}
                  />
                </div>
              )}

              {/* Sección de Chat */}
              <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                <ReactionOverlay reactions={floatingReactions} />
                <MessageList messages={messages} currentUsername={user.username} />

                <MessageInput
                  onSendMessage={sendMessage}
                  onSendReaction={sendReaction}
                  roomId={user.roomId}
                  token={user.token}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>
            </div>
            ) : (
              <SocialFeed user={user} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;

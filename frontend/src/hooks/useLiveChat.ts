import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, FloatingReaction, UserProfile } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useLiveChat(user: UserProfile | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<number>(1);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');

  // Estados de Live Streaming WebRTC
  const [isLive, setIsLive] = useState(false);
  const [streamMode, setStreamMode] = useState<string>('screen');
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const lastRoomRef = useRef<string>(user?.roomId || '');

  // Limpiar mensajes y estados al cambiar de sala
  useEffect(() => {
    if (user?.roomId && user.roomId !== lastRoomRef.current) {
      lastRoomRef.current = user.roomId;
      setMessages([]);
      setIsLive(false);
      setLiveStream(null);
    }
  }, [user?.roomId]);

  // Referencias para WebRTC
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map()); // para host -> múltiples viewers
  const viewerPeerConnection = useRef<RTCPeerConnection | null>(null); // para viewer -> host

  // Reacciones flotantes
  const triggerFloatingReaction = useCallback((reactionType: string) => {
    const reactionMap: Record<string, string> = {
      heart: '❤️',
      fire: '🔥',
      rocket: '🚀',
      clap: '👏',
      bulb: '💡',
      '100': '💯',
    };
    const emoji = reactionMap[reactionType] || '⚡';
    const id = `${Date.now()}-${Math.random()}`;
    const left = 65 + Math.random() * 25;

    setFloatingReactions((prev) => [...prev.slice(-15), { id, emoji, left }]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
  }, []);

  // Función para enviar mensajes crudos por WebSocket
  const sendRawWS = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Configurar receptor WebRTC para espectadores
  const setupViewerPeer = useCallback(() => {
    if (viewerPeerConnection.current) {
      viewerPeerConnection.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    viewerPeerConnection.current = pc;

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setLiveStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendRawWS({
          type: 'webrtc_candidate',
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    return pc;
  }, [sendRawWS]);

  const connect = useCallback(() => {
    if (!user) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

    const envWsUrl = import.meta.env.VITE_WS_URL;
    let wsBase = '';
    if (envWsUrl) {
      wsBase = envWsUrl.replace(/\/$/, '');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${protocol}//${window.location.host}`;
    }

    const queryParams = new URLSearchParams({
      username: user.username,
      avatar: user.avatar,
      role: user.role,
    });

    if (user.token) {
      queryParams.set('token', user.token);
    }

    const fullUrl = `${wsBase}/ws/${encodeURIComponent(user.roomId)}?${queryParams.toString()}`;

    try {
      const socket = new WebSocket(fullUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      socket.onmessage = async (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : await event.data.text();
          const lines = raw.split('\n').filter(Boolean);

          for (const line of lines) {
            const data = JSON.parse(line);

            if (data.type === 'history') {
              if (Array.isArray(data.history)) {
                setMessages(data.history);
              }
            } else if (data.type === 'presence') {
              if (typeof data.count === 'number') {
                setViewers(data.count);
              }
            } else if (data.type === 'reaction') {
              if (data.reaction) {
                triggerFloatingReaction(data.reaction);
              }
            } else if (data.type === 'story') {
              window.dispatchEvent(new CustomEvent('neuraljira_story_update'));
            } else if (data.type === 'message_delete') {
              const deletedId = data.text;
              if (deletedId) {
                setMessages((prev) => prev.filter((m) => m.id !== deletedId));
              }
            } else if (data.type === 'chat' || data.type === 'file' || data.type === 'user_join' || data.type === 'user_leave') {
              setMessages((prev) => {
                // Evitar duplicados si ya existe el ID
                if (prev.some((m) => m.id === data.id)) return prev;
                return [...prev.slice(-199), data];
              });
            }
          // Señalización de streaming en vivo
          else if (data.type === 'stream_start' || data.type === 'stream_status') {
            setIsLive(true);
            setStreamMode(data.text || 'screen');

            // Si somos espectadores y no el host emisor, preparar para recibir video
            if (!localStreamRef.current) {
              setupViewerPeer();
            }
          } else if (data.type === 'stream_stop') {
            setIsLive(false);
            setLiveStream(null);
            if (viewerPeerConnection.current) {
              viewerPeerConnection.current.close();
              viewerPeerConnection.current = null;
            }
          }
          // Manejo de oferta SDP recibida
          else if (data.type === 'webrtc_offer') {
            if (!localStreamRef.current && data.payload) {
              const pc = viewerPeerConnection.current || setupViewerPeer();
              const offerDesc = JSON.parse(data.payload);
              await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              sendRawWS({
                type: 'webrtc_answer',
                payload: JSON.stringify(answer),
              });
            }
          }
          // Manejo de respuesta SDP recibida (en el Host)
          else if (data.type === 'webrtc_answer') {
            if (localStreamRef.current && data.payload) {
              const answerDesc = JSON.parse(data.payload);
              peerConnections.current.forEach(async (pc) => {
                if (pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
                }
              });
            }
          }
          // Candidatos ICE
          else if (data.type === 'webrtc_candidate') {
            if (data.payload) {
              const candidate = new RTCIceCandidate(JSON.parse(data.payload));
              if (viewerPeerConnection.current && viewerPeerConnection.current.remoteDescription) {
                viewerPeerConnection.current.addIceCandidate(candidate).catch((e) => console.log(e));
              }
              peerConnections.current.forEach((pc) => {
                if (pc.remoteDescription) {
                  pc.addIceCandidate(candidate).catch((e) => console.log(e));
                }
              });
            }
          }
        } // fin del for (const line of lines)
      } catch (e) {
        console.error('[WS Parse Error]', e);
      }
    };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 10000);
        reconnectAttempts.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, timeout);
      };

      socket.onerror = (err) => {
        console.error('[WS Error]', err);
        socket.close();
      };
    } catch (e) {
      console.error('[WS Connection Error]', e);
      setConnectionStatus('disconnected');
    }
  }, [user, triggerFloatingReaction, sendRawWS, setupViewerPeer]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (viewerPeerConnection.current) {
        viewerPeerConnection.current.close();
      }
    };
  }, [connect]);

  // Iniciar directo compartiendo pantalla de PC
  const startScreenStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 30, max: 60 },
        } as any,
        audio: true,
      });

      localStreamRef.current = stream;
      setLiveStream(stream);
      setIsStreaming(true);
      setIsLive(true);
      setStreamMode('screen');

      // Notificar al backend que inició el directo
      sendRawWS({
        type: 'stream_start',
        text: 'screen',
      });

      // Crear conexión emisora y oferta SDP
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set('broadcaster', pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendRawWS({
            type: 'webrtc_candidate',
            payload: JSON.stringify(event.candidate),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendRawWS({
        type: 'webrtc_offer',
        payload: JSON.stringify(offer),
      });

      // Si el usuario deja de compartir desde la barra del navegador
      stream.getVideoTracks()[0].onended = () => {
        stopStream();
      };
    } catch (err) {
      console.error('[Error Compartir Pantalla]', err);
    }
  }, [sendRawWS]);

  // Iniciar directo con Cámara Web
  const startCameraStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;
      setLiveStream(stream);
      setIsStreaming(true);
      setIsLive(true);
      setStreamMode('camera');

      sendRawWS({
        type: 'stream_start',
        text: 'camera',
      });

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set('broadcaster', pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendRawWS({
            type: 'webrtc_candidate',
            payload: JSON.stringify(event.candidate),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendRawWS({
        type: 'webrtc_offer',
        payload: JSON.stringify(offer),
      });
    } catch (err) {
      console.error('[Error Cámara Web]', err);
    }
  }, [sendRawWS]);

  // Detener directo
  const stopStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    setLiveStream(null);
    setIsStreaming(false);
    setIsLive(false);

    sendRawWS({
      type: 'stream_stop',
    });
  }, [sendRawWS]);

  // Silenciar / Activar micrófono del stream local
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Enviar mensaje de chat
  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WS] No se puede enviar mensaje, socket no abierto:', wsRef.current?.readyState);
      return;
    }
    console.log('[WS] 📤 Enviando mensaje al servidor:', text);
    wsRef.current.send(JSON.stringify({ type: 'chat', text }));
  }, []);

  // Enviar reacción
  const sendReaction = useCallback(
    (reactionType: string) => {
      triggerFloatingReaction(reactionType);
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type: 'reaction', reaction: reactionType }));
    },
    [triggerFloatingReaction]
  );

  // Eliminar mensaje como Moderador o Super Admin
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user?.token) return false;
    try {
      const res = await fetch(`/api/moderation/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      return res.ok;
    } catch (e) {
      console.error('[Error al eliminar mensaje]', e);
      return false;
    }
  }, [user?.token]);

  return {
    messages,
    viewers,
    floatingReactions,
    connectionStatus,
    sendMessage,
    sendReaction,
    deleteMessage,
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
  };
}

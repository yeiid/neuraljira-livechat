import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, FloatingReaction, UserProfile } from '../types';

export function useLiveChat(user: UserProfile | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<number>(1);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);

  // Agregar reacción flotante animada temporal
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
    // Variación horizontal aleatoria en el tercio derecho de la pantalla
    const left = 65 + Math.random() * 25;

    setFloatingReactions((prev) => [...prev.slice(-15), { id, emoji, left }]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
  }, []);

  const connect = useCallback(() => {
    if (!user) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

    // Determinar la URL del WebSocket:
    // 1) Variable de entorno VITE_WS_URL si existe
    // 2) O deducir según protocolo actual (wss:// en HTTPS, ws:// en HTTP)
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

    const fullUrl = `${wsBase}/ws/${encodeURIComponent(user.roomId)}?${queryParams.toString()}`;

    try {
      const socket = new WebSocket(fullUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

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
          } else if (data.type === 'chat' || data.type === 'user_join' || data.type === 'user_leave') {
            setMessages((prev) => [...prev.slice(-199), data]);
          }
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Reconexión automática con exponential backoff
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
  }, [user, triggerFloatingReaction]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Enviar mensaje de texto
  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: 'chat',
      text,
    });
    wsRef.current.send(payload);
  }, []);

  // Enviar reacción
  const sendReaction = useCallback(
    (reactionType: string) => {
      // Disparar localmente de inmediato para feedback instantáneo
      triggerFloatingReaction(reactionType);

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const payload = JSON.stringify({
        type: 'reaction',
        reaction: reactionType,
      });
      wsRef.current.send(payload);
    },
    [triggerFloatingReaction]
  );

  return {
    messages,
    viewers,
    floatingReactions,
    connectionStatus,
    sendMessage,
    sendReaction,
  };
}

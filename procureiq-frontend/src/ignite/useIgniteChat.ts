import { useState, useRef, useEffect, useCallback } from 'react';
// WS_OPEN kept as symbolic reference (value = 1, matches WebSocket.OPEN)
import type { IgniteMessage } from '@/core/types';

let _msgId = 0;
const nextId = () => `msg-${++_msgId}-${Date.now()}`;

// ── WebSocket connection states we care about ─────────────────────────────────
const WS_CLOSED = WebSocket.CLOSED;  // 3

export function useIgniteChat(moduleContext: string) {
  const [messages, setMessages] = useState<IgniteMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLocal,  setIsLocal]  = useState(false);
  const wsRef  = useRef<WebSocket | null>(null);
  const convId = useRef<string | null>(null);

  // ── Welcome message on mount ─────────────────────────────────────────────
  useEffect(() => {
    setMessages([{
      id: nextId(),
      role: 'assistant',
      content: [
        `Hello! I'm **Ignite**, your AI Procurement Advisor.`,
        `I can answer questions about your spend data, analyse supplier performance,`,
        `identify savings opportunities, and generate executive summaries.`,
        `What would you like to explore today?`,
      ].join(' '),
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // ── REST fallback (used when WS is unavailable) ──────────────────────────
  const callRest = useCallback(async (text: string, assistantId: string) => {
    try {
      // Dynamic import avoids circular deps; apiClient auto-attaches JWT header
      const { apiClient } = await import('@/core/api/client');
      const { data } = await apiClient.post('/ignite/chat', {
        message: text,
        module_context: moduleContext,
        conversation_id: convId.current,
      });
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: data.reply ?? 'No response received.',
              isStreaming: false,
              citations: data.citations ?? [],
              isLocalInference: data.is_local_inference ?? false,
            }
          : m
      ));
      if (data.conversation_id) convId.current = data.conversation_id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `Error: ${msg}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsTyping(false);
    }
  }, [moduleContext]);

  // ── Open a fresh WebSocket for one send cycle ────────────────────────────
  const openWS = useCallback((): Promise<WebSocket> => {
    // Close any stale socket first
    const existing = wsRef.current;
    if (existing && existing.readyState !== WS_CLOSED) {
      existing.onclose = null;
      existing.close(1000, 'reconnecting');
    }
    wsRef.current = null;

    const token    = localStorage.getItem('piq_access_token') ?? '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host     = window.location.host;
    const ws       = new WebSocket(
      `${protocol}://${host}/api/v1/ignite/stream?token=${encodeURIComponent(token)}`
    );
    wsRef.current = ws;

    return new Promise((resolve, reject) => {
      // Timeout guard — if socket doesn't open in 5 s, reject
      const timeout = window.setTimeout(() => {
        ws.onopen = ws.onerror = null;
        reject(new Error('WS connect timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.onopen = null;
        resolve(ws);
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        ws.onopen = null;
        reject(new Error('WS connection error'));
      };
    });
  }, []);

  // ── Main send function ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: IgniteMessage = {
      id: nextId(), role: 'user', content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const assistantId = nextId();
    const placeholder: IgniteMessage = {
      id: assistantId, role: 'assistant', content: '',
      isStreaming: true, timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, placeholder]);
    setIsTyping(true);

    // ── Try WebSocket ──────────────────────────────────────────────────────
    let ws: WebSocket;
    try {
      ws = await openWS();
    } catch {
      // WS unavailable — use REST fallback
      await callRest(trimmed, assistantId);
      return;
    }

    let buffer     = '';
    let didReceive = false;
    let settled    = false;

    const finish = () => {
      ws.onmessage = null;
      ws.onerror   = null;
      ws.onclose   = () => { if (wsRef.current === ws) wsRef.current = null; };
      settled      = true;
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      if (!settled && !didReceive) {
        // Closed before any data — fall back to REST
        callRest(trimmed, assistantId);
      } else if (!settled) {
        // Closed mid-stream — show partial
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: buffer || 'Connection closed.', isStreaming: false }
            : m
        ));
        setIsTyping(false);
      }
    };

    ws.onerror = () => {
      finish();
      wsRef.current = null;
      if (!didReceive) {
        callRest(trimmed, assistantId);
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: buffer || 'Connection error.', isStreaming: false }
            : m
        ));
        setIsTyping(false);
      }
    };

    ws.onmessage = (evt: MessageEvent) => {
      didReceive = true;
      try {
        const event = JSON.parse(evt.data as string);

        if (event.type === 'token') {
          buffer += event.content as string;
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: buffer } : m
          ));

        } else if (event.type === 'done') {
          finish();
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content:         buffer,
                  isStreaming:      false,
                  citations:        (event.citations  as IgniteMessage['citations']) ?? [],
                  isLocalInference: (event.is_local_inference as boolean) ?? false,
                }
              : m
          ));
          setIsTyping(false);
          setIsLocal((event.is_local_inference as boolean) ?? false);
          if (event.conversation_id) convId.current = event.conversation_id as string;

        } else if (event.type === 'error') {
          finish();
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, content: (event.message as string) || 'An error occurred.', isStreaming: false }
              : m
          ));
          setIsTyping(false);
        }
      } catch {
        // Malformed JSON — ignore
      }
    };

    // Socket is open — send immediately
    ws.send(JSON.stringify({
      message:         trimmed,
      module_context:  moduleContext,
      conversation_id: convId.current,
    }));
  }, [moduleContext, isTyping, openWS, callRest]);

  // ── Clear chat ───────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    convId.current = null;
    setMessages([{
      id: nextId(), role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  return { messages, isTyping, isLocal, sendMessage, clearChat };
}

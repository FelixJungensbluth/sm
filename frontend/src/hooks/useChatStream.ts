import { useCallback, useRef } from 'react';
import type { ChatMessage } from '@/lib/chat-types';

export interface StreamMessage {
  type: 'token' | 'done' | 'error';
  content?: string;
  conversation_id?: string;
}

export function useChatStream() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamMessage = useCallback(
    async (
      message: string,
      conversationId: string | null,
      tenderId: string | null,
      contextType: string,
      onToken: (token: string) => void,
      onComplete: (conversationId: string) => void,
      onError: (error: string) => void
    ) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/chat/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              conversation_id: conversationId || null,
              tender_id: tenderId || null,
              context_type: contextType,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamMessage = JSON.parse(line.slice(6));
                
                if (data.type === 'token' && data.content) {
                  onToken(data.content);
                } else if (data.type === 'done' && data.conversation_id) {
                  onComplete(data.conversation_id);
                  return;
                } else if (data.type === 'error') {
                  onError(data.content || 'Unknown error');
                  return;
                }
              } catch (e) {
                // Silently handle parsing errors - they're usually recoverable
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return; // Request was cancelled
        }
        onError(error.message || 'Failed to stream message');
      } finally {
        abortControllerRef.current = null;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { streamMessage, cancel };
}



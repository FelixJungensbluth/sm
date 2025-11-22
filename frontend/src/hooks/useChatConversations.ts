import { useState, useCallback, useEffect } from 'react';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';

type ConversationsState = {
  conversations: Record<string, ChatConversation>;
};

interface UseChatConversationsResult {
  conversations: ChatConversation[];
  conversationsById: Record<string, ChatConversation>;
  isLoading: boolean;
}

const STORAGE_KEY = 'chat-conversations';

// Load conversations from localStorage
const loadConversationsFromStorage = (): ConversationsState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { conversations: JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load conversations from storage:', e);
  }
  return { conversations: {} };
};

// Save conversations to localStorage
const saveConversationsToStorage = (conversations: Record<string, ChatConversation>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations to storage:', e);
  }
};

/**
 * Hook for managing chat conversations stored locally
 */
export const useChatConversations = (): UseChatConversationsResult => {
  const [data, setData] = useState<ConversationsState>(() => {
    return loadConversationsFromStorage();
  });

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      setData(() => {
        const loaded = loadConversationsFromStorage();
        return loaded;
      });
    };

    window.addEventListener('conversations-updated', handleUpdate);
    return () => {
      window.removeEventListener('conversations-updated', handleUpdate);
    };
  }, []);

  const conversationsById = data?.conversations ?? {};
  const conversations = Object.values(conversationsById).sort((a, b) => {
    const aTime = new Date(a.updated_at).getTime();
    const bTime = new Date(b.updated_at).getTime();
    return bTime - aTime; // Most recent first
  });
  const isLoading = false;

  return { conversations, conversationsById, isLoading };
};

// Export update function
export const updateConversations = (
  updater: (conversations: Record<string, ChatConversation>) => Record<string, ChatConversation>
) => {
  const current = loadConversationsFromStorage();
  const updated = updater(current.conversations);
  saveConversationsToStorage(updated);
  // Dispatch event to notify listeners
  window.dispatchEvent(new CustomEvent('conversations-updated'));
};

// Helper to create a new conversation
export const createConversation = (
  title: string,
  context?: string
): ChatConversation => {
  const now = new Date().toISOString();
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    messages: [],
    context,
    created_at: now,
    updated_at: now,
  };
};

// Helper to add a message to a conversation
export const addMessageToConversation = (
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
) => {
  const now = new Date().toISOString();
  const newMessage: ChatMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now,
  };

  updateConversations((conversations) => {
    const conversation = conversations[conversationId];
    if (!conversation) {
      return conversations;
    }

    return {
      ...conversations,
      [conversationId]: {
        ...conversation,
        messages: [...conversation.messages, newMessage],
        updated_at: now,
      },
    };
  });
};

// Helper to update conversation title
export const updateConversationTitle = (conversationId: string, title: string) => {
  updateConversations((conversations) => {
    const conversation = conversations[conversationId];
    if (!conversation) {
      return conversations;
    }

    return {
      ...conversations,
      [conversationId]: {
        ...conversation,
        title,
        updated_at: new Date().toISOString(),
      },
    };
  });
};

// Helper to delete a conversation
export const deleteConversation = (conversationId: string) => {
  updateConversations((conversations) => {
    const updated = { ...conversations };
    delete updated[conversationId];
    return updated;
  });
};







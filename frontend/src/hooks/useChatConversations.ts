import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';

interface UseChatConversationsResult {
  conversations: ChatConversation[];
  conversationsById: Record<string, ChatConversation>;
  isLoading: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Hook for managing chat conversations from backend API
 */
export const useChatConversations = (): UseChatConversationsResult => {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json() as Promise<ChatConversation[]>;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const conversationsById = conversations.reduce(
    (acc, conv) => {
      acc[conv.id] = conv;
      return acc;
    },
    {} as Record<string, ChatConversation>
  );

  return { conversations, conversationsById, isLoading };
};

// Helper to create a new conversation
export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      tenderId,
      contextType,
    }: {
      title: string;
      tenderId?: string | null;
      contextType?: string;
    }) => {
      const params = new URLSearchParams({ title });
      if (tenderId) params.append('tender_id', tenderId);
      if (contextType) params.append('context_type', contextType);

      const response = await fetch(
        `${API_BASE_URL}/chat/conversations?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      return response.json() as Promise<ChatConversation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

// Helper to update conversation title
export const useUpdateConversationTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}/title?title=${encodeURIComponent(title)}`,
        {
          method: 'PUT',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to update conversation title');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Update both the conversations list and the individual conversation
      queryClient.setQueryData<ChatConversation[]>(['chat', 'conversations'], (old) =>
        old?.map((conv) =>
          conv.id === variables.conversationId ? { ...conv, title: variables.title } : conv
        )
      );
      queryClient.setQueryData<ChatConversation>(['chat', 'conversation', variables.conversationId], (old) =>
        old ? { ...old, title: variables.title } : old
      );
    },
  });
};

// Helper to delete a conversation
export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

// Helper to get a single conversation
export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return response.json() as Promise<ChatConversation>;
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });
};







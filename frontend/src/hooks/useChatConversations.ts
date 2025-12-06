import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';
import { useApi } from '@/hooks/use-api';

interface UseChatConversationsResult {
  conversations: ChatConversation[];
  conversationsById: Record<string, ChatConversation>;
  isLoading: boolean;
}

/**
 * Hook for managing chat conversations from backend API
 */
export const useChatConversations = (): UseChatConversationsResult => {
  const api = useApi();
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const res = await api.chat.getConversations();
      return res.data.conversations;
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
  const api = useApi();
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
      const res = await api.chat.createConversation({
        title,
        tender_id: tenderId ?? undefined,
        context_type: contextType ?? undefined,
      });
      return res.data.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

// Helper to update conversation title
export const useUpdateConversationTitle = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => {
      const res = await api.chat.updateConversationTitle(conversationId, { title });
      return res.data;
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
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await api.chat.deleteConversation(conversationId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

// Helper to get a single conversation
export const useConversation = (conversationId: string | null) => {
  const api = useApi();
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await api.chat.getConversation(conversationId);
      return res.data.conversation;
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });
};







import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Send,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useChatConversations,
  useCreateConversation,
  useUpdateConversationTitle,
  useDeleteConversation,
  useConversation,
  useSendMessage,
} from '@/hooks/useChatConversations';
import { useTenders } from '@/hooks/use-tenders';
import type { ChatContext } from '@/lib/chat-types';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Chat() {
  const [searchParams] = useSearchParams();
  const { conversations, isLoading: conversationsLoading } = useChatConversations();
  const { data: tenders = [] } = useTenders();
  const createConversation = useCreateConversation();
  const updateTitle = useUpdateConversationTitle();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendMessage();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<ChatContext>({ id: 'global', name: 'All Tenders' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: selectedConversation, refetch: refetchConversation } = useConversation(selectedConversationId);

  // Build available contexts - no "No Context" option
  const availableContexts: ChatContext[] = [
    { id: 'global', name: 'All Tenders' },
    ...tenders.map((t) => ({
      id: 'tender',
      name: t.title,
      tender_id: t.id,
    })),
  ];

  // Set context from URL parameter if tenderId is provided, otherwise default to global
  useEffect(() => {
    const tenderIdFromUrl = searchParams.get('tenderId');
    if (tenderIdFromUrl && tenders.length > 0) {
      const tender = tenders.find((t) => t.id === tenderIdFromUrl);
      if (tender) {
        setSelectedContext({
          id: 'tender',
          name: tender.title,
          tender_id: tender.id,
        });
      }
    } else if (!selectedContext.tender_id && selectedContext.id !== 'global') {
      // Ensure we always have a valid context (default to global)
      setSelectedContext({ id: 'global', name: 'All Tenders' });
    }
  }, [searchParams, tenders]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleNewConversation = useCallback(async () => {
    try {
      const contextType = selectedContext.id === 'tender' && selectedContext.tender_id ? 'tender' : 'global';
      const result = await createConversation.mutateAsync({
        title: 'New Conversation',
        tenderId: selectedContext.tender_id || null,
        contextType,
      });
      setSelectedConversationId(result.id);
      setInputValue('');
    } catch (error) {
      toast.error('Failed to create conversation');
      throw error;
    }
  }, [selectedContext, createConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || sendMessage.isPending) return;

    const messageContent = inputValue.trim();
    setInputValue('');

    let convId = selectedConversationId;

    try {
      // Create new conversation if none selected
      if (!convId) {
        const contextType = selectedContext.id === 'tender' && selectedContext.tender_id ? 'tender' : 'global';
        const result = await createConversation.mutateAsync({
          title: messageContent.slice(0, 50) || 'New Conversation',
          tenderId: selectedContext.tender_id || null,
          contextType,
        });
        convId = result.id;
        setSelectedConversationId(convId);
      }

      // Determine context type - ensure it's never 'none'
      let contextType = selectedContext.id === 'tender' && selectedContext.tender_id ? 'tender' : 'global';

      // Send the message
      await sendMessage.mutateAsync({
        message: messageContent,
        conversationId: convId,
        tenderId: selectedContext.tender_id || null,
        contextType,
      });

      // Refetch conversation to get updated messages
      await refetchConversation();
    } catch (error) {
      toast.error('Failed to send message');
    }
  }, [inputValue, selectedConversationId, selectedContext, sendMessage, createConversation, refetchConversation]);

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, conversationId: string) => {
      e.stopPropagation();
      try {
        await deleteConversation.mutateAsync(conversationId);
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
        }
      } catch (error) {
        toast.error('Failed to delete conversation');
        throw error;
      }
    },
    [selectedConversationId, deleteConversation]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Update conversation title from first message if it's still "New Conversation"
  const titleUpdateRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (selectedConversation && selectedConversation.title === 'New Conversation') {
      // Only update if we haven't already tried to update this conversation
      if (!titleUpdateRef.current.has(selectedConversation.id)) {
        const firstUserMessage = selectedConversation.messages.find((m) => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content.trim()) {
          const newTitle = firstUserMessage.content.slice(0, 50);
          titleUpdateRef.current.add(selectedConversation.id);
          updateTitle.mutate({
            conversationId: selectedConversation.id,
            title: newTitle,
          });
        }
      }
    }
  }, [selectedConversation?.id, selectedConversation?.title, selectedConversation?.messages.length, updateTitle]);


  const displayMessages = selectedConversation?.messages || [];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 min-h-0 flex">
        {/* Sidebar - Recent Conversations */}
        <div className="w-[25%] min-w-0 min-h-0 overflow-hidden border-r border-border bg-muted/30">
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between bg-background">
              <h2 className="font-semibold text-sm">Conversations</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewConversation}
                aria-label="New conversation"
                disabled={createConversation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 opacity-50 animate-spin" />
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation to begin</p>
                </div>
              ) : (
                <div>
                  {conversations.map((conv, index) => (
                    <div key={conv.id}>
                      <div
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={cn(
                          'group relative p-3 cursor-pointer transition-colors border-b border-border',
                          selectedConversationId === conv.id
                            ? 'bg-blue-50'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            {conv.messages.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {conv.messages[conv.messages.length - 1].content}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            aria-label="Delete conversation"
                            disabled={deleteConversation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-[75%] min-w-0 min-h-0 overflow-hidden flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-4',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] px-4 py-3 border',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-blue-50 border-blue-200'
                      )}
                    >
                      <div className="text-sm leading-relaxed markdown-content">
                        <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                      </div>
                      <p className={cn(
                        'text-xs mt-2 text-muted-foreground',
                        message.role === 'user' ? 'opacity-80' : 'opacity-70'
                      )}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Loading indicator while sending message */}
                {sendMessage.isPending && (
                  <div className="flex gap-4 justify-start">
                    <div className="max-w-[80%] px-4 py-3 bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                        <p className="text-sm text-muted-foreground">Thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border bg-background p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Context:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        {selectedContext.name}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                      <DropdownMenuLabel>Select Context</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableContexts.map((context) => (
                        <DropdownMenuItem
                          key={context.tender_id || context.id}
                          onClick={() => setSelectedContext(context)}
                        >
                          {context.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                    className="min-h-[60px] max-h-[200px] resize-none"
                    rows={1}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || sendMessage.isPending}
                    size="icon"
                    className="self-end h-[60px] w-[60px]"
                    aria-label="Send message"
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <div className="text-center space-y-4 max-w-md">
                <MessageSquare className="h-16 w-16 mx-auto opacity-50" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a conversation from the sidebar or create a new one to begin chatting.
                  </p>
                  <Button onClick={handleNewConversation} disabled={createConversation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

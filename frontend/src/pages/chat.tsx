import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
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
} from '@/hooks/useChatConversations';
import { useChatStream } from '@/hooks/useChatStream';
import { useTenders } from '@/hooks/use-tenders';
import type { ChatContext } from '@/lib/chat-types';
import { toast } from 'sonner';

export function Chat() {
  const [searchParams] = useSearchParams();
  const { conversations, isLoading: conversationsLoading } = useChatConversations();
  const { data: tenders = [] } = useTenders();
  const createConversation = useCreateConversation();
  const updateTitle = useUpdateConversationTitle();
  const deleteConversation = useDeleteConversation();
  const { streamMessage, cancel } = useChatStream();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<ChatContext>({ id: 'none', name: 'No Context' });
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: selectedConversation, refetch: refetchConversation } = useConversation(selectedConversationId);
  const lastStreamedConvId = useRef<string | null>(null);

  // Build available contexts
  const availableContexts: ChatContext[] = [
    { id: 'none', name: 'No Context' },
    { id: 'global', name: 'All Tenders' },
    ...tenders.map((t) => ({
      id: 'tender',
      name: t.title,
      tender_id: t.id,
    })),
  ];

  // Set context from URL parameter if tenderId is provided
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
    }
  }, [searchParams, tenders]);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages, streamingContent, pendingUserMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleNewConversation = useCallback(async () => {
    try {
      const result = await createConversation.mutateAsync({
        title: 'New Conversation',
        tenderId: selectedContext.tender_id || null,
        contextType: selectedContext.id,
      });
      setSelectedConversationId(result.id);
      setInputValue('');
    } catch (error) {
      toast.error('Failed to create conversation');
      throw error;
    }
  }, [selectedContext, createConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setPendingUserMessage(messageContent); // Show user message immediately
    setIsStreaming(true);
    setStreamingContent('');

    let convId = selectedConversationId;

    try {
      // Create new conversation if none selected
      if (!convId) {
        const result = await createConversation.mutateAsync({
          title: messageContent.slice(0, 50) || 'New Conversation',
          tenderId: selectedContext.tender_id || null,
          contextType: selectedContext.id,
        });
        convId = result.id;
        setSelectedConversationId(convId);
      }

      // Determine context type
      let contextType = selectedContext.id;
      if (selectedContext.id === 'tender' && selectedContext.tender_id) {
        contextType = 'tender';
      }

      // Stream the response
      await streamMessage(
        messageContent,
        convId,
        selectedContext.tender_id || null,
        contextType,
        (token) => {
          setStreamingContent((prev) => prev + token);
        },
        (completedConvId) => {
          setIsStreaming(false);
          setStreamingContent('');
          setPendingUserMessage(null); // Clear pending message
          setSelectedConversationId(completedConvId);
          // Only refetch once after streaming completes to get the saved messages
          if (lastStreamedConvId.current !== completedConvId) {
            lastStreamedConvId.current = completedConvId;
            // Use setTimeout to debounce and avoid immediate refetch loops
            setTimeout(() => {
              refetchConversation();
            }, 500);
          }
        },
        () => {
          setIsStreaming(false);
          setStreamingContent('');
          setPendingUserMessage(null); // Clear pending message on error
          toast.error('Failed to stream message');
        }
      );
    } catch (error) {
      setIsStreaming(false);
      setStreamingContent('');
      setPendingUserMessage(null); // Clear pending message on error
      toast.error('Failed to send message');
      throw error;
    }
  }, [inputValue, selectedConversationId, selectedContext, isStreaming, createConversation, streamMessage]);

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

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const displayMessages = selectedConversation?.messages || [];

  return (
    <div className="h-full flex flex-col bg-background">
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Sidebar - Recent Conversations */}
        <Panel
          id="conversations-sidebar"
          defaultSize={25}
          minSize={20}
          maxSize={40}
          className="min-w-0 min-h-0 overflow-hidden border-r bg-muted/30"
        >
          <div className="h-full flex flex-col">
            <div className="p-2 border-b flex items-center justify-between">
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
                <div className="p-2 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto mb-1 opacity-50 animate-spin" />
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-0.5">Start a new conversation to begin</p>
                </div>
              ) : (
                <div className="p-1">
                  {conversations.map((conv, index) => (
                    <div key={conv.id}>
                      <div
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={cn(
                          'group relative p-3 cursor-pointer transition-colors',
                          selectedConversationId === conv.id
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
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
                      {index < conversations.length - 1 && (
                        <div className="border-b border-border mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle/>
        <Panel
          id="chat-main"
          defaultSize={75}
          minSize={60}
          className="min-w-0 min-h-0 overflow-hidden flex flex-col"
        >
          {selectedConversation ? (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] px-5 py-3 border',
                        message.role === 'user'
                          ? 'bg-primary/90 text-primary-foreground border-primary/30'
                          : 'bg-gray-200 border-border'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className={cn(
                        'text-xs mt-2',
                        message.role === 'user' ? 'opacity-80' : 'opacity-70'
                      )}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Pending user message (shown immediately) */}
                {pendingUserMessage && (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[80%] px-5 py-3 border bg-primary/90 text-primary-foreground border-primary/30">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{pendingUserMessage}</p>
                      <p className="text-xs mt-2 opacity-80">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
                {/* Loading indicator or streaming message */}
                {isStreaming && (
                  <div className="flex gap-3 justify-start">
                    <div className="max-w-[80%] px-5 py-3 bg-gray-200 border border-border">
                      {streamingContent ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {streamingContent}
                          <span className="animate-pulse">▋</span>
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                          <p className="text-sm text-muted-foreground">Thinking...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        Context: {selectedContext.name}
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
                    disabled={isStreaming}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isStreaming}
                    size="icon"
                    className="self-end"
                    aria-label="Send message"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
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
        </Panel>
      </PanelGroup>
    </div>
  );
}

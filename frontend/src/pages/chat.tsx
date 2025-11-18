import { useState, useCallback, useRef, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useChatConversations,
  createConversation,
  addMessageToConversation,
  updateConversationTitle,
  deleteConversation,
  updateConversations,
} from '@/hooks/useChatConversations';
import type { ChatConversation, ChatContext } from '@/lib/chat-types';

// Available contexts - can be extended later
const AVAILABLE_CONTEXTS: ChatContext[] = [
  { id: 'none', name: 'No Context' },
  { id: 'project', name: 'Project Context' },
  { id: 'document', name: 'Document Context' },
  { id: 'codebase', name: 'Codebase Context' },
];

export function Chat() {
  const { conversations, conversationsById } = useChatConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<ChatContext>(AVAILABLE_CONTEXTS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedConversation = selectedConversationId
    ? conversationsById[selectedConversationId]
    : null;

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

  const handleNewConversation = useCallback(() => {
    const newConv = createConversation('New Conversation', selectedContext.id);
    updateConversations((convs) => ({
      ...convs,
      [newConv.id]: newConv,
    }));
    setSelectedConversationId(newConv.id);
    setInputValue('');
  }, [selectedContext]);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    let convId = selectedConversationId;
    
    // Create new conversation if none selected
    if (!convId) {
      const newConv = createConversation(
        inputValue.slice(0, 50) || 'New Conversation',
        selectedContext.id
      );
      updateConversations((convs) => ({
        ...convs,
        [newConv.id]: newConv,
      }));
      convId = newConv.id;
      setSelectedConversationId(convId);
    }

    // Add user message
    addMessageToConversation(convId, {
      role: 'user',
      content: inputValue,
    });

    // TODO: Send to backend API and get response
    // For now, add a placeholder assistant response
    setTimeout(() => {
      addMessageToConversation(convId!, {
        role: 'assistant',
        content: 'This is a placeholder response. Connect to your backend API to get real responses.',
      });
    }, 500);

    setInputValue('');
  }, [inputValue, selectedConversationId, selectedContext]);

  const handleDeleteConversation = useCallback(
    (e: React.MouseEvent, conversationId: string) => {
      e.stopPropagation();
      deleteConversation(conversationId);
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
    },
    [selectedConversationId]
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
  useEffect(() => {
    if (selectedConversation && selectedConversation.title === 'New Conversation') {
      const firstUserMessage = selectedConversation.messages.find((m) => m.role === 'user');
      if (firstUserMessage) {
        const newTitle = firstUserMessage.content.slice(0, 50);
        updateConversationTitle(selectedConversation.id, newTitle);
      }
    }
  }, [selectedConversation]);

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
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">Conversations</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewConversation}
                aria-label="New conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation to begin</p>
                </div>
              ) : (
                <div className="p-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={cn(
                        'group relative p-3 rounded-lg cursor-pointer transition-colors mb-1',
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
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle
          id="handle-conversations-chat"
          className={cn(
            'relative z-30 bg-border cursor-col-resize group touch-none',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            'focus-visible:ring-offset-1 focus-visible:ring-offset-background',
            'transition-all w-1'
          )}
          aria-label="Resize panels"
          role="separator"
          aria-orientation="vertical"
        >
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 bg-muted/90 border border-border rounded-full px-1.5 py-3 opacity-70 group-hover:opacity-100 group-focus:opacity-100 transition-opacity shadow-sm">
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          </div>
        </PanelResizeHandle>

        {/* Main Chat Area */}
        <Panel
          id="chat-main"
          defaultSize={75}
          minSize={60}
          className="min-w-0 min-h-0 overflow-hidden flex flex-col"
        >
          {selectedConversation ? (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
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
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Select Context</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {AVAILABLE_CONTEXTS.map((context) => (
                        <DropdownMenuItem
                          key={context.id}
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
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    size="icon"
                    className="self-end"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
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
                  <Button onClick={handleNewConversation}>
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


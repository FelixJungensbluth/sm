export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  context?: string;
  created_at: string;
  updated_at: string;
};

export type ChatContext = {
  id: string;
  name: string;
  description?: string;
};







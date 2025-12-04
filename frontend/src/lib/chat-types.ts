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
  context_type?: string;
  tender_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatContext = {
  id: string;
  name: string;
  description?: string;
  tender_id?: string;
};







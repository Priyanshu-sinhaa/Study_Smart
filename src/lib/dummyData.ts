// Type definitions shared across canvas components

export interface CanvasNodeData {
  label?: string;
  question?: string;
  answer?: string;
  title?: string;
  definition?: string;
  intuition?: string;
  contextRole?: string;
  depth?: 'basic' | 'advanced';
  subpoints?: string[];
  whyItMatters?: string;
  parentConcept?: string;
  code?: string;
  language?: string;
  concepts?: string[];
  fileSource?: string;
  pageNumber?: number;
}

export interface RevisionItem {
  id: string;
  title: string;
  type: 'concept' | 'code' | 'phrase' | 'subtopic';
  summary: string;
  originalNodeId: string;
  addedAt: string;
}

// Keep MockRevisionItem as alias for backward compat with Sidebar component
export type MockRevisionItem = RevisionItem;

export interface LearningSession {
  id: string;
  title: string;
  createdAt: string;
}

// Available LLM models — only Groq-compatible models listed as free defaults
export const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B', provider: 'Groq', cost: 'Free (System Key)', status: 'active', keyRequired: false },
  { id: 'llama-3.1-8b-instant',    name: 'Groq Llama 3.1 8B',  provider: 'Groq', cost: 'Free (System Key)', status: 'active', keyRequired: false },
  { id: 'gpt-4o',        name: 'GPT-4o',           provider: 'OpenAI',    cost: '$0.005 / 1k tokens', status: 'locked', keyRequired: true },
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', cost: '$0.003 / 1k tokens', status: 'locked', keyRequired: true },
];

// Keep DUMMY_MODELS as alias so existing imports don't break
export const DUMMY_MODELS = AVAILABLE_MODELS;

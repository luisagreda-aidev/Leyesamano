export interface Source {
  title?: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
  timestamp: number;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}
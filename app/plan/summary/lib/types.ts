// Cross-component types for the summary surface.

export interface EditTarget {
  sectionIdx: number;
  lineIdx: number;
}

export interface RouteStop {
  city: string;
  startDate?: string;
  endDate?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

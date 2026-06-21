export interface SSEEvent {
  type: string;
  project?: string;
  environment?: string;
  changedKeys?: string[];
  targetClient?: string;
  timestamp: string;
  [key: string]: unknown;
}

export type SSEListener = (event: SSEEvent) => void;

export interface SSEFilter {
  project?: string | null;
  environment?: string | null;
  eventTypes?: string[];
}

export function matchSSEEvent(event: SSEEvent, filter: SSEFilter): boolean {
  if (filter.eventTypes && filter.eventTypes.length > 0) {
    if (!filter.eventTypes.includes(event.type)) return false;
  }

  if (filter.project !== undefined && filter.project !== null) {
    if (event.project !== filter.project) return false;
  }

  if (filter.environment !== undefined && filter.environment !== null) {
    if (event.environment !== filter.environment) return false;
  }

  return true;
}

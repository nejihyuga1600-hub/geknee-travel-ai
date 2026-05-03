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

// The shape consumed by BookView. Lifted out of the now-deleted BookTab.tsx
// so the booking surface no longer pins a 1,880-line legacy file alive
// just for a 12-field type.
export interface BookTabProps {
  location: string;
  purpose: string;
  style: string;
  budget: string;
  interests: string;
  startDate: string;
  endDate: string;
  nights: string;
  stops?: string;
  travelingFrom?: string;
  fullItinerary?: string;
  /** Trip ID — required for the slot-in adjust endpoint to find the
   *  trip in the DB. When absent, the Add-to-itinerary action stays
   *  disabled. */
  tripId?: string;
  /** Called after a successful /api/itinerary/adjust round trip with
   *  the updated full itinerary. SummaryView uses this to refresh the
   *  rendered day cards in place without a page reload. */
  onItineraryAdjusted?: (newItinerary: string) => void;
}

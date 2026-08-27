export type LandmarkCategory =
  | 'academic'
  | 'facility'
  | 'sports'
  | 'food'
  | 'admin'
  | 'parking';

export interface Landmark {
  id: string;
  name: string;
  shortName: string;
  subtitle?: string;
  category: LandmarkCategory;
  coordinates: [number, number]; // [y, x] in Leaflet CRS.Simple (0-1600, 0-1000)
  iconName: string;
  description: string;
  departments?: string[];
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  locationId: string;
  locationName: string;
  proofImageUrl: string;
  clubName?: string;
  authorName?: string;
  createdAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms (createdAt + 24*3600*1000)
  likesCount: number;
  tags?: string[];
}

export interface NewEventPayload {
  title: string;
  description: string;
  locationId: string;
  proofImageUrl: string;
  clubName?: string;
  authorName?: string;
  tags?: string[];
}

export interface StoryGroup {
  locationId: string;
  locationName: string;
  events: CampusEvent[];
  latestEvent: CampusEvent;
  hasUnseen?: boolean;
}

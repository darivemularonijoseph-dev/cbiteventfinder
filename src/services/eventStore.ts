import { CampusEvent, NewEventPayload } from '../types';
import { LANDMARK_LOOKUP } from '../data/landmarks';
import { db, isFirebaseConfigured } from '../firebase.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';

const STORAGE_KEY = 'cbit_campus_events_v3';
const BROADCAST_CHANNEL_NAME = 'cbit_events_channel';
const EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

class EventStore {
  private events: CampusEvent[] = [];
  private listeners: Set<(events: CampusEvent[]) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private timerId: number | null = null;
  private firestoreUnsubscribe: Unsubscribe | null = null;
  public isFirestoreActive: boolean = false;

  constructor() {
    this.initStorage();
    this.initBroadcast();
    this.initFirestoreSync();
    this.startCleanupTimer();
  }

  private initStorage() {
    try {
      localStorage.removeItem('cbit_campus_events_v1');
      localStorage.removeItem('cbit_campus_events_v2');

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CampusEvent[] = JSON.parse(stored);
        const now = Date.now();
        const valid = parsed.filter((e) => e.expiresAt > now);
        this.events = valid;
        this.saveToStorage();
        return;
      }
    } catch (err) {
      console.warn('Failed to parse stored events', err);
    }

    this.events = [];
    this.saveToStorage();
  }

  private initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (message) => {
        if (message.data?.type === 'SYNC_EVENTS') {
          this.loadFromStorage();
        }
      };
    }
  }

  private initFirestoreSync() {
    if (!db || !isFirebaseConfigured()) {
      this.isFirestoreActive = false;
      return;
    }

    try {
      const eventsCol = collection(db, 'events');
      const q = query(eventsCol, orderBy('createdAt', 'desc'));

      this.firestoreUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteEvents: CampusEvent[] = [];
          const now = Date.now();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const event: CampusEvent = {
              id: docSnap.id,
              title: data.title || '',
              description: data.description || '',
              locationId: data.locationId || '',
              locationName: data.locationName || '',
              clubName: data.clubName || undefined,
              authorName: data.authorName || undefined,
              createdAt: data.createdAt || now,
              expiresAt: data.expiresAt || (data.createdAt ? data.createdAt + EXPIRY_DURATION_MS : now + EXPIRY_DURATION_MS),
              likesCount: data.likesCount || 0,
              tags: data.tags || [],
              proofImageUrl: data.proofImageUrl || '',
            };

            if (event.expiresAt > now) {
              remoteEvents.push(event);
            }
          });

          this.events = remoteEvents;
          this.isFirestoreActive = true;
          this.saveToStorage();
          this.notify();
        },
        (error) => {
          console.warn('Firestore snapshot listener note:', error.message);
          this.isFirestoreActive = false;
        }
      );
    } catch (err) {
      console.warn('Firestore initialization note:', err);
      this.isFirestoreActive = false;
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const now = Date.now();
        this.events = (JSON.parse(stored) as CampusEvent[]).filter(
          (e) => e.expiresAt > now
        );
        this.notify();
      }
    } catch (err) {
      console.error(err);
    }
  }

  private saveToStorage() {
    try {
      const now = Date.now();
      const valid = this.events.filter((e) => e.expiresAt > now);
      this.events = valid;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    } catch (err) {
      console.error('Storage write error', err);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.events]));
  }

  private notifyBroadcast() {
    this.notify();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'SYNC_EVENTS' });
    }
  }

  private startCleanupTimer() {
    if (typeof window !== 'undefined') {
      this.timerId = window.setInterval(() => {
        const now = Date.now();
        const initialCount = this.events.length;
        const valid = this.events.filter((e) => e.expiresAt > now);
        if (valid.length !== initialCount) {
          this.events = valid;
          this.saveToStorage();
          this.notifyBroadcast();
        }
      }, 30000);
    }
  }

  public getActiveEvents(): CampusEvent[] {
    const now = Date.now();
    return this.events.filter((e) => e.expiresAt > now);
  }

  public getAllEvents(): CampusEvent[] {
    return [...this.events];
  }

  public getEventsByLocation(locationId: string): CampusEvent[] {
    const now = Date.now();
    return this.events
      .filter((e) => e.locationId === locationId && e.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public async addEvent(payload: NewEventPayload): Promise<CampusEvent> {
    const now = Date.now();
    const landmark = LANDMARK_LOOKUP[payload.locationId];
    const locationName = landmark ? landmark.name : payload.locationId;
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newEvent: CampusEvent = {
      id: eventId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      locationId: payload.locationId,
      locationName,
      proofImageUrl: payload.proofImageUrl,
      clubName: payload.clubName?.trim() || undefined,
      authorName: payload.authorName?.trim() || undefined,
      createdAt: now,
      expiresAt: now + EXPIRY_DURATION_MS,
      likesCount: 0,
      tags: payload.tags || [],
    };

    // Optimistic local update
    this.events.unshift(newEvent);
    this.saveToStorage();
    this.notifyBroadcast();

    // Firestore sync if available
    if (db && isFirebaseConfigured()) {
      try {
        const eventDocRef = doc(db, 'events', eventId);
        await setDoc(eventDocRef, {
          title: newEvent.title,
          description: newEvent.description,
          locationId: newEvent.locationId,
          locationName: newEvent.locationName,
          proofImageUrl: newEvent.proofImageUrl,
          clubName: newEvent.clubName || null,
          authorName: newEvent.authorName || null,
          createdAt: newEvent.createdAt,
          expiresAt: newEvent.expiresAt,
          likesCount: 0,
          tags: newEvent.tags,
        });
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }
    }

    return newEvent;
  }

  public async likeEvent(eventId: string): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.likesCount = (event.likesCount || 0) + 1;
      this.saveToStorage();
      this.notifyBroadcast();
    }

    if (db && isFirebaseConfigured()) {
      try {
        const eventDocRef = doc(db, 'events', eventId);
        await updateDoc(eventDocRef, {
          likesCount: increment(1),
        });
      } catch (err) {
        console.warn('Firestore like update warning:', err);
      }
    }
  }

  public async deleteEvent(eventId: string): Promise<void> {
    this.events = this.events.filter((e) => e.id !== eventId);
    this.saveToStorage();
    this.notifyBroadcast();

    if (db && isFirebaseConfigured()) {
      try {
        const eventDocRef = doc(db, 'events', eventId);
        await deleteDoc(eventDocRef);
      } catch (err) {
        console.warn('Firestore delete warning:', err);
      }
    }
  }

  public async clearAllEvents(): Promise<void> {
    const existingIds = this.events.map((e) => e.id);
    this.events = [];
    this.saveToStorage();
    this.notifyBroadcast();

    if (db && isFirebaseConfigured()) {
      try {
        for (const id of existingIds) {
          await deleteDoc(doc(db, 'events', id));
        }
      } catch (err) {
        console.warn('Firestore clear error:', err);
      }
    }
  }

  public resetToDefaults(): void {
    this.clearAllEvents();
  }

  public subscribe(callback: (events: CampusEvent[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.getActiveEvents()]);

    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const eventStore = new EventStore();

/**
 * Compresses an image file down to max 1200px width/height and returns base64 data URI
 */
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formats time remaining in "18h 32m 10s" or "Expires in 42m"
 */
export function formatTimeRemaining(expiresAt: number): {
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
  isExpiringSoon: boolean;
  percentage: number;
} {
  const now = Date.now();
  const diffMs = Math.max(0, expiresAt - now);

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const percentage = Math.min(100, Math.max(0, (diffMs / (24 * 3600 * 1000)) * 100));
  const isExpiringSoon = hours < 2;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return {
    formatted,
    hours,
    minutes,
    seconds,
    isExpiringSoon,
    percentage,
  };
}

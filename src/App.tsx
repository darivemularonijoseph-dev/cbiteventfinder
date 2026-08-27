import React, { useState, useEffect } from 'react';
import { CampusEvent, Landmark, NewEventPayload } from './types';
import { CAMPUS_LANDMARKS, LANDMARK_LOOKUP } from './data/landmarks';
import { eventStore } from './services/eventStore';
import { Navbar } from './components/Navbar';
import { StoriesBar } from './components/StoriesBar';
import { CampusMap } from './components/CampusMap';
import { EventDetailPopup } from './components/EventDetailPopup';
import { AddEventModal } from './components/AddEventModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { SidebarFeed } from './components/SidebarFeed';
import { LandmarkDirectoryModal } from './components/LandmarkDirectoryModal';
import { AdminPanel } from './components/AdminPanel';
import { Plus, Sparkles, MapPin, Compass } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'/' | '/admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin') || hash === '#/admin' || hash === '#admin') {
        return '/admin';
      }
    }
    return '/';
  });

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);

  // Sync route with browser URL history
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin') || hash === '#/admin' || hash === '#admin') {
        setCurrentRoute('/admin');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (route: '/' | '/admin') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', route);
      } catch {
        window.location.hash = route === '/admin' ? '/admin' : '';
      }
    }
  };

  // Subscribe to real-time event updates
  useEffect(() => {
    const unsubscribe = eventStore.subscribe((updatedEvents) => {
      setEvents(updatedEvents);
    });
    return () => unsubscribe();
  }, []);

  // Handle selecting an event from Stories Bar, Feed, or Pin
  const handleSelectEvent = (event: CampusEvent) => {
    const landmark = LANDMARK_LOOKUP[event.locationId];
    if (landmark) {
      setSelectedLandmark(landmark);
      setSelectedEventId(event.id);
    }
  };

  // Handle clicking a landmark on the map
  const handleSelectLandmark = (landmark: Landmark, eventId?: string) => {
    setSelectedLandmark(landmark);
    setSelectedEventId(eventId);
  };

  // Handle opening add modal for a specific location
  const handleOpenAddModalAtLocation = (locationId?: string) => {
    setPreselectedLocationId(locationId);
    setIsAddModalOpen(true);
  };

  // Handle opening Story Viewer from Stories Bar
  const handleOpenStoryViewer = (index: number) => {
    setStoryViewerIndex(index);
    setIsStoryViewerOpen(true);
  };

  // Handle submitting new event
  const handleSubmitNewEvent = async (payload: NewEventPayload) => {
    const createdEvent = await eventStore.addEvent(payload);
    // Pan to the newly created event
    const landmark = LANDMARK_LOOKUP[payload.locationId];
    if (landmark) {
      setSelectedLandmark(landmark);
      setSelectedEventId(createdEvent.id);
    }
  };

  // Handle cheering / liking an event
  const handleLikeEvent = (eventId: string) => {
    eventStore.likeEvent(eventId);
  };

  // Handle deleting an event
  const handleDeleteEvent = (eventId: string) => {
    eventStore.deleteEvent(eventId);
  };

  // Reset map view to campus center
  const handleResetMapView = () => {
    setSelectedLandmark(null);
    setSelectedEventId(undefined);
  };

  // If viewing the Admin Panel route
  if (currentRoute === '/admin') {
    return <AdminPanel onBackToMap={() => navigateTo('/')} />;
  }

  // Active events at currently selected landmark
  const currentLandmarkEvents = selectedLandmark
    ? events.filter((e) => e.locationId === selectedLandmark.id)
    : [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a1628] flex flex-col font-sans select-none text-white">
      
      {/* 1. TOP HEADER & BRANDING */}
      <Navbar
        activeCount={events.length}
        onOpenAddModal={() => handleOpenAddModalAtLocation(undefined)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onResetView={handleResetMapView}
        onNavigateAdmin={() => navigateTo('/admin')}
      />

      {/* 2. INSTAGRAM-STYLE STORIES BAR */}
      <StoriesBar
        events={events}
        onSelectEvent={handleSelectEvent}
        onOpenAddModal={() => handleOpenAddModalAtLocation(undefined)}
        onOpenStoryViewer={handleOpenStoryViewer}
      />

      {/* 3. MAIN INTERACTIVE CAMPUS MAP (LEAFLET CRS.SIMPLE) */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <CampusMap
          events={events}
          selectedLandmark={selectedLandmark}
          onSelectLandmark={handleSelectLandmark}
          onOpenAddModalAtLocation={handleOpenAddModalAtLocation}
        />

        {/* 4. EVENT DETAIL POPUP / GLASSMORPHISM CARD */}
        {selectedLandmark && (
          <EventDetailPopup
            landmark={selectedLandmark}
            events={currentLandmarkEvents}
            initialEventId={selectedEventId}
            onClose={() => {
              setSelectedLandmark(null);
              setSelectedEventId(undefined);
            }}
            onLikeEvent={handleLikeEvent}
            onDeleteEvent={handleDeleteEvent}
            onAddNewAtLocation={handleOpenAddModalAtLocation}
          />
        )}

        {/* 5. FLOATING "+" ACTION BUTTON ON BOTTOM RIGHT */}
        <button
          id="btn-floating-add-event"
          onClick={() => handleOpenAddModalAtLocation(undefined)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e63946] hover:bg-red-500 rounded-full flex items-center justify-center text-3xl sm:text-4xl text-white shadow-2xl shadow-red-600/40 border-4 border-[#0a1628] hover:scale-105 active:scale-95 transition-all fixed bottom-8 right-8 z-40 cursor-pointer"
          title="Post Live Campus Event (24h Expiry)"
          aria-label="Add Event"
        >
          +
        </button>
      </main>

      {/* 6. SIDEBAR / FEED DRAWER */}
      <SidebarFeed
        isOpen={isSidebarOpen}
        events={events}
        onClose={() => setIsSidebarOpen(false)}
        onSelectEvent={(event) => {
          handleSelectEvent(event);
          setIsSidebarOpen(false);
        }}
        onSelectLandmark={(landmark) => {
          handleSelectLandmark(landmark);
          setIsSidebarOpen(false);
        }}
        onOpenAddModal={() => {
          setIsSidebarOpen(false);
          setIsAddModalOpen(true);
        }}
        onDeleteEvent={handleDeleteEvent}
      />

      {/* 7. ADD EVENT MODAL (MANDATORY PROOF IMAGE REQUIREMENT) */}
      <AddEventModal
        isOpen={isAddModalOpen}
        preselectedLocationId={preselectedLocationId}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectedLocationId(undefined);
        }}
        onSubmit={handleSubmitNewEvent}
      />

      {/* 8. INSTAGRAM STORY IMMERSIVE VIEWER */}
      <StoryViewerModal
        events={events}
        initialIndex={storyViewerIndex}
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        onSelectEvent={handleSelectEvent}
        onLikeEvent={handleLikeEvent}
        onDeleteEvent={handleDeleteEvent}
      />

      {/* 9. CAMPUS DIRECTORY & LANDMARKS MODAL */}
      <LandmarkDirectoryModal
        isOpen={isDirectoryOpen}
        events={events}
        onClose={() => setIsDirectoryOpen(false)}
        onSelectLandmark={(landmark) => {
          handleSelectLandmark(landmark);
          setIsDirectoryOpen(false);
        }}
      />
    </div>
  );
}

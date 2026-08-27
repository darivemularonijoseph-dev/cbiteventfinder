import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CampusEvent, Landmark } from '../types';
import { CAMPUS_LANDMARKS, LANDMARK_LOOKUP } from '../data/landmarks';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Building,
} from 'lucide-react';

interface CampusMapProps {
  events: CampusEvent[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark, eventId?: string) => void;
  onOpenAddModalAtLocation: (locationId: string) => void;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1600;
const MAP_BOUNDS: L.LatLngBoundsLiteral = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH],
];

export const CampusMap: React.FC<CampusMapProps> = ({
  events,
  selectedLandmark,
  onSelectLandmark,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Initialize Leaflet Map with CRS.Simple
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1.2,
      maxZoom: 2.2,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      attributionControl: false,
      zoomControl: false,
      maxBounds: [
        [-200, -200],
        [MAP_HEIGHT + 200, MAP_WIDTH + 200],
      ],
      maxBoundsViscosity: 0.8,
    });

    // Add SVG Image Overlay
    const imageOverlay = L.imageOverlay('/cbit-campus-map.svg', MAP_BOUNDS, {
      interactive: true,
      alt: 'CBIT Hyderabad Interactive Campus Map',
    });
    imageOverlay.addTo(map);

    // Initial view fitting the entire campus
    map.fitBounds(MAP_BOUNDS, { padding: [15, 15] });

    // Markers layer group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan and focus when selectedLandmark changes
  useEffect(() => {
    if (mapInstanceRef.current && selectedLandmark) {
      const [y, x] = selectedLandmark.coordinates;
      mapInstanceRef.current.setView([y, x], 0.8, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedLandmark]);

  // Render Pins (Landmarks + Active Event Pins)
  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Group events by location
    const eventsByLocation = events.reduce((acc, event) => {
      if (!acc[event.locationId]) acc[event.locationId] = [];
      acc[event.locationId].push(event);
      return acc;
    }, {} as Record<string, CampusEvent[]>);

    CAMPUS_LANDMARKS.forEach((landmark) => {
      // Filter by category
      if (activeCategory !== 'all' && landmark.category !== activeCategory) {
        return;
      }

      const [y, x] = landmark.coordinates;
      const locationEvents = eventsByLocation[landmark.id] || [];
      const hasActiveEvents = locationEvents.length > 0;
      const isSelected = selectedLandmark?.id === landmark.id;

      let iconHtml = '';

      if (hasActiveEvents) {
        // GLOWING ANIMATED RED PIN FOR ACTIVE EVENTS
        iconHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2" id="map-pin-${landmark.id}">
            <!-- Pulsing outer ring -->
            <span class="absolute -inset-2 rounded-full bg-[#e63946]/40 animate-ping"></span>
            
            <!-- Glowing radar aura -->
            <span class="absolute -inset-3 rounded-full bg-[#e63946]/30 blur-md"></span>

            <!-- Main Pin Container with Frosted Glass Border -->
            <div class="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-[#e63946] via-rose-600 to-amber-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(230,57,70,0.6)] border-2 ${
              isSelected ? 'border-white scale-110' : 'border-white/90'
            } transition-all duration-300 hover:scale-115">
              
              <!-- Event thumbnail or flame icon -->
              <div class="w-5 h-5 rounded-full overflow-hidden bg-[#0a1628] flex-shrink-0 border border-white/80">
                <img src="${locationEvents[0].proofImageUrl}" class="w-full h-full object-cover" alt="Proof" />
              </div>

              <span class="truncate max-w-[85px] leading-tight text-[11px] font-sans">${landmark.shortName}</span>

              <!-- Multiple events badge count -->
              ${
                locationEvents.length > 1
                  ? `<span class="px-1.5 py-0.2 rounded-full bg-white text-[#e63946] text-[10px] font-extrabold shadow-sm">${locationEvents.length}</span>`
                  : `<span class="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>`
              }
            </div>

            <!-- Arrow tip pointing down -->
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#e63946] mx-auto -mt-0.5 filter drop-shadow"></div>
          </div>
        `;
      } else {
        // DEFAULT CAMPUS LANDMARK PIN
        iconHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2" id="landmark-pin-${landmark.id}">
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              isSelected
                ? 'bg-[#e63946] text-white border-2 border-white scale-110 shadow-lg'
                : 'bg-[#0a1628]/80 text-white/90 border border-white/20 hover:bg-white/10 hover:border-white/40'
            } backdrop-blur-md transition-all duration-200 text-[10px] font-semibold shadow-md">
              <span class="w-2 h-2 rounded-full ${
                landmark.category === 'academic'
                  ? 'bg-amber-400'
                  : landmark.category === 'sports'
                  ? 'bg-emerald-400'
                  : landmark.category === 'food'
                  ? 'bg-orange-400'
                  : 'bg-sky-400'
              }"></span>
              ${showLabels ? `<span class="truncate max-w-[80px] uppercase font-mono tracking-wider">${landmark.shortName}</span>` : ''}
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [120, 40],
        iconAnchor: [60, 20],
      });

      const marker = L.marker([y, x], { icon: customIcon });

      // Click handler
      marker.on('click', () => {
        onSelectLandmark(landmark, locationEvents[0]?.id);
      });

      // Hover tooltip
      marker.bindTooltip(
        `<strong>${landmark.name}</strong><br/>${
          hasActiveEvents
            ? `<span style="color:#f87171">⚡ ${locationEvents.length} Active Event(s)</span>`
            : landmark.subtitle || landmark.description
        }`,
        {
          direction: 'top',
          offset: [0, -15],
          className: 'leaflet-custom-tooltip',
        }
      );

      marker.addTo(markersLayerRef.current!);
    });
  }, [events, selectedLandmark, showLabels, activeCategory, onSelectLandmark]);

  // Update markers whenever events, selection, or filter changes
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleFitBounds = () => {
    mapInstanceRef.current?.fitBounds(MAP_BOUNDS, { padding: [15, 15], animate: true });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0d1b2e] select-none">
      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Fit Bounds */}
        <button
          onClick={handleFitBounds}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
          title="Fit Campus View"
        >
          <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Toggle Landmark Labels */}
        <button
          onClick={() => setShowLabels((prev) => !prev)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shadow-xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 ${
            showLabels
              ? 'bg-[#e63946] text-white border-white/30'
              : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
          }`}
          title={showLabels ? 'Hide Landmark Labels' : 'Show Landmark Labels'}
        >
          {showLabels ? (
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>

      {/* Floating Category Filter Pills Top-Left on Desktop */}
      <div className="hidden sm:flex absolute top-4 left-4 z-20 items-center gap-1.5 p-1 rounded-2xl bg-[#0a1628]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        {[
          { id: 'all', label: 'All Places', icon: Layers },
          { id: 'academic', label: 'Academic & Labs', icon: Building },
          { id: 'sports', label: 'Sports Grounds', icon: Flame },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === tab.id
                  ? 'bg-[#e63946] text-white shadow-lg shadow-red-600/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Map Legend Floating Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0a1628]/85 backdrop-blur-xl border border-white/10 text-[11px] text-white/80 shadow-2xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e63946] shadow-[0_0_8px_#e63946] animate-ping"></span>
          <span className="font-bold text-[#e63946]">Live 24h Event</span>
        </div>
        <span className="text-white/20">|</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Academic</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Sports</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
          <span>Canteen</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CampusEvent, Landmark } from '../types';
import { CAMPUS_LANDMARKS, LANDMARK_LOOKUP } from '../data/landmarks';
import { formatTimeRemaining } from '../services/eventStore';
import {
  X,
  Search,
  MapPin,
  Clock,
  Heart,
  Sparkles,
  ChevronRight,
  Filter,
  Building,
  Plus,
  Trash2,
} from 'lucide-react';

interface SidebarFeedProps {
  isOpen: boolean;
  events: CampusEvent[];
  onClose: () => void;
  onSelectEvent: (event: CampusEvent) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onOpenAddModal: () => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const SidebarFeed: React.FC<SidebarFeedProps> = ({
  isOpen,
  events,
  onClose,
  onSelectEvent,
  onSelectLandmark,
  onOpenAddModal,
  onDeleteEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'events' | 'landmarks'>('events');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.clubName && e.clubName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter !== 'all') {
      const landmark = LANDMARK_LOOKUP[e.locationId];
      if (landmark && landmark.category !== categoryFilter) {
        return false;
      }
    }

    return true;
  });

  const filteredLandmarks = CAMPUS_LANDMARKS.filter((lm) => {
    const matchesSearch =
      lm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lm.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lm.departments &&
        lm.departments.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && lm.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div
      id="sidebar-feed-drawer"
      className="fixed inset-y-0 left-0 z-40 w-full max-w-sm sm:max-w-md bg-[#0a1628]/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-left text-white"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#e63946]/20 border border-[#e63946]/30 text-[#e63946] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Campus Live Feed</h2>
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              {events.length} active stories on CBIT map
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="p-3.5 border-b border-white/10 space-y-2.5 bg-white/[0.02]">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'events'
                ? 'bg-[#e63946] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Live Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('landmarks')}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'landmarks'
                ? 'bg-[#e63946] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Campus Locations ({CAMPUS_LANDMARKS.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'events'
                ? 'Search events, clubs, locations...'
                : 'Search 31 campus blocks, courts, labs...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/40 focus:border-[#e63946] focus:bg-white/10 outline-none transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-medium pt-0.5">
          <span className="text-white/40 flex items-center gap-1">
            <Filter className="w-3 h-3" />
          </span>
          {['all', 'academic', 'sports', 'facility', 'food'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-white/20 text-white font-bold border border-white/30'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {cat === 'all' ? 'All Zones' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {activeTab === 'events' ? (
          filteredEvents.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/50 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No active events found</p>
              <p className="text-xs text-white/50">
                {searchQuery
                  ? 'Try another search keyword or clear the filter.'
                  : 'Be the first to upload a live photo proof for campus!'}
              </p>
              <button
                onClick={onOpenAddModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63946] hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Post Event Now</span>
              </button>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const { formatted, isExpiringSoon } = formatTimeRemaining(event.expiresAt);

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-md transition-all cursor-pointer group shadow-sm flex gap-3"
                >
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950/80 flex-shrink-0 border border-white/15">
                    <img
                      src={event.proofImageUrl}
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[#e63946] uppercase tracking-wider truncate">
                        {event.clubName || 'CBIT Live'}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                          isExpiringSoon ? 'text-amber-400 animate-pulse' : 'text-white/60'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatted}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white group-hover:text-white transition-colors line-clamp-1 mt-0.5">
                      {event.title}
                    </h4>

                    <p className="text-[11px] text-white/60 line-clamp-1 mt-0.5">
                      {event.description}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/50">
                      <span className="flex items-center gap-1 text-white/70">
                        <MapPin className="w-3 h-3 text-[#e63946]" />
                        <span className="truncate max-w-[120px]">{event.locationName}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[#e63946] font-bold">
                          <Heart className="w-3 h-3 fill-[#e63946]/30" />
                          <span>{event.likesCount}</span>
                        </span>
                        {onDeleteEvent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this event?')) {
                                onDeleteEvent(event.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Campus Landmarks Directory Tab */
          filteredLandmarks.map((lm) => {
            const landmarkEvents = events.filter((e) => e.locationId === lm.id);

            return (
              <div
                key={lm.id}
                onClick={() => onSelectLandmark(lm)}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-md transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#e63946]/20 text-white/70 group-hover:text-[#e63946] flex items-center justify-center border border-white/10 transition-colors flex-shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white group-hover:text-white transition-colors truncate">
                      {lm.name}
                    </h4>
                    <p className="text-[10px] text-white/50 truncate">
                      {lm.subtitle || lm.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {landmarkEvents.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30 animate-pulse">
                      {landmarkEvents.length} Live
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-3.5 border-t border-white/10 bg-white/5">
        <button
          onClick={onOpenAddModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#e63946] hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Upload Campus Event Story</span>
        </button>
      </div>
    </div>
  );
};

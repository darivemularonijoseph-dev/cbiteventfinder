import React, { useRef } from 'react';
import { CampusEvent } from '../types';
import { Plus, ChevronLeft, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { formatTimeRemaining } from '../services/eventStore';

interface StoriesBarProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  onOpenAddModal: () => void;
  onOpenStoryViewer: (eventIndex: number) => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  events,
  onSelectEvent,
  onOpenAddModal,
  onOpenStoryViewer,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div
      id="stories-bar-container"
      className="relative z-20 w-full bg-white/5 backdrop-blur-xl border-b border-white/10 px-2 sm:px-6 py-3"
    >
      {/* Scroll left button */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center border border-white/20 backdrop-blur-md shadow-lg transition-all hover:scale-105"
        aria-label="Scroll stories left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Stories Scrollable Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth px-2 py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* + Add Story Trigger Bubble */}
        <button
          id="btn-story-add-event"
          onClick={onOpenAddModal}
          className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
          title="Post new 24h event story"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 group-hover:scale-105 transition-all duration-300">
            <div className="w-full h-full rounded-full bg-[#0a1628] border-2 border-[#0a1628] flex flex-col items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-[#e63946] group-hover:bg-red-500 text-white flex items-center justify-center shadow-md">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>
          <span className="mt-1 text-[10px] uppercase font-semibold tracking-wider text-white/80 group-hover:text-[#e63946] transition-colors truncate max-w-[70px]">
            Post Story
          </span>
        </button>

        {/* Empty state prompt if no events */}
        {events.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-xs text-white/70">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>No campus stories active right now. Be the first to post with photo proof!</span>
          </div>
        )}

        {/* Active Event Stories */}
        {events.map((event, index) => {
          const { formatted, isExpiringSoon } = formatTimeRemaining(event.expiresAt);

          return (
            <button
              key={event.id}
              id={`story-item-${event.id}`}
              onClick={() => {
                onSelectEvent(event);
                onOpenStoryViewer(index);
              }}
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer focus:outline-none"
              title={`${event.title} • ${event.locationName} (Expires in ${formatted})`}
            >
              {/* Gradient Ring around Proof Thumbnail */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 group-hover:scale-105 transition-transform duration-200 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0a1628] border-2 border-[#0a1628]">
                  <img
                    src={event.proofImageUrl}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Expiry mini-badge on thumbnail */}
                <div
                  className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-md flex items-center gap-0.5 border border-[#0a1628] ${
                    isExpiringSoon ? 'bg-amber-600 animate-pulse' : 'bg-[#e63946]'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatted.split(' ')[0]}</span>
                </div>
              </div>

              {/* Story Title & Location */}
              <div className="mt-1 flex flex-col items-center max-w-[80px]">
                <span className="text-[10px] uppercase font-semibold text-white/90 group-hover:text-white truncate w-full text-center tracking-wider">
                  {event.clubName ? event.clubName.split(' ')[0] : event.locationName.split(' ')[0]}
                </span>
                <span className="text-[9px] text-white/50 truncate w-full text-center">
                  {event.locationName}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Scroll right button */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center border border-white/20 backdrop-blur-md shadow-lg transition-all hover:scale-105"
        aria-label="Scroll stories right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

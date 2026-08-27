import React, { useState, useEffect } from 'react';
import { CampusEvent, Landmark } from '../types';
import {
  X,
  MapPin,
  Clock,
  Heart,
  ChevronLeft,
  ChevronRight,
  Share2,
  Plus,
  Maximize2,
  Building,
  User,
  ShieldCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { formatTimeRemaining } from '../services/eventStore';

interface EventDetailPopupProps {
  landmark: Landmark | null;
  events: CampusEvent[];
  initialEventId?: string;
  onClose: () => void;
  onLikeEvent: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddNewAtLocation: (locationId: string) => void;
}

export const EventDetailPopup: React.FC<EventDetailPopupProps> = ({
  landmark,
  events,
  initialEventId,
  onClose,
  onLikeEvent,
  onDeleteEvent,
  onAddNewAtLocation,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [, setTicker] = useState(0);

  // Sync initial event index if passed
  useEffect(() => {
    if (initialEventId && events.length > 0) {
      const idx = events.findIndex((e) => e.id === initialEventId);
      if (idx !== -1) setActiveIdx(idx);
    } else {
      setActiveIdx(0);
    }
  }, [initialEventId, events]);

  // Real-time ticking every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!landmark) return null;

  const currentEvent = events[activeIdx] || null;

  const handleLike = (eventId: string) => {
    if (!liked[eventId]) {
      onLikeEvent(eventId);
      setLiked((prev) => ({ ...prev, [eventId]: true }));
    }
  };

  const handleShare = () => {
    if (!currentEvent) return;
    if (navigator.share) {
      navigator.share({
        title: currentEvent.title,
        text: `Live campus event at ${landmark.name}: ${currentEvent.title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Check out "${currentEvent.title}" at ${landmark.name} on R-ODE TO CBIT!`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Lightbox for zooming proof image */}
      {isImageZoomed && currentEvent && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsImageZoomed(false)}
        >
          <button
            onClick={() => setIsImageZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={currentEvent.proofImageUrl}
            alt={currentEvent.title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Main Glassmorphism Bottom Sheet / Card */}
      <div
        id="event-detail-popup-container"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl bg-[#0a1628]/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 text-white"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#e63946]/20 text-[#e63946] flex items-center justify-center border border-[#e63946]/40 flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#e63946]" />
            </div>
            <div className="truncate">
              <h4 className="text-sm font-bold text-white tracking-wide truncate">
                {landmark.name}
              </h4>
              <p className="text-[10px] uppercase tracking-wider text-white/50 truncate">
                {landmark.subtitle || landmark.description}
              </p>
            </div>
          </div>

          <button
            id="btn-close-event-popup"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/10"
            aria-label="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If no active events at this location */}
        {events.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/60 mx-auto flex items-center justify-center mb-3">
              <Building className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-white">No active events right now</h5>
            <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
              Be the first to post what is happening at {landmark.name}! Anyone can upload with photo proof.
            </p>
            <button
              onClick={() => {
                onClose();
                onAddNewAtLocation(landmark.id);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63946] hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Post Event at {landmark.shortName}</span>
            </button>
          </div>
        ) : (
          /* Active Event Details & Carousel */
          <div className="p-5">
            {/* Carousel navigation header if multiple events */}
            {events.length > 1 && (
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>⚡ {events.length} Live Events at this Spot</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setActiveIdx((prev) => (prev > 0 ? prev - 1 : events.length - 1))
                    }
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs border border-white/10"
                    aria-label="Previous event"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-white/60">
                    {activeIdx + 1} / {events.length}
                  </span>
                  <button
                    onClick={() =>
                      setActiveIdx((prev) => (prev < events.length - 1 ? prev + 1 : 0))
                    }
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs border border-white/10"
                    aria-label="Next event"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {currentEvent && (
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Proof Image Column */}
                <div className="relative w-full sm:w-48 h-44 sm:h-48 rounded-xl overflow-hidden bg-slate-950/80 flex-shrink-0 border border-white/20 shadow-lg group">
                  <img
                    src={currentEvent.proofImageUrl}
                    alt={currentEvent.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Verified Proof Watermark */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[9px] font-bold text-sky-300 flex items-center gap-1 border border-white/20">
                    <ShieldCheck className="w-3 h-3 text-sky-400" />
                    <span>VERIFIED PROOF</span>
                  </div>

                  {/* Zoom button */}
                  <button
                    onClick={() => setIsImageZoomed(true)}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-colors border border-white/10"
                    title="Zoom Proof Image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Event Content & Countdown Column */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Club / Tag Badge */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {currentEvent.clubName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30">
                          {currentEvent.clubName}
                        </span>
                      )}
                      {currentEvent.tags?.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/70 border border-white/10"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Event Title */}
                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {currentEvent.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-1.5 text-xs text-white/70 leading-relaxed max-h-20 overflow-y-auto">
                      {currentEvent.description}
                    </p>

                    {/* Author / AI Discovery credit */}
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/60">
                      {currentEvent.authorName && (currentEvent.authorName.toLowerCase().includes('searched by ai') || currentEvent.authorName.toLowerCase().includes('auto')) ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[10px] flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Searched by AI</span>
                        </span>
                      ) : (
                        <p className="flex items-center gap-1">
                          <User className="w-3 h-3 text-white/40" />
                          <span>Posted by: <strong className="text-white/80">{currentEvent.authorName || 'CBIT Student'}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 24-Hour Countdown Bar & Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    {/* Live Ticking Countdown */}
                    {(() => {
                      const {
                        hours,
                        minutes,
                        seconds,
                        isExpiringSoon,
                        percentage,
                      } = formatTimeRemaining(currentEvent.expiresAt);

                      return (
                        <div className="mb-2.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                            <span className="flex items-center gap-1 text-[10px] uppercase text-white/50 tracking-wider">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Expires In:</span>
                            </span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                isExpiringSoon ? 'text-amber-400 animate-pulse' : 'text-[#e63946]'
                              }`}
                            >
                              {hours}h {minutes}m {seconds}s
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                isExpiringSoon
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-[#e63946] to-amber-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Interactive Action Row */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleLike(currentEvent.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          liked[currentEvent.id]
                            ? 'bg-[#e63946]/20 text-[#e63946] border-[#e63946]/40 shadow-md shadow-red-900/30'
                            : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            liked[currentEvent.id] ? 'fill-[#e63946] text-[#e63946] scale-110' : ''
                          }`}
                        />
                        <span>{currentEvent.likesCount + (liked[currentEvent.id] ? 1 : 0)} Cheers</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {onDeleteEvent && (
                          <button
                            onClick={() => {
                              if (confirm('Delete this event?')) {
                                onDeleteEvent(currentEvent.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/10 transition-colors"
                            title="Delete this event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={handleShare}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 transition-colors"
                          title="Share event"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copied ? 'Copied!' : 'Share'}</span>
                        </button>

                        <button
                          onClick={() => {
                            onClose();
                            onAddNewAtLocation(landmark.id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#e63946]/20 hover:bg-[#e63946]/30 text-[#e63946] text-xs font-bold border border-[#e63946]/30 transition-colors"
                          title="Post another event here"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Post</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

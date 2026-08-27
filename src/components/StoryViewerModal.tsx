import React, { useState, useEffect, useCallback } from 'react';
import { CampusEvent } from '../types';
import {
  X,
  MapPin,
  Clock,
  Heart,
  ChevronLeft,
  ChevronRight,
  Share2,
  ExternalLink,
  ShieldCheck,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { formatTimeRemaining } from '../services/eventStore';

interface StoryViewerModalProps {
  events: CampusEvent[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: CampusEvent) => void;
  onLikeEvent: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  events,
  initialIndex,
  isOpen,
  onClose,
  onSelectEvent,
  onLikeEvent,
  onDeleteEvent,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Sync initialIndex when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, events.length - 1)));
      setIsPaused(false);
    }
  }, [isOpen, initialIndex, events.length]);

  const currentEvent = events[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, events.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Auto-advance timer (6 seconds per story)
  useEffect(() => {
    if (!isOpen || isPaused || events.length === 0) return;

    const timer = setTimeout(() => {
      handleNext();
    }, 6000);

    return () => clearTimeout(timer);
  }, [isOpen, isPaused, currentIndex, events.length, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentEvent) return null;

  const { formatted, isExpiringSoon } = formatTimeRemaining(currentEvent.expiresAt);

  const handleLike = () => {
    if (!liked[currentEvent.id]) {
      onLikeEvent(currentEvent.id);
      setLiked((prev) => ({ ...prev, [currentEvent.id]: true }));
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentEvent.title,
        text: `Live Campus Event at ${currentEvent.locationName}: ${currentEvent.title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Check out "${currentEvent.title}" happening at ${currentEvent.locationName} on CBIT Live Map!`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToMap = () => {
    onSelectEvent(currentEvent);
    onClose();
  };

  return (
    <div
      id="story-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4"
    >
      {/* Navigation arrows for desktop */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center backdrop-blur-md transition-transform hover:scale-110"
          aria-label="Previous story"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < events.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center backdrop-blur-md transition-transform hover:scale-110"
          aria-label="Next story"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story Container Card */}
      <div className="relative w-full max-w-md h-[88vh] max-h-[780px] bg-[#0a1628]/95 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Top Story Progress Bars */}
        <div className="absolute top-2 left-0 right-0 z-30 px-3 flex gap-1.5">
          {events.map((_, idx) => (
            <div
              key={idx}
              className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  idx < currentIndex
                    ? 'w-full'
                    : idx === currentIndex
                    ? isPaused
                      ? 'w-1/2 bg-[#e63946]'
                      : 'w-full animate-[progress_6s_linear]'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Story Header Overlay */}
        <div className="absolute top-5 left-0 right-0 z-30 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-[#0a1628]/90 via-[#0a1628]/40 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#e63946] shadow-md">
              <img
                src={currentEvent.proofImageUrl}
                alt="Proof"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-wide">
                  {currentEvent.clubName || currentEvent.authorName || 'CBIT Student'}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#e63946]" />
              </div>
              <p className="text-[11px] text-white/70 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#e63946]" />
                <span>{currentEvent.locationName}</span>
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              title={isPaused ? 'Resume Story' : 'Pause Story'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              aria-label="Close Story"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Proof Image & Tap-to-Navigate Zones */}
        <div className="relative flex-1 bg-[#071322] overflow-hidden flex items-center justify-center">
          {/* Left tap zone for previous story */}
          <div
            onClick={handlePrev}
            className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-pointer"
            aria-label="Previous story tap"
          />
          {/* Right tap zone for next story */}
          <div
            onClick={handleNext}
            className="absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-pointer"
            aria-label="Next story tap"
          />

          {/* Uploaded Proof Photo / Poster */}
          <img
            src={currentEvent.proofImageUrl}
            alt={currentEvent.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none"
          />

          {/* 24-Hour Expiry Pill Badge */}
          <div className="absolute top-20 right-4 z-20">
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg backdrop-blur-md border border-white/20 ${
                isExpiringSoon ? 'bg-amber-600/90 animate-pulse' : 'bg-[#e63946]/90'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in {formatted}</span>
            </div>
          </div>
        </div>

        {/* Bottom Details Drawer */}
        <div className="relative z-30 p-4 bg-[#0a1628]/95 backdrop-blur-xl border-t border-white/10">
          <h3 className="text-base font-bold text-white leading-snug">
            {currentEvent.title}
          </h3>

          <p className="mt-1 text-xs text-white/70 line-clamp-2 leading-relaxed">
            {currentEvent.description}
          </p>

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            {/* View on Map Button */}
            <button
              id="btn-story-view-on-map"
              onClick={handleGoToMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e63946] hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Locate on Map</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Like & Share */}
            <div className="flex items-center gap-2">
              {onDeleteEvent && (
                <button
                  onClick={() => {
                    if (confirm('Delete this event?')) {
                      onDeleteEvent(currentEvent.id);
                      if (events.length <= 1) {
                        onClose();
                      } else {
                        handleNext();
                      }
                    }
                  }}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                  title="Delete Story"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                title="Share Story"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={handleLike}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  liked[currentEvent.id]
                    ? 'bg-[#e63946]/20 text-[#e63946] border-[#e63946]/40'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
                title="Cheer / Like Event"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    liked[currentEvent.id] ? 'fill-[#e63946] text-[#e63946] scale-110' : ''
                  }`}
                />
                <span>{currentEvent.likesCount + (liked[currentEvent.id] ? 1 : 0)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

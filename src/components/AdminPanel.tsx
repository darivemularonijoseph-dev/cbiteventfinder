import React, { useState, useEffect } from 'react';
import { CampusEvent } from '../types';
import { eventStore, formatTimeRemaining } from '../services/eventStore';
import { isFirebaseConfigured, firebaseConfig } from '../firebase.js';
import { CLOUDINARY_CONFIG } from '../services/cloudinary';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Search,
  MapPin,
  Clock,
  Heart,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Flame,
  AlertTriangle,
  Building,
  Cloud,
  CheckCircle2,
} from 'lucide-react';

interface AdminPanelProps {
  onBackToMap: () => void;
}

const ADMIN_PASSCODE = 'cbitroni2026';
const SESSION_STORAGE_KEY = 'cbit_admin_auth_status';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToMap }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Subscribe to real-time events from eventStore / Firestore
  useEffect(() => {
    const unsub = eventStore.subscribe((updated) => {
      setEvents(updated);
    });
    return () => unsub();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      setErrorMsg(null);
      setPasscode('');
    } else {
      setErrorMsg('Incorrect passcode. Please enter the valid admin passcode.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setPasscode('');
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (confirm(`Delete "${title}"?\n\nThis will remove the event immediately from the campus map and Firestore.`)) {
      setDeletingId(eventId);
      try {
        await eventStore.deleteEvent(eventId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleClearAll = async () => {
    if (events.length === 0) return;
    if (confirm('WARNING: Are you sure you want to delete ALL active campus events?\n\nThis cannot be undone.')) {
      await eventStore.clearAllEvents();
    }
  };

  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.locationName.toLowerCase().includes(q) ||
      (e.clubName && e.clubName.toLowerCase().includes(q)) ||
      (e.authorName && e.authorName.toLowerCase().includes(q))
    );
  });

  const isCloudinaryUrl = (url: string) => url.includes('cloudinary.com') || url.includes('res.cloudinary');

  // PASSCODE LOCK SCREEN
  if (!isAuthenticated) {
    return (
      <div
        id="admin-passcode-gate"
        className="min-h-screen bg-[#071322] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden"
      >
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e63946]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative w-full max-w-md bg-[#0a1628]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          
          {/* Header Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#e63946]/20 border border-[#e63946]/30 text-[#e63946] flex items-center justify-center shadow-lg shadow-red-950/40">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                CBIT Admin Moderation
              </h1>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Enter admin passcode to manage active events, delete fake posts, and moderate live proofs.
              </p>
            </div>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter secret passcode..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-[#e63946] focus:ring-1 focus:ring-[#e63946] transition-all font-mono"
                />
              </div>
              {errorMsg && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <button
              id="btn-admin-submit-passcode"
              type="submit"
              className="w-full py-3 rounded-xl bg-[#e63946] hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-white/20"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          {/* Return to Map */}
          <div className="pt-2 text-center border-t border-white/10">
            <button
              onClick={onBackToMap}
              className="text-xs text-white/60 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Campus Map</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN CONSOLE
  return (
    <div id="admin-panel-container" className="min-h-screen bg-[#071322] text-white flex flex-col font-sans">
      
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-[#0a1628]/95 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e63946]/20 border border-[#e63946]/30 text-[#e63946] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                CBIT Campus Moderation Panel
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Admin Passcode Verified</span>
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Live moderation for real-time campus events & proof verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Campus Map</span>
            <span className="sm:hidden">Map</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer"
            title="Lock Admin Panel"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock / Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Status and Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Active Events</span>
              <Flame className="w-4 h-4 text-[#e63946]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{events.length}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Total Likes</span>
              <Heart className="w-4 h-4 text-[#e63946]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {events.reduce((acc, curr) => acc + (curr.likesCount || 0), 0)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Cloudinary CDN Proofs</span>
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-sky-400">
              {events.filter((e) => isCloudinaryUrl(e.proofImageUrl)).length}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Database Backend</span>
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isFirebaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <p className="text-xs font-bold text-white">
                {isFirebaseConfigured() ? 'Firebase Firestore' : 'Local + Broadcast (Ready)'}
              </p>
            </div>
          </div>
        </div>

        {/* Database info banner */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0">
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-white">
                Database: <span className="text-emerald-400 font-mono">/src/firebase.js</span> • Storage: <span className="text-sky-400 font-mono">{CLOUDINARY_CONFIG.cloudName}</span>
              </p>
              <p className="text-white/50 text-[11px]">
                Paste your Firebase credentials into <code className="text-white/80 bg-white/10 px-1 py-0.5 rounded">src/firebase.js</code> for full cloud Firestore sync.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigHelp((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/10 transition-colors cursor-pointer flex-shrink-0"
          >
            {showConfigHelp ? 'Hide Config Instructions' : 'View Config Instructions'}
          </button>
        </div>

        {/* Config Instructions Drawer */}
        {showConfigHelp && (
          <div className="p-4 rounded-2xl bg-[#0a1628]/95 border border-white/15 text-xs space-y-2 animate-in fade-in duration-200">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>How to connect your Firebase Firestore database:</span>
            </h4>
            <ol className="list-decimal list-inside text-white/70 space-y-1 pl-1 leading-relaxed">
              <li>Open <code className="text-sky-300 font-mono">src/firebase.js</code> in the file explorer.</li>
              <li>Paste your Firebase Web SDK config into <code className="text-sky-300 font-mono">firebaseConfig</code> (apiKey, projectId, etc.).</li>
              <li>Firestore security rules are already pre-configured in <code className="text-sky-300 font-mono">firestore.rules</code>.</li>
              <li>Once pasted, real-time Firestore sync activates automatically across all students and devices!</li>
            </ol>
          </div>
        )}

        {/* Search and Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active events by title, description, location, or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm placeholder-white/40 outline-none focus:border-[#e63946] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold border border-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Delete all events"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Events ({events.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Events Table / Card List */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">
              {events.length === 0 ? 'No Active Campus Events' : 'No Events Match Search'}
            </h3>
            <p className="text-xs text-white/50 max-w-md mx-auto">
              {events.length === 0
                ? 'All cleared! When students upload ongoing events on the campus map, they will appear here in real-time.'
                : 'Try adjusting your search query to find specific events.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/50 px-1">
              <span>Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
              <span>Click image to view high-res proof</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredEvents.map((event) => {
                const timeInfo = formatTimeRemaining(event.expiresAt);
                const isCloudinary = isCloudinaryUrl(event.proofImageUrl);

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    {/* Event Proof Thumbnail & Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        onClick={() => setPreviewImage(event.proofImageUrl)}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/40 border border-white/20 flex-shrink-0 cursor-pointer group/thumb shadow-md"
                        title="Click to view full proof image"
                      >
                        <img
                          src={event.proofImageUrl}
                          alt="Proof"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                            {event.title}
                          </h3>
                          {event.clubName && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30">
                              {event.clubName}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-white/50 flex-wrap">
                          <span className="flex items-center gap-1 text-white/80">
                            <MapPin className="w-3 h-3 text-[#e63946]" />
                            <span>{event.locationName}</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Expires in {timeInfo.formatted}</span>
                          </span>

                          <span className="flex items-center gap-1 text-[#e63946] font-semibold">
                            <Heart className="w-3 h-3 fill-[#e63946]/30" />
                            <span>{event.likesCount || 0} likes</span>
                          </span>

                          {isCloudinary && (
                            <span className="flex items-center gap-1 text-sky-400 font-mono text-[10px]">
                              <Cloud className="w-3 h-3" />
                              <span>Cloudinary</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      {isCloudinary && (
                        <a
                          href={event.proofImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
                          title="Open CDN Image in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteEvent(event.id, event.title)}
                        disabled={deletingId === event.id}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-900/40 border border-red-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Delete fake / inappropriate event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-[#0a1628] rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-2">
            <img
              src={previewImage}
              alt="Proof full preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-white/60 mt-2">
              Tap anywhere to close preview
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

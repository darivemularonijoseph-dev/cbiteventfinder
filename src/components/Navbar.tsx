import React from 'react';
import {
  MapPin,
  Plus,
  Flame,
  Menu,
  BookOpen,
  RotateCcw,
  Sparkles,
  Shield,
} from 'lucide-react';

interface NavbarProps {
  activeCount: number;
  onOpenAddModal: () => void;
  onToggleSidebar: () => void;
  onOpenDirectory: () => void;
  onResetView: () => void;
  onNavigateAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCount,
  onOpenAddModal,
  onToggleSidebar,
  onOpenDirectory,
  onResetView,
  onNavigateAdmin,
}) => {
  return (
    <header
      id="main-header"
      className="h-16 flex items-center justify-between px-3 sm:px-6 bg-[#0a1628]/80 backdrop-blur-xl border-b border-white/10 z-50 text-white select-none transition-colors"
    >
      {/* Left: Branding & Campus Logo */}
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar-mobile"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-md cursor-pointer"
          title="Open Events Feed"
          aria-label="Toggle Events Feed"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#e63946] rounded-lg flex items-center justify-center font-black text-lg sm:text-xl italic text-white shadow-lg shadow-red-600/30 border border-white/20">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tighter uppercase font-sans">
                R-ODE TO <span className="text-[#e63946]">CBIT</span>
              </h1>
            </div>
            <p className="text-[10px] text-white/50 tracking-wider hidden sm:block uppercase">
              Chaitanya Bharathi Institute of Technology
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Pulse Tracker */}
      <div className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-white/80">
        <span className="tracking-wider">HYDERABAD, TS</span>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></div>
          <span className="text-xs font-semibold tracking-wider uppercase text-white/90">
            {activeCount} Live Updates
          </span>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset Map View */}
        <button
          id="btn-reset-map-view"
          onClick={onResetView}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
          title="Reset Map View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Map</span>
        </button>

        {/* Campus Directory */}
        <button
          id="btn-open-directory"
          onClick={onOpenDirectory}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
          title="Campus Directory & Landmarks"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#e63946]" />
          <span className="hidden sm:inline">Directory</span>
        </button>

        {/* Admin Panel Entry */}
        {onNavigateAdmin && (
          <button
            id="btn-header-admin-panel"
            onClick={onNavigateAdmin}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
            title="Admin Moderation (/admin)"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Add Event CTA Button */}
        <button
          id="btn-header-add-event"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-[#e63946] hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/30 border border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Post Event</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-200 hidden sm:inline" />
        </button>
      </div>
    </header>
  );
};

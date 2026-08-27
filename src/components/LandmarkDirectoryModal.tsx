import React, { useState } from 'react';
import { Landmark, CampusEvent } from '../types';
import { CAMPUS_LANDMARKS } from '../data/landmarks';
import {
  X,
  Building,
  Search,
  MapPin,
  Flame,
  BookOpen,
  Dumbbell,
  Utensils,
  GraduationCap,
  Shield,
} from 'lucide-react';

interface LandmarkDirectoryModalProps {
  isOpen: boolean;
  events: CampusEvent[];
  onClose: () => void;
  onSelectLandmark: (landmark: Landmark) => void;
}

export const LandmarkDirectoryModal: React.FC<LandmarkDirectoryModalProps> = ({
  isOpen,
  events,
  onClose,
  onSelectLandmark,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = CAMPUS_LANDMARKS.filter((lm) => {
    const matchesQuery =
      lm.name.toLowerCase().includes(search.toLowerCase()) ||
      lm.shortName.toLowerCase().includes(search.toLowerCase()) ||
      lm.description.toLowerCase().includes(search.toLowerCase()) ||
      (lm.departments &&
        lm.departments.some((d) => d.toLowerCase().includes(search.toLowerCase())));

    if (!matchesQuery) return false;
    if (category !== 'all' && lm.category !== category) return false;
    return true;
  });

  return (
    <div
      id="landmark-directory-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#0a1628]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e63946]/20 border border-[#e63946]/30 text-[#e63946] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                CBIT Campus Map Directory
              </h3>
              <p className="text-xs text-white/50">
                Explore all 31 landmark locations, engineering departments, and courts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 text-white/60 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.02]">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by block name, department (CSE, ECE, Mech, Civil), or facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm placeholder-white/40 outline-none focus:border-[#e63946]"
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold">
            {[
              { id: 'all', label: 'All Places', icon: Building },
              { id: 'academic', label: 'Academic & Labs', icon: GraduationCap },
              { id: 'sports', label: 'Sports & Grounds', icon: Dumbbell },
              { id: 'facility', label: 'Facilities & Stage', icon: Shield },
              { id: 'food', label: 'Canteen & Food', icon: Utensils },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                    category === tab.id
                      ? 'bg-[#e63946] text-white shadow'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Directory Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((landmark) => {
            const liveEvents = events.filter((e) => e.locationId === landmark.id);

            return (
              <div
                key={landmark.id}
                onClick={() => {
                  onSelectLandmark(landmark);
                  onClose();
                }}
                className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e63946]" />
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-white transition-colors">
                        {landmark.name}
                      </h4>
                    </div>

                    {liveEvents.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40 flex items-center gap-1 flex-shrink-0 animate-pulse">
                        <Flame className="w-2.5 h-2.5" />
                        <span>{liveEvents.length} Live</span>
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[11px] text-white/60 leading-relaxed">
                    {landmark.description}
                  </p>

                  {landmark.departments && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {landmark.departments.map((dept) => (
                        <span
                          key={dept}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-white/80 border border-white/10"
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#e63946] group-hover:text-red-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#e63946]" />
                    <span>View on Campus Map</span>
                  </span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

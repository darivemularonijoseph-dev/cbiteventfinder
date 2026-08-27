import React, { useState, useRef } from 'react';
import { Landmark, NewEventPayload } from '../types';
import { CAMPUS_LANDMARKS } from '../data/landmarks';
import { compressImageFile } from '../services/eventStore';
import { uploadImageToCloudinary, CLOUDINARY_CONFIG } from '../services/cloudinary';
import confetti from 'canvas-confetti';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  AlertCircle,
  Camera,
  CheckCircle2,
  Trash2,
  Clock,
  ShieldCheck,
  Building,
  Cloud,
  ExternalLink,
} from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  preselectedLocationId?: string;
  onClose: () => void;
  onSubmit: (payload: NewEventPayload) => void;
}

const POPULAR_CLUBS = [
  'IEEE CBIT',
  'CSI CBIT',
  'Robotics Club',
  'Chaitanya Samskruthi',
  'Chaitanya Geethi',
  'CBIT Sports Council',
  'CBIT Toastmasters',
  'EDC Incubation',
  'Street Cause CBIT',
  'NSS CBIT',
  'SAE Collegiate Club',
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  preselectedLocationId,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState(
    preselectedLocationId || CAMPUS_LANDMARKS[0]?.id || ''
  );
  const [clubName, setClubName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isCloudinaryHosted, setIsCloudinaryHosted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync preselected location if provided
  React.useEffect(() => {
    if (preselectedLocationId) {
      setLocationId(preselectedLocationId);
    }
  }, [preselectedLocationId]);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);
    setUploadProgress(10);
    setIsCloudinaryHosted(false);

    try {
      // 1. First create local fast preview / compress to ensure optimal speed
      const localCompressedUri = await compressImageFile(file);
      setProofImage(localCompressedUri);
      setUploadProgress(30);

      // 2. Upload to Cloudinary using unsigned upload preset
      const cloudinaryResult = await uploadImageToCloudinary(file, (percent) => {
        // Map progress to 30-100%
        setUploadProgress(30 + Math.round(percent * 0.7));
      });

      if (cloudinaryResult.secureUrl) {
        setProofImage(cloudinaryResult.secureUrl);
        setIsCloudinaryHosted(true);
      }
    } catch (err: any) {
      console.warn('Cloudinary upload issue:', err);
      // If Cloudinary returned an error, alert the user with details
      const errMsg = err?.message || 'Could not upload to Cloudinary.';
      setErrorMsg(`Cloudinary Upload Notice: ${errMsg}. Local compressed image used.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Please enter an event title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter an event description.');
      return;
    }
    if (!locationId) {
      setErrorMsg('Please select a campus location.');
      return;
    }
    if (!proofImage) {
      setErrorMsg('Mandatory proof image is missing! Please upload a photo or story screenshot.');
      return;
    }

    // Submit payload
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      locationId,
      proofImageUrl: proofImage,
      clubName: clubName.trim() || undefined,
      authorName: authorName.trim() || undefined,
    });

    // Trigger celebratory confetti blast
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e63946', '#f43f5e', '#fbbf24', '#38bdf8'],
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setProofImage(null);
    setIsCloudinaryHosted(false);
    setClubName('');
    setAuthorName('');
    setErrorMsg(null);
    onClose();
  };

  const isFormReady = title.trim() && description.trim() && locationId && proofImage && !isProcessing;

  return (
    <div
      id="add-event-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="add-event-modal-dialog"
        className="relative w-full max-w-xl bg-[#0a1628]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 text-white"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e63946]/20 border border-[#e63946]/30 text-[#e63946] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Post Live Campus Event</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e63946]/30 text-[#e63946] font-bold border border-[#e63946]/40">
                  24H EXPIRY
                </span>
              </h3>
              <p className="text-[11px] text-white/50">
                Cloudinary CDN proof storage ({CLOUDINARY_CONFIG.cloudName}) • Real-time broadcast
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#e63946]/10 border border-[#e63946]/30 flex items-center gap-2.5 text-xs text-[#e63946]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#e63946]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. MANDATORY PROOF IMAGE UPLOAD SECTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#e63946]" />
                <span>Proof Image / Poster (Cloudinary Upload)</span>
                <span className="text-[#e63946] font-bold">*REQUIRED</span>
              </label>
              <span className="text-[11px] text-white/50 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-sky-400" />
                <span>Preset: {CLOUDINARY_CONFIG.uploadPreset}</span>
              </span>
            </div>

            {proofImage ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#e63946]/60 bg-white/5 p-2 flex items-center gap-4">
                <div className="relative">
                  <img
                    src={proofImage}
                    alt="Proof preview"
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg border border-white/10"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center gap-1">
                      <div className="w-6 h-6 border-2 border-white border-t-[#e63946] rounded-full animate-spin" />
                      <span className="text-[9px] font-bold text-white">{uploadProgress}%</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {isProcessing
                        ? `Uploading to Cloudinary (${uploadProgress}%)...`
                        : isCloudinaryHosted
                        ? 'Hosted on Cloudinary CDN'
                        : 'Proof Attached & Verified'}
                    </span>
                  </div>
                  
                  {isCloudinaryHosted && (
                    <p className="text-[10px] text-sky-400 flex items-center gap-1 truncate font-mono">
                      <Cloud className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{proofImage}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-white/60">
                    This photo will be displayed on the map pin and story thumbnail.
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-50 cursor-pointer"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setProofImage(null);
                        setIsCloudinaryHosted(false);
                      }}
                      className="p-1 text-white/40 hover:text-[#e63946] transition-colors disabled:opacity-50 cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  dragOver
                    ? 'border-[#e63946] bg-[#e63946]/10'
                    : 'border-white/20 hover:border-white/40 bg-white/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/10 text-[#e63946] flex items-center justify-center shadow-inner">
                    {isProcessing ? (
                      <div className="w-6 h-6 border-2 border-[#e63946] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6 animate-bounce" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isProcessing
                        ? `Uploading to Cloudinary CDN (${uploadProgress}%)...`
                        : 'Drag & drop your event photo or poster here'}
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Uploads directly to Cloudinary (cloud: {CLOUDINARY_CONFIG.cloudName}, preset: {CLOUDINARY_CONFIG.uploadPreset})
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 shadow cursor-pointer disabled:opacity-50"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Browse Files</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 shadow cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Snap Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. EVENT TITLE */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <span>Event Title</span>
              <span className="text-[#e63946]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sudhee Flash Mob, HackCBIT 2026, Basketball Semifinals..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#e63946] text-white text-xs sm:text-sm placeholder-white/40 outline-none transition-all"
            />
          </div>

          {/* 3. CAMPUS LOCATION DROPDOWN */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#e63946]" />
              <span>Campus Landmark Location</span>
              <span className="text-[#e63946]">*</span>
            </label>
            <div className="relative">
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#e63946] text-white text-xs sm:text-sm appearance-none outline-none cursor-pointer"
              >
                {CAMPUS_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id} className="bg-[#0a1628] text-white py-1">
                    {lm.name} ({lm.category.toUpperCase()})
                  </option>
                ))}
              </select>
              <Building className="w-4 h-4 text-white/40 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. EVENT DESCRIPTION */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <span>Description & Details</span>
              <span className="text-[#e63946]">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="What is happening? Timings, entry rules, prizes, food, or instructions for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#e63946] text-white text-xs sm:text-sm placeholder-white/40 outline-none resize-none transition-all"
            />
          </div>

          {/* 5. CLUB NAME & YOUR NAME (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/70">
                Club / Organization (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. IEEE CBIT, Chaitanya Samskruthi"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/40 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/70">
                Your Name / Department (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Rohan (CSE 3rd Yr)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/40 outline-none"
              />
            </div>
          </div>

          {/* Quick Club Suggestions Chips */}
          <div className="space-y-1">
            <span className="text-[11px] text-white/50">Quick Club Tags:</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_CLUBS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClubName(c)}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  +{c}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Banner */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white/60">
            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              This pin will broadcast across CBIT campus and disappear automatically after 24 hours.
            </span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-submit-event-form"
              type="submit"
              disabled={!isFormReady}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all ${
                isFormReady
                  ? 'bg-[#e63946] hover:bg-red-500 text-white shadow-red-600/30 hover:scale-105 active:scale-95 cursor-pointer border border-white/20'
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Uploading Proof to Cloudinary...'
                  : proofImage
                  ? 'Broadcast to Campus Map'
                  : 'Upload Proof Image to Post'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

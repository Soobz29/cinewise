import React, { useEffect } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';

interface TrailerModalProps {
  videoKey: string | null;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ videoKey, title, isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-5xl bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl absolute top-0 left-0 right-0 z-10">
            <h3 className="text-white font-semibold text-lg truncate pr-8 drop-shadow-md">{title} - Official Trailer</h3>
            <button 
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video w-full bg-black group">
            {videoKey ? (
                <>
                  <iframe 
                      src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                      className="w-full h-full"
                      title={`${title} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                  />
                  
                  {/* Fallback Overlay - visible if embed fails or purely as an option */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                     <div className="pointer-events-auto">
                        <a 
                           href={`https://www.youtube.com/watch?v=${videoKey}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-lg transition-colors"
                        >
                           <ExternalLink className="w-4 h-4" />
                           Open in YouTube
                        </a>
                     </div>
                  </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4 bg-[#0f0f10]">
                    <div className="p-4 rounded-full bg-white/5">
                         <AlertCircle className="w-10 h-10 opacity-60" />
                    </div>
                    <p className="font-medium text-lg">Trailer unavailable</p>
                    <button 
                      onClick={onClose}
                      className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
                    >
                      Close
                    </button>
                </div>
            )}
        </div>
        
        {/* Footer info (optional for context, helping with "same-page trailer solution" feel) */}
        {videoKey && (
          <div className="px-6 py-3 bg-[#121212] border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Playback issues? 
              </span>
              <a 
                 href={`https://www.youtube.com/watch?v=${videoKey}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                 Watch directly on YouTube <ExternalLink className="w-3 h-3" />
              </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrailerModal;
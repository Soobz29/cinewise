import React, { useState } from 'react';
import { Play, Plus, Check, Share2, Star, Ticket } from 'lucide-react';
import { ExtendedMovieResult } from '../types';
import PosterImage from './PosterImage';
import { TMDB_IMAGE_BASE } from '../constants';

interface MediaCardProps {
  item: ExtendedMovieResult;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onPlayTrailer: (videoKey: string | null, title: string) => void;
  showActions?: boolean;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, inWatchlist, onToggleWatchlist, onPlayTrailer, showActions = true }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const title = item.title;
  const year = item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A');
  
  // Ratings Logic
  const tmdbScore = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
  const rtScore = item.vote_average ? Math.round(item.vote_average * 10) : 0;
  const isFresh = rtScore >= 60;

  // Targeted Platforms: Netflix, Prime, Disney+, Apple TV
  const targetedProviders = ['Netflix', 'Amazon Prime Video', 'Disney Plus', 'Apple TV', 'Apple TV Plus'];
  const relevantProviders = item.providers?.filter(p => targetedProviders.some(tp => p.provider_name.includes(tp) || tp.includes(p.provider_name))) || [];

  // Availability Logic
  const releaseDateObj = item.release_date ? new Date(item.release_date) : null;
  const now = new Date();
  // Check if unreleased
  const isUpcoming = releaseDateObj && releaseDateObj > now;
  // Approximate logic for "In Cinemas": Released within last 90 days and NOT on a flatrate streaming service
  const daysSinceRelease = releaseDateObj ? (now.getTime() - releaseDateObj.getTime()) / (1000 * 3600 * 24) : 999;
  const isMovie = item.media_type === 'movie';
  const isInTheaters = isMovie && !isUpcoming && daysSinceRelease < 90 && relevantProviders.length === 0;

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayTrailer(item.trailer || null, title);
  };

  const handleProviderClick = (providerName: string) => {
    const query = encodeURIComponent(`${title} watch on ${providerName}`);
    window.open(`https://www.google.com/search?q=${query}&btnI`, '_blank');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
    const shareData = {
        title: title,
        text: `Check out ${title} (${year})`,
        url: shareUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.debug('Share cancelled');
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy');
        }
    }
  };

  return (
    <div 
        className="w-[260px] md:w-[300px] flex flex-col gap-3 relative transition-all duration-500 group perspective-1000"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Container */}
      <div 
        className={`
            relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg cursor-pointer 
            transition-all duration-500 ease-out border border-white/5
            ${isHovered ? 'scale-105 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-2 ring-white/20 z-50' : 'z-0'}
        `}
        onClick={handleTrailerClick}
      >
        {/* Poster Image */}
        <div className="w-full h-full relative">
            <PosterImage 
            tmdbId={item.id} 
            type={item.media_type} 
            tmdbPath={item.poster_path} 
            alt={title}
            className="w-full h-full object-cover"
            />
        </div>

        {/* Gradient Overlay (Always visible for text contrast) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>

        {/* Center Play Button (Visible on Hover) */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-2xl group-active:scale-95 transition-transform flex items-center gap-2.5 hover:bg-white/20">
                <Play className="w-4 h-4 fill-white text-white" />
                <span className="text-white font-medium text-sm tracking-wide">Watch Trailer</span>
            </div>
        </div>

        {/* Top Right Actions */}
        {showActions && (
          <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
              {onToggleWatchlist && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
                      className={`p-2 rounded-full backdrop-blur-xl border border-white/10 shadow-lg ${inWatchlist ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}
                      title={inWatchlist ? "Remove from List" : "Add to List"}
                  >
                      {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
              )}
              <button 
                  onClick={handleShare}
                  className={`p-2 rounded-full backdrop-blur-xl border border-white/10 shadow-lg transition-all ${isCopied ? 'bg-green-600 text-white' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}
                  title="Share"
              >
                  {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </button>
          </div>
        )}

        {/* Bottom Info Overlay (Visible on Hover) */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-500 ${isHovered ? 'translate-y-0' : 'translate-y-full opacity-0'}`}>
             <p className="text-white/80 text-xs line-clamp-3 mb-3 font-medium leading-relaxed drop-shadow-md">
                 {item.overview || "No synopsis available."}
             </p>
             <div className="flex flex-wrap gap-2">
                 {relevantProviders.map((provider) => (
                    <button
                        key={provider.provider_id}
                        onClick={(e) => { e.stopPropagation(); handleProviderClick(provider.provider_name); }}
                        className="w-8 h-8 rounded-lg bg-black/50 border border-white/20 p-1 hover:bg-white hover:border-white transition-all"
                        title={`Watch on ${provider.provider_name}`}
                    >
                        <img 
                            src={`${TMDB_IMAGE_BASE}${provider.logo_path}`} 
                            alt={provider.provider_name} 
                            className="w-full h-full object-contain rounded-md"
                        />
                    </button>
                 ))}
             </div>
        </div>
      </div>

      {/* Persistent Meta Data (Below Card) */}
      <div className="px-1 flex flex-col gap-1 z-0">
         <h3 className="text-[17px] font-semibold text-white leading-tight truncate group-hover:text-slate-200 transition-colors">
            {title}
         </h3>
         
         <div className="flex items-center justify-between text-sm text-slate-400 font-medium">
            <div className="flex items-center gap-2">
                <span>{year}</span>
                <span className="text-slate-600">•</span>
                <span className="capitalize">{item.media_type === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
            
            {/* Ratings */}
            <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1">
                     <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                     <span className="text-slate-200 text-xs">{tmdbScore}</span>
                 </div>
                 {item.vote_average > 0 && (
                    <div className="flex items-center gap-1">
                         <span className="text-xs">{isFresh ? '🍅' : '🍿'}</span>
                         <span className="text-slate-200 text-xs">{rtScore}%</span>
                    </div>
                 )}
            </div>
         </div>

         {/* Availability Info */}
         {relevantProviders.length > 0 ? (
            <div 
              className="flex items-center gap-1.5 mt-1 cursor-pointer group/provider"
              onClick={(e) => { e.stopPropagation(); handleProviderClick(relevantProviders[0].provider_name); }}
            >
                <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Play className="w-2 h-2 text-indigo-400 fill-indigo-400" />
                </div>
                <span className="text-xs font-medium text-indigo-300 truncate group-hover/provider:text-indigo-200 group-hover/provider:underline transition-colors">
                    Stream on {relevantProviders[0].provider_name}
                </span>
            </div>
         ) : isInTheaters ? (
            <div className="flex items-center gap-1.5 mt-1">
                <Ticket className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">In Cinemas</span>
            </div>
         ) : isUpcoming ? (
            <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-medium text-slate-500">Coming {releaseDateObj?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
         ) : (
            // Spacer to keep card heights somewhat consistent if needed, or just nothing
            <div className="h-[20px]"></div>
         )}
      </div>
    </div>
  );
};

export default MediaCard;
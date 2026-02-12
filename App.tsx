import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeUserRequest } from './services/geminiService';
import { searchMedia, getWatchProviders, getTrailers, getTrending } from './services/tmdbService';
import { ExtendedMovieResult, LoadingStage, Recommendation } from './types';
import SearchBar from './components/SearchBar';
import MediaCard from './components/MediaCard';
import TrailerModal from './components/TrailerModal';
import { Loader2, Flame, Bookmark, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [results, setResults] = useState<ExtendedMovieResult[]>([]);
  const [trending, setTrending] = useState<ExtendedMovieResult[]>([]);
  const [watchlist, setWatchlist] = useState<ExtendedMovieResult[]>([]);
  const [loading, setLoading] = useState<LoadingStage>({ stage: 'idle' });
  const [lastQuery, setLastQuery] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<{ key: string | null; title: string } | null>(null);
  
  // Pagination State
  const [displayedTitles, setDisplayedTitles] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    // Load LocalStorage Data
    try {
      const savedWatchlist = localStorage.getItem('cinewise_watchlist');
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    } catch (e) { console.error("Storage parse error", e); }

    // Load Trending Content
    const loadTrending = async () => {
        const movies = await getTrending('movie');
        const tv = await getTrending('tv');
        const combined = [...movies.slice(0, 8), ...tv.slice(0, 8)].sort(() => 0.5 - Math.random());
        
        // Hydrate with details (providers, etc)
        const hydrated = await Promise.all(combined.map(async (item) => {
            const [providers, trailer] = await Promise.all([
                getWatchProviders(item.id, item.media_type),
                getTrailers(item.id, item.media_type)
            ]);
            return { ...item, providers, trailer };
        }));
        setTrending(hydrated);
    };

    loadTrending();
  }, []);

  // --- PERSISTENCE ---

  const toggleWatchlist = (item: ExtendedMovieResult) => {
    setWatchlist(prev => {
      const exists = prev.find(i => i.id === item.id);
      const updated = exists ? prev.filter(i => i.id !== item.id) : [item, ...prev];
      localStorage.setItem('cinewise_watchlist', JSON.stringify(updated));
      return updated;
    });
  };

  // --- TRAILER HANDLING ---
  
  const handlePlayTrailer = (key: string | null, title: string) => {
    setSelectedTrailer({ key, title });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTrailer(null);
  };

  // --- SEARCH & RECOMMENDATION ---

  const fetchRecommendations = async (query: string, currentTitles: Set<string>, isLoadMore: boolean) => {
    try {
      const excludeList = Array.from(currentTitles);
      const recommendations: Recommendation[] = await analyzeUserRequest(query, excludeList);

      if (recommendations.length === 0) {
        if (!isLoadMore) setLoading({ stage: 'error', message: "No matches found. Try a different search." });
        setHasMore(false);
        return;
      }

      if (!isLoadMore) setLoading({ stage: 'fetching', message: 'Curating selection...' });

      const mediaPromises = recommendations.map(async (rec) => {
        if (currentTitles.has(rec.title)) return null;
        const details = await searchMedia(rec.title, rec.media_type, rec.year);
        if (!details) return null;

        const [providers, trailer] = await Promise.all([
          getWatchProviders(details.id, rec.media_type),
          getTrailers(details.id, rec.media_type)
        ]);

        return {
          ...details,
          title: (details as any).title || (details as any).name,
          ai_reason: rec.reason,
          media_type: rec.media_type,
          providers,
          trailer
        } as ExtendedMovieResult;
      });

      const fetchedResults = await Promise.all(mediaPromises);
      const validResults = fetchedResults.filter((item): item is ExtendedMovieResult => item !== null);
      
      if (validResults.length === 0) setHasMore(false);

      setResults(prev => isLoadMore ? [...prev, ...validResults] : validResults);
      setDisplayedTitles(prev => {
        const newSet = new Set(prev);
        validResults.forEach(r => newSet.add(r.title));
        return newSet;
      });
      
      setLoading({ stage: 'complete' });

    } catch (error) {
      console.error(error);
      setLoading({ stage: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async (query: string) => {
    setLastQuery(query);
    setLoading({ stage: 'analyzing', message: 'Searching library...' });
    setResults([]);
    setDisplayedTitles(new Set());
    setPage(1);
    setHasMore(true);
    await fetchRecommendations(query, new Set(), false);
  };

  // --- INFINITE SCROLL ---

  const handleLoadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore || !lastQuery) return;
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      await fetchRecommendations(lastQuery, displayedTitles, true);
  }, [isLoadingMore, hasMore, lastQuery, displayedTitles]);

  useEffect(() => {
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && results.length > 0) {
              handleLoadMore();
          }
      }, { threshold: 0.1 });

      if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

      return () => observerRef.current?.disconnect();
  }, [results, handleLoadMore]);


  // Helper to determine if we are in "Home" mode (idle and no search results)
  const isHomepage = loading.stage === 'idle' && results.length === 0;

  return (
    <div className="min-h-screen bg-[#000000] text-[#e5e5e5] font-sans selection:bg-white/20 pb-32 overflow-x-hidden">
      
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#1a1a1a] to-transparent opacity-60"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Navigation Header */}
      <header className="fixed w-full z-50 top-0 transition-all duration-300 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
           {/* Logo */}
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Sparkles className="w-5 h-5 text-black" />
             </div>
             <span className="text-xl font-bold tracking-tight text-white font-display">CineWise</span>
           </div>
           
           {/* Search */}
           <div className="flex-1 max-w-2xl w-full">
              <SearchBar 
                onSearch={handleSearch} 
                isLoading={loading.stage === 'analyzing' || (loading.stage === 'fetching' && !isLoadingMore)} 
              />
           </div>

           {/* Profile Icon (Removed broken links) */}
           <div className="hidden md:flex items-center gap-5">
               <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden cursor-default">
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
               </div>
           </div>
        </div>
      </header>

      <main className="relative z-10 w-full pt-28 space-y-12">
        
        {/* Loading State Overlay */}
        {loading.stage === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-40 animate-fade-in">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4 opacity-80" />
            <p className="text-lg text-white/60 font-light tracking-wide">{loading.message}</p>
          </div>
        )}

        {/* Error State */}
        {loading.stage === 'error' && (
           <div className="max-w-xl mx-auto mt-12 p-6 bg-red-900/10 border border-red-500/10 rounded-2xl text-center">
            <p className="text-red-200/80">{loading.message}</p>
          </div>
        )}

        {/* --- HOMEPAGE DESCRIPTION --- */}
        {isHomepage && (
           <div className="max-w-[1200px] mx-auto px-6 mt-8 mb-12 text-center animate-fade-in">
               <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tighter">
                  Discover Your Next<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Favorite Story</span>
               </h1>
               <div className="max-w-2xl mx-auto space-y-4">
                 <p className="text-lg text-slate-300 font-light leading-relaxed">
                    Recommends movies and TV shows based on your natural language input.
                    Featuring posters, IMDb & Rotten Tomatoes ratings, and streaming platform availability.
                 </p>
               </div>
           </div>
        )}

        {/* --- MAIN RESULTS ROW --- */}
        {(results.length > 0) && (
          <div className="animate-fade-in-up pl-6 md:pl-12">
            <div className="flex items-baseline gap-4 mb-4">
               <h2 className="text-2xl font-semibold text-white tracking-wide">Top Picks</h2>
               {lastQuery && <span className="text-slate-500 font-medium truncate max-w-md text-base opacity-70">for "{lastQuery}"</span>}
            </div>
            
            <div className="flex overflow-x-auto gap-5 pb-12 pt-4 px-2 snap-x snap-mandatory scroll-smooth scrollbar-hide -ml-2">
              {results.map((item) => (
                <div key={`${item.id}-${item.media_type}`} className="snap-start shrink-0 pl-2">
                    <MediaCard 
                        item={item} 
                        inWatchlist={watchlist.some(w => w.id === item.id)}
                        onToggleWatchlist={() => toggleWatchlist(item)}
                        onPlayTrailer={handlePlayTrailer}
                        showActions={true}
                    />
                </div>
              ))}
              
              {/* Infinite Scroll Sentinel */}
              <div ref={loadMoreRef} className="snap-start shrink-0 w-20 flex items-center justify-center">
                 {isLoadingMore && <Loader2 className="w-6 h-6 text-white/50 animate-spin" />}
              </div>
            </div>
          </div>
        )}

        {/* --- WATCHLIST ROW --- */}
        {watchlist.length > 0 && (
            <div className="pl-6 md:pl-12">
                <div className="flex items-center gap-2 mb-4">
                    <Bookmark className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white tracking-wide">My List</h2>
                </div>
                <div className="flex overflow-x-auto gap-5 pb-8 px-2 snap-x snap-mandatory scroll-smooth scrollbar-hide -ml-2">
                    {watchlist.map((item) => (
                        <div key={`wl-${item.id}`} className="snap-start shrink-0 pl-2">
                            <MediaCard 
                                item={item} 
                                inWatchlist={true}
                                onToggleWatchlist={() => toggleWatchlist(item)}
                                onPlayTrailer={handlePlayTrailer}
                                showActions={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TRENDING ROW (Moved to Bottom) --- */}
        {trending.length > 0 && (
            <div className="pl-6 md:pl-12 pb-20">
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="text-xl font-semibold text-white tracking-wide">Trending Now</h2>
                </div>
                <div className="flex overflow-x-auto gap-5 pb-8 px-2 snap-x snap-mandatory scroll-smooth scrollbar-hide -ml-2">
                    {trending.map((item) => (
                        <div key={`trend-${item.id}`} className="snap-start shrink-0 pl-2">
                            <MediaCard 
                                item={item} 
                                inWatchlist={watchlist.some(w => w.id === item.id)}
                                onToggleWatchlist={() => toggleWatchlist(item)}
                                onPlayTrailer={handlePlayTrailer}
                                showActions={false}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* --- TRAILER MODAL --- */}
      <TrailerModal 
        isOpen={modalOpen} 
        onClose={handleCloseModal} 
        videoKey={selectedTrailer?.key || null} 
        title={selectedTrailer?.title || ''} 
      />

    </div>
  );
};

export default App;
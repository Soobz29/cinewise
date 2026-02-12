import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MovieResult, WatchProvider, Video } from '../types';

const fetchTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.statusText}`);
  }
  return response.json();
};

export const searchMedia = async (query: string, type: 'movie' | 'tv' = 'movie', year?: number, page: number = 1): Promise<MovieResult | null> => {
  try {
    const params: Record<string, string> = { 
      query,
      page: page.toString() 
    };

    if (year) {
      if (type === 'movie') params.primary_release_year = year.toString();
      if (type === 'tv') params.first_air_date_year = year.toString();
    }
    
    const data = await fetchTMDB(`/search/${type}`, params);
    
    if (data.results && data.results.length > 0) {
      // Return the first result that matches closely, or just the first one
      const exactMatch = data.results.find((item: any) => {
        const title = type === 'movie' ? item.title : item.name;
        return title.toLowerCase() === query.toLowerCase();
      });
      return exactMatch || data.results[0];
    }
    return null;
  } catch (error) {
    console.error("Error searching media:", error);
    return null;
  }
};

export const getWatchProviders = async (id: number, type: 'movie' | 'tv'): Promise<WatchProvider[]> => {
  try {
    const data = await fetchTMDB(`/${type}/${id}/watch/providers`);
    // Default to US for this demo
    const usProviders = data.results?.US?.flatrate || [];
    return usProviders.map((p: any) => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path
    }));
  } catch (error) {
    console.error("Error fetching providers:", error);
    return [];
  }
};

export const getTrailers = async (id: number, type: 'movie' | 'tv'): Promise<string | undefined> => {
  try {
    const data = await fetchTMDB(`/${type}/${id}/videos`);
    const videos: any[] = data.results || [];
    
    // Filter strictly for YouTube
    const ytVideos = videos.filter(v => v.site === 'YouTube');
    
    // STRATEGY FOR ERROR 153:
    // 1. Prioritize "Official" Trailers (Type: Trailer, Official: true). These are almost always embeddable.
    // 2. Fallback to any "Trailer".
    // 3. Fallback to "Official" Teasers (if no trailer exists, better to show something than nothing).
    
    const bestMatch = 
        ytVideos.find(v => v.type === 'Trailer' && v.official) || 
        ytVideos.find(v => v.type === 'Trailer') ||
        ytVideos.find(v => v.type === 'Teaser' && v.official) ||
        ytVideos[0]; // Absolute fallback

    return bestMatch?.key;
  } catch (error) {
    console.error("Error fetching trailers:", error);
    return undefined;
  }
};

// New: Get Trending Movies/TV for the initial view
export const getTrending = async (type: 'movie' | 'tv' = 'movie'): Promise<MovieResult[]> => {
  try {
    const data = await fetchTMDB(`/trending/${type}/week`);
    return (data.results || []).map((item: any) => ({
      ...item,
      media_type: type // Ensure media_type is set
    }));
  } catch (error) {
    console.error(`Error fetching trending ${type}:`, error);
    return [];
  }
};

// New: Autocomplete suggestions
export const getAutocompleteSuggestions = async (query: string): Promise<MovieResult[]> => {
  try {
    if (!query || query.length < 2) return [];
    const data = await fetchTMDB('/search/multi', { query, page: '1' });
    // Filter for only movies and tv shows
    return (data.results || [])
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 5);
  } catch (error) {
    return [];
  }
};
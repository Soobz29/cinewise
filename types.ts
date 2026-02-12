export interface MovieResult {
  id: number;
  title: string; // or name for TV
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
}

export interface Recommendation {
  title: string;
  media_type: 'movie' | 'tv';
  year?: number;
  reason: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface Video {
  key: string;
  site: string;
  type: string;
}

export interface ExtendedMovieResult extends MovieResult {
  ai_reason?: string;
  providers?: WatchProvider[];
  trailer?: string;
  tmdb_poster?: string;
  rpdb_poster?: string;
}

export interface LoadingStage {
  stage: 'idle' | 'analyzing' | 'fetching' | 'complete' | 'error';
  message?: string;
}
import { create } from 'zustand';
import { getNextVideoForUser } from '../lib/supabase';

interface Video {
  video_id: string;
  youtube_url: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
}

interface VideoState {
  videoQueue: Video[];
  currentVideoIndex: number;
  isLoading: boolean;
  error: string | null;
  blacklistedVideoIds: string[];
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  handleVideoError: (videoId: string) => void;
  resetQueue: () => void;
  clearQueue: () => void;
  setError: (error: string | null) => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  error: null,
  blacklistedVideoIds: [],

  fetchVideos: async (userId: string) => {
    console.log('VideoStore: Starting fetchVideos for user:', userId);
    set({ isLoading: true });
    try {
      const videos = await getNextVideoForUser(userId);
      console.log('VideoStore: Received videos:', videos);
      
      if (videos && videos.length > 0) {
        const { blacklistedVideoIds } = get();
        const filteredVideos = videos.filter(
          (video: Video) => !blacklistedVideoIds.includes(video.video_id)
        );
        console.log('VideoStore: Filtered videos:', filteredVideos.length);
        set({ 
          videoQueue: filteredVideos, 
          currentVideoIndex: 0,
          isLoading: false,
          error: null
        });
      } else {
        console.log('VideoStore: No videos received');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0, 
          isLoading: false,
          error: 'No videos available at the moment'
        });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      set({ 
        isLoading: false,
        error: 'Failed to load videos. Please try again.'
      });
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    return videoQueue[currentVideoIndex] || null;
  },

  moveToNextVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    if (currentVideoIndex < videoQueue.length - 1) {
      set({ currentVideoIndex: currentVideoIndex + 1 });
    } else {
      // Reset to beginning or fetch more videos
      set({ currentVideoIndex: 0 });
    }
  },

  handleVideoError: (videoId: string) => {
    console.log('VideoStore: Handling video error for:', videoId);
    const { blacklistedVideoIds } = get();
    set({ 
      blacklistedVideoIds: [...blacklistedVideoIds, videoId] 
    });
    get().moveToNextVideo();
  },

  resetQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      isLoading: false,
      blacklistedVideoIds: [],
      error: null
    });
  },

  clearQueue: () => {
    console.log('Video queue cleared - forcing refresh');
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      isLoading: false,
      blacklistedVideoIds: [],
      error: null
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
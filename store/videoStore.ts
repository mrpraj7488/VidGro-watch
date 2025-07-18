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
  blacklistedVideoIds: string[];
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  handleVideoError: (videoId: string) => void;
  resetQueue: () => void;
  clearQueue: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  blacklistedVideoIds: [],

  fetchVideos: async (userId: string) => {
    set({ isLoading: true });
    try {
      const videos = await getNextVideoForUser(userId);
      if (videos && videos.length > 0) {
        const { blacklistedVideoIds } = get();
        // Filter out user's own videos and blacklisted videos
        const filteredVideos = videos.filter((video: Video) => {
          // The RPC function should already exclude user's own videos,
          // but we add this as an extra safety check
          return !blacklistedVideoIds.includes(video.video_id);
        });
        
        console.log(`Fetched ${videos.length} videos, filtered to ${filteredVideos.length} videos`);
        
        set({ 
          videoQueue: filteredVideos, 
          currentVideoIndex: 0,
          isLoading: false 
        });
      } else {
        console.log('No videos available in queue');
        set({ videoQueue: [], currentVideoIndex: 0, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      set({ isLoading: false });
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    return videoQueue[currentVideoIndex] || null;
  },

  moveToNextVideo: () => {
    const { videoQueue, currentVideoIndex, fetchVideos } = get();
    
    if (currentVideoIndex < videoQueue.length - 1) {
      set({ currentVideoIndex: currentVideoIndex + 1 });
    } else {
      // If we're at the end of the queue, fetch more videos
      set({ currentVideoIndex: 0, videoQueue: [] });
      // Note: We need the userId to fetch more videos
      // This will be handled by the component calling fetchVideos again
    }
  },

  handleVideoError: (videoId: string) => {
    const { blacklistedVideoIds, moveToNextVideo } = get();
    console.log('Video error for:', videoId, 'adding to blacklist');
    set({ 
      blacklistedVideoIds: [...blacklistedVideoIds, videoId] 
    });
    moveToNextVideo();
  },

  resetQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      isLoading: false,
      blacklistedVideoIds: []
    });
  },

  clearQueue: () => {
    console.log('Video queue cleared - forcing refresh');
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      isLoading: false,
      blacklistedVideoIds: []
    });
  },
});
        );
        set({ 
          videoQueue: filteredVideos, 
          currentVideoIndex: 0,
          isLoading: false 
        });
      } else {
        set({ videoQueue: [], currentVideoIndex: 0, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      set({ isLoading: false });
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
      blacklistedVideoIds: []
    });
  },

  clearQueue: () => {
    console.log('Video queue cleared - forcing refresh');
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      isLoading: false,
      blacklistedVideoIds: []
    });
  },
}));
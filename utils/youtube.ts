// YouTube API utilities for VidGro app

interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

// Extract video ID from YouTube URL
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Convert ISO 8601 duration to seconds
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Get video thumbnail URL
export function getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

// Get video embed URL
export function getEmbedUrl(videoId: string, options: {
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  mute?: boolean;
  start?: number;
  end?: number;
} = {}): string {
  const params = new URLSearchParams();
  
  if (options.autoplay) params.set('autoplay', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.loop) params.set('loop', '1');
  if (options.mute) params.set('mute', '1');
  if (options.start) params.set('start', options.start.toString());
  if (options.end) params.set('end', options.end.toString());
  
  // Always disable related videos from other channels
  params.set('rel', '0');
  
  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
}

// Fetch video information using YouTube Data API
export async function fetchVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('YouTube API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;

    return {
      id: videoId,
      title: snippet.title,
      description: snippet.description,
      duration: parseDuration(contentDetails.duration),
      thumbnail: getThumbnailUrl(videoId, 'medium'),
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
}

// Validate if video is suitable for promotion
export function validateVideoForPromotion(videoInfo: YouTubeVideoInfo): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check duration (10 seconds to 10 minutes)
  if (videoInfo.duration < 10) {
    errors.push('Video must be at least 10 seconds long');
  }
  if (videoInfo.duration > 600) {
    errors.push('Video must be less than 10 minutes long');
  }

  // Check if video is too old (optional - could be configurable)
  const publishedDate = new Date(videoInfo.publishedAt);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (publishedDate < oneYearAgo) {
    errors.push('Video is too old for promotion');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Format view count for display
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Check if URL is a valid YouTube URL
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// Get video watch URL from video ID
export function getWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Create YouTube search URL
export function createSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.youtube.com/results?search_query=${encodedQuery}`;
}

// Extract video info from URL (without API)
export async function getBasicVideoInfo(url: string): Promise<{
  videoId: string;
  thumbnailUrl: string;
  embedUrl: string;
} | null> {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    thumbnailUrl: getThumbnailUrl(videoId),
    embedUrl: getEmbedUrl(videoId, { autoplay: true, controls: true }),
  };
}

// YouTube player state constants
export const PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

// Create iframe player HTML for WebView
export function createPlayerHTML(videoId: string, options: {
  width?: number;
  height?: number;
  autoplay?: boolean;
  controls?: boolean;
} = {}): string {
  const {
    width = 320,
    height = 180,
    autoplay = true,
    controls = true,
  } = options;

  const embedUrl = getEmbedUrl(videoId, { autoplay, controls });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        iframe {
          border: none;
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <iframe
        src="${embedUrl}"
        width="${width}"
        height="${height}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    </body>
    </html>
  `;
}

export default {
  extractVideoId,
  parseDuration,
  getThumbnailUrl,
  getEmbedUrl,
  fetchVideoInfo,
  validateVideoForPromotion,
  formatViewCount,
  formatDuration,
  isValidYouTubeUrl,
  getWatchUrl,
  createSearchUrl,
  getBasicVideoInfo,
  createPlayerHTML,
  PLAYER_STATES,
};
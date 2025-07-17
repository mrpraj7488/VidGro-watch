// YouTube utilities for VidGro app - System-based validation without API

interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  isEmbeddable: boolean;
  embedUrl: string;
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

// Extract video title from YouTube page (system-based approach)
export async function extractVideoTitle(videoId: string): Promise<string | null> {
  try {
    // Try to fetch the YouTube page and extract title from meta tags
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Extract title from various possible meta tags
    const titlePatterns = [
      /<meta property="og:title" content="([^"]+)"/,
      /<meta name="title" content="([^"]+)"/,
      /<title>([^<]+)<\/title>/,
      /"title":"([^"]+)"/
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Clean up the title (remove " - YouTube" suffix if present)
        let title = match[1].replace(/ - YouTube$/, '').trim();
        // Decode HTML entities
        title = title.replace(/"/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&/g, '&')
                    .replace(/</g, '<')
                    .replace(/>/g, '>');
        return title;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting video title:', error);
    return null;
  }
}

// Check if video is embeddable by testing iframe load
export function checkVideoEmbeddable(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      // Not in browser environment, assume embeddable
      resolve(true);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = getEmbedUrl(videoId, { autoplay: false, controls: true });
    iframe.style.display = 'none';
    iframe.width = '1';
    iframe.height = '1';
    
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        document.body.removeChild(iframe);
        resolve(false);
      }
    }, 5000); // 5 second timeout

    iframe.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(true);
      }
    };

    iframe.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(false);
      }
    };

    document.body.appendChild(iframe);
  });
}

// Validate video for promotion (system-based)
export async function validateVideoForPromotion(url: string): Promise<{
  isValid: boolean;
  videoInfo?: YouTubeVideoInfo;
  error?: string;
}> {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    return {
      isValid: false,
      error: 'Invalid YouTube URL format'
    };
  }

  try {
    // Check if video is embeddable
    const isEmbeddable = await checkVideoEmbeddable(videoId);
    
    if (!isEmbeddable) {
      return {
        isValid: false,
        error: 'Video is not embeddable or may be restricted'
      };
    }

    // Extract video title
    const title = await extractVideoTitle(videoId);
    
    if (!title) {
      return {
        isValid: false,
        error: 'Could not extract video title. Video may be private or restricted.'
      };
    }

    const videoInfo: YouTubeVideoInfo = {
      id: videoId,
      title,
      thumbnail: getThumbnailUrl(videoId),
      isEmbeddable: true,
      embedUrl: getEmbedUrl(videoId, { autoplay: true, controls: true })
    };

    return {
      isValid: true,
      videoInfo
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate video. Please check the URL and try again.'
    };
  }
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

// Get basic video info without API
export async function getBasicVideoInfo(url: string): Promise<YouTubeVideoInfo | null> {
  const validation = await validateVideoForPromotion(url);
  
  if (validation.isValid && validation.videoInfo) {
    return validation.videoInfo;
  }
  
  return null;
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
  getThumbnailUrl,
  getEmbedUrl,
  extractVideoTitle,
  checkVideoEmbeddable,
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
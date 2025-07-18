import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoStore } from '../../store/videoStore';
import { useAdFreeStore } from '../../store/adFreeStore';
import { awardCoinsForVideoCompletion } from '../../lib/supabase';
import GlobalHeader from '../../components/GlobalHeader';
import { ExternalLink, Play, Pause, SkipForward } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { videoQueue, currentVideoIndex, isLoading, fetchVideos, getCurrentVideo, moveToNextVideo, handleVideoError } = useVideoStore();
  const { isAdFreeActive, updateTimer } = useAdFreeStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [canEarnCoins, setCanEarnCoins] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(false);
  const [adCounter, setAdCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoProgressing, setAutoProgressing] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const watchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoProgressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideo = getCurrentVideo();

  useEffect(() => {
    if (user && !isLoading && videoQueue.length === 0) {
      fetchVideos(user.id);
    }
  }, [user, isLoading, videoQueue.length, fetchVideos]);

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  useEffect(() => {
    if (currentVideo) {
      resetVideoState();
      startWatchTimer();
    }

    return () => {
      if (watchTimerRef.current) {
        clearInterval(watchTimerRef.current);
      }
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
      }
    };
  }, [currentVideo]);

  const resetVideoState = () => {
    if (watchTimerRef.current) {
      clearInterval(watchTimerRef.current);
    }
    if (autoProgressTimerRef.current) {
      clearTimeout(autoProgressTimerRef.current);
    }

    const duration = currentVideo?.duration_seconds || 0;
    const requiredWatchTime = Math.floor(duration * 0.95); // 95% completion
    
    setSecondsRemaining(requiredWatchTime);
    setWatchedSeconds(0);
    setVideoStartTime(Date.now());
    setCanEarnCoins(false);
    setCoinsAwarded(false);
    setIsPlaying(true);
    setAutoProgressing(false);
  };

  const startWatchTimer = () => {
    if (!currentVideo) return;

    const duration = currentVideo.duration_seconds;
    const requiredWatchTime = Math.floor(duration * 0.95);

    watchTimerRef.current = setInterval(() => {
      if (isPlaying) {
        setWatchedSeconds(prev => {
          const newWatchedSeconds = prev + 1;
          
          setSecondsRemaining(Math.max(0, requiredWatchTime - newWatchedSeconds));
          
          // Check if we've reached the required watch time
          if (newWatchedSeconds >= requiredWatchTime && !coinsAwarded) {
            setCanEarnCoins(true);
            awardCoinsAutomatically(newWatchedSeconds);
          }
          
          return newWatchedSeconds;
        });
      }
    }, 1000);
  };

  const awardCoinsAutomatically = async (watchDuration: number) => {
    if (!currentVideo || !user || coinsAwarded) return;

    setCoinsAwarded(true);

    try {
      const result = await awardCoinsForVideoCompletion(
        user.id,
        currentVideo.video_id,
        watchDuration
      );

      if (result && result.success) {
        // Silently refresh profile to update coin balance
        await refreshProfile();
        
        // Set auto-progression after a short delay
        setAutoProgressing(true);
        autoProgressTimerRef.current = setTimeout(() => {
          handleAutoProgression();
        }, 2000); // 2 second delay before auto-progression
      }
    } catch (error) {
      console.error('Error awarding coins:', error);
      // Still allow progression even if coin award fails
      setAutoProgressing(true);
      autoProgressTimerRef.current = setTimeout(() => {
        handleAutoProgression();
      }, 2000);
    }
  };

  const handleAutoProgression = () => {
    // Show ad after every 5 videos if not ad-free
    if (!isAdFreeActive) {
      setAdCounter(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) {
          // In a real implementation, you would show an ad here
          console.log('Would show ad after 5 videos');
          return 0;
        }
        return newCount;
      });
    }

    // Move to next video
    moveToNextVideo();
  };

  const handleSkipVideo = () => {
    Alert.alert(
      'Skip Video',
      'Are you sure you want to skip this video? You won\'t earn any coins.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => {
          if (watchTimerRef.current) {
            clearInterval(watchTimerRef.current);
          }
          if (autoProgressTimerRef.current) {
            clearTimeout(autoProgressTimerRef.current);
          }
          moveToNextVideo();
        }}
      ]
    );
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    
    // Send play/pause command to WebView
    if (webViewRef.current) {
      const command = isPlaying ? 'pauseVideo()' : 'playVideo()';
      webViewRef.current.postMessage(JSON.stringify({ action: command }));
    }
  };

  const openInYouTube = () => {
    if (currentVideo) {
      Alert.alert(
        'Open in YouTube',
        'This will open the video in YouTube app',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => {
            // YouTube app would open here
          }}
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GlobalHeader 
          title="View" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <GlobalHeader 
          title="View" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos available</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => user && fetchVideos(user.id)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getEmbedUrl = (youtubeUrl: string) => {
    const videoId = youtubeUrl.split('v=')[1]?.split('&')[0] || youtubeUrl.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&showinfo=0&fs=0&disablekb=1&enablejsapi=1`;
  };

  const createSecurePlayerHTML = (embedUrl: string) => {
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
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
          iframe {
            border: none;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
          }
          .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 10;
            pointer-events: auto;
          }
        </style>
      </head>
      <body>
        <iframe
          id="player"
          src="${embedUrl}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
        <div class="overlay"></div>
        
        <script>
          let player;
          
          function onYouTubeIframeAPIReady() {
            // YouTube API ready
          }
          
          function playVideo() {
            const iframe = document.getElementById('player');
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
          
          function pauseVideo() {
            const iframe = document.getElementById('player');
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          }
          
          // Listen for messages from React Native
          window.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data.action === 'playVideo()') {
                playVideo();
              } else if (data.action === 'pauseVideo()') {
                pauseVideo();
              }
            } catch (e) {
              // Ignore invalid messages
            }
          });
          
          // Prevent all interactions with the iframe
          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          });
          
          document.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          });
          
          // Disable context menu
          document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="View" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <View style={styles.videoContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: createSecurePlayerHTML(getEmbedUrl(currentVideo.youtube_url)) }}
          style={styles.webView}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onError={() => handleVideoError(currentVideo.video_id)}
          onShouldStartLoadWithRequest={() => true}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          allowsBackForwardNavigationGestures={false}
          allowsLinkPreview={false}
          dataDetectorTypes="none"
        />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.videoControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause}>
            {isPlaying ? (
              <Pause size={24} color="#800080" />
            ) : (
              <Play size={24} color="#800080" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={openInYouTube}>
            <ExternalLink size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={handleSkipVideo}>
            <SkipForward size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{secondsRemaining}</Text>
            <Text style={styles.statLabel}>Seconds to earn coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentVideo.coin_reward}</Text>
            <Text style={styles.statLabel}>Coins to earn</Text>
          </View>
        </View>

        {canEarnCoins && !autoProgressing && (
          <View style={styles.earnedContainer}>
            <Text style={styles.earnedText}>🎉 Coins Earned! Moving to next video...</Text>
          </View>
        )}

        {autoProgressing && (
          <View style={styles.progressingContainer}>
            <Text style={styles.progressingText}>Loading next video...</Text>
          </View>
        )}

        {!isAdFreeActive && (
          <View style={styles.adNotice}>
            <Text style={styles.adNoticeText}>
              You will see an Ad after watching 5 Videos. CONFIGURE?
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#800080',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    height: 250,
    backgroundColor: 'black',
    margin: 0,
  },
  webView: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    padding: 20,
  },
  videoControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  earnedContainer: {
    backgroundColor: '#2ECC71',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  earnedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressingContainer: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  progressingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  adNotice: {
    backgroundColor: '#FF4757',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  adNoticeText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});
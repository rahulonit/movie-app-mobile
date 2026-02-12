import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TouchableWithoutFeedback, Text, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import apiService from '../services/api';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function VideoPlayerScreen({ route, navigation }: any) {
  const { cloudflareVideoId, title, contentId, contentType, episodeId, genres } = route.params;
  const activeProfile = useSelector((state: RootState) => state.profile.activeProfile);
  const lastProgressSent = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const webRef = useRef<WebView>(null);
  const [paused, setPaused] = useState(false);
  const [startPosition, setStartPosition] = useState<number>(0);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [qualityMenuVisible, setQualityMenuVisible] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [seekFeedback, setSeekFeedback] = useState<{ show: boolean; direction: 'left' | 'right' | null }>({ show: false, direction: null });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [speedMenuVisible, setSpeedMenuVisible] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const [audioTracksMenuVisible, setAudioTracksMenuVisible] = useState(false);
  const [audioTrack, setAudioTrack] = useState<string>('en');
  const [subtitlesMenuVisible, setSubtitlesMenuVisible] = useState(false);
  const [subtitle, setSubtitle] = useState<string>('off');
  const [volume, setVolume] = useState<number>(1);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080p' },
    { label: '720p', value: '720p' },
    { label: '480p', value: '480p' },
    { label: '360p', value: '360p' }
  ];

  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: 'Normal', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 }
  ];

  const audioTracks = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' }
  ];

  const subtitleTracks = [
    { label: 'Off', value: 'off' },
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' }
  ];

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Fetch last watched position
  useEffect(() => {
    if (!activeProfile) return;

    apiService.getWatchHistory(activeProfile._id)
      .then(response => {
        const history = response.data.watchHistory || [];
        const entry = history.find((h: any) => 
          h.contentId === contentId && 
          (!episodeId || h.episodeId === episodeId)
        );
        if (entry && entry.progress) {
          // Resume from saved position (convert ms to seconds for player)
          setStartPosition(entry.progress / 1000);
        }
      })
      .catch(err => console.warn('Failed to fetch watch history', err));
  }, [activeProfile, contentId, episodeId]);

  const html = useMemo(() => {
    const videoId = cloudflareVideoId || '';
    const safeTitle = (title || '').replace(/</g, '&lt;');
    const startTime = startPosition || 0;
    if (__DEV__) console.log('WebView HTML startTime', startTime, 'videoId', videoId);
    // Use the standard Cloudflare Stream embed URL (no <CODE> placeholder)
    // Example: https://iframe.cloudflarestream.com/${videoId}?autoplay=true&controls=false
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: none; }
    </style>
    <script src="https://embed.cloudflarestream.com/embed/sdk.latest.js"></script>
  </head>
  <body>
    <iframe
      id="stream-player"
      src="https://iframe.cloudflarestream.com/${videoId}?autoplay=true&controls=false"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowfullscreen="true"
      style="width:100%;height:100%;border:none;"
    ></iframe>
    <script>
      const post = (payload) => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };
      const player = Stream(document.getElementById('stream-player'));
      player.addEventListener('loadedmetadata', () => {
        if (${startTime} > 0) {
          player.currentTime = ${startTime};
        }
        post({ type: 'ready' });
      });
      player.addEventListener('timeupdate', () => {
        post({ type: 'progress', position: player.currentTime * 1000, duration: player.duration * 1000, paused: player.paused });
      });
      player.addEventListener('durationchange', () => {
        post({ type: 'duration', duration: player.duration * 1000 });
      });
      player.addEventListener('play', () => {
        post({ type: 'playstate', paused: false });
      });
      player.addEventListener('pause', () => {
        post({ type: 'playstate', paused: true });
      });
      // Handle commands from React Native
      window.__enqueueCommand = (data) => {
        try {
          if (data.type === 'seek') {
            player.currentTime = data.time;
          } else if (data.type === 'play') {
            player.play();
          } else if (data.type === 'pause') {
            player.pause();
          } else if (data.type === 'setSpeed') {
            player.playbackRate = data.speed || 1;
          } else if (data.type === 'setVolume') {
            player.volume = Math.min(1, Math.max(0, data.volume ?? 1));
          }
        } catch (e) {}
      };
    </script>
  </body>
</html>`;
  }, [cloudflareVideoId, title, startPosition]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let data: any;
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        if (__DEV__) console.log('WebView message parse error', event.nativeEvent.data);
        return;
      }

      if (__DEV__) console.log('WebView message', data);

      if (data?.type === 'ready' || data?.type === 'playerReady') {
        setPlayerReady(true);
      } else if (data?.type === 'duration') {
        const dur = data.duration / 1000;
        setVideoDuration(dur);
        if (__DEV__) console.log('Duration set:', dur);
      } else if (data?.type === 'playstate') {
        setPaused(!!data.paused);
      } else if (data?.type === 'error') {
        if (__DEV__) console.log('Player error:', data.message);
      } else if (data?.type === 'progress') {
        const { position, duration, paused: isPaused } = data;
        if (__DEV__) console.log('Progress event', { position, duration, isPaused });
        setPaused(!!isPaused);
        const pos = position / 1000;
        const dur = duration / 1000;
        if (!isScrubbing) {
          setCurrentPosition(pos);
        }
        if (dur > 0 && dur !== videoDuration) {
          setVideoDuration(dur);
        }
        // Playback session integration (start/update/complete)
        (async () => {
          try {
            if (!activeProfile || !duration) return;

            // Start session once when duration is known
            if (!sessionIdRef.current && duration > 0) {
              const sessionId = await apiService.startPlaybackSession({
                profileId: activeProfile._id,
                titleId: contentId,
                episodeId,
                durationMs: duration,
                currentCdn: 'cloudflare',
                currentBitrate: 0,
                resumeAt: position,
              });
              sessionIdRef.current = sessionId;
            }

            if (sessionIdRef.current) {
              const now = Date.now();
              const shouldSend = now - lastProgressSent.current > 10000; // ~10s
              const nearEnd = duration > 0 && position >= duration - 2000; // last 2s

              if (shouldSend || nearEnd) {
                await apiService.updatePlaybackSession(sessionIdRef.current, {
                  lastPositionMs: position,
                  durationMs: duration,
                  resumeAt: position,
                });
                lastProgressSent.current = now;
              }

              if (nearEnd) {
                await apiService.completePlaybackSession(sessionIdRef.current);
                sessionIdRef.current = null;
              }
            }
          } catch (err) {
            if (__DEV__) console.warn('Playback session update failed', err);
          }
        })();
      } else if (data?.type === 'qualityChange') {
        // Quality change detected - no action needed, just acknowledged
      }
    },
    [activeProfile, contentId, contentType, episodeId, isScrubbing, videoDuration]
  );

  const sendCommand = useCallback((payload: any) => {
    const script = `(function(){ if (window.__enqueueCommand) { window.__enqueueCommand(${JSON.stringify(payload)}); } })(); true;`;
    webRef.current?.injectJavaScript(script);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    hideControlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  }, []);

  // Hide controls after initial display
  useEffect(() => {
    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
    
    return () => {
      clearTimeout(timer);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const lastLeftTap = useRef<number>(0);
  const lastRightTap = useRef<number>(0);
  const leftTapCount = useRef<number>(0);
  const rightTapCount = useRef<number>(0);
  const DOUBLE_TAP_MS = 400;

  const onLeftTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastLeftTap.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_MS) {
      // Double tap detected
      leftTapCount.current++;
      if (leftTapCount.current === 2) {
        const seekTime = Math.max(0, currentPosition - 10);
        sendCommand({ type: 'seek', time: seekTime });
        setCurrentPosition(seekTime);
        setSeekFeedback({ show: true, direction: 'left' });
        setTimeout(() => setSeekFeedback({ show: false, direction: null }), 800);
        leftTapCount.current = 0;
      }
    } else {
      // First tap
      leftTapCount.current = 1;
      showControlsTemporarily();
    }
    lastLeftTap.current = now;
    
    // Reset count after timeout
    setTimeout(() => {
      if (Date.now() - lastLeftTap.current >= DOUBLE_TAP_MS) {
        leftTapCount.current = 0;
      }
    }, DOUBLE_TAP_MS + 50);
  };

  const onRightTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastRightTap.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_MS) {
      // Double tap detected
      rightTapCount.current++;
      if (rightTapCount.current === 2) {
        const seekTime = Math.min(videoDuration, currentPosition + 10);
        sendCommand({ type: 'seek', time: seekTime });
        setCurrentPosition(seekTime);
        setSeekFeedback({ show: true, direction: 'right' });
        setTimeout(() => setSeekFeedback({ show: false, direction: null }), 800);
        rightTapCount.current = 0;
      }
    } else {
      // First tap
      rightTapCount.current = 1;
      showControlsTemporarily();
    }
    lastRightTap.current = now;
    
    // Reset count after timeout
    setTimeout(() => {
      if (Date.now() - lastRightTap.current >= DOUBLE_TAP_MS) {
        rightTapCount.current = 0;
      }
    }, DOUBLE_TAP_MS + 50);
  };

  const togglePlayPause = () => {
    showControlsTemporarily();
    webRef.current?.injectJavaScript(`
      (function() {
        if (window.__enqueueCommand) {
          window.__enqueueCommand({ type: '${paused ? 'play' : 'pause'}' });
        }
      })();
      true;
    `);
  };

  const changeQuality = (quality: string) => {
    setCurrentQuality(quality);
    setQualityMenuVisible(false);
    // Note: Cloudflare Stream quality is typically controlled by the ABR algorithm
    // Manual quality selection may require different implementation
  };

  const toggleQualityMenu = () => {
    showControlsTemporarily();
    setQualityMenuVisible(!qualityMenuVisible);
    setSpeedMenuVisible(false);
    setAudioTracksMenuVisible(false);
    setSubtitlesMenuVisible(false);
  };

  const toggleSpeedMenu = () => {
    showControlsTemporarily();
    setSpeedMenuVisible(!speedMenuVisible);
    setQualityMenuVisible(false);
    setAudioTracksMenuVisible(false);
    setSubtitlesMenuVisible(false);
  };

  const toggleAudioTracksMenu = () => {
    showControlsTemporarily();
    setAudioTracksMenuVisible(!audioTracksMenuVisible);
    setQualityMenuVisible(false);
    setSpeedMenuVisible(false);
    setSubtitlesMenuVisible(false);
  };

  const toggleSubtitlesMenu = () => {
    showControlsTemporarily();
    setSubtitlesMenuVisible(!subtitlesMenuVisible);
    setQualityMenuVisible(false);
    setSpeedMenuVisible(false);
    setAudioTracksMenuVisible(false);
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setSpeedMenuVisible(false);
    webRef.current?.injectJavaScript(`
      (function() {
        if (window.__enqueueCommand) {
          window.__enqueueCommand({ type: 'setSpeed', speed: ${speed} });
        }
      })();
      true;
    `);
  };

  const skipIntro = () => {
    setShowSkipIntro(false);
    webRef.current?.injectJavaScript(`
      (function() {
        if (window.__enqueueCommand) {
          window.__enqueueCommand({ type: 'seek', time: 90 });
        }
      })();
      true;
    `);
  };

  const skipCredits = () => {
    setShowSkipCredits(false);
    // Navigate to next episode (you'll need to implement navigation logic)
    navigation.goBack();
  };

  const playNextEpisode = () => {
    // Navigate to next episode (implement based on your navigation structure)
    setNextEpisodeCountdown(null);
    navigation.goBack();
  };

  const handleSliderChange = (value: number) => {
    setIsScrubbing(true);
    setCurrentPosition(value);
  };

  const handleSliderComplete = (value: number) => {
    const seekTime = Math.floor(value);
    sendCommand({ type: 'seek', time: seekTime });
    setCurrentPosition(seekTime);
    setTimeout(() => {
      setIsScrubbing(false);
    }, 100);
  };

  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        key={String(startPosition)}
        originWhitelist={["*"]}
        style={styles.player}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        source={{ html }}
        onMessage={handleMessage}
      />

      {/* Top Bar with Back Button, Title and Genres */}
      {controlsVisible && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
            {genres && genres.length > 0 && (
              <Text style={styles.genresText} numberOfLines={1}>
                {Array.isArray(genres) ? genres.join(' • ') : genres}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Touch zones - leave bottom area for native controls */}
      <View style={styles.touchLayer} pointerEvents="box-none">
        <View style={styles.topArea} pointerEvents="box-none">
          <View style={styles.row} pointerEvents="box-none">
            <TouchableWithoutFeedback onPressIn={onLeftTap}>
              <View style={styles.sideZone} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={togglePlayPause}>
              <View style={styles.centerZone} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPressIn={onRightTap}>
              <View style={styles.sideZone} />
            </TouchableWithoutFeedback>
          </View>
        </View>
      </View>

      {/* Seek Feedback Indicators */}
      {seekFeedback.show && seekFeedback.direction === 'left' && (
        <View style={styles.seekIndicatorLeft}>
          <Ionicons name="play-back" size={48} color="#fff" />
          <Text style={styles.seekText}>-10s</Text>
        </View>
      )}
      {seekFeedback.show && seekFeedback.direction === 'right' && (
        <View style={styles.seekIndicatorRight}>
          <Ionicons name="play-forward" size={48} color="#fff" />
          <Text style={styles.seekText}>+10s</Text>
        </View>
      )}

      {/* Custom Timeline & Controls Bar - Netflix Style */}
      {controlsVisible && (
        <View style={styles.controlsBar}>
          {/* Single Row: Play/Pause + Timeline Left, Controls Right */}
          <View style={styles.singleRow}>
            {/* Left Side: Play/Pause + Timeline */}
            <View style={styles.leftSection}>
              <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                <Ionicons name={paused ? 'play' : 'pause'} size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={videoDuration || 1}
                  value={currentPosition}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#E50914"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#E50914"
                />
              </View>
              <Text style={styles.timeText}>{formatTime(videoDuration)}</Text>
            </View>
            
            {/* Right Side: Controls */}
            <View style={styles.rightControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleSubtitlesMenu}>
                <Ionicons name="chatbox-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={toggleAudioTracksMenu}>
                <Ionicons name="volume-high-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={toggleSpeedMenu}>
                <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={toggleQualityMenu}>
                <Ionicons name="settings-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <View style={styles.skipIntroContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipIntro}>
            <Text style={styles.skipButtonText}>Skip Intro</Text>
            <Ionicons name="play-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Skip Credits / Next Episode Button */}
      {showSkipCredits && (
        <View style={styles.skipCreditsContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipCredits}>
            <Text style={styles.skipButtonText}>Next Episode</Text>
            <Ionicons name="play-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Next Episode Countdown */}
      {nextEpisodeCountdown !== null && (
        <View style={styles.nextEpisodeOverlay}>
          <View style={styles.nextEpisodeCard}>
            <Text style={styles.nextEpisodeTitle}>Next Episode</Text>
            <Text style={styles.nextEpisodeCountdown}>Playing in {nextEpisodeCountdown}s</Text>
            <View style={styles.nextEpisodeButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setNextEpisodeCountdown(null)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playNowButton} onPress={playNextEpisode}>
                <Text style={styles.playNowButtonText}>Play Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Speed Selection Menu */}
      {speedMenuVisible && (
        <View style={styles.qualityMenu}>
          <View style={styles.qualityMenuHeader}>
            <Text style={styles.qualityMenuTitle}>Playback Speed</Text>
            <TouchableOpacity onPress={() => setSpeedMenuVisible(false)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {speedOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.qualityOption,
                playbackSpeed === option.value && styles.qualityOptionActive
              ]}
              onPress={() => changePlaybackSpeed(option.value)}
            >
              <Text style={[
                styles.qualityOptionText,
                playbackSpeed === option.value && styles.qualityOptionTextActive
              ]}>
                {option.label}
              </Text>
              {playbackSpeed === option.value && (
                <Ionicons name="checkmark" size={18} color="#E50914" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Volume Control Menu - Vertical */}
      {audioTracksMenuVisible && (
        <View style={styles.volumeMenuVertical}>
          <TouchableOpacity 
            onPress={() => setAudioTracksMenuVisible(false)} 
            style={styles.volumeCloseButton}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="volume-high" size={20} color="#fff" style={{ marginBottom: 8 }} />
          <View style={styles.verticalSliderContainer}>
            <Slider
              style={styles.verticalSlider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={(val) => {
                setVolume(val);
                sendCommand({ type: 'setVolume', volume: val });
              }}
              minimumTrackTintColor="#E50914"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#E50914"
              vertical
            />
          </View>
          <Ionicons name="volume-low" size={20} color="#fff" style={{ marginTop: 8 }} />
        </View>
      )}

      {/* Subtitles Menu */}
      {subtitlesMenuVisible && (
        <View style={styles.qualityMenu}>
          <View style={styles.qualityMenuHeader}>
            <Text style={styles.qualityMenuTitle}>Subtitles</Text>
            <TouchableOpacity onPress={() => setSubtitlesMenuVisible(false)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {subtitleTracks.map((track) => (
            <TouchableOpacity
              key={track.value}
              style={[styles.qualityOption, subtitle === track.value && styles.qualityOptionActive]}
              onPress={() => {
                setSubtitle(track.value);
                setSubtitlesMenuVisible(false);
              }}
            >
              <Text style={styles.qualityOptionText}>{track.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quality Selection Menu */}
      {qualityMenuVisible && (
        <View style={styles.qualityMenu}>
          <View style={styles.qualityMenuHeader}>
            <Text style={styles.qualityMenuTitle}>Video Quality</Text>
            <TouchableOpacity onPress={() => setQualityMenuVisible(false)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{padding: 16, alignItems: 'center'}}>
            <Ionicons name="information-circle-outline" size={32} color="#E50914" style={{marginBottom: 8}} />
            <Text style={{color: '#fff', fontSize: 15, textAlign: 'center'}}>
              Video quality is set automatically based on your connection speed. Manual quality selection is not available for this video.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  player: {
    flex: 1,
    backgroundColor: 'black',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 1000,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  genresText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '400',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(20,20,20,0.7)',
    borderRadius: 16,
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    pointerEvents: 'auto',
    zIndex: 100,
  },
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playPauseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E50914',
    borderRadius: 16,
  },
  controlButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2b2b2b',
    borderRadius: 6,
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  volumeMenuVertical: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    backgroundColor: '#141414',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 200,
  },
  volumeCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  verticalSliderContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalSlider: {
    width: 120,
    height: 30,
    transform: [{ rotate: '-90deg' }],
  },
  volumeMenu: {
    position: 'absolute',
    bottom: 75,
    right: 16,
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
  },
  volumeMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeSlider: {
    flex: 1,
    height: 30,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'center',
  },
  topArea: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  sideZone: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  seekIndicatorLeft: {
    position: 'absolute',
    left: '20%',
    top: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  seekIndicatorRight: {
    position: 'absolute',
    right: '20%',
    top: '50%',
    transform: [{ translateX: 40 }, { translateY: -40 }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  seekText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  centerZone: {
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  centerZoneVisible: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 70,
  },
  skipIntroContainer: {
    position: 'absolute',
    bottom: 120,
    right: 16,
  },
  skipCreditsContainer: {
    position: 'absolute',
    bottom: 120,
    right: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    gap: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nextEpisodeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextEpisodeCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  nextEpisodeTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  nextEpisodeCountdown: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  nextEpisodeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2b2b2b',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playNowButton: {
    flex: 1,
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  playNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomRightControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  qualityText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  qualityMenu: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    width: 180,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qualityMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  qualityMenuTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qualityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qualityOptionActive: {
    backgroundColor: 'rgba(229,9,20,0.2)',
  },
  qualityOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityOptionTextActive: {
    color: '#E50914',
    fontWeight: '600',
  },
});

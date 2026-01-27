import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RootState } from '../store';
import apiService from '../services/api';

interface CustomVideoPlayerProps {
  playbackId: string;
  title: string;
  contentId: string;
  contentType: 'Movie' | 'Series';
  episodeId?: string;
  onBack: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEEK_TIME = 10000; // 10 seconds in milliseconds
const DOUBLE_TAP_DELAY = 500; // Increased for better detection

export default function CustomVideoPlayer({
  playbackId,
  title,
  contentId,
  contentType,
  episodeId,
  onBack,
}: CustomVideoPlayerProps) {
  const activeProfile = useSelector((state: RootState) => state.profile.activeProfile);
  
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [selectedCaption, setSelectedCaption] = useState('Off');
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const progressIntervalRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastTapLeft = useRef<number>(0);
  const lastTapRight = useRef<number>(0);
  const progressBarRef = useRef<View>(null);
  const panResponderRef = useRef<any>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(SCREEN_WIDTH - 68);
  const [seekIndicator, setSeekIndicator] = useState<{ show: boolean; direction: 'left' | 'right' }>({ 
    show: false, 
    direction: 'left'
  });
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  // Auto-hide controls after 3 seconds
  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (controlsVisible) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
  };

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    resetControlsTimer();
  };

  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  };

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  };

  // Handle playback status updates
  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    if (playbackStatus.isLoaded) {
      setIsBuffering(playbackStatus.isBuffering);
    }
  };

  // Handle double tap for seek
  const handleDoubleTapLeft = async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapLeft.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // Double tap detected
      console.log('Double tap LEFT detected');
      if (status?.isLoaded && 'positionMillis' in status) {
        const newPosition = Math.max(0, status.positionMillis - SEEK_TIME);
        await videoRef.current?.setPositionAsync(newPosition);
        setSeekIndicator({ show: true, direction: 'left' });
        setTimeout(() => setSeekIndicator({ show: false, direction: 'left' }), 800);
      }
      lastTapLeft.current = 0; // Reset to prevent triple tap
    } else {
      lastTapLeft.current = now;
    }
  };

  const handleDoubleTapRight = async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRight.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // Double tap detected
      console.log('Double tap RIGHT detected');
      if (status?.isLoaded && 'positionMillis' in status && 'durationMillis' in status) {
        const newPosition = Math.min(status.durationMillis || 0, status.positionMillis + SEEK_TIME);
        await videoRef.current?.setPositionAsync(newPosition);
        setSeekIndicator({ show: true, direction: 'right' });
        setTimeout(() => setSeekIndicator({ show: false, direction: 'right' }), 800);
      }
      lastTapRight.current = 0; // Reset to prevent triple tap
    } else {
      lastTapRight.current = now;
    }
  };

  // Play/Pause
  const togglePlayPause = async () => {
    if (status?.isLoaded) {
      if (status.isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    }
  };

  const seekBy = async (delta: number) => {
    if (status?.isLoaded && 'positionMillis' in status && 'durationMillis' in status) {
      const next = Math.max(0, Math.min((status.durationMillis || 0), (status.positionMillis || 0) + delta));
      await videoRef.current?.setPositionAsync(next);
      showControls();
    }
  };

  // Seek handler for timeline
  const handleSeekStart = () => {
    setIsDraggingSeek(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleSeekMove = (event: any) => {
    if (!isDraggingSeek || !status?.isLoaded || duration === 0) return;
    
    const locationX = event.nativeEvent.locationX;
    const width = progressBarWidth || SCREEN_WIDTH - 68;
    const percentage = Math.max(0, Math.min(1, locationX / width));
    const newPosition = percentage * duration;
    
    setDragPosition(newPosition);
  };

  const handleSeekEnd = async () => {
    setIsDraggingSeek(false);
    if (status?.isLoaded) {
      await handleSeek(dragPosition);
      showControls();
    }
  };

  // Seek handler
  const handleSeek = async (value: number) => {
    if (status?.isLoaded && 'positionMillis' in status) {
      const validValue = Math.max(0, Math.min(value, duration));
      await videoRef.current?.setPositionAsync(validValue);
      console.log('Seeked to:', formatTime(validValue));
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    // In a real app, you'd use expo-screen-orientation to change orientation
    setIsFullscreen(!isFullscreen);
  };

  // Format time
  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Save progress every 5 seconds
  useEffect(() => {
    if (status?.isLoaded && 'isPlaying' in status && status.isPlaying && activeProfile) {
      progressIntervalRef.current = setInterval(() => {
        if (status.isLoaded && 'positionMillis' in status && 'durationMillis' in status) {
          apiService.updateProgress({
            profileId: activeProfile._id,
            contentId,
            contentType,
            episodeId,
            progress: status.positionMillis,
            duration: status.durationMillis || 0,
          }).catch(err => console.error('Failed to update progress:', err));
        }
      }, 5000);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [status?.isLoaded, status && 'isPlaying' in status ? status.isPlaying : false, status && 'positionMillis' in status ? status.positionMillis : 0]);

  // Setup auto-rotation and cleanup
  useEffect(() => {
    // Lock to landscape mode when video player mounts
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .catch(err => console.warn('Failed to lock orientation:', err));

    resetControlsTimer();

    return () => {
      // Restore to portrait when video player unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .catch(err => console.warn('Failed to restore orientation:', err));

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Reset controls timer when visibility changes
  useEffect(() => {
    if (controlsVisible) {
      resetControlsTimer();
    }
  }, [controlsVisible]);

  const isPlaying = status?.isLoaded && 'isPlaying' in status && status.isPlaying;
  const position = status?.isLoaded && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status?.isLoaded && 'durationMillis' in status ? status.durationMillis || 0 : 0;
  const progress = duration > 0 ? position / duration : 0;
  const progressPercent = duration > 0 ? (isDraggingSeek ? dragPosition : position) / duration : 0;

  // Initialize PanResponder for progress bar dragging (needs duration computed first)
  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        handleSeekStart();
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleSeekMove(evt);
      },
      onPanResponderRelease: () => {
        handleSeekEnd();
      },
    });
  }, [isDraggingSeek, duration, status]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: streamUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        useNativeControls={false}
      />

      {/* Loading Indicator */}
      {isBuffering && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {/* Seek Indicator Left */}
      {seekIndicator.show && seekIndicator.direction === 'left' && (
        <View style={styles.seekIndicatorLeft}>
          <MaterialIcons name="fast-rewind" size={60} color="rgba(255,255,255,0.9)" />
          <Text style={styles.seekText}>-10s</Text>
        </View>
      )}

      {/* Seek Indicator Right */}
      {seekIndicator.show && seekIndicator.direction === 'right' && (
        <View style={styles.seekIndicatorRight}>
          <MaterialIcons name="fast-forward" size={60} color="rgba(255,255,255,0.9)" />
          <Text style={styles.seekText}>+10s</Text>
        </View>
      )}

      {/* Touch Areas for Double Tap */}
      <View style={styles.touchAreas}>
        {/* Left 1/4 for rewind */}
        <TouchableWithoutFeedback onPress={handleDoubleTapLeft}>
          <View style={styles.leftTouchArea} />
        </TouchableWithoutFeedback>

        {/* Center for toggle controls */}
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.centerTouchArea} />
        </TouchableWithoutFeedback>

        {/* Right 1/4 for forward */}
        <TouchableWithoutFeedback onPress={handleDoubleTapRight}>
          <View style={styles.rightTouchArea} />
        </TouchableWithoutFeedback>
      </View>

      {/* Controls Overlay */}
      {controlsVisible && (
        <Animated.View style={[styles.controlsContainer, { opacity: controlsOpacity }]}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconButton} onPress={onBack}>
              <MaterialIcons name="arrow-back-ios" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowMenu(true)}>
              <Ionicons name="settings-sharp" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerControls}>
            <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
              <MaterialIcons 
                name={isPlaying ? 'pause' : 'play-arrow'} 
                size={70} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(isDraggingSeek ? dragPosition : position)}</Text>
              <View 
                ref={progressBarRef}
                style={styles.progressBarContainer}
                {...(panResponderRef.current ? panResponderRef.current.panHandlers : {})}
              >
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(1, progressPercent)) * 100}%` }]} />
                </View>
                <TouchableWithoutFeedback 
                  onPress={(e) => {
                    if (!isDraggingSeek) {
                      const locationX = e.nativeEvent.locationX;
                      const width = progressBarWidth || SCREEN_WIDTH - 68;
                      const percentage = Math.max(0, Math.min(1, locationX / width));
                      handleSeek(percentage * duration);
                      showControls();
                    }
                  }}
                >
                  <View style={styles.progressBarTouchArea} onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)} />
                </TouchableWithoutFeedback>
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* <View style={styles.controlRow}>
              <TouchableOpacity style={styles.iconButton} onPress={() => seekBy(-10000)}>
                <MaterialIcons name="replay-10" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, styles.playSmall]} onPress={togglePlayPause}>
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => seekBy(10000)}>
                <MaterialIcons name="forward-10" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.spacer} />
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowMenu(true)}>
                <MaterialIcons name="closed-caption" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowMenu(true)}>
                <MaterialIcons name="settings" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={toggleFullscreen}>
                <MaterialIcons name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={22} color="#fff" />
              </TouchableOpacity>
            </View> */}
          </View>
        </Animated.View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.menuContainer}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Settings</Text>
                  <TouchableOpacity onPress={() => setShowMenu(false)}>
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.menuScroll}>
                  {/* Quality Settings */}
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Quality</Text>
                    {['Auto', '1080p', '720p', '480p', '360p'].map((quality) => (
                      <TouchableOpacity
                        key={quality}
                        style={styles.menuItem}
                        onPress={() => {
                          setSelectedQuality(quality);
                          // TODO: Implement quality change
                        }}
                      >
                        <Text style={styles.menuItemText}>{quality}</Text>
                        {selectedQuality === quality && (
                          <MaterialIcons name="check" size={24} color="#E50914" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Caption Settings */}
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Captions</Text>
                    {['Off', 'English', 'Hindi', 'Tamil', 'Telugu'].map((caption) => (
                      <TouchableOpacity
                        key={caption}
                        style={styles.menuItem}
                        onPress={() => {
                          setSelectedCaption(caption);
                          // TODO: Implement caption change
                        }}
                      >
                        <Text style={styles.menuItemText}>{caption}</Text>
                        {selectedCaption === caption && (
                          <MaterialIcons name="check" size={24} color="#E50914" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Audio Settings */}
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>Audio</Text>
                    {['English', 'Hindi', 'Tamil', 'Telugu'].map((audio) => (
                      <TouchableOpacity
                        key={audio}
                        style={styles.menuItem}
                        onPress={() => {
                          // TODO: Implement audio track change
                        }}
                      >
                        <Text style={styles.menuItemText}>{audio}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  seekIndicatorLeft: {
    position: 'absolute',
    left: 60,
    top: '50%',
    marginTop: -50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 50,
    width: 100,
    height: 100,
    zIndex: 10,
  },
  seekIndicatorRight: {
    position: 'absolute',
    right: 60,
    top: '50%',
    marginTop: -50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 50,
    width: 100,
    height: 100,
    zIndex: 10,
  },
  seekText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  touchAreas: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  leftTouchArea: {
    flex: 1,
    maxWidth: '25%',
  },
  centerTouchArea: {
    flex: 2,
  },
  rightTouchArea: {
    flex: 1,
    maxWidth: '25%',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
    zIndex: 2,
    pointerEvents: 'box-none',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 50,
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 12,
    position: 'relative',
    height: 24, // Increase height for easier interaction
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#3a3a3a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  progressBarTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  playSmall: {
    backgroundColor: '#E50914',
  },
  spacer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '92%',
    maxHeight: SCREEN_HEIGHT * 0.6,
    marginBottom: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuScroll: {
    padding: 20,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
});

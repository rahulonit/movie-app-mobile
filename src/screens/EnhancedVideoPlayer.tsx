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
  Image,
  FlatList,
  Switch,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import * as ScreenOrientation from 'expo-screen-orientation';
import { BlurView } from 'expo-blur';
import { RootState } from '../store';
import apiService from '../services/api';

interface EnhancedVideoPlayerProps {
  playbackId: string;
  title: string;
  contentId: string;
  contentType: 'Movie' | 'Series';
  episodeId?: string;
  onBack: () => void;
  movieData?: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEEK_TIME = 10000;
const DOUBLE_TAP_DELAY = 500;

const QUALITY_OPTIONS = ['420p', '720p', '1080p', '4K'];
const SUBTITLE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi'];

export default function EnhancedVideoPlayer({
  playbackId,
  title,
  contentId,
  contentType,
  episodeId,
  onBack,
  movieData,
}: EnhancedVideoPlayerProps) {
  const activeProfile = useSelector((state: RootState) => state.profile.activeProfile);
  
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [selectedSubtitleLanguage, setSelectedSubtitleLanguage] = useState('English');
  const [isLocked, setIsLocked] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const progressIntervalRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastTapLeft = useRef<number>(0);
  const lastTapRight = useRef<number>(0);
  const [seekIndicator, setSeekIndicator] = useState<{ show: boolean; direction: 'left' | 'right' }>({ 
    show: false, 
    direction: 'left'
  });
  const [contentData, setContentData] = useState<any>(movieData || null);
  const [recommendedContent, setRecommendedContent] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<any[]>([]);

  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  // Auto-hide controls
  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (controlsVisible && !isLocked) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
  };

  const showControls = () => {
    if (isLocked) return;
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

  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    if (playbackStatus.isLoaded) {
      setIsBuffering(playbackStatus.isBuffering);
    }
  };

  const handleDoubleTapLeft = async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapLeft.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      if (status?.isLoaded && 'positionMillis' in status) {
        const newPosition = Math.max(0, status.positionMillis - SEEK_TIME);
        await videoRef.current?.setPositionAsync(newPosition);
        setSeekIndicator({ show: true, direction: 'left' });
        setTimeout(() => setSeekIndicator({ show: false, direction: 'left' }), 800);
      }
      lastTapLeft.current = 0;
    } else {
      lastTapLeft.current = now;
    }
  };

  const handleDoubleTapRight = async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRight.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      if (status?.isLoaded && 'positionMillis' in status && 'durationMillis' in status) {
        const newPosition = Math.min(status.durationMillis || 0, status.positionMillis + SEEK_TIME);
        await videoRef.current?.setPositionAsync(newPosition);
        setSeekIndicator({ show: true, direction: 'right' });
        setTimeout(() => setSeekIndicator({ show: false, direction: 'right' }), 800);
      }
      lastTapRight.current = 0;
    } else {
      lastTapRight.current = now;
    }
  };

  const togglePlayPause = async () => {
    if (status?.isLoaded) {
      if (status.isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    }
  };

  const handleSeek = async (value: number) => {
    if (status?.isLoaded && 'positionMillis' in status) {
      const validValue = Math.max(0, Math.min(value, duration));
      await videoRef.current?.setPositionAsync(validValue);
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Fetch content details
  useEffect(() => {
    if (!contentData) {
      // Fetch from API
      // apiService.getMovieById(contentId).then(setContentData);
    }
  }, [contentId]);

  // Parse cast members from actors string
  useEffect(() => {
    if (contentData?.actors) {
      const actors = contentData.actors.split(',').map((actor: string, index: number) => ({
        id: index,
        name: actor.trim(),
        image: 'https://via.placeholder.com/100', // Replace with actual image URLs
      }));
      setCastMembers(actors);
    }
  }, [contentData]);

  // Save progress
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
  }, [status?.isLoaded, status && 'isPlaying' in status ? status.isPlaying : false]);

  useEffect(() => {
    resetControlsTimer();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (controlsVisible) {
      resetControlsTimer();
    }
  }, [controlsVisible]);

  const isPlaying = status?.isLoaded && 'isPlaying' in status && status.isPlaying;
  const position = status?.isLoaded && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status?.isLoaded && 'durationMillis' in status ? status.durationMillis || 0 : 0;
  const progress = duration > 0 ? position / duration : 0;

  const renderCastMember = ({ item }: any) => (
    <View style={styles.castMember}>
      <Image source={{ uri: item.image }} style={styles.castImage} />
      <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
    </View>
  );

  const renderRecommendedItem = ({ item }: any) => (
    <TouchableOpacity style={styles.recommendedItem}>
      <Image 
        source={{ uri: item.poster?.vertical || 'https://via.placeholder.com/150x225' }} 
        style={styles.recommendedPoster}
      />
    </TouchableOpacity>
  );

  // Settings Bottom Sheet
  const renderSettingsSheet = () => (
    <Modal
      visible={showSettingsMenu}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSettingsMenu(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowSettingsMenu(false)}>
        <BlurView intensity={30} style={styles.settingsOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.settingsSheet}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Video Settings</Text>
                <TouchableOpacity onPress={() => setShowSettingsMenu(false)}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.settingsContent}>
                {/* Video Quality */}
                <View style={styles.settingSection}>
                  <Text style={styles.settingSectionTitle}>Video Quality</Text>
                  <View style={styles.qualityOptions}>
                    {QUALITY_OPTIONS.map((quality) => (
                      <TouchableOpacity
                        key={quality}
                        style={[
                          styles.qualityOption,
                          selectedQuality === quality && styles.qualityOptionSelected,
                        ]}
                        onPress={() => setSelectedQuality(quality)}
                      >
                        <Text style={[
                          styles.qualityText,
                          selectedQuality === quality && styles.qualityTextSelected,
                        ]}>
                          {quality}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Subtitles */}
                <View style={styles.settingSection}>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingSectionTitle}>Subtitles</Text>
                    <Switch
                      value={subtitlesEnabled}
                      onValueChange={setSubtitlesEnabled}
                      trackColor={{ false: '#3e3e3e', true: '#E50914' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Subtitle Language */}
                {subtitlesEnabled && (
                  <View style={styles.settingSection}>
                    <Text style={styles.settingSectionTitle}>Subtitle Language</Text>
                    {SUBTITLE_LANGUAGES.map((language) => (
                      <TouchableOpacity
                        key={language}
                        style={styles.languageOption}
                        onPress={() => setSelectedSubtitleLanguage(language)}
                      >
                        <Text style={styles.languageText}>{language}</Text>
                        {selectedSubtitleLanguage === language && (
                          <MaterialIcons name="check" size={24} color="#E50914" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (isFullscreen) {
    // Landscape Fullscreen Player
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden />
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          shouldPlay
        />

        {isBuffering && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
          </View>
        )}

        {/* Seek Indicators */}
        {seekIndicator.show && (
          <View style={seekIndicator.direction === 'left' ? styles.seekIndicatorLeft : styles.seekIndicatorRight}>
            <MaterialIcons 
              name={seekIndicator.direction === 'left' ? 'replay-10' : 'forward-10'} 
              size={40} 
              color="#fff" 
            />
          </View>
        )}

        {/* Touch Areas for Double Tap */}
        {!isLocked && (
          <View style={styles.touchAreas}>
            <TouchableWithoutFeedback onPress={handleDoubleTapLeft}>
              <View style={styles.leftTouchArea} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={toggleControls}>
              <View style={styles.centerTouchArea} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={handleDoubleTapRight}>
              <View style={styles.rightTouchArea} />
            </TouchableWithoutFeedback>
          </View>
        )}

        {/* Controls Overlay */}
        {controlsVisible && (
          <Animated.View style={[styles.controlsContainer, { opacity: controlsOpacity }]}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
              <View style={styles.topBarRight}>
                <TouchableOpacity 
                  style={styles.lockButton} 
                  onPress={() => setIsLocked(!isLocked)}
                >
                  <MaterialIcons name={isLocked ? 'lock' : 'lock-open'} size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Play/Pause */}
            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <MaterialIcons 
                  name={isPlaying ? 'pause' : 'play-arrow'} 
                  size={60} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              <View style={styles.progressRow}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
              <View style={styles.controlsRow}>
                <View style={styles.flex} />
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={toggleFullscreen}
                >
                  <MaterialIcons name="fullscreen-exit" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={() => setShowSettingsMenu(true)}
                >
                  <MaterialIcons name="settings" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {renderSettingsSheet()}
      </View>
    );
  }

  // Portrait Mode with Content Details
  return (
    <View style={styles.portraitContainer}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.scrollContainer}>
        {/* Compact Video Player */}
        <View style={styles.compactPlayer}>
          <Video
            ref={videoRef}
            source={{ uri: streamUrl }}
            style={styles.compactVideo}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            shouldPlay
          />

          {isBuffering && (
            <View style={styles.compactLoadingContainer}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          )}

          {/* Compact Touch Areas */}
          <View style={styles.compactTouchAreas}>
            <TouchableWithoutFeedback onPress={handleDoubleTapLeft}>
              <View style={styles.leftTouchArea} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={toggleControls}>
              <View style={styles.centerTouchArea} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={handleDoubleTapRight}>
              <View style={styles.rightTouchArea} />
            </TouchableWithoutFeedback>
          </View>

          {/* Compact Controls */}
          {controlsVisible && (
            <Animated.View style={[styles.compactControls, { opacity: controlsOpacity }]}>
              <TouchableOpacity style={styles.compactBackButton} onPress={onBack}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.compactTitle} numberOfLines={1}>{title}</Text>
              
              <TouchableOpacity style={styles.compactPlayButton} onPress={togglePlayPause}>
                <MaterialIcons 
                  name={isPlaying ? 'pause' : 'play-arrow'} 
                  size={48} 
                  color="#fff" 
                />
              </TouchableOpacity>

              <View style={styles.compactBottomBar}>
                <View style={styles.compactProgressRow}>
                  <Text style={styles.compactTimeText}>{formatTime(position)}</Text>
                  <View style={styles.compactProgressBar}>
                    <View style={[styles.compactProgressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.compactTimeText}>{formatTime(duration)}</Text>
                </View>
                <View style={styles.compactControlButtons}>
                  <TouchableOpacity onPress={toggleFullscreen}>
                    <MaterialIcons name="fullscreen" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowSettingsMenu(true)}>
                    <MaterialIcons name="settings" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Content Details Section */}
        <View style={styles.contentDetails}>
          {/* Title and Tags */}
          <Text style={styles.contentTitle}>{title}</Text>
          
          <View style={styles.tagsRow}>
            {contentData?.genres?.slice(0, 2).map((genre: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{genre}</Text>
              </View>
            ))}
            <View style={styles.tag}>
              <Text style={styles.tagText}>{contentData?.language || 'English'}</Text>
            </View>
            {contentData?.duration && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{formatDuration(contentData.duration)}</Text>
              </View>
            )}
            {contentData?.imdbRating && (
              <View style={[styles.tag, styles.ratingTag]}>
                <Text style={styles.tagText}>⭐ {contentData.imdbRating}</Text>
              </View>
            )}
          </View>

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              {contentData?.plot || contentData?.description || 'Lorem ipsum dolor sit amet consectetur. Aliquam risus integer blandit pellentesque amet eget ultrices ac lectus aliquet. Velit vitae diam facilisis viverra orci.'}
            </Text>
          </View>

          {/* Cast Section */}
          {castMembers.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <FlatList
                horizontal
                data={castMembers}
                renderItem={renderCastMember}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castList}
              />
            </View>
          )}

          {/* Recommended Section */}
          {recommendedContent.length > 0 && (
            <View style={styles.recommendedSection}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              <FlatList
                horizontal
                data={recommendedContent}
                renderItem={renderRecommendedItem}
                keyExtractor={(item, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedList}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {renderSettingsSheet()}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  portraitContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  compactPlayer: {
    width: '100%',
    height: SCREEN_WIDTH * (9 / 16),
    backgroundColor: '#000',
    position: 'relative',
  },
  compactVideo: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  compactLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  touchAreas: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  compactTouchAreas: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  leftTouchArea: {
    flex: 1,
  },
  centerTouchArea: {
    flex: 2,
  },
  rightTouchArea: {
    flex: 1,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    minWidth: 45,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 12,
    height: 6,
    position: 'relative',
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
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E50914',
    marginLeft: -5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  controlButton: {
    marginLeft: 16,
  },
  // Compact Player Controls
  compactControls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 2,
  },
  compactBackButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  compactTitle: {
    position: 'absolute',
    top: 48,
    left: 64,
    right: 16,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  compactPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  compactProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTimeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    minWidth: 40,
  },
  compactProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#3a3a3a',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  compactControlButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  // Content Details
  contentDetails: {
    padding: 20,
  },
  contentTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingTag: {
    backgroundColor: '#E50914',
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  aboutSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  aboutText: {
    color: '#b3b3b3',
    fontSize: 14,
    lineHeight: 22,
  },
  castSection: {
    marginBottom: 24,
  },
  castList: {
    paddingRight: 20,
  },
  castMember: {
    marginRight: 16,
    alignItems: 'center',
    width: 80,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
    marginBottom: 8,
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  recommendedSection: {
    marginBottom: 24,
  },
  recommendedList: {
    paddingRight: 20,
  },
  recommendedItem: {
    marginRight: 12,
  },
  recommendedPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  // Settings Bottom Sheet
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsContent: {
    padding: 20,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  qualityOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3e3e3e',
    backgroundColor: '#2a2a2a',
  },
  qualityOptionSelected: {
    borderColor: '#E50914',
    backgroundColor: '#E50914',
  },
  qualityText: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '500',
  },
  qualityTextSelected: {
    color: '#fff',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  languageText: {
    color: '#fff',
    fontSize: 15,
  },
});

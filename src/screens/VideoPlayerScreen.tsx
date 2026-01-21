import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import apiService from '../services/api';

const getDims = () => Dimensions.get('window');

export default function VideoPlayerScreen({ route, navigation }: any) {
  const { playbackId, title, contentId, contentType, episodeId } = route.params;
  const { activeProfile } = useSelector((state: RootState) => state.profile);
  
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const progressIntervalRef = useRef<any>(null);
  const [dims, setDims] = useState(getDims());
  const lastTapLeft = useRef<number>(0);
  const lastTapRight = useRef<number>(0);

  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  useEffect(() => {
    // Update progress every 5 seconds
    progressIntervalRef.current = setInterval(() => {
      if (status?.isLoaded && status.isPlaying && activeProfile) {
        updateProgress();
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Save final progress on unmount
      if (status?.isLoaded && activeProfile) {
        updateProgress();
      }
    };
  }, [status, activeProfile]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => {
      sub?.remove?.();
    };
  }, []);

  const updateProgress = async () => {
    if (!status || !status.isLoaded || status.positionMillis == null || status.durationMillis == null) {
      return;
    }
    try {
      await apiService.updateProgress({
        profileId: activeProfile._id,
        contentId,
        contentType,
        episodeId,
        progress: Math.floor(status.positionMillis / 1000),
        duration: Math.floor(status.durationMillis / 1000),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const seekBy = async (deltaMs: number) => {
    try {
      const current = await videoRef.current?.getStatusAsync();
      if (!current || !current.isLoaded || current.positionMillis == null || current.durationMillis == null) return;
      const next = Math.min(Math.max(0, current.positionMillis + deltaMs), current.durationMillis);
      await videoRef.current?.setStatusAsync({ positionMillis: next });
      setStatus((prev) => (prev && prev.isLoaded ? { ...prev, positionMillis: next } : prev));
    } catch (e) {
      // ignore seek errors
    }
  };

  const handleDoubleTap = (side: 'left' | 'right') => {
    const now = Date.now();
    const ref = side === 'left' ? lastTapLeft : lastTapRight;
    if (now - ref.current < 300) {
      seekBy(side === 'left' ? -10000 : 10000);
    }
    ref.current = now;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>X</Text>
      </TouchableOpacity>

      <View style={{ width: dims.width, height: dims.height }}>
        <TouchableWithoutFeedback onPress={() => handleDoubleTap('left')}>
          <View style={styles.leftZone} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => handleDoubleTap('right')}>
          <View style={styles.rightZone} />
        </TouchableWithoutFeedback>
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={(status) => setStatus(status)}
          onLoadStart={() => setIsBuffering(true)}
          onLoad={() => setIsBuffering(false)}
        />
      </View>

      {isBuffering && (
        <View style={styles.bufferingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.bufferingText}>Loading...</Text>
        </View>
      )}

      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bufferingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  leftZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    zIndex: 5,
  },
  rightZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    zIndex: 5,
  },
  titleContainer: {
    position: 'absolute',
    top: 50,
    left: 70,
    right: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import apiService from '../services/api';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function VideoPlayerScreen({ route, navigation }: any) {
  const { playbackId, playbackToken, title, contentId, contentType, episodeId } = route.params;
  const activeProfile = useSelector((state: RootState) => state.profile.activeProfile);
  const lastProgressSent = useRef<number>(0);
  const webRef = useRef<WebView>(null);
  const [paused, setPaused] = useState(false);
  const [startPosition, setStartPosition] = useState<number>(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const id = playbackId || '';
    const token = playbackToken || '';
    const safeTitle = (title || '').replace(/</g, '&lt;');
    const startTime = startPosition || 0;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; }
      mux-player { width: 100%; height: 100%; background: #000; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3"></script>
  </head>
  <body>
    <mux-player
      id="player"
      stream-type="on-demand"
      playsinline
      autoplay
      title="${safeTitle}"
      playback-id="${id}"
      ${token ? `playback-token="${token}"` : ''}
      start-time="${startTime}"
      controls
    ></mux-player>
    <script>
      const player = document.getElementById('player');
      const post = (payload) => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };
      
      // Notify React Native when player is ready
      player?.addEventListener('loadedmetadata', () => {
        post({ type: 'ready' });
      });
      
      player?.addEventListener('timeupdate', () => {
        post({ type: 'progress', position: player.currentTime * 1000, duration: player.duration * 1000, paused: player.paused });
      });
      
      player?.addEventListener('play', () => {
        post({ type: 'playstate', paused: false });
      });
      
      player?.addEventListener('pause', () => {
        post({ type: 'playstate', paused: true });
      });
      
      player?.addEventListener('error', (e) => {
        post({ type: 'error', message: (e?.detail && e.detail.message) || 'Mux player error' });
      });
      
      // Handle messages from React Native
      document.addEventListener('message', (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (!player) return;
        if (data.type === 'seek' && typeof data.delta === 'number') {
          player.currentTime = Math.max(0, Math.min(player.duration || Infinity, player.currentTime + data.delta));
        } else if (data.type === 'play') {
          player.play().catch(e => console.log('Play failed:', e));
        } else if (data.type === 'pause') {
          player.pause();
        }
      });
    </script>
  </body>
</html>`;
  }, [playbackId, playbackToken, title, startPosition]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let data: any;
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (data?.type === 'ready') {
        setPlayerReady(true);
      } else if (data?.type === 'playstate') {
        setPaused(!!data.paused);
      } else if (data?.type === 'progress') {
        const { position, duration, paused: isPaused } = data;
        setPaused(!!isPaused);
        if (!activeProfile || isPaused) return;

        const now = Date.now();
        if (now - lastProgressSent.current < 5000) return;
        lastProgressSent.current = now;

        apiService
          .updateProgress({
            profileId: activeProfile._id,
            contentId,
            contentType,
            episodeId,
            progress: position,
            duration,
          })
          .catch((err: any) => console.warn('Failed to update progress', err));
      }
    },
    [activeProfile, contentId, contentType, episodeId]
  );

  const sendCommand = useCallback((payload: any) => {
    webRef.current?.postMessage(JSON.stringify(payload));
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
  const DOUBLE_TAP_MS = 350;

  const onLeftTap = () => {
    showControlsTemporarily();
    const now = Date.now();
    if (now - lastLeftTap.current < DOUBLE_TAP_MS) {
      sendCommand({ type: 'seek', delta: -10 });
    }
    lastLeftTap.current = now;
  };

  const onRightTap = () => {
    showControlsTemporarily();
    const now = Date.now();
    if (now - lastRightTap.current < DOUBLE_TAP_MS) {
      sendCommand({ type: 'seek', delta: 10 });
    }
    lastRightTap.current = now;
  };

  const togglePlayPause = () => {
    showControlsTemporarily();
    sendCommand({ type: paused ? 'play' : 'pause' });
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        style={styles.player}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        source={{ html }}
        onMessage={handleMessage}
      />

      {/* Touch zones - leave bottom area for native controls */}
      <View style={styles.touchLayer} pointerEvents="box-none">
        <View style={styles.topArea} pointerEvents="box-none">
          <View style={styles.row} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={onLeftTap}>
              <View style={styles.sideZone} />
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={togglePlayPause}>
              <View style={[styles.centerZone, controlsVisible && styles.centerZoneVisible]}>
                {controlsVisible && (
                  <Ionicons name={paused ? 'play' : 'pause'} size={48} color="#fff" />
                )}
              </View>
            </TouchableWithoutFeedback>
            <TouchableWithoutFeedback onPress={onRightTap}>
              <View style={styles.sideZone} />
            </TouchableWithoutFeedback>
          </View>
        </View>
      </View>

      {controlsVisible && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  centerZone: {
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  centerZoneVisible: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 70,
  },
});

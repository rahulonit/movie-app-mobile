// Example: Update MovieDetailScreen.tsx to use EnhancedVideoPlayer

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchMovieById } from '../store/slices/contentSlice';
import { addToMyList, removeFromMyList, fetchMyList } from '../store/slices/profileSlice';

export default function MovieDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentMovie } = useSelector((state: RootState) => state.content);
  const { activeProfile, myList } = useSelector((state: RootState) => state.profile);
  const [inMyList, setInMyList] = useState(false);

  useEffect(() => {
    dispatch(fetchMovieById(id));
  }, [id]);

  useEffect(() => {
    if (currentMovie && myList) {
      setInMyList(myList.some((item: any) => item._id === currentMovie._id));
    }
  }, [currentMovie, myList]);

  // UPDATED: Navigate to EnhancedVideoPlayer with full movie data
  const handlePlayMovie = () => {
    if (!currentMovie.cloudflareVideoId && !currentMovie.muxPlaybackId) {
      Alert.alert('Premium Required', 'This content requires a premium subscription');
      return;
    }
    
    navigation.navigate('EnhancedVideoPlayer', {
      playbackId: currentMovie.muxPlaybackId || currentMovie.cloudflareVideoId,
      title: currentMovie.title,
      contentId: currentMovie._id,
      contentType: 'Movie',
      movieData: currentMovie, // Pass full movie data for cast, description, etc.
    });
  };

  const handleToggleMyList = async () => {
    if (!activeProfile) return;

    try {
      if (inMyList) {
        await dispatch(removeFromMyList({ 
          profileId: activeProfile._id, 
          contentId: currentMovie._id 
        }));
      } else {
        await dispatch(addToMyList({ 
          profileId: activeProfile._id, 
          contentId: currentMovie._id 
        }));
      }
      dispatch(fetchMyList(activeProfile._id));
    } catch (error) {
      Alert.alert('Error', 'Failed to update My List');
    }
  };

  if (!currentMovie) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: currentMovie.poster?.horizontal || currentMovie.poster?.vertical }}
          style={styles.heroImage}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{currentMovie.title}</Text>

        {/* Meta Info */}
        <View style={styles.meta}>
          <Text style={styles.metaText}>{currentMovie.releaseYear}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{currentMovie.duration} min</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{currentMovie.maturityRating}</Text>
          {currentMovie.isPremium && (
            <>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.premium}>PREMIUM</Text>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayMovie}
          >
            <Text style={styles.playButtonText}>▶ Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listButton}
            onPress={handleToggleMyList}
          >
            <Text style={styles.listButtonText}>
              {inMyList ? '✓ In My List' : '+ My List'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {currentMovie.plot || currentMovie.description}
        </Text>

        {/* IMDB Rating */}
        {currentMovie.imdbRating && (
          <View style={styles.imdbSection}>
            <Text style={styles.imdbRating}>⭐ {currentMovie.imdbRating}/10</Text>
            {currentMovie.imdbLink && (
              <Text style={styles.imdbLabel}>IMDB Rating</Text>
            )}
          </View>
        )}

        {/* Additional Details */}
        {currentMovie.director && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Director:</Text>
            <Text style={styles.detailValue}>{currentMovie.director}</Text>
          </View>
        )}

        {currentMovie.actors && (
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Cast:</Text>
            <Text style={styles.detailValue}>{currentMovie.actors}</Text>
          </View>
        )}

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Genres:</Text>
          <Text style={styles.detailValue}>
            {currentMovie.genres.join(', ')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  heroSection: {
    position: 'relative',
    height: 200,
    marginTop: 50,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 16,
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
  content: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  metaText: {
    color: '#808080',
    fontSize: 14,
  },
  premium: {
    color: '#E50914',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  playButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    flex: 1,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listButton: {
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    flex: 1,
  },
  listButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  imdbSection: {
    backgroundColor: '#F5C518',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  imdbRating: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imdbLabel: {
    color: '#000',
    fontSize: 12,
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    color: '#808080',
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
  },
});

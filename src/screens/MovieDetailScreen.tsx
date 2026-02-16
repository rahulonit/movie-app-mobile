import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchMovieById } from '../store/slices/contentSlice';
import { addToMyList, removeFromMyList, fetchMyList } from '../store/slices/profileSlice';
import apiService from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Timeline bar height
const TIMELINE_HEIGHT = 6;

export default function MovieDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentMovie } = useSelector((state: RootState) => state.content);
  const { activeProfile, myList } = useSelector((state: RootState) => state.profile);
  const [inMyList, setInMyList] = useState(false);
  const [castMembers, setCastMembers] = useState<any[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<any[]>([]);
  const [watchedProgress, setWatchedProgress] = useState(0); // in seconds
  const [videoDuration, setVideoDuration] = useState(0); // in seconds
  // Fetch last watched progress for this movie
  useEffect(() => {
    const fetchProgress = async () => {
      if (!activeProfile || !currentMovie?._id) return;
      try {
        const res = await apiService.getWatchHistory(activeProfile._id);
        const history = res.data?.watchHistory || [];
        const entry = history.find((h: any) => h.contentId === currentMovie._id);
        if (entry) {
          setWatchedProgress(Math.floor((entry.progress || 0) / 1000));
          setVideoDuration(Math.floor((entry.duration || currentMovie.duration * 60 || 0) / 1000));
        } else {
          setWatchedProgress(0);
          setVideoDuration(Math.floor((currentMovie.duration * 60) || 0));
        }
      } catch (e) {
        setWatchedProgress(0);
        setVideoDuration(Math.floor((currentMovie.duration * 60) || 0));
      }
    };
    fetchProgress();
  }, [activeProfile, currentMovie]);

  useEffect(() => {
    dispatch(fetchMovieById(id));
  }, [id]);

  useEffect(() => {
    if (currentMovie && myList) {
      setInMyList(myList.some((item: any) => item._id === currentMovie._id));
    }
  }, [currentMovie, myList]);

  // Parse cast members from actors string
  useEffect(() => {
    if (currentMovie?.actors) {
      const actors = currentMovie.actors.split(',').map((actor: string, index: number) => ({
        id: index,
        name: actor.trim(),
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.trim())}&size=200&background=E50914&color=fff&bold=true`,
      }));
      setCastMembers(actors.slice(0, 10));
    }
  }, [currentMovie]);

  // Fetch recommended movies
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (currentMovie?._id) {
        try {
          const response = await apiService.getRelatedContent(currentMovie._id, 'Movie');
          setRecommendedMovies(response.data || []);
        } catch (error) {
          if (__DEV__) console.log('Could not fetch recommendations:', error);
        }
      }
    };
    fetchRecommendations();
  }, [currentMovie]);

  const handlePlayMovie = () => {
    if (!currentMovie.cloudflareVideoId) {
      Alert.alert('Premium Required', 'This content requires a premium subscription');
      return;
    }
    navigation.navigate('VideoPlayer', {
      cloudflareVideoId: currentMovie.cloudflareVideoId,
      title: currentMovie.title,
      contentId: currentMovie._id,
      contentType: 'Movie',
      startTime: watchedProgress, // pass last watched time in seconds
    });
  };

  const handleToggleMyList = async () => {
    if (!activeProfile) return;

    try {
      if (inMyList) {
        await dispatch(removeFromMyList({
          profileId: activeProfile._id,
          contentId: currentMovie._id,
        })).unwrap();
        await dispatch(fetchMyList(activeProfile._id));
        setInMyList(false);
      } else {
          await dispatch(addToMyList({
            profileId: activeProfile._id,
            contentId: currentMovie._id,
            contentType: 'Movie',
          })).unwrap();
        await dispatch(fetchMyList(activeProfile._id));
        setInMyList(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error);
    }
  };

  if (!currentMovie) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const renderCastMember = ({ item }: any) => (
    <View style={styles.castMember}>
      <Image source={{ uri: item.image }} style={styles.castImage} />
      <Text style={styles.castName} numberOfLines={2}>
        {item.name}
      </Text>
    </View>
  );

  const renderRecommendedMovie = ({ item }: any) => (
    <TouchableOpacity
      style={styles.recommendedCard}
      onPress={() => navigation.push('MovieDetail', { id: item._id })}
    >
      <Image
        source={{ uri: item.poster?.vertical || item.poster?.horizontal }}
        style={styles.recommendedPoster}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.recommendedGradient}
      >
        <Text style={styles.recommendedTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.imdbRating && (
          <Text style={styles.recommendedRating}>⭐ {item.imdbRating}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section with Poster */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: currentMovie.poster?.vertical || currentMovie.poster?.horizontal || 'https://res.cloudinary.com/dxbno5xjb/image/upload/v1769669827/MV5BODExYmU1N2ItY2IyMS00OGY5LTlkZTMtNTBmM2QyMjJlZDM2XkEyXkFqcGc._V1__zjdc2v.jpg' }}
            style={styles.heroPoster}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
            style={styles.heroGradient}
          />

          {/* Timeline Progress Bar */}
          {videoDuration > 0 && (
            <View style={styles.timelineBarContainer}>
              <View style={styles.timelineBarBg} />
              <View style={[styles.timelineBarFg, { width: `${Math.min(100, (watchedProgress / videoDuration) * 100)}%` }]} />
            </View>
          )}

          {/* Top Bar with Back and Favorite */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topButton} onPress={handleToggleMyList}>
              <Ionicons
                name={inMyList ? 'heart' : 'heart-outline'}
                size={24}
                color={inMyList ? '#E50914' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Movie Title */}
          <Text style={styles.movieTitle}>{currentMovie.title}</Text>

          {/* Metadata Pills */}
          <View style={styles.metaPills}>
            {currentMovie.genres?.slice(0, 2).map((genre: string, index: number) => (
              <View key={index} style={styles.pill}>
                <Text style={styles.pillText}>{genre}</Text>
              </View>
            ))}
            <View style={styles.pill}>
              <Text style={styles.pillText}>{currentMovie.language || currentMovie.languages}</Text>
            </View>
            {currentMovie.duration && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{formatDuration(currentMovie.duration)}</Text>
              </View>
            )}
            {currentMovie.imdbRating && (
              <View style={[styles.pill, styles.ratingPill]}>
                <Text style={styles.pillText}>⭐ {currentMovie.imdbRating}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayMovie}>
              <MaterialIcons name="play-arrow" size={28} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>
            
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              {currentMovie.plot || currentMovie.description}
            </Text>
          </View>

          {/* Additional Info Pills */}
          {(currentMovie.director || currentMovie.rated || currentMovie.releaseYear) && (
            <View style={styles.infoRow}>
              {currentMovie.releaseYear && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillLabel}>Year</Text>
                  <Text style={styles.infoPillValue}>{currentMovie.releaseYear}</Text>
                </View>
              )}
              {currentMovie.rated && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillLabel}>Rated</Text>
                  <Text style={styles.infoPillValue}>{currentMovie.rated}</Text>
                </View>
              )}
              {currentMovie.director && (
                <View style={[styles.infoPill, { flex: 1 }]}>
                  <Text style={styles.infoPillLabel}>Director</Text>
                  <Text style={styles.infoPillValue} numberOfLines={1}>
                    {currentMovie.director.split(',')[0]}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cast Section */}
          {castMembers.length > 0 && (
            <View style={styles.section}>
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
          {recommendedMovies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              <FlatList
                horizontal
                data={recommendedMovies}
                renderItem={renderRecommendedMovie}
                keyExtractor={(item, index) => `${item._id}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedList}
              />
            </View>
          )}

          {/* OMDB Additional Info */}
          {currentMovie.awards && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Awards</Text>
              <Text style={styles.infoText}>{currentMovie.awards}</Text>
            </View>
          )}

          {currentMovie.ratings && currentMovie.ratings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              {currentMovie.ratings.map((rating: any, index: number) => (
                <View key={index} style={styles.ratingRow}>
                  <Text style={styles.ratingSource}>{rating.source}</Text>
                  <Text style={styles.ratingValue}>{rating.value}</Text>
                </View>
              ))}
            </View>
          )}

          {currentMovie.country && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Production</Text>
              <Text style={styles.infoText}>Country: {currentMovie.country}</Text>
              {currentMovie.released && (
                <Text style={styles.infoText}>Released: {currentMovie.released}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    timelineBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: TIMELINE_HEIGHT,
      zIndex: 20,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    timelineBarBg: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: TIMELINE_HEIGHT,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: TIMELINE_HEIGHT / 2,
    },
    timelineBarFg: {
      height: TIMELINE_HEIGHT,
      backgroundColor: '#E50914',
      borderRadius: TIMELINE_HEIGHT / 2,
    },
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141414',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  heroSection: {
    // 9:16 aspect ratio
    height: Dimensions.get('window').width * 16 / 9,
    position: 'relative',
  },
  heroPoster: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 5,
  },
  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  contentSection: {
    padding: 20,
    paddingBottom: 40,
  },
  movieTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  ratingPill: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  pillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  playButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2b2b2b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  listButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  aboutText: {
    fontSize: 15,
    color: '#b3b3b3',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoPill: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  infoPillLabel: {
    fontSize: 11,
    color: '#8f8f8f',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoPillValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  castList: {
    paddingRight: 20,
  },
  castMember: {
    alignItems: 'center',
    marginRight: 16,
    width: 90,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  castName: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  recommendedList: {
    paddingRight: 20,
  },
  recommendedCard: {
    marginRight: 14,
    width: 130,
  },
  recommendedPoster: {
    width: 130,
    height: 195,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
    marginBottom: 8,
  },
  recommendedGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 10,
    justifyContent: 'flex-end',
    padding: 8,
  },
  recommendedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendedTitle: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendedGenre: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    marginBottom: 8,
  },
  ratingSource: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ratingValue: {
    fontSize: 14,
    color: '#E50914',
    fontWeight: '600',
  },
});

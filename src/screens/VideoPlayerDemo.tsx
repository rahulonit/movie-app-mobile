// Demo Screen to Test EnhancedVideoPlayer
// Use this to quickly test the video player with sample data

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Sample movie data matching your backend structure
const SAMPLE_MOVIES = [
  {
    _id: 'avengers_endgame',
    title: 'Avengers: End Game',
    description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more to reverse Thanos\' actions and restore balance to the universe.',
    plot: 'After the devastating events of Avengers: Infinity War (2018), the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos\' actions and restore balance to the universe.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    language: 'English',
    releaseYear: 2019,
    duration: 181, // minutes
    imdbRating: 8.4,
    rated: 'PG-13',
    director: 'Anthony Russo, Joe Russo',
    actors: 'Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth, Scarlett Johansson, Jeremy Renner',
    muxPlaybackId: 'YOUR_MUX_PLAYBACK_ID', // Replace with actual ID
    cloudflareVideoId: 'YOUR_CLOUDFLARE_ID', // Or use this
    poster: {
      vertical: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
      horizontal: 'https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    },
    maturityRating: 'PG-13',
    isPremium: true,
  },
  {
    _id: 'inception',
    title: 'Inception',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    plot: 'Dom Cobb is a skilled thief, the absolute best in the dangerous art of extraction, stealing valuable secrets from deep within the subconscious during the dream state when the mind is at its most vulnerable.',
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    language: 'English',
    releaseYear: 2010,
    duration: 148,
    imdbRating: 8.8,
    rated: 'PG-13',
    director: 'Christopher Nolan',
    actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page, Tom Hardy, Marion Cotillard',
    muxPlaybackId: 'YOUR_MUX_PLAYBACK_ID_2',
    poster: {
      vertical: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      horizontal: 'https://image.tmdb.org/t/p/w780/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    },
    maturityRating: 'PG-13',
    isPremium: true,
  },
  {
    _id: 'dark_knight',
    title: 'The Dark Knight',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    plot: 'Set within a year after the events of Batman Begins, Batman, Lieutenant James Gordon, and new District Attorney Harvey Dent successfully begin to round up the criminals that plague Gotham City.',
    genres: ['Action', 'Crime', 'Drama'],
    language: 'English',
    releaseYear: 2008,
    duration: 152,
    imdbRating: 9.0,
    rated: 'PG-13',
    director: 'Christopher Nolan',
    actors: 'Christian Bale, Heath Ledger, Aaron Eckhart, Michael Caine, Maggie Gyllenhaal',
    muxPlaybackId: 'YOUR_MUX_PLAYBACK_ID_3',
    poster: {
      vertical: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      horizontal: 'https://image.tmdb.org/t/p/w780/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg',
    },
    maturityRating: 'PG-13',
    isPremium: true,
  },
];

export default function VideoPlayerDemo({ navigation }: any) {
  const handlePlayMovie = (movie: any) => {
    navigation.navigate('EnhancedVideoPlayer', {
      playbackId: movie.muxPlaybackId || movie.cloudflareVideoId,
      title: movie.title,
      contentId: movie._id,
      contentType: 'Movie',
      movieData: movie,
    });
  };

  const renderMovieCard = (movie: any) => (
    <TouchableOpacity
      key={movie._id}
      style={styles.movieCard}
      onPress={() => handlePlayMovie(movie)}
    >
      <Image
        source={{ uri: movie.poster.vertical }}
        style={styles.moviePoster}
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{movie.title}</Text>
        <View style={styles.movieMeta}>
          <Text style={styles.movieYear}>{movie.releaseYear}</Text>
          <Text style={styles.movieDot}>•</Text>
          <Text style={styles.movieDuration}>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</Text>
          <Text style={styles.movieDot}>•</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.movieRating}>⭐ {movie.imdbRating}</Text>
          </View>
        </View>
        <Text style={styles.movieDescription} numberOfLines={2}>
          {movie.description}
        </Text>
        <View style={styles.genreTags}>
          {movie.genres.map((genre: string) => (
            <View key={genre} style={styles.genreTag}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handlePlayMovie(movie)}
        >
          <MaterialIcons name="play-arrow" size={24} color="#000" />
          <Text style={styles.playButtonText}>Play Movie</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Player Demo</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color="#E50914" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Testing the Enhanced Video Player</Text>
            <Text style={styles.infoText}>
              Tap any movie below to test the video player. Make sure to:
            </Text>
            <Text style={styles.infoItem}>• Replace playback IDs with real ones</Text>
            <Text style={styles.infoItem}>• Test in both portrait and landscape</Text>
            <Text style={styles.infoItem}>• Try double-tap seek gestures</Text>
            <Text style={styles.infoItem}>• Open settings menu</Text>
            <Text style={styles.infoItem}>• Check cast and recommendations</Text>
          </View>
        </View>

        <View style={styles.moviesSection}>
          <Text style={styles.sectionTitle}>Sample Movies</Text>
          {SAMPLE_MOVIES.map(renderMovieCard)}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features to Test</Text>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="screen-rotation" size={24} color="#E50914" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Orientation Switching</Text>
              <Text style={styles.featureText}>
                Tap fullscreen icon to switch between portrait and landscape modes
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="touch-app" size={24} color="#E50914" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Double-Tap Seek</Text>
              <Text style={styles.featureText}>
                Double-tap left side (-10s) or right side (+10s) of video
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="settings" size={24} color="#E50914" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Settings Menu</Text>
              <Text style={styles.featureText}>
                Tap gear icon to open quality and subtitle settings
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="lock" size={24} color="#E50914" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Orientation Lock</Text>
              <Text style={styles.featureText}>
                In landscape mode, tap lock icon to prevent accidental rotation
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="people" size={24} color="#E50914" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Cast & Recommendations</Text>
              <Text style={styles.featureText}>
                Scroll down in portrait mode to see cast members and related movies
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>📝 Important Notes</Text>
          <Text style={styles.notesText}>
            1. Replace "YOUR_MUX_PLAYBACK_ID" with real Mux video IDs
          </Text>
          <Text style={styles.notesText}>
            2. Cast images are generated from actor names (uses UI Avatars)
          </Text>
          <Text style={styles.notesText}>
            3. Recommendations are not loaded by default (implement API call)
          </Text>
          <Text style={styles.notesText}>
            4. Progress tracking requires backend API endpoint
          </Text>
          <Text style={styles.notesText}>
            5. See ENHANCED_VIDEO_PLAYER.md for full documentation
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E50914',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 8,
  },
  infoItem: {
    color: '#b3b3b3',
    fontSize: 13,
    marginLeft: 8,
    marginVertical: 2,
  },
  moviesSection: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  movieCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  moviePoster: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
  },
  movieInfo: {
    padding: 16,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  movieYear: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  movieDot: {
    color: '#b3b3b3',
    fontSize: 14,
    marginHorizontal: 8,
  },
  movieDuration: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  ratingBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  movieRating: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  movieDescription: {
    color: '#b3b3b3',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  genreTag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  featuresSection: {
    padding: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureText: {
    color: '#b3b3b3',
    fontSize: 14,
    lineHeight: 20,
  },
  notesSection: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  notesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  notesText: {
    color: '#b3b3b3',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
});

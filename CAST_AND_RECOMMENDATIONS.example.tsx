// ==========================================
// Example Code Snippets for Cast & Recommendations
// ==========================================
// 
// NOTE: These are code examples/snippets to be integrated into your components.
// Each section shows different approaches and can be copied into your actual files.
// Missing imports are intentional - add them to your component as needed.
//
// Imports needed in your actual component file:
// import React, { useEffect, useState } from 'react';
// import { View, Image, TouchableOpacity, Text, FlatList, StyleSheet } from 'react-native';
// import apiService from '../services/api';
//
// ==========================================

// Example: Adding Cast Images and Recommendations to EnhancedVideoPlayer

// ==========================================
// Option 1: Update the EnhancedVideoPlayer.tsx directly
// ==========================================

// Replace the castMembers useEffect with this enhanced version:

useEffect(() => {
  if (contentData?.actors) {
    // Map of actor names to profile images (you can replace with API calls)
    const actorImages: { [key: string]: string } = {
      'Robert Downey Jr.': 'https://image.tmdb.org/t/p/w200/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg',
      'Chris Evans': 'https://image.tmdb.org/t/p/w200/3bOGNsHlrswhyW79uvIHH1V43JI.jpg',
      'Chris Hemsworth': 'https://image.tmdb.org/t/p/w200/xkHHiTGrh8wYmshgDgKC8TSq6N3.jpg',
      'Scarlett Johansson': 'https://image.tmdb.org/t/p/w200/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg',
      'Mark Ruffalo': 'https://image.tmdb.org/t/p/w200/z3dvKqMNDQWk3QLxzumloQVR0R.jpg',
      'Jeremy Renner': 'https://image.tmdb.org/t/p/w200/yj5TuFRR5TpBQIxloP4JxJLfRqc.jpg',
      'Brie Larson': 'https://image.tmdb.org/t/p/w200/iqZ5uKJWbwSITCK4CqdlUHZTnXD.jpg',
      'Paul Rudd': 'https://image.tmdb.org/t/p/w200/8eTtJ7XVXY0BnEeUaSiTAraTIXd.jpg',
      'Karen Gillan': 'https://image.tmdb.org/t/p/w200/bX8kcKMHgBMWkKIpvDkCLFD7H7h.jpg',
      'Bradley Cooper': 'https://image.tmdb.org/t/p/w200/z5LUl9bljJnah3S5rtN7rScrmI8.jpg',
    };

    const actors = contentData.actors.split(',').map((actor: string, index: number) => {
      const actorName = actor.trim();
      return {
        id: index,
        name: actorName,
        // Try to get image from map, fallback to placeholder with initials
        image: actorImages[actorName] || `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&size=200&background=E50914&color=fff`,
      };
    });
    setCastMembers(actors.slice(0, 10)); // Limit to 10 actors
  }
}, [contentData]);

// ==========================================
// Option 2: Fetch Cast Images from TMDB API
// ==========================================

// Add this utility function to fetch cast with images
const fetchCastWithImages = async (movieTitle: string) => {
  try {
    // Replace with your TMDB API key
    const TMDB_API_KEY = 'your_tmdb_api_key';
    
    // Search for movie
    const searchResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
    );
    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const movieId = searchData.results[0].id;
      
      // Get movie credits
      const creditsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
      );
      const creditsData = await creditsResponse.json();
      
      // Map cast with images
      const cast = creditsData.cast.slice(0, 10).map((actor: any, index: number) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        image: actor.profile_path 
          ? `https://image.tmdb.org/t/p/w200${actor.profile_path}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&size=200&background=E50914&color=fff`,
      }));
      
      return cast;
    }
  } catch (error) {
    console.error('Error fetching cast:', error);
  }
  return [];
};

// Use in component:
useEffect(() => {
  const loadCast = async () => {
    if (contentData?.title) {
      const cast = await fetchCastWithImages(contentData.title);
      setCastMembers(cast);
    } else if (contentData?.actors) {
      // Fallback to parsing actors string
      const actors = contentData.actors.split(',').map((actor: string, index: number) => ({
        id: index,
        name: actor.trim(),
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.trim())}&size=200&background=E50914&color=fff`,
      }));
      setCastMembers(actors.slice(0, 10));
    }
  };
  
  loadCast();
}, [contentData]);

// ==========================================
// Option 3: Fetch Recommendations
// ==========================================

// Add this to your apiService.ts
class ApiService {
  // ... existing methods
  
  async getRelatedContent(contentId: string, contentType: 'Movie' | 'Series') {
    try {
      const response = await this.request(`/content/${contentId}/related`, {
        method: 'GET',
        query: { type: contentType },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching related content:', error);
      return [];
    }
  }
  
  async getSimilarMovies(movieId: string) {
    try {
      const response = await this.request(`/movies/${movieId}/similar`, {
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching similar movies:', error);
      return [];
    }
  }
}

// Use in EnhancedVideoPlayer:
useEffect(() => {
  const loadRecommendations = async () => {
    try {
      const related = await apiService.getRelatedContent(contentId, contentType);
      setRecommendedContent(related);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };
  
  // Only load when in portrait mode to improve performance
  if (!isFullscreen && contentId) {
    loadRecommendations();
  }
}, [contentId, contentType, isFullscreen]);

// ==========================================
// Option 4: Mock Data for Testing
// ==========================================

// Add this to EnhancedVideoPlayer for testing without backend:
useEffect(() => {
  // Mock cast data
  const mockCast = [
    {
      id: 1,
      name: 'Angela Bassett',
      image: 'https://image.tmdb.org/t/p/w200/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg',
    },
    {
      id: 2,
      name: 'Danai Gurira',
      image: 'https://image.tmdb.org/t/p/w200/3bOGNsHlrswhyW79uvIHH1V43JI.jpg',
    },
    {
      id: 3,
      name: 'Lupita Nyong\'o',
      image: 'https://image.tmdb.org/t/p/w200/xkHHiTGrh8wYmshgDgKC8TSq6N3.jpg',
    },
    {
      id: 4,
      name: 'Winston Duke',
      image: 'https://image.tmdb.org/t/p/w200/yj5TuFRR5TpBQIxloP4JxJLfRqc.jpg',
    },
  ];
  
  // Mock recommendations
  const mockRecommendations = [
    {
      _id: '1',
      title: 'Movie 1',
      poster: {
        vertical: 'https://image.tmdb.org/t/p/w300/qAZ0pzat24kLdO3o8ejmbLxyOac.jpg',
      },
    },
    {
      _id: '2',
      title: 'Movie 2',
      poster: {
        vertical: 'https://image.tmdb.org/t/p/w300/xBHvZcjRiWyobQ9kxBhO6B2dtRI.jpg',
      },
    },
    {
      _id: '3',
      title: 'Movie 3',
      poster: {
        vertical: 'https://image.tmdb.org/t/p/w300/tPBViktbQ3VVOdXRvyONqVMXe2x.jpg',
      },
    },
  ];
  
  // Set mock data (remove in production)
  if (!contentData?.actors) {
    setCastMembers(mockCast);
  }
  if (recommendedContent.length === 0) {
    setRecommendedContent(mockRecommendations);
  }
}, []);

// ==========================================
// Option 5: Enhanced Cast Member Rendering
// ==========================================

// Update the renderCastMember function to show character names:
const renderCastMember = ({ item }: any) => (
  <TouchableOpacity style={styles.castMember}>
    <Image 
      source={{ uri: item.image }} 
      style={styles.castImage}
      defaultSource={require('../assets/default-avatar.png')} // Add fallback
    />
    <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
    {item.character && (
      <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
    )}
  </TouchableOpacity>
);

// Add to styles:
// castCharacter: {
//   color: '#808080',
//   fontSize: 10,
//   textAlign: 'center',
//   marginTop: 2,
// },

// ==========================================
// Option 6: Enhanced Recommendations with Click Handler
// ==========================================

const renderRecommendedItem = ({ item }: any) => (
  <TouchableOpacity 
    style={styles.recommendedItem}
    onPress={() => handleRecommendedPress(item)}
  >
    <Image 
      source={{ uri: item.poster?.vertical || 'https://via.placeholder.com/150x225' }} 
      style={styles.recommendedPoster}
    />
    <View style={styles.recommendedOverlay}>
      <Text style={styles.recommendedTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.imdbRating && (
        <Text style={styles.recommendedRating}>⭐ {item.imdbRating}</Text>
      )}
    </View>
  </TouchableOpacity>
);

const handleRecommendedPress = (movie: any) => {
  // Navigate to the selected movie's detail page or play directly
  navigation.push('MovieDetail', { id: movie._id });
  // Or play directly:
  // navigation.replace('EnhancedVideoPlayer', {
  //   playbackId: movie.muxPlaybackId,
  //   title: movie.title,
  //   contentId: movie._id,
  //   contentType: 'Movie',
  //   movieData: movie,
  // });
};

// Add to styles:
// recommendedOverlay: {
//   position: 'absolute',
//   bottom: 0,
//   left: 0,
//   right: 0,
//   backgroundColor: 'rgba(0,0,0,0.8)',
//   padding: 8,
// },
// recommendedTitle: {
//   color: '#fff',
//   fontSize: 12,
//   fontWeight: '600',
// },
// recommendedRating: {
//   color: '#F5C518',
//   fontSize: 10,
//   marginTop: 2,
// },

// ==========================================
// Backend API Endpoint Examples
// ==========================================

// Add these to your backend (backend/src/controllers/contentController.ts):

// Get similar/related content
// export const getRelatedContent = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const movie = await Movie.findById(id);
//     
//     if (!movie) {
//       return res.status(404).json({ error: 'Movie not found' });
//     }
//     
//     // Find movies with similar genres
//     const relatedMovies = await Movie.find({
//       _id: { $ne: id },
//       genres: { $in: movie.genres },
//       isPublished: true,
//     })
//       .limit(10)
//       .select('title poster imdbRating genres language duration')
//       .sort('-views');
//     
//     res.json({ data: relatedMovies });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch related content' });
//   }
// };

// Add to routes (backend/src/routes/contentRoutes.ts):
// router.get('/content/:id/related', getRelatedContent);

// ==========================================
// Using with Real Backend Data
// ==========================================

// Complete example with backend integration:
// useEffect(() => {
//   const loadContentData = async () => {
//     try {
//       // Fetch full movie data if not provided
//       if (!contentData) {
//         const movieDetails = await apiService.getMovieById(contentId);
//         setContentData(movieDetails);
//       }
//       
//       // Fetch recommendations
//       const recommendations = await apiService.getRelatedContent(contentId, contentType);
//       setRecommendedContent(recommendations);
//       
//       // Parse cast from actors string or fetch from TMDB
//       if (contentData?.actors) {
//         const actors = contentData.actors.split(',').map((actor: string, index: number) => ({
//           id: index,
//           name: actor.trim(),
//           image: `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.trim())}&size=200&background=E50914&color=fff`,
//         }));
//         setCastMembers(actors.slice(0, 10));
//       }
//     } catch (error) {
//       console.error('Error loading content data:', error);
//     }
//   };
//   
//   if (!isFullscreen) {
//     loadContentData();
//   }
// }, [contentId, contentType, isFullscreen]);

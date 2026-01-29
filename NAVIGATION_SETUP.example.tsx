// ==========================================
// Example: Navigation Setup for EnhancedVideoPlayer
// ==========================================
//
// NOTE: This is an example file showing navigation configuration.
// Copy the relevant sections into your actual App.tsx or navigation files.
// Some components (SearchScreen, MyListScreen) are commented out as they may not exist yet.
//
// ==========================================
// Add this to your main navigation file (e.g., App.tsx or navigation/AppNavigator.tsx)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Import your screens
import HomeScreen from './src/screens/HomeScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import EnhancedVideoPlayer from './src/screens/EnhancedVideoPlayer';
import LoginScreen from './src/screens/LoginScreen';
import AccountScreen from './src/screens/AccountScreen';
// import SearchScreen from './src/screens/SearchScreen';
// import MyListScreen from './src/screens/MyListScreen';
// ... other imports

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Stack Navigator
function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="HomeTabs" component={TabNavigator} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      <Stack.Screen 
        name="EnhancedVideoPlayer" 
        component={EnhancedVideoPlayer}
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back during playback
        }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator (if using tabs)
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#E50914',
        tabBarInactiveTintColor: '#808080',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      {/* Uncomment when screens are available */}
      {/* <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="search" size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="MyList" 
        component={MyListScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="bookmark" size={24} color={color} />,
        }}
      /> */}
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="account-circle" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator with Auth
function RootNavigator() {
  const isAuthenticated = true; // Replace with your auth logic

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainStackNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default RootNavigator;

// ==========================================
// Usage Examples
// ==========================================

// 1. Navigate from Home Screen to Movie Detail
// In your HomeScreen or movie list component:
// const handleMoviePress = (movieId: string) => {
//   navigation.navigate('MovieDetail', { id: movieId });
// };

// 2. Navigate from Movie Detail to Video Player
// In MovieDetailScreen:
// const handlePlayMovie = () => {
//   navigation.navigate('EnhancedVideoPlayer', {
//     playbackId: currentMovie.muxPlaybackId,
//     title: currentMovie.title,
//     contentId: currentMovie._id,
//     contentType: 'Movie',
//     movieData: currentMovie,
//   });
// };

// 3. Direct component usage (without navigation)
// const [showPlayer, setShowPlayer] = useState(false);
// const [selectedMovie, setSelectedMovie] = useState(null);
//
// const handlePlayDirect = (movie: any) => {
//   setSelectedMovie(movie);
//   setShowPlayer(true);
// };
//
// return (
//   <View style={{ flex: 1 }}>
//     {showPlayer && selectedMovie ? (
//       <EnhancedVideoPlayer
//         playbackId={selectedMovie.muxPlaybackId}
//         title={selectedMovie.title}
//         contentId={selectedMovie._id}
//         contentType="Movie"
//         onBack={() => setShowPlayer(false)}
//         movieData={selectedMovie}
//       />
//     ) : (
//       <MovieListComponent onMoviePress={handlePlayDirect} />
//     )}
//   </View>
// );

// ==========================================
// app.json Configuration (JSON file, not TypeScript)
// ==========================================

// Add this to your app.json file (NOT as TypeScript code):
// {
//   "expo": {
//     "name": "Movie App",
//     "slug": "movie-app",
//     "version": "1.0.0",
//     "orientation": "default",
//     "icon": "./assets/icon.png",
//     "splash": {
//       "image": "./assets/splash.png",
//       "resizeMode": "contain",
//       "backgroundColor": "#000000"
//     },
//     "plugins": [
//       [
//         "expo-screen-orientation",
//         {
//           "initialOrientation": "DEFAULT"
//         }
//       ]
//     ],
//     "ios": {
//       "supportsTablet": true,
//       "requireFullScreen": false
//     },
//     "android": {
//       "adaptiveIcon": {
//         "foregroundImage": "./assets/adaptive-icon.png",
//         "backgroundColor": "#000000"
//       },
//       "screenOrientation": "user"
//     }
//   }
// }

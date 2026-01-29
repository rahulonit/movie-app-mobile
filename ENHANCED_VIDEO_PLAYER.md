# Enhanced Video Player - Implementation Guide

## Overview
The Enhanced Video Player provides a Netflix-style video playback experience with both landscape (fullscreen) and portrait modes, complete with content details, cast information, and recommendations.

## Features

### 🎬 Landscape Mode (Fullscreen Player)
- Full-width video player with rounded corners (when in container)
- Centered play/pause button overlay
- Bottom progress bar with red seek indicator
- Timestamp display (current/total duration)
- Fullscreen toggle and settings gear icon
- Top-left back arrow with movie title
- Lock orientation button to prevent accidental touches
- Minimal, distraction-free UI with auto-hiding controls

### 📱 Portrait Mode (Player + Content Details)
- Compact video player at the top (16:9 aspect ratio)
- Playback progress bar visible below video
- Movie title and metadata tags
- Genre, language, runtime, and IMDb rating pills
- About section with description
- Horizontal scrollable cast list with circular profile images
- Recommended movies carousel
- All in a dark mode UI

### ⚙️ Settings Bottom Sheet
- Floating modal with blurred background
- Video Quality selection: 420p, 720p, 1080p, 4K
- Subtitles toggle (on/off)
- Subtitle language selector
- Rounded corners, soft shadows, modern typography

### 🎮 Player Controls
- Double-tap left side to rewind 10 seconds
- Double-tap right side to forward 10 seconds
- Single tap center to toggle play/pause
- Tap anywhere to show/hide controls
- Auto-hide controls after 3 seconds of inactivity
- Lock button to prevent accidental touches in landscape mode

## Installation

The player is already integrated into your project. Make sure you have the required dependencies:

```json
{
  "expo-av": "~16.0.8",
  "expo-blur": "~15.0.8",
  "expo-screen-orientation": "~9.0.8",
  "@expo/vector-icons": "^15.0.3"
}
```

## Usage

### Basic Implementation

```tsx
import EnhancedVideoPlayer from '../screens/EnhancedVideoPlayer';

// In your navigation or screen component
<EnhancedVideoPlayer
  playbackId="YOUR_MUX_PLAYBACK_ID"
  title="Avengers: End Game"
  contentId="movie_id_123"
  contentType="Movie"
  onBack={() => navigation.goBack()}
  movieData={movieDetails}
/>
```

### Props Interface

```tsx
interface EnhancedVideoPlayerProps {
  playbackId: string;        // Mux playback ID for HLS streaming
  title: string;              // Movie/series title
  contentId: string;          // Database ID of the content
  contentType: 'Movie' | 'Series';
  episodeId?: string;         // Optional: for series episodes
  onBack: () => void;         // Back button handler
  movieData?: any;            // Optional: Full movie data object
}
```

### Movie Data Structure

The `movieData` prop should contain:

```tsx
{
  title: string;
  description: string;
  plot?: string;              // Detailed plot (preferred over description)
  genres: string[];           // ['Action', 'Adventure', 'Sci-Fi']
  language: string;           // 'English'
  duration: number;           // Duration in minutes
  imdbRating?: number;        // 8.7
  actors?: string;            // "Robert Downey Jr., Chris Evans, ..."
  director?: string;
  poster: {
    vertical: string;         // URL for portrait poster
    horizontal: string;       // URL for landscape poster
  },
  // ... other fields
}
```

## Integration Examples

### 1. From Movie Detail Screen

```tsx
// In MovieDetailScreen.tsx
import EnhancedVideoPlayer from './EnhancedVideoPlayer';

const handlePlayMovie = () => {
  if (!currentMovie.cloudflareVideoId) {
    Alert.alert('Premium Required', 'This content requires a premium subscription');
    return;
  }
  
  // Using React Navigation
  navigation.navigate('EnhancedVideoPlayer', {
    playbackId: currentMovie.cloudflareVideoId, // or muxPlaybackId
    title: currentMovie.title,
    contentId: currentMovie._id,
    contentType: 'Movie',
    movieData: currentMovie,
  });
};
```

### 2. Direct Component Usage

```tsx
const [showPlayer, setShowPlayer] = useState(false);

{showPlayer && (
  <EnhancedVideoPlayer
    playbackId={movie.muxPlaybackId}
    title={movie.title}
    contentId={movie._id}
    contentType="Movie"
    onBack={() => setShowPlayer(false)}
    movieData={movie}
  />
)}
```

### 3. With React Navigation

```tsx
// In your navigation setup
import EnhancedVideoPlayer from './screens/EnhancedVideoPlayer';

const Stack = createNativeStackNavigator();

<Stack.Screen 
  name="EnhancedVideoPlayer" 
  component={EnhancedVideoPlayer}
  options={{ headerShown: false }}
/>

// Navigate from anywhere
navigation.navigate('EnhancedVideoPlayer', {
  playbackId: 'abc123xyz',
  title: 'Movie Title',
  contentId: 'content_id',
  contentType: 'Movie',
  movieData: movieObject,
});
```

## Features in Detail

### Orientation Management

The player automatically handles orientation:
- Starts in portrait mode showing content details
- User can toggle to landscape fullscreen mode
- Automatically locks to portrait when exiting
- Lock button in landscape prevents accidental orientation changes

### Progress Tracking

Automatically saves viewing progress every 5 seconds:
```tsx
// Integrated with your API service
apiService.updateProgress({
  profileId: activeProfile._id,
  contentId,
  contentType,
  episodeId,
  progress: currentPosition,
  duration: totalDuration,
});
```

### Cast Display

Cast members are automatically parsed from the `actors` field:
```tsx
// From "Robert Downey Jr., Chris Evans, Chris Hemsworth"
// Creates individual cast cards with circular images
```

To customize cast images, modify the `useEffect` that parses actors:
```tsx
useEffect(() => {
  if (contentData?.actors) {
    const actors = contentData.actors.split(',').map((actor: string, index: number) => ({
      id: index,
      name: actor.trim(),
      image: getActorImage(actor.trim()), // Your custom function
    }));
    setCastMembers(actors);
  }
}, [contentData]);
```

### Recommendations

To add recommendations, fetch related content and set it:
```tsx
useEffect(() => {
  const fetchRecommendations = async () => {
    const related = await apiService.getRelatedContent(contentId);
    setRecommendedContent(related);
  };
  fetchRecommendations();
}, [contentId]);
```

## Customization

### Colors

Update the color scheme by modifying these style values:

```tsx
const styles = StyleSheet.create({
  // Primary color (currently Netflix red)
  progressBarFill: {
    backgroundColor: '#E50914', // Change to your brand color
  },
  ratingTag: {
    backgroundColor: '#E50914', // Change to your brand color
  },
  // ... other color references
});
```

### Controls Behavior

Adjust auto-hide timing:
```tsx
const DOUBLE_TAP_DELAY = 500; // Double tap detection window (ms)
const SEEK_TIME = 10000;      // Seek amount when double tapping (ms)

// In resetControlsTimer function
controlsTimeoutRef.current = setTimeout(() => {
  hideControls();
}, 3000); // Change this value to adjust auto-hide delay
```

### Quality Options

Modify available quality options:
```tsx
const QUALITY_OPTIONS = ['420p', '720p', '1080p', '4K'];
// Add or remove options as needed
```

### Subtitle Languages

Update available subtitle languages:
```tsx
const SUBTITLE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi'];
```

## Styling Guide

### Dark Mode Theme

The player uses a dark charcoal/black theme:
- Primary background: `#1a1a1a`
- Card background: `#2a2a2a`
- Border color: `#333`
- Text primary: `#fff`
- Text secondary: `#b3b3b3`
- Accent color: `#E50914` (Netflix red)

### Typography

- Title: 24px, bold
- Section headers: 18px, bold
- Body text: 14-16px, regular
- Tags: 12px, medium
- Time stamps: 11-13px, medium

## Troubleshooting

### Video Not Playing

1. Check that the `playbackId` is valid
2. Ensure Mux stream URL is accessible
3. Check device permissions for video playback

### Controls Not Showing

1. Verify `controlsVisible` state
2. Check if orientation lock is active
3. Ensure touch handlers are not blocked

### Orientation Issues

1. Add permissions in app.json:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-screen-orientation",
        {
          "initialOrientation": "DEFAULT"
        }
      ]
    ]
  }
}
```

## Performance Optimization

### Large Cast Lists

For movies with many actors, limit the display:
```tsx
const actors = contentData.actors
  .split(',')
  .slice(0, 10) // Limit to first 10 actors
  .map((actor: string, index: number) => ({
    id: index,
    name: actor.trim(),
    image: getActorImage(actor.trim()),
  }));
```

### Recommendations Loading

Implement lazy loading for recommendations:
```tsx
const [loadingRecommendations, setLoadingRecommendations] = useState(false);

useEffect(() => {
  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const related = await apiService.getRelatedContent(contentId);
      setRecommendedContent(related);
    } finally {
      setLoadingRecommendations(false);
    }
  };
  
  // Delay loading until portrait mode
  if (!isFullscreen) {
    fetchRecommendations();
  }
}, [contentId, isFullscreen]);
```

## API Integration

### Required API Endpoints

1. **Update Progress**
```tsx
POST /api/profiles/:profileId/progress
{
  contentId: string,
  contentType: 'Movie' | 'Series',
  episodeId?: string,
  progress: number,
  duration: number
}
```

2. **Get Related Content** (Optional)
```tsx
GET /api/content/:contentId/related
```

3. **Get Movie Details** (If not passed as prop)
```tsx
GET /api/movies/:movieId
```

## Migration from CustomVideoPlayer

If you're replacing the existing CustomVideoPlayer:

1. **Update navigation references:**
```tsx
// Old
navigation.navigate('VideoPlayer', {...});

// New
navigation.navigate('EnhancedVideoPlayer', {...});
```

2. **Update route configuration:**
```tsx
<Stack.Screen 
  name="EnhancedVideoPlayer" 
  component={EnhancedVideoPlayer}
  options={{ headerShown: false }}
/>
```

3. **Pass additional movieData prop:**
```tsx
// Old
<CustomVideoPlayer
  playbackId={id}
  title={title}
  contentId={contentId}
  contentType="Movie"
  onBack={onBack}
/>

// New
<EnhancedVideoPlayer
  playbackId={id}
  title={title}
  contentId={contentId}
  contentType="Movie"
  onBack={onBack}
  movieData={fullMovieObject} // Add this
/>
```

## Future Enhancements

Potential features to add:
- [ ] Picture-in-Picture (PiP) mode
- [ ] Chromecast support
- [ ] Download for offline viewing
- [ ] Skip intro/outro buttons
- [ ] Next episode auto-play for series
- [ ] Watch party / shared viewing
- [ ] Quality auto-switching based on bandwidth
- [ ] Actual subtitle track integration
- [ ] Audio track switching
- [ ] Playback speed controls

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure API endpoints are accessible
4. Test on both iOS and Android devices

## License

This component is part of your Movie APP project.

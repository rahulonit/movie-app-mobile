# OTT Streaming Platform - Mobile App

Production-grade Netflix-style OTT streaming mobile application built with React Native (Expo), TypeScript, and Redux Toolkit.

## 🚀 Features

### User Features
- **Email/Password Authentication** with JWT
- **Multiple Profiles** (up to 5 per account)
- **Profile Selection** with Kids mode
- **Home Feed** with dynamic content rows
  - Trending content
  - New releases
  - Continue watching
  - Genre-based rows
- **Search** movies and series
- **My List** (Watchlist)
- **Video Player** with HLS streaming
- **Resume Playback** from where you left off
- **Movie & Series Details** screens
- **Account Management**

### Technical Features
- Redux state management
- Persistent authentication
- API service with token refresh
- Responsive design
- Native video player (expo-av)
- Bottom tab navigation
- Stack navigation
- AsyncStorage for local data

## 🛠️ Tech Stack

- **React Native** (Expo)
- **TypeScript**
- **Redux Toolkit** for state management
- **React Navigation** for routing
- **expo-av** for video playback
- **Axios** for API calls
- **AsyncStorage** for local storage

## 📋 Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- Backend server running

## ⚙️ Installation

1. **Install dependencies:**
```bash
cd mobile
npm install
```

2. **Configure API endpoint:**
Update the API base URL in [src/services/api.ts](src/services/api.ts):
```typescript
const API_BASE_URL = 'http://YOUR_BACKEND_URL/api';
```

For local development:
- iOS Simulator: `http://localhost:5000/api`
- Android Emulator: `http://10.0.2.2:5000/api`
- Physical device: `http://YOUR_LOCAL_IP:5000/api`

3. **Start the app:**

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## 📱 App Structure

```
mobile/
├── App.tsx                 # Main app entry with navigation
├── src/
│   ├── services/
│   │   └── api.ts         # API service layer
│   ├── store/
│   │   ├── index.ts       # Redux store configuration
│   │   └── slices/
│   │       ├── authSlice.ts      # Authentication state
│   │       ├── contentSlice.ts   # Content state
│   │       └── profileSlice.ts   # Profile state
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── RegisterScreen.tsx
│       ├── ProfileSelectionScreen.tsx
│       ├── HomeScreen.tsx
│       ├── SearchScreen.tsx
│       ├── MyListScreen.tsx
│       ├── AccountScreen.tsx
│       ├── MovieDetailScreen.tsx
│       ├── SeriesDetailScreen.tsx
│       └── VideoPlayerScreen.tsx
├── app.json               # Expo configuration
├── package.json
└── tsconfig.json
```

## 🎨 Screens

### Authentication
- **Login Screen** - Email/password login
- **Register Screen** - New user registration

### Main App
- **Profile Selection** - Choose or create profile
- **Home** - Dynamic content feed with featured content
- **Search** - Search movies and series
- **My List** - User's watchlist
- **Account** - Profile and account settings

### Content
- **Movie Detail** - Movie information and playback
- **Series Detail** - Series with seasons and episodes
- **Video Player** - Full-screen HLS video player

## 🔑 Key Features

### Authentication Flow
1. User logs in/registers
2. JWT tokens stored in AsyncStorage
3. Automatic token refresh on expiry
4. Profile selection after auth
5. Profile stored in Redux state

### Video Streaming
- HLS streaming via Mux
- Native controls (play, pause, seek)
- Progress tracking every 5 seconds
- Resume playback from last position
- Automatic quality adjustment

### State Management
- **Auth Slice**: User authentication, tokens
- **Content Slice**: Movies, series, search results
- **Profile Slice**: Profiles, My List, watch history

### API Integration
- Axios interceptors for auth tokens
- Automatic token refresh
- Error handling
- Request/response transformations

## 🎯 Usage Examples

### Adding Content to My List
```typescript
dispatch(addToMyList({
  profileId: activeProfile._id,
  contentId: movie._id,
}));
```

### Tracking Video Progress
```typescript
await apiService.updateProgress({
  profileId: activeProfile._id,
  contentId: movie._id,
  contentType: 'Movie',
  progress: currentTime,
  duration: totalDuration,
});
```

### Searching Content
```typescript
dispatch(searchContent({
  query: 'action',
  filters: { genre: 'Action' }
}));
```

## 🔒 Security

- JWT tokens stored securely in AsyncStorage
- Automatic token refresh
- Protected routes with authentication
- Premium content checks
- Secure API communication

## 📊 Performance Optimizations

- FlatList with optimized rendering
- Image lazy loading
- Video streaming optimization
- Redux state normalization
- Efficient re-renders with React.memo

## 🚀 Build for Production

### iOS
```bash
# Build for iOS
expo build:ios

# Or with EAS Build
eas build --platform ios
```

### Android
```bash
# Build for Android
expo build:android

# Or with EAS Build
eas build --platform android
```

## 🐛 Troubleshooting

### Can't connect to backend
- Check API_BASE_URL in api.ts
- Ensure backend is running
- Use correct IP for physical devices
- Check firewall settings

### Video won't play
- Verify Mux playback ID is valid
- Check internet connection
- Ensure proper video format (HLS)
- Check premium subscription status

### AsyncStorage errors
- Clear app data
- Reinstall the app
- Check storage permissions

## 🔄 Future Enhancements

- [ ] Offline downloads
- [ ] Push notifications
- [ ] Cast support (Chromecast)
- [ ] Picture-in-picture mode
- [ ] Subtitle support
- [ ] Multiple audio tracks
- [ ] Parental controls
- [ ] Content recommendations
- [ ] Social features
- [ ] Watchlist sharing

## 📝 License

MIT

## 👨‍💻 Support

For issues and questions:
- Backend issues: Check backend README
- Mobile issues: Check logs with `expo start`
- API issues: Test endpoints with Postman

---

Built with ❤️ using Expo and React Native

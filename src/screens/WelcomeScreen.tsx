import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { setGuestAuth } from '../store/slices/authSlice';
import { setActiveProfile } from '../store/slices/profileSlice';


const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const dispatch = useDispatch();

  const handleGuestLogin = () => {
    // Mark user as authenticated in guest mode
    dispatch(setGuestAuth(null));
    // Set a simple active profile to satisfy navigator guard
    dispatch(setActiveProfile({ _id: 'guest', name: 'Guest' }));
    // Do not navigate immediately; AppNavigator re-renders to show Main
  };
  return (
    <ImageBackground
      source={{ uri: 'https://res.cloudinary.com/dxbno5xjb/image/upload/v1769152625/movie-poster_ewgr2g.jpg' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Camera Icon */}
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/Logo-2.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Watch Movies</Text>
          <Text style={styles.subtitle}>
            Watch unlimited movies,{'\n'}series & TV shows{'\n'}anywhere, anytime
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
          >
            <Text style={styles.guestButtonText}>Try as Guest!</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 30,
  },
  gradient: {
    flex: 1,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#b3b3b3',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 60,
  },
  loginButton: {
    width: width - 60,
    backgroundColor: '#E50914',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guestButton: {
    width: width - 60,
    backgroundColor: '#2b2b2b',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#b3b3b3',
    fontSize: 18,
    fontWeight: '600',
  },
});

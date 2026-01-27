import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { store, RootState } from './src/store';
import { loadStoredAuth } from './src/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfiles, setActiveProfile } from './src/store/slices/profileSlice';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import MyListScreen from './src/screens/MyListScreen';
import AccountScreen from './src/screens/AccountScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import SeriesDetailScreen from './src/screens/SeriesDetailScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import CategoryScreen from './src/screens/CategoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopWidth: 0,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          height: 80,
          paddingBottom: 20,
          paddingTop: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'My List') {
            iconName = 'list';
          } else if (route.name === 'Account') {
            iconName = 'person';
          }
          
          return (
            <View style={[
              styles.tabIconContainer,
              focused && styles.tabIconActive
            ]}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
      />
      <Tab.Screen 
        name="My List" 
        component={MyListScreen}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabIconActive: {
    backgroundColor: '#333',
  },
});

function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { activeProfile, profiles } = useSelector((state: RootState) => state.profile);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfiles() as any);
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !activeProfile && profiles.length > 0) {
      dispatch(setActiveProfile(profiles[0]));
    }
  }, [isAuthenticated, activeProfile, profiles, dispatch]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
        </>
      ) : !activeProfile ? (
        <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
          <Stack.Screen name="Category" component={CategoryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function App() {
  useEffect(() => {
    store.dispatch(loadStoredAuth() as any);
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </Provider>
  );
}

export default App;

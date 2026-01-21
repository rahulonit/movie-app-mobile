import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let SecureStore: any = null;
try {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

const tokenService = {
  async setAccessToken(token: string | null) {
    if (!token) {
      await this.removeAccessToken();
      return;
    }
    if (SecureStore && SecureStore.setItemAsync) {
      await SecureStore.setItemAsync(ACCESS_KEY, token);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACCESS_KEY, token);
    } else {
      await AsyncStorage.setItem(ACCESS_KEY, token);
    }
  },
  async getAccessToken(): Promise<string | null> {
    try {
      if (SecureStore && SecureStore.getItemAsync) {
        return await SecureStore.getItemAsync(ACCESS_KEY);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(ACCESS_KEY);
      }
      return await AsyncStorage.getItem(ACCESS_KEY);
    } catch (e) {
      return null;
    }
  },
  async removeAccessToken() {
    if (SecureStore && SecureStore.deleteItemAsync) {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACCESS_KEY);
    } else {
      await AsyncStorage.removeItem(ACCESS_KEY);
    }
  },

  async setRefreshToken(token: string | null) {
    if (!token) {
      await this.removeRefreshToken();
      return;
    }
    if (SecureStore && SecureStore.setItemAsync) {
      await SecureStore.setItemAsync(REFRESH_KEY, token);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REFRESH_KEY, token);
    } else {
      await AsyncStorage.setItem(REFRESH_KEY, token);
    }
  },
  async getRefreshToken(): Promise<string | null> {
    try {
      if (SecureStore && SecureStore.getItemAsync) {
        return await SecureStore.getItemAsync(REFRESH_KEY);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(REFRESH_KEY);
      }
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch (e) {
      return null;
    }
  },
  async removeRefreshToken() {
    if (SecureStore && SecureStore.deleteItemAsync) {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(REFRESH_KEY);
    } else {
      await AsyncStorage.removeItem(REFRESH_KEY);
    }
  },

  async setUser(user: any | null) {
    if (!user) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(USER_KEY);
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  async getUser(): Promise<any | null> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      }
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  async removeUser() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(USER_KEY);
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  },
  async clearAll() {
    await Promise.all([this.removeAccessToken(), this.removeRefreshToken(), this.removeUser()]);
  },
};

export default tokenService;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/api';
import tokenService from '../../services/tokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  role: string;
  subscription: {
    plan: string;
    status: string;
    expiresAt?: string;
  };
  profiles: any[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isLoggingOut: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.login(email, password);
      const { user, accessToken, refreshToken } = response;

        await tokenService.setAccessToken(accessToken);
        await tokenService.setRefreshToken(refreshToken);
        await tokenService.setUser(user);

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, profileName }: { email: string; password: string; profileName?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.register(email, password, profileName);
      if (__DEV__) console.log('register response:', response);
      const { user, accessToken, refreshToken } = response;

      await tokenService.setAccessToken(accessToken);
      await tokenService.setRefreshToken(refreshToken);
      await tokenService.setUser(user);

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      if (__DEV__) console.error('register error:', error?.response || error?.message || error);
      const resp = error?.response?.data;
      if (resp) {
        if (resp.errors && Array.isArray(resp.errors)) {
          const msgs = resp.errors.map((e: any) => e.message).join('; ');
          return rejectWithValue(msgs || resp.message || 'Registration failed');
        }
        return rejectWithValue(resp.message || 'Registration failed');
      }
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    // Clear local tokens immediately (local-first logout)
    await tokenService.clearAll();
    // Attempt server logout but don't block the UI (apiService.logout handles background attempt)
    await apiService.logout();
    return null;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Logout failed');
  }
});

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async (_, { rejectWithValue }) => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const userStr = await AsyncStorage.getItem('user');

    if (accessToken && refreshToken && userStr) {
      const user = JSON.parse(userStr);
      return { user, accessToken, refreshToken };
    }

    return null;
  } catch (error) {
    return rejectWithValue('Failed to load stored auth');
  }
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setGuestAuth: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload || null;
      state.isAuthenticated = true;
      state.accessToken = null;
      state.refreshToken = null;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.pending, (state) => {
      state.isLoggingOut = true;
      state.error = null;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoggingOut = false;
    });
    builder.addCase(logout.rejected, (state, action) => {
      state.isLoggingOut = false;
      state.error = (action.payload as string) || 'Logout failed';
    });

    // Load stored auth
    builder.addCase(loadStoredAuth.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      }
    });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export const { setGuestAuth } = authSlice.actions;
export default authSlice.reducer;

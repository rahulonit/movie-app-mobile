import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface ProfileState {
  profiles: any[];
  activeProfile: any | null;
  myList: any[];
  watchHistory: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profiles: [],
  activeProfile: null,
  myList: [],
  watchHistory: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProfiles = createAsyncThunk(
  'profile/fetchProfiles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getProfiles();
      return response.data.profiles;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profiles');
    }
  }
);

export const createProfile = createAsyncThunk(
  'profile/create',
  async (
    { name, isKids, avatar }: { name: string; isKids: boolean; avatar?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.createProfile(name, isKids, avatar);
      return response.data.profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (
    { profileId, name, avatar }: { profileId: string; name?: string; avatar?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateProfile(profileId, { name, avatar });
      return response.data.profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const deleteProfile = createAsyncThunk(
  'profile/delete',
  async (profileId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteProfile(profileId);
      return profileId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete profile');
    }
  }
);

export const fetchMyList = createAsyncThunk(
  'profile/fetchMyList',
  async (profileId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getMyList(profileId);
      return response.data.myList;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch My List');
    }
  }
);

export const addToMyList = createAsyncThunk(
  'profile/addToMyList',
  async ({ profileId, contentId }: { profileId: string; contentId: string }, { rejectWithValue }) => {
    try {
      await apiService.addToMyList(profileId, contentId);
      const refreshed = await apiService.getMyList(profileId);
      return refreshed.data.myList;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to My List');
    }
  }
);

export const removeFromMyList = createAsyncThunk(
  'profile/removeFromMyList',
  async ({ profileId, contentId }: { profileId: string; contentId: string }, { rejectWithValue }) => {
    try {
      await apiService.removeFromMyList(profileId, contentId);
      const refreshed = await apiService.getMyList(profileId);
      return refreshed.data.myList;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from My List');
    }
  }
);

// Slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setActiveProfile: (state, action: PayloadAction<any>) => {
      state.activeProfile = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profiles
    builder.addCase(fetchProfiles.fulfilled, (state, action) => {
      state.profiles = action.payload;
    });

    // Create profile
    builder.addCase(createProfile.fulfilled, (state, action) => {
      state.profiles.push(action.payload);
    });

    // Update profile
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      const updated = action.payload;
      state.profiles = state.profiles.map((p) => (p._id === updated._id ? updated : p));
      if (state.activeProfile && state.activeProfile._id === updated._id) {
        state.activeProfile = updated;
      }
    });

    // Delete profile
    builder.addCase(deleteProfile.fulfilled, (state, action) => {
      const id = action.payload as string;
      state.profiles = state.profiles.filter((p) => p._id !== id);
      if (state.activeProfile && state.activeProfile._id === id) {
        state.activeProfile = state.profiles[0] || null;
      }
    });

    // Fetch My List
    builder.addCase(fetchMyList.fulfilled, (state, action) => {
      state.myList = action.payload;
    });

    // Add to My List
    builder.addCase(addToMyList.fulfilled, (state, action) => {
      state.myList = action.payload as any[];
    });

    // Remove from My List
    builder.addCase(removeFromMyList.fulfilled, (state, action) => {
      state.myList = action.payload as any[];
    });
  },
});

export const { setActiveProfile, clearError } = profileSlice.actions;
export default profileSlice.reducer;

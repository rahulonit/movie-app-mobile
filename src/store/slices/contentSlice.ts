import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface ContentState {
  homeFeed: any | null;
  currentMovie: any | null;
  currentSeries: any | null;
  searchResults: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ContentState = {
  homeFeed: null,
  currentMovie: null,
  currentSeries: null,
  searchResults: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchHomeFeed = createAsyncThunk(
  'content/fetchHomeFeed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getHomeFeed();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch home feed');
    }
  }
);

export const fetchMovieById = createAsyncThunk(
  'content/fetchMovieById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getMovieById(id);
      return response.data.movie;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch movie');
    }
  }
);

export const fetchSeriesById = createAsyncThunk(
  'content/fetchSeriesById',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log('fetchSeriesById thunk: Starting fetch for id:', id);
      const response = await apiService.getSeriesById(id);
      console.log('fetchSeriesById thunk: Full response:', JSON.stringify(response, null, 2));
      console.log('fetchSeriesById thunk: response.data:', response.data);
      console.log('fetchSeriesById thunk: response.data.series:', response.data?.series);
      return response.data.series;
    } catch (error: any) {
      console.error('fetchSeriesById thunk: Error caught:', error);
      console.error('fetchSeriesById thunk: Error status:', error?.status);
      console.error('fetchSeriesById thunk: Error body:', error?.body);
      console.error('fetchSeriesById thunk: Error message:', error?.message);
      console.error('fetchSeriesById thunk: Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const message = error?.body?.message || error?.message || 'Failed to fetch series';
      return rejectWithValue(message);
    }
  }
);

export const searchContent = createAsyncThunk(
  'content/search',
  async ({ query, filters }: { query: string; filters?: any }, { rejectWithValue }) => {
    try {
      const response = await apiService.searchContent(query, filters);
      return response.data.results;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

// Slice
const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentContent: (state) => {
      state.currentMovie = null;
      state.currentSeries = null;
    },
  },
  extraReducers: (builder) => {
    // Home feed
    builder.addCase(fetchHomeFeed.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchHomeFeed.fulfilled, (state, action) => {
      state.isLoading = false;
      state.homeFeed = action.payload;
    });
    builder.addCase(fetchHomeFeed.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Movie
    builder.addCase(fetchMovieById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMovieById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentMovie = action.payload;
    });
    builder.addCase(fetchMovieById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Series
    builder.addCase(fetchSeriesById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchSeriesById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentSeries = action.payload;
    });
    builder.addCase(fetchSeriesById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Search
    builder.addCase(searchContent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(searchContent.fulfilled, (state, action) => {
      state.isLoading = false;
      state.searchResults = action.payload;
    });
    builder.addCase(searchContent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, clearCurrentContent } = contentSlice.actions;
export default contentSlice.reducer;

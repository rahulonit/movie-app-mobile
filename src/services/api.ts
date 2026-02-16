
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenService from './tokenService';

// Determine API base URL depending on runtime packager host and platform.
function detectPackagerHost(): string | null {
  try {
    const scriptURL = (NativeModules.SourceCode && NativeModules.SourceCode.scriptURL) || '';
    if (scriptURL) {
      let host = scriptURL;
      if (host.includes('://')) host = host.split('://')[1];
      host = host.split('/')[0];
      const hostname = host.split(':')[0];
      return hostname;
    }

    const expoHost = (Constants as any)?.manifest?.debuggerHost || (Constants as any)?.manifest?.packagerOpts?.packagerHost;
    if (expoHost) {
      const hostname = expoHost.split(':')[0];
      return hostname;
    }
  } catch (e) {}

  return null;
}

const logDev = (...args: any[]) => {
  if (__DEV__) console.log(...args);
};

// Always start with production URL - resolveAndSetBaseURL will check for local dev servers if needed
let API_BASE_URL = 'https://movie-app-backend-indol.vercel.app/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  timeoutMs?: number;
  retry?: boolean;
  attachAuth?: boolean;
  skipRefresh?: boolean;
}

class ApiService {
  private baseURL: string;
  private resolved = false;
  private resolvePromise: Promise<void> | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    if (__DEV__) {
      console.log('[ApiService] Constructor - initial baseURL:', this.baseURL);
      console.log('[ApiService] Platform:', Platform.OS);
      console.log('[ApiService] __DEV__:', __DEV__);
    }
    this.resolvePromise = this.resolveAndSetBaseURL();
  }

  // Probe candidate hosts and set baseURL to the first reachable one.
  private async resolveAndSetBaseURL() {
    if (this.resolved) return;
    
    if (__DEV__) {
      console.log('[ApiService] resolveAndSetBaseURL - starting resolution');
      console.log('[ApiService] Current baseURL before resolution:', this.baseURL);
    }
    
    // Priority 1: Explicit app.json extra (production URL - always check first)
    try {
      const extra = (Constants as any)?.manifest?.extra || (Constants as any)?.expoConfig?.extra;
      if (__DEV__) {
        console.log('[ApiService] Constants.manifest:', (Constants as any)?.manifest);
        console.log('[ApiService] Constants.expoConfig:', (Constants as any)?.expoConfig);
        console.log('[ApiService] Extra from config:', extra);
      }
      const explicit = extra?.API_BASE_URL || extra?.API_HOST;
      if (explicit) {
        const normalized = explicit.startsWith('http') ? explicit : `https://${explicit}`;
        this.baseURL = normalized.endsWith('/api') ? normalized : `${normalized.replace(/\/$/, '')}/api`;
        this.resolved = true;
        console.log('[ApiService] ✅ Resolved API base URL from expo extra (app.json):', this.baseURL);
        return;
      }
    } catch (e) {
      if (__DEV__) console.log('[ApiService] Error reading expo extra:', e);
    }

    // Priority 2: public env vars (usable with EAS/Expo envs)
    const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_HOST;
    if (envBase) {
      const normalized = envBase.startsWith('http') ? envBase : `https://${envBase}`;
      this.baseURL = normalized.endsWith('/api') ? normalized : `${normalized.replace(/\/$/, '')}/api`;
      this.resolved = true;
      logDev('Resolved API base URL from EXPO_PUBLIC env', this.baseURL);
      return;
    }

    // IMPORTANT: Only probe localhost in development mode when no explicit URL is set
    if (!__DEV__) {
      this.resolved = true;
      return;
    }

    const candidates: string[] = [];
    try {
      const detected = (API_BASE_URL.match(/http:\/\/([^:/]+)/) || [])[1];
      if (detected) candidates.push(detected);
    } catch (e) {}

    // If developer set an override in AsyncStorage, prefer that (useful from REPL)
    try {
      const override = await AsyncStorage.getItem('DEV_API_HOST_OVERRIDE');
      if (override) {
        let h = override;
        if (h.includes('://')) h = h.split('://')[1];
        h = h.split('/')[0];
        h = h.split(':')[0];
        candidates.push(h);
      }
    } catch (e) {}

    // Add any API_HOST override from Expo config extras (useful for physical devices)
    try {
      const extra = (Constants as any)?.manifest?.extra || (Constants as any)?.expoConfig?.extra;
      const extraHost = extra?.API_HOST || extra?.API_BASE_URL;
      if (extraHost) {
        let h = extraHost;
        if (h.includes('://')) h = h.split('://')[1];
        h = h.split('/')[0];
        h = h.split(':')[0];
        candidates.push(h);
      }
    } catch (e) {}

    candidates.push('10.0.2.2');
    candidates.push('127.0.0.1');
    candidates.push('localhost');

    const uniqueCandidates = Array.from(new Set(candidates));

    logDev('API host probe candidates:', uniqueCandidates);
    for (const host of uniqueCandidates) {
      const url = `http://${host}:5002/health`;
      try {
        const ok = await this.probeUrl(url, 3000);
        if (ok) {
          const newBase = `http://${host}:5002/api`;
          this.baseURL = newBase;
          logDev('Resolved API base URL to', newBase);
          this.resolved = true;
          return;
        }
      } catch (e) {}
    }

    logDev('Could not auto-resolve API host; using', this.baseURL);
    logDev('If you are on a physical device, set expo.extra.API_HOST = "192.168.x.x" or use adb reverse for Android emulator.');
  }

  private async probeUrl(url: string, timeoutMs = 2000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      fetch(url, { method: 'GET' })
        .then((res) => {
          clearTimeout(timer);
          resolve(res.ok);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(false);
        });
    });
  }

  // Allow callers to wait briefly for resolution to complete before issuing the first request.
  private async ensureResolved(timeoutMs = 2500) {
    if (this.resolved) return;
    if (!this.resolvePromise) return;
    try {
      await Promise.race([
        this.resolvePromise,
        new Promise((r) => setTimeout(() => r(undefined), timeoutMs)),
      ]);
    } catch (e) {}
  }

  private buildUrl(path: string, query?: Record<string, any>) {
    if (path.startsWith('http')) {
      const url = new URL(path);
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          url.searchParams.append(key, String(value));
        });
      }
      return url.toString();
    }

    const normalized = path.replace(/^\//, '');
    const url = new URL(normalized, this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private getAlternateBaseURL(): string | null {
    const trimmed = this.baseURL.replace(/\/$/, '');
    if (/\/api$/i.test(trimmed)) {
      const noApi = trimmed.replace(/\/api$/i, '');
      return noApi || null;
    }
    return `${trimmed}/api`;
  }

  private shouldRetryWithAlternateBase(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized === '/auth' || normalized.startsWith('/auth/');
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = await tokenService.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await this.rawFetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await this.parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(json?.message || `Refresh failed (${res.status})`);
      }
      const { accessToken, refreshToken: newRefreshToken } = json.data;
      await tokenService.setAccessToken(accessToken);
      await tokenService.setRefreshToken(newRefreshToken);
      return true;
    } catch (e) {
      await tokenService.clearAll();
      return false;
    }
  }

  private async rawFetch(url: string, init: RequestInit & { timeoutMs?: number }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 30000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJsonSafe(res: Response) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  private async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    await this.ensureResolved();

    if (!this.baseURL) {
      throw new Error('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL or app.json extra.API_BASE_URL.');
    }

    const {
      method = 'GET',
      body,
      headers = {},
      query,
      timeoutMs = 30000,
      retry = false,
      attachAuth = true,
      skipRefresh = false,
    } = options;

    const finalHeaders: Record<string, string> = { ...headers };
    let finalBody: BodyInit | undefined = body as any;

    if (attachAuth) {
      const token = await tokenService.getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
      finalBody = JSON.stringify(body);
    }

    const url = this.buildUrl(path, query);

    let res: Response;
    try {
      res = await this.rawFetch(url, { method, headers: finalHeaders, body: finalBody, timeoutMs });
    } catch (err: any) {
      throw new Error(err?.message || 'Network error');
    }

    if (res.status === 404 && this.shouldRetryWithAlternateBase(path)) {
      const alternateBaseURL = this.getAlternateBaseURL();
      if (alternateBaseURL && alternateBaseURL !== this.baseURL) {
        const previousBaseURL = this.baseURL;
        try {
          this.baseURL = alternateBaseURL;
          const alternateUrl = this.buildUrl(path, query);
          const alternateRes = await this.rawFetch(alternateUrl, {
            method,
            headers: finalHeaders,
            body: finalBody,
            timeoutMs,
          });
          if (alternateRes.status !== 404) {
            if (__DEV__) {
              console.log('[ApiService] Retried auth request with alternate base URL:', alternateBaseURL);
            }
            res = alternateRes;
          } else {
            this.baseURL = previousBaseURL;
          }
        } catch (_e) {
          this.baseURL = previousBaseURL;
        }
      }
    }

    // If token is expired/invalid, do not auto-refresh; require re-login.
    if (res.status === 401) {
      await tokenService.clearAll();
      const error: any = new Error('Session expired. Please log in again.');
      error.status = 401;
      throw error;
    }

    const data = await this.parseJsonSafe(res);
    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      const error: any = new Error(message);
      error.status = res.status;
      error.body = data;
      throw error;
    }
    return data as T;
  }

  // Auth
  async register(email: string, password: string, profileName?: string) {
    const body: any = { email, password };
    if (profileName && profileName.trim()) body.profileName = profileName.trim();
    const response = await this.request<{ data: any }>('/auth/register', {
      method: 'POST',
      body,
      attachAuth: false,
      skipRefresh: true,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.request<{ data: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      attachAuth: false,
      skipRefresh: true,
    });
    return response.data;
  }

  async logout() {
    const refreshToken = await tokenService.getRefreshToken();
    await tokenService.clearAll();
    // Fire-and-forget server logout (best effort)
    (async () => {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          attachAuth: false,
          skipRefresh: true,
        });
      } catch (e: any) {
        // Silently fail - tokens already cleared locally
        if (__DEV__) {
          console.log('[Logout] Server notification failed (non-critical):', e?.message || 'Network error');
        }
      }
    })();
  }

  async me() {
    return this.request('/auth/me');
  }

  // Playback sessions
  async startPlaybackSession(body: {
    profileId: string;
    titleId: string;
    episodeId?: string;
    durationMs: number;
    playbackToken?: string;
    manifestUrl?: string;
    licenseUrl?: string;
    currentCdn?: string;
    currentBitrate?: number;
    resumeAt?: number;
  }) {
    const res = await this.request<{ data: { sessionId: string } }>('/playback/start', {
      method: 'POST',
      body,
    });
    return res.data.sessionId;
  }

  async updatePlaybackSession(sessionId: string, body: {
    lastPositionMs?: number;
    durationMs?: number;
    currentCdn?: string;
    currentBitrate?: number;
    resumeAt?: number;
    playbackError?: { code: string; message: string };
  }) {
    await this.request(`/playback/${sessionId}`, {
      method: 'PATCH',
      body,
    });
  }

  async completePlaybackSession(sessionId: string) {
    await this.request(`/playback/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  // Content
  async getHomeFeed() {
    return this.request('/home');
  }

  async getMovieById(id: string) {
    return this.request(`/movies/${id}`);
  }

  async getSeriesById(id: string) {
    return this.request(`/series/${id}`);
  }

  async searchContent(query: string, filters?: Record<string, any>) {
    return this.request('/search', { query: { q: query, ...(filters || {}) } });
  }

  // Profiles
  async createProfile(name: string, isKids: boolean, avatar?: string) {
    const body: any = { name, isKids };
    if (avatar) body.avatar = avatar;
    return this.request('/profiles', { method: 'POST', body });
  }

  async getProfiles() {
    return this.request('/profiles');
  }

  async updateProfile(profileId: string, data: any) {
    return this.request(`/profiles/${profileId}`, { method: 'PUT', body: data });
  }

  async deleteProfile(profileId: string) {
    return this.request(`/profiles/${profileId}`, { method: 'DELETE' });
  }

  // My List
  async addToMyList(profileId: string, contentId: string, contentType?: 'Movie' | 'Series') {
    const body: any = { profileId, contentId };
    if (contentType) body.contentType = contentType;
    return this.request('/my-list/add', { method: 'POST', body });
  }

  async removeFromMyList(profileId: string, contentId: string) {
    return this.request('/my-list/remove', { method: 'POST', body: { profileId, contentId } });
  }

  async getMyList(profileId: string) {
    return this.request(`/my-list/${profileId}`);
  }

  // Watch Progress
  async updateProgress(data: {
    profileId: string;
    contentId: string;
    contentType: 'Movie' | 'Series';
    episodeId?: string;
    progress: number;
    duration: number;
  }) {
    return this.request('/progress/update', { method: 'POST', body: data });
  }

  async getWatchHistory(profileId: string) {
    return this.request(`/watch-history/${profileId}`);
  }

  // Related Content
  async getRelatedContent(contentId: string, contentType: 'Movie' | 'Series') {
    return this.request(`/content/${contentId}/related`, {
      query: { type: contentType },
    });
  }

  async getSimilarMovies(movieId: string) {
    return this.request(`/movies/${movieId}/similar`);
  }
}

export default new ApiService();

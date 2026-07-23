/**
 * VRVerse Player — API Service
 * Centralized HTTP client for all backend API calls.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Generic fetch wrapper with error handling */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/** Video API */
export const videoApi = {
  upload: (file: File, onProgress?: (percent: number) => void): Promise<{ success: boolean; video: any }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('video', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.open('POST', `${API_BASE}/videos/upload`);
      xhr.send(formData);
    });
  },

  getAll: () => request<{ videos: any[] }>('/videos'),
  getById: (id: string) => request<{ video: any }>(`/videos/${id}`),
  delete: (id: string) => request(`/videos/${id}`, { method: 'DELETE' }),
  rename: (id: string, name: string) =>
    request(`/videos/${id}/rename`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  getStreamUrl: (id: string) => `${API_BASE}/videos/${id}/stream`,
  getThumbnailUrl: (id: string) => `${API_BASE}/videos/${id}/thumbnail`,
};

/** Conversion API */
export const conversionApi = {
  start: (data: {
    videoId: string;
    vrMode: string;
    projectionType?: string;
    outputResolution?: string;
    outputFps?: number;
    outputBitrate?: string;
    projectionQuality?: string;
  }) => request<{ success: boolean; conversion: any }>('/conversions/start', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getStatus: (id: string) => request<{ conversion: any; queueStatus: string }>(`/conversions/${id}/status`),
  cancel: (id: string) => request(`/conversions/${id}/cancel`, { method: 'POST' }),
  getAll: () => request<{ conversions: any[] }>('/conversions'),
  getByVideo: (videoId: string) => request<{ conversions: any[] }>(`/conversions/video/${videoId}`),
  delete: (id: string) => request(`/conversions/${id}`, { method: 'DELETE' }),
  getStreamUrl: (id: string) => `${API_BASE}/conversions/${id}/stream`,
  getDownloadUrl: (id: string) => `${API_BASE}/conversions/${id}/download`,
  getPlugins: () => request<{ plugins: any[] }>('/conversions/plugins'),
  getQueueStats: () => request<any>('/conversions/queue/stats'),
};

/** History API */
export const historyApi = {
  getAll: () => request<{ history: any[] }>('/history'),
  getDownloads: () => request<{ downloads: any[] }>('/history/downloads'),
  clearAll: () => request('/history/clear', { method: 'DELETE' }),
};

/** Settings API */
export const settingsApi = {
  getAll: () => request<{ settings: Record<string, string> }>('/settings'),
  get: (key: string) => request<{ key: string; value: string }>(`/settings/${key}`),
  update: (key: string, value: string) =>
    request('/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),
  updateMany: (settings: Record<string, string>) =>
    request('/settings/bulk', { method: 'PUT', body: JSON.stringify({ settings }) }),
};

/** Health check */
export const healthApi = {
  check: () => request<{ status: string }>('/health'),
};

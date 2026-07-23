/**
 * VRVerse Player — Utility Functions
 */

/** Format file size to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Format duration in seconds to MM:SS or HH:MM:SS */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format resolution (e.g., "1920x1080" => "1080p") */
export function formatResolution(width: number, height: number): string {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return `${width}×${height}`;
}

/** Format date to relative time */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/** Format ETA seconds to human readable */
export function formatETA(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Calculating...';
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s remaining`;
}

/** Get VR mode display label */
export function getVRModeLabel(mode: string): string {
  switch (mode) {
    case 'normal': return 'Normal';
    case 'vr180': return 'VR 180°';
    case 'vr360': return 'VR 360°';
    default: return mode;
  }
}

/** Get status color class */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-400';
    case 'processing': return 'text-amber-400';
    case 'queued': return 'text-blue-400';
    case 'failed': return 'text-red-400';
    case 'cancelled': return 'text-gray-400';
    default: return 'text-white/60';
  }
}

/** Validate video file type */
export function isValidVideoFile(file: File): boolean {
  const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return file.type.startsWith('video/') || validExtensions.includes(ext);
}

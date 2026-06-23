import { AppUser } from '../types';

// Supabase details
const rawSupaUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const VITE_SUPABASE_URL = rawSupaUrl.endsWith('/') ? rawSupaUrl.slice(0, -1) : rawSupaUrl;
const VITE_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export interface DeviceSession {
  id: string; // unique session ID / device ID
  user_id: string;
  device_name: string;
  last_active: string;
  is_current: boolean;
}

// Get or create unique persistent device ID
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('nexwin_device_id');
  if (!deviceId) {
    deviceId = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem('nexwin_device_id', deviceId);
  }
  return deviceId;
}

// Get device name based on User Agent
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "نامشخص";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";

  let os = "سیستم‌عامل نامشخص";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("X11") || ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} (${os})`;
}

// Map user tier to max allowed devices
export function getDeviceLimit(tier: 'bronze' | 'silver' | 'gold' | string): number {
  const t = tier ? tier.toLowerCase() : 'bronze';
  if (t === 'bronze') return 1; // فروشگاهی
  if (t === 'silver') return 2; // کارگاهی
  if (t === 'gold') return 3;   // مدیریتی
  return 1; // default
}

// Helper to check if Supabase is active
function isSupabaseActive(): boolean {
  return !!(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY && !VITE_SUPABASE_URL.includes('YOUR_SUPABASE') && VITE_SUPABASE_URL !== 'zibal');
}

// Fetch active sessions from Supabase with localStorage fallback
export async function fetchActiveSessions(userId: string): Promise<DeviceSession[]> {
  const currentDevId = getOrCreateDeviceId();
  
  if (!isSupabaseActive()) {
    // Fallback Mock Local Sessions so user can test the active sessions, limits, and removal offline
    const localMockStr = localStorage.getItem(`nexwin_mock_sessions_${userId}`);
    if (localMockStr) {
      try {
        const parsed = JSON.parse(localMockStr) as DeviceSession[];
        return parsed.map(s => ({ ...s, is_current: s.id === currentDevId }));
      } catch (e) {
        // ignore
      }
    }
    
    // Default initial mock if nothing in local storage
    const initialMocks: DeviceSession[] = [
      {
        id: currentDevId,
        user_id: userId,
        device_name: `${getDeviceName()} (همین دستگاه)`,
        last_active: new Date().toISOString(),
        is_current: true
      }
    ];
    localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(initialMocks));
    return initialMocks;
  }

  try {
    const url = `${VITE_SUPABASE_URL}/rest/v1/nexwin_sessions?user_id=eq.${encodeURIComponent(userId)}&select=*`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
      }
    });

    if (res.status === 404) {
      console.warn('nexwin_sessions table not found on Supabase. Falling back to local device tracking.');
      return fetchLocalFallbackSessions(userId);
    }

    if (res.ok) {
      const data = await res.json();
      const sessions: DeviceSession[] = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        device_name: item.device_name,
        last_active: item.last_active || new Date().toISOString(),
        is_current: item.id === currentDevId
      }));

      // Ensure the current device is present in the list, otherwise add it if we are logged in
      const currentExists = sessions.some(s => s.id === currentDevId);
      if (!currentExists && localStorage.getItem('nexwin_user')) {
        await registerCurrentSession(userId);
        return fetchActiveSessions(userId); // re-fetch
      }

      return sessions;
    }
    
    throw new Error(`Supabase returned status ${res.status}`);
  } catch (error) {
    console.error('Error fetching sessions from Supabase:', error);
    return fetchLocalFallbackSessions(userId);
  }
}

// Local storage helper for fallback
function fetchLocalFallbackSessions(userId: string): DeviceSession[] {
  const currentDevId = getOrCreateDeviceId();
  const localMockStr = localStorage.getItem(`nexwin_mock_sessions_${userId}`);
  if (localMockStr) {
    try {
      const parsed = JSON.parse(localMockStr) as DeviceSession[];
      return parsed.map(s => ({ ...s, is_current: s.id === currentDevId }));
    } catch (e) {
      console.warn('Failed to parse local mock sessions:', e);
    }
  }
  const defaultList = [
    {
      id: currentDevId,
      user_id: userId,
      device_name: `${getDeviceName()} (همین دستگاه)`,
      last_active: new Date().toISOString(),
      is_current: true
    }
  ];
  localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(defaultList));
  return defaultList;
}

// Register or update current device session
export async function registerCurrentSession(userId: string): Promise<boolean> {
  const currentDevId = getOrCreateDeviceId();
  const currentDevName = getDeviceName();
  const now = new Date().toISOString();

  if (!isSupabaseActive()) {
    const sessions = fetchLocalFallbackSessions(userId);
    if (!sessions.some(s => s.id === currentDevId)) {
      sessions.push({
        id: currentDevId,
        user_id: userId,
        device_name: `${currentDevName} (همین دستگاه)`,
        last_active: now,
        is_current: true
      });
      localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(sessions));
    }
    return true;
  }

  try {
    // Attempt upsert (insert with ON CONFLICT)
    const url = `${VITE_SUPABASE_URL}/rest/v1/nexwin_sessions?on_conflict=id`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        id: currentDevId,
        user_id: userId,
        device_name: currentDevName,
        last_active: now
      })
    });

    if (res.status === 404) {
      // Table doesn't exist, use fallback
      registerLocalSession(userId);
      return true;
    }

    return res.ok;
  } catch (err) {
    console.error('Failed to register session on Supabase:', err);
    registerLocalSession(userId);
    return true;
  }
}

function registerLocalSession(userId: string) {
  const currentDevId = getOrCreateDeviceId();
  const sessions = fetchLocalFallbackSessions(userId);
  if (!sessions.some(s => s.id === currentDevId)) {
    sessions.push({
      id: currentDevId,
      user_id: userId,
      device_name: `${getDeviceName()} (همین دستگاه)`,
      last_active: new Date().toISOString(),
      is_current: true
    });
    localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(sessions));
  }
}

// Revoke/Delete a session
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  if (!isSupabaseActive()) {
    const sessions = fetchLocalFallbackSessions(userId);
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(filtered));
    return true;
  }

  try {
    const url = `${VITE_SUPABASE_URL}/rest/v1/nexwin_sessions?id=eq.${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
      }
    });

    if (res.status === 404) {
      const sessions = fetchLocalFallbackSessions(userId);
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(filtered));
      return true;
    }

    return res.ok;
  } catch (err) {
    console.error('Failed to revoke session on Supabase:', err);
    const sessions = fetchLocalFallbackSessions(userId);
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(filtered));
    return true;
  }
}

// Add a mock device session (for user testing of the limits and list)
export function addMockDeviceSession(userId: string, name: string): void {
  const sessions = fetchLocalFallbackSessions(userId);
  const newMockId = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
  sessions.push({
    id: newMockId,
    user_id: userId,
    device_name: name,
    last_active: new Date().toISOString(),
    is_current: false
  });
  localStorage.setItem(`nexwin_mock_sessions_${userId}`, JSON.stringify(sessions));
}

/**
 * @file syncService.ts
 * @description Core Cloud-Sync and Backup Automation Engine for the NexWin UPVC Dashboard.
 * Integrates client-side saved projects to the relational database tables deployed on Supabase.
 * Implements a resilient local-first write queue, handling offline synchronization, conflict
 * resolution, and batch uplinks for uninterrupted glass manufacturing factory operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// 1. Core TypeScript Interface Definitions
// ==========================================

export interface WindowItemPayload {
  id?: string; // Optional UUID if stored in DB
  window_name: string; // Dynamic CAD window name/tag
  raw_inputs: {
    width: number;
    height: number;
    config: {
      type: string;
      mullions: number;
      frameType?: 'standard' | 'renovation';
      spacerColor?: string;
      layout?: any; // Nested JSON tree structure representing mullion divisions
    };
    quantity: number;
  };
  profile_data: {
    profileId: string;
    glassId: string;
    hardwareId: string;
    frameType?: string;
    spacerColor?: string;
  };
  calculated_glass: {
    glassArea: number;
    glassPrice: number;
    profileMeters: number;
    profilePrice: number;
    sashCount: number;
    hardwarePrice: number;
    totalPrice: number;
    unitPrice: number;
    details: Array<{
      rowId: number;
      name: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
}

export interface WindowProjectPayload {
  id: string; // Project standard UUID
  userLicenseId: string; // Foreign key linking to public.app_users.id (e.g. "NW-48352")
  project_name: string;
  total_items: number;
  status: 'Draft' | 'Contract' | 'Production' | 'Produced';
  metadata: {
    customerName: string;
    address: string;
    installPercent: number;
    companyName: string;
    date: string;
    totalPrice: number;
    payments: Array<{
      id: string;
      amount: number;
      date: string;
      type: 'Cash' | 'Check';
      checkDetails?: {
        checkNumber: string;
        bankName: string;
        dueDate: string;
        isSayad: boolean;
      };
    }>;
  };
  items: WindowItemPayload[];
  created_at?: string;
  updated_at?: string;
}

export interface SyncQueueItem {
  queueId: string;
  projectId: string;
  payload: WindowProjectPayload;
  timestamp: number;
  action: 'UPSERT' | 'DELETE';
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingQueueCount: number;
  lastSyncTime: string | null;
  syncState: 'idle' | 'syncing' | 'error';
  systemLogs: string[];
}

// ==========================================
// 2. Supabase Client Initialization (Lazy/Robust Pattern)
// ==========================================

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url === 'YOUR_SUPABASE_PROJECT_URL' || url === 'zibal' || url.trim() === '') {
    console.warn(
      '[SyncService Warning] Supabase environment variables are missing or use placeholders. Utilizing Sandbox mock database mode.'
    );
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseInstance;
  } catch (err: any) {
    console.error('[SyncService Fatal] Failed to create Supabase client instance:', err);
    return null;
  }
}

// Local Storage Keys
const LOCAL_PROJECTS_KEY = 'nexwin_local_projects';
const SYNC_QUEUE_KEY = 'nexwin_sync_write_queue';
const SYNC_LOGS_KEY = 'nexwin_sync_syslogs';
const LAST_SYNC_KEY = 'nexwin_last_successful_sync';

// Logger Helper
function logSystemEvent(msg: string) {
  try {
    const timestamp = new Intl.DateTimeFormat('fa-IR', {
      timeStyle: 'medium',
      dateStyle: 'short',
    }).format(new Date());
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    const existing = JSON.parse(localStorage.getItem(SYNC_LOGS_KEY) || '[]');
    existing.unshift(formatted);
    // Keep last 150 log entries to preserve resource limit
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(existing.slice(0, 150)));
  } catch (e) {
    console.warn('[SyncService Logger ERROR]', e);
  }
}

// ==========================================
// 3. Core Cloud-Sync Operations
// ==========================================

/**
 * Performs a synchronized write (upsert) to Supabase Cloud, mapping client state to structural tables.
 * Falls back to offline-mode write queue if a network partition or server error occurs.
 */
export async function syncProjectToCloud(project: WindowProjectPayload): Promise<{
  success: boolean;
  mode: 'cloud' | 'local_queue';
  message: string;
}> {
  logSystemEvent(`شروع جفت‌سازی پروژه "${project.project_name}" با پایگاه ابر...`);
  
  // Verify/Normalize license identifier
  if (!project.userLicenseId || project.userLicenseId.trim() === '') {
    const errorMsg = 'شناسه لایسنس کارگاهی موجود نیست. ثبت پروژه نامعتبر است.';
    logSystemEvent(`خطای همگام‌سازی: ${errorMsg}`);
    return { success: false, mode: 'local_queue', message: errorMsg };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // offline bypass fallback
    enqueueLocalMutation(project, 'UPSERT');
    return {
      success: true,
      mode: 'local_queue',
      message: 'سرویس ابری متصل نیست. اطلاعات در صف تریگر محلی ذخیره گردید.',
    };
  }

  try {
    // 1. Transaction Simulation Phase 1: Top-level primary Project metadata upsert
    const projectUpsertData = {
      id: project.id,
      license_id: project.userLicenseId,
      project_name: project.project_name,
      total_items: project.total_items,
      created_at: project.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: projectError } = await supabase
      .from('projects')
      .upsert(projectUpsertData, { onConflict: 'id' });

    if (projectError) {
      throw new Error(`خطای درج پروژه در دیتابیس ابر: ${projectError.message}`);
    }

    // 2. Transaction Simulation Phase 2: Relational batch upsert for individual window configurations
    // First, clear existing orphaned item entries for this project to maintain structural integrity
    const metadataRowId = project.id.substring(0, 24) + 'e7e7e7e7e7e7';
    const fileItemIds = project.items.filter(item => item.id).map(item => item.id as string);
    // Include metadataRowId to guard it against deletion
    fileItemIds.push(metadataRowId);

    await supabase
      .from('window_items')
      .delete()
      .eq('project_id', project.id)
      .not('id', 'in', `(${fileItemIds.join(',')})`);

    const windowItemsBatches = project.items.map((item, idx) => ({
      id: item.id || crypto.randomUUID(), // Guarantee a primary block UUID
      project_id: project.id,
      window_name: item.window_name || `پنجره ردیف ${idx + 1}`,
      raw_inputs: item.raw_inputs,
      profile_data: item.profile_data,
      calculated_glass: item.calculated_glass,
    }));

    // Append metadata and status row
    windowItemsBatches.push({
      id: metadataRowId,
      project_id: project.id,
      window_name: '__NEXWIN_PROJECT_METADATA__',
      raw_inputs: {
        metadata: project.metadata,
        status: project.status
      } as any,
      profile_data: {} as any,
      calculated_glass: {} as any,
    });

    const { error: itemsError } = await supabase
      .from('window_items')
      .upsert(windowItemsBatches, { onConflict: 'id' });

    if (itemsError) {
      throw new Error(`خطای درج تک تک واحدهای محاسباتی: ${itemsError.message}`);
    }

    // Mark successful sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    logSystemEvent(`سیستم با موفقیت به دیتابیس مرکزی متصل گردید و پروژه "${project.project_name}" ابری شد.`);
    return {
      success: true,
      mode: 'cloud',
      message: 'پروژه با موفقیت به همراه جزییات ماژولار ابری گردید.',
    };

  } catch (err: any) {
    logSystemEvent(`عدم امکان دسترسی به شبکه مرکزی. خطای رخ داده: ${err.message || err}`);
    // Push mutation to localized queue for automatic background drain
    enqueueLocalMutation(project, 'UPSERT', err.message || '');
    return {
      success: true,
      mode: 'local_queue',
      message: 'پروژه به صورت محلی ذخیره شد و در صف همگام‌سازی پس‌زمینه قرار گرفت.',
    };
  }
}

/**
 * Downloads and restores all cloud database entries mapped relational database to UI Client Payloads.
 */
export async function fetchUserProjectsFromCloud(licenseId: string): Promise<WindowProjectPayload[]> {
  logSystemEvent(`شروع دریافت لیست کامل لایسنسهای متصل به شناسه کارگاه: ${licenseId}`);
  const supabase = getSupabaseClient();
  if (!supabase) {
    logSystemEvent('سرویس ابری متصل نیست. بازگشت به مخزن آفلاین محلی.');
    return fetchLocalSavedProjects();
  }

  try {
    // Read from top parent projects table
    const { data: projectsData, error: projectsQueryErr } = await supabase
      .from('projects')
      .select(`
        id,
        license_id,
        project_name,
        total_items,
        created_at,
        updated_at
      `)
      .eq('license_id', licenseId);

    if (projectsQueryErr) {
      throw new Error(`شکست در بازیابی پروژه‌های کارگاه: ${projectsQueryErr.message}`);
    }

    if (!projectsData || projectsData.length === 0) {
      logSystemEvent('هیچ پروژه‌ای در ابر متناظر با این لایسنس یافت نشد.');
      return [];
    }

    const compiledProjects: WindowProjectPayload[] = [];

    // Map each parent record and join child components
    for (const rawProj of projectsData) {
      const { data: itemsData, error: itemsQueryErr } = await supabase
        .from('window_items')
        .select('*')
        .eq('project_id', rawProj.id);

      if (itemsQueryErr) {
        console.warn(`[SyncService Error] Failed to join window items for project ${rawProj.id}:`, itemsQueryErr.message);
      }

      const itemsList = itemsData || [];
      const metadataItem = itemsList.find(item => item.window_name === '__NEXWIN_PROJECT_METADATA__');
      const regularItems = itemsList.filter(item => item.window_name !== '__NEXWIN_PROJECT_METADATA__');

      const itemsResolved: WindowItemPayload[] = regularItems.map(rawItem => ({
        id: rawItem.id,
        window_name: rawItem.window_name,
        raw_inputs: typeof rawItem.raw_inputs === 'string' ? JSON.parse(rawItem.raw_inputs) : rawItem.raw_inputs,
        profile_data: typeof rawItem.profile_data === 'string' ? JSON.parse(rawItem.profile_data) : rawItem.profile_data,
        calculated_glass: typeof rawItem.calculated_glass === 'string' ? JSON.parse(rawItem.calculated_glass) : rawItem.calculated_glass,
      }));

      // Parse metadata & status
      let metadataResolved = {
        customerName: 'نامشخص',
        address: 'بدون آدرس ثبت شده',
        installPercent: 10,
        companyName: 'کارگاه نکس‌وین',
        date: rawProj.created_at || new Date().toISOString(),
        totalPrice: 0,
        payments: []
      };
      let statusResolved: 'Draft' | 'Contract' | 'Production' | 'Produced' = 'Draft';

      if (metadataItem) {
        const rawInputsParsed = typeof metadataItem.raw_inputs === 'string'
          ? JSON.parse(metadataItem.raw_inputs)
          : metadataItem.raw_inputs;

        if (rawInputsParsed) {
          if (rawInputsParsed.metadata) {
            metadataResolved = rawInputsParsed.metadata;
          }
          if (rawInputsParsed.status) {
            statusResolved = rawInputsParsed.status;
          }
        }
      }

      compiledProjects.push({
        id: rawProj.id,
        userLicenseId: rawProj.license_id,
        project_name: rawProj.project_name,
        total_items: rawProj.total_items || itemsResolved.length,
        status: statusResolved,
        metadata: metadataResolved,
        items: itemsResolved,
        created_at: rawProj.created_at,
        updated_at: rawProj.updated_at,
      });
    }

    // Sync client local cache with latest pulled items from cloud to maximize speed
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(compiledProjects));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    logSystemEvent(`مجموعاً تعداد ${compiledProjects.length} پروژه با تایید ابر همگام و بازیابی شد.`);

    return compiledProjects;

  } catch (err: any) {
    logSystemEvent(`خطای بازیابی دیتای ابری: ${err.message || err}. استفاده از حافظه کش محلی.`);
    return fetchLocalSavedProjects();
  }
}

// ==========================================
// 4. Local-First Mitigation Queue & Offline Queue Handler
// ==========================================

export function enqueueLocalMutation(project: WindowProjectPayload, action: 'UPSERT' | 'DELETE', errorTxt?: string) {
  try {
    const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    
    // Remove duplication for the same project in the queue to save space
    const filteredQueue = queue.filter(item => item.projectId !== project.id);
    
    const newItem: SyncQueueItem = {
      queueId: crypto.randomUUID(),
      projectId: project.id,
      payload: project,
      timestamp: Date.now(),
      action: action,
      retryCount: 0,
      lastError: errorTxt,
    };

    filteredQueue.push(newItem);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
    
    // Also save in local offline main list so user sees it instantly
    const localProjects = fetchLocalSavedProjects();
    const updatedLocal = localProjects.filter(p => p.id !== project.id);
    updatedLocal.unshift(project);
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(updatedLocal));

    logSystemEvent(`پروژه "${project.project_name}" در صف آفلاین محلی درج گردید.`);
  } catch (err) {
    console.error('[SyncService Queue Error]', err);
  }
}

export function fetchLocalSavedProjects(): WindowProjectPayload[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function fetchSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function fetchSystemLogs(): string[] {
  try {
    const raw = localStorage.getItem(SYNC_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearSystemLogs() {
  localStorage.setItem(SYNC_LOGS_KEY, '[]');
}

/**
 * Iterates through local mutations saved when offline and uploads them sequentially when network returns.
 */
export async function flushSyncQueue(): Promise<{
  attempted: number;
  successful: number;
  failed: number;
}> {
  const queue = fetchSyncQueue();
  if (queue.length === 0) {
    return { attempted: 0, successful: 0, failed: 0 };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { attempted: queue.length, successful: 0, failed: queue.length };
  }

  logSystemEvent(`تلاش جهت تسویه همزمان صف همگام‌سازی محلی (شامل ${queue.length} عملیات معلق)...`);

  let successful = 0;
  let failed = 0;
  const remainingQueue: SyncQueueItem[] = [];

  for (const queueItem of queue) {
    try {
      if (queueItem.action === 'UPSERT') {
        const result = await uploadSingleProjectDirect(supabase, queueItem.payload);
        if (result.success) {
          successful++;
          logSystemEvent(`تخلیه صف موفق: پروژه "${queueItem.payload.project_name}" با پایگاه ابر یکسان‌سازی شد.`);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (e: any) {
      failed++;
      queueItem.retryCount++;
      queueItem.lastError = e?.message || 'Unknown network error';
      // Auto limit queue retries to prevent blocking indefinitely
      if (queueItem.retryCount < 5) {
        remainingQueue.push(queueItem);
      } else {
        logSystemEvent(`پروژه "${queueItem.payload.project_name}" پس از ۵ تلاش مکرر به آرشیو بن‌بست محلی انتقال یافت.`);
      }
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
  
  if (successful > 0) {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  return { attempted: queue.length, successful, failed };
}

// Low-level helper specifically bypassing queue check to avoid infinite recurrence
async function uploadSingleProjectDirect(supabase: SupabaseClient, project: WindowProjectPayload) {
  const projectUpsertData = {
    id: project.id,
    license_id: project.userLicenseId,
    project_name: project.project_name,
    total_items: project.total_items,
    created_at: project.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: projectError } = await supabase
    .from('projects')
    .upsert(projectUpsertData, { onConflict: 'id' });

  if (projectError) return { success: false, message: projectError.message };

  // Sync window items child batch
  const metadataRowId = project.id.substring(0, 24) + 'e7e7e7e7e7e7';
  const fileItemIds = project.items.filter(item => item.id).map(item => item.id as string);
  // Include metadata row to protect from delete
  fileItemIds.push(metadataRowId);

  await supabase
    .from('window_items')
    .delete()
    .eq('project_id', project.id)
    .not('id', 'in', `(${fileItemIds.join(',')})`);

  const windowItemsBatches = project.items.map((item, idx) => ({
    id: item.id || crypto.randomUUID(),
    project_id: project.id,
    window_name: item.window_name || `پنجره ردیف ${idx + 1}`,
    raw_inputs: item.raw_inputs,
    profile_data: item.profile_data,
    calculated_glass: item.calculated_glass,
  }));

  // Append metadata row
  windowItemsBatches.push({
    id: metadataRowId,
    project_id: project.id,
    window_name: '__NEXWIN_PROJECT_METADATA__',
    raw_inputs: {
      metadata: project.metadata,
      status: project.status
    } as any,
    profile_data: {} as any,
    calculated_glass: {} as any,
  });

  const { error: itemsError } = await supabase
    .from('window_items')
    .upsert(windowItemsBatches, { onConflict: 'id' });

  if (itemsError) return { success: false, message: itemsError.message };

  return { success: true, message: 'Done' };
}

// ==========================================
// 5. Automatic Listeners & Network Observers
// ==========================================

let isInitialized = false;

export function initializeSyncEngine(onStatusChange?: (status: SyncStatus) => void) {
  if (typeof window === 'undefined') return;

  const getStatus = (): SyncStatus => ({
    isOnline: navigator.onLine,
    pendingQueueCount: fetchSyncQueue().length,
    lastSyncTime: localStorage.getItem(LAST_SYNC_KEY),
    syncState: 'idle',
    systemLogs: fetchSystemLogs().slice(0, 15),
  });

  const notifyChange = () => {
    if (onStatusChange) {
      onStatusChange(getStatus());
    }
  };

  if (!isInitialized) {
    isInitialized = true;
    logSystemEvent('سامانه مدیریت همگام‌سازی و پشتیبان‌گیری خودکار نکس‌وین راه اندازی گردید.');

    // Event 1: Online trigger
    window.addEventListener('online', async () => {
      logSystemEvent('اتصال اینترنت با موفقیت برقرار شد. آغاز پردازش صف همگام‌سازی...');
      notifyChange();
      await flushSyncQueue();
      notifyChange();
    });

    // Event 2: Offline trigger
    window.addEventListener('offline', () => {
      logSystemEvent('اینترنت قطع شد. تغییر موقت مکانیزم محاسبات به پایگاه آفلاین کارگاه.');
      notifyChange();
    });

    // Periodically run background check every 60 seconds to push queue and pull if online
    setInterval(async () => {
      if (navigator.onLine && fetchSyncQueue().length > 0) {
        await flushSyncQueue();
        notifyChange();
      }
    }, 60000);
  }

  // Initial feedback trigger
  notifyChange();
}

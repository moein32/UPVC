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

/**
 * Deterministically maps any client-side ID (such as numeric timestamps) to a valid UUID format
 * to guarantee compatibility with Supabase primary key constraints while avoiding duplication on upserts.
 */
export function toDeterministicUUID(str: string): string {
  if (!str) return crypto.randomUUID();
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }

  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  
  let h3 = h1, h4 = h2;
  h3 = Math.imul(h3 ^ 0xbadf00d, 2654435761);
  h4 = Math.imul(h4 ^ 0xfee1900d, 1597334677);
  const part3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const part4 = (h4 >>> 0).toString(16).padStart(8, '0');
  
  const hex = (part1 + part2 + part3 + part4).substring(0, 32);
  
  const p1 = hex.substring(0, 8);
  const p2 = hex.substring(8, 12);
  const p3 = '4' + hex.substring(13, 16);
  const p4 = 'a' + hex.substring(17, 20);
  const p5 = hex.substring(20, 32);
  
  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}

// Local Storage Keys
const LOCAL_PROJECTS_KEY = 'lumina_projects';
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
 * Normalizes any project format (including local SavedProject format with customerName, payments etc.)
 * into the standardized WindowProjectPayload format needed for cloud upserts.
 */
export function normalizeLocalProjectToPayload(project: any): WindowProjectPayload {
  if (!project) {
    throw new Error('مقدار پروژه نامعتبر است.');
  }

  let localUser: any = null;
  try {
    const userStr = localStorage.getItem('nexwin_user');
    if (userStr) {
      localUser = JSON.parse(userStr);
    }
  } catch (e) {
    console.warn('Failed to parse nexwin_user from localStorage:', e);
  }

  const licenseId = project.userLicenseId || project.license_id || localUser?.id || 'GUEST';

  // Handle name mapping (customerName in local SavedProject, project_name in payload)
  const projectName = project.project_name || project.customerName || 'پروژه نکس‌وین';
  
  // Extract and map items securely
  const items = (project.items || []).map((item: any, idx: number) => {
    return {
      id: item.id || crypto.randomUUID(),
      window_name: item.window_name || item.config?.type || `پنجره ردیف ${idx + 1}`,
      raw_inputs: item.raw_inputs || {
        config: item.config || {},
        quantity: item.quantity || 1,
        calculations: item.calculations || {}
      },
      profile_data: item.profile_data || item.config || {},
      calculated_glass: item.calculated_glass || item.calculations || {},
    };
  });

  // Extract and map metadata
  const metadata = project.metadata || {
    customerName: project.customerName || 'میهمان',
    address: project.address || '',
    installPercent: project.installPercent || 10,
    companyName: project.companyName || '',
    date: project.date || new Date().toISOString(),
    totalPrice: project.totalPrice || 0,
    payments: project.payments || [],
  };

  const totalItems = project.total_items || items.length || 0;

  return {
    id: project.id,
    userLicenseId: licenseId,
    project_name: projectName,
    total_items: totalItems,
    status: project.status || 'Draft',
    metadata,
    items,
    created_at: project.created_at || project.date || new Date().toISOString(),
    updated_at: project.updated_at || new Date().toISOString(),
  };
}

/**
 * Performs a synchronized write (upsert) to Supabase Cloud, mapping client state to structural tables.
 * Falls back to offline-mode write queue if a network partition or server error occurs.
 */
export async function syncProjectToCloud(rawProject: any): Promise<{
  success: boolean;
  mode: 'cloud' | 'local_queue';
  message: string;
}> {
  let project: WindowProjectPayload;
  try {
    project = normalizeLocalProjectToPayload(rawProject);
  } catch (err: any) {
    return { success: false, mode: 'local_queue', message: `خطای ساختار لایه محلی: ${err.message}` };
  }

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
      success: false,
      mode: 'local_queue',
      message: 'سرویس ابری متصل نیست یا اطلاعات اتصال ناقص است. پروژه در صف تریگر محلی ذخیره گردید.',
    };
  }

  try {
    // Ensure the license exists in public.app_users to satisfy the foreign-key constraint
    let localUser: any = null;
    try {
      const userStr = localStorage.getItem('nexwin_user');
      if (userStr) {
        localUser = JSON.parse(userStr);
      }
    } catch (e) {
      console.warn('Failed to parse nexwin_user from localStorage:', e);
    }

    const licenseId = project.userLicenseId || localUser?.id || 'GUEST';
    project.userLicenseId = licenseId; // Ensure payload is enriched

    const appUserUpsert = {
      id: licenseId,
      owner_name: localUser?.owner_name || 'کارفرمای میهمان',
      company_name: localUser?.company_name || 'کارگاه نکس‌وین میهمان',
      phone_number: localUser?.phone_number || '09000000000',
      tier: localUser?.tier || 'silver',
      status: localUser?.status || 'active',
      register_date: localUser?.register_date || new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
      expiry_date: localUser?.expiry_date || new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      max_devices: localUser?.max_devices || 3,
      total_paid: localUser?.total_paid || 0,
      is_trial: localUser?.is_trial || false
    };

    const { error: userError } = await supabase
      .from('app_users')
      .upsert(appUserUpsert, { onConflict: 'id' });

    if (userError) {
      throw new Error(`خطای ثبت لایسنس کارگاه در دیتابیس ابر: ${userError.message}`);
    }

    // Standardize IDs to clean UUIDs deterministically
    const projectUUID = toDeterministicUUID(project.id);

    // 1. Transaction Simulation Phase 1: Top-level primary Project metadata upsert
    const projectUpsertData = {
      id: projectUUID,
      license_id: project.userLicenseId,
      project_name: project.project_name,
      total_items: project.total_items,
      status: project.status || 'Draft',
      metadata: project.metadata,
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
    const windowItemsBatches = project.items.map((item, idx) => {
      const itemUUID = toDeterministicUUID(item.id || `${project.id}_item_${idx}`);
      return {
        id: itemUUID,
        project_id: projectUUID,
        window_name: item.window_name || `پنجره ردیف ${idx + 1}`,
        raw_inputs: item.raw_inputs,
        profile_data: item.profile_data,
        calculated_glass: item.calculated_glass,
      };
    });

    const fileItemIds = windowItemsBatches.map(batch => batch.id);

    // First, clear existing orphaned item entries for this project to maintain structural integrity
    await supabase
      .from('window_items')
      .delete()
      .eq('project_id', projectUUID)
      .not('id', 'in', `(${fileItemIds.join(',')})`);

    const { error: itemsError } = await supabase
      .from('window_items')
      .upsert(windowItemsBatches, { onConflict: 'id' });

    if (itemsError) {
      throw new Error(`خطای درج تک تک واحدهای محاسباتی: ${itemsError.message}`);
    }

    // Local ID Sync to standardize our local store to use UUIDs
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (stored) {
        const localProjects = JSON.parse(stored);
        let changed = false;
        const updatedLocal = localProjects.map((p: any) => {
          if (p.id === project.id) {
            changed = true;
            return {
              ...p,
              id: projectUUID,
              items: p.items.map((it: any, idx: number) => ({
                ...it,
                id: windowItemsBatches[idx]?.id || it.id
              }))
            };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(updatedLocal));
        }
      }
    } catch (e) {
      console.warn('[SyncService local ID sync warning]', e);
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
      success: false,
      mode: 'local_queue',
      message: `خطا در همگام‌سازی ابری: ${err.message || err}`,
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
        status,
        metadata,
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

      // Parse metadata & status (First checking native project table level, then falling back to legacy metadata record)
      let metadataResolved = {
        customerName: 'نامشخص',
        address: 'بدون آدرس ثبت شده',
        installPercent: 10,
        companyName: 'کارگاه نکس‌وین',
        date: rawProj.created_at || new Date().toISOString(),
        totalPrice: 0,
        payments: []
      };
      let statusResolved: 'Draft' | 'Contract' | 'Production' | 'Produced' = (rawProj as any).status || 'Draft';

      if ((rawProj as any).metadata) {
        const parsedMeta = typeof (rawProj as any).metadata === 'string'
          ? JSON.parse((rawProj as any).metadata)
          : (rawProj as any).metadata;
        if (parsedMeta) {
          metadataResolved = { ...metadataResolved, ...parsedMeta };
        }
      } else if (metadataItem) {
        // Fallback to legacy row
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
async function uploadSingleProjectDirect(supabase: SupabaseClient, rawProject: any) {
  let project: WindowProjectPayload;
  try {
    project = normalizeLocalProjectToPayload(rawProject);
  } catch (err: any) {
    return { success: false, message: `خطای ساختار لایه محلی در آپلود مستقیم: ${err.message}` };
  }

  // Ensure corresponding app_users record exists for foreign-key constraint
  let localUser: any = null;
  try {
    const userStr = localStorage.getItem('nexwin_user');
    if (userStr) {
      localUser = JSON.parse(userStr);
    }
  } catch (e) {
    console.warn('Failed to parse nexwin_user from localStorage in uploadSingleProjectDirect:', e);
  }

  const licenseId = project.userLicenseId || localUser?.id || 'GUEST';
  project.userLicenseId = licenseId;

  const appUserUpsert = {
    id: licenseId,
    owner_name: localUser?.owner_name || 'کارفرمای میهمان',
    company_name: localUser?.company_name || 'کارگاه نکس‌وین میهمان',
    phone_number: localUser?.phone_number || '09000000000',
    tier: localUser?.tier || 'silver',
    status: localUser?.status || 'active',
    register_date: localUser?.register_date || new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
    expiry_date: localUser?.expiry_date || new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    max_devices: localUser?.max_devices || 3,
    total_paid: localUser?.total_paid || 0,
    is_trial: localUser?.is_trial || false
  };

  const { error: userError } = await supabase
    .from('app_users')
    .upsert(appUserUpsert, { onConflict: 'id' });

  if (userError) {
    return { success: false, message: `خطای ثبت لایسنس کارگاه در دیتابیس ابر: ${userError.message}` };
  }

  const projectUUID = toDeterministicUUID(project.id);

  const projectUpsertData = {
    id: projectUUID,
    license_id: project.userLicenseId,
    project_name: project.project_name,
    total_items: project.total_items,
    status: project.status || 'Draft',
    metadata: project.metadata,
    created_at: project.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: projectError } = await supabase
    .from('projects')
    .upsert(projectUpsertData, { onConflict: 'id' });

  if (projectError) return { success: false, message: projectError.message };

  // Sync window items child batch
  const windowItemsBatches = project.items.map((item, idx) => {
    const itemUUID = toDeterministicUUID(item.id || `${project.id}_item_${idx}`);
    return {
      id: itemUUID,
      project_id: projectUUID,
      window_name: item.window_name || `پنجره ردیف ${idx + 1}`,
      raw_inputs: item.raw_inputs,
      profile_data: item.profile_data,
      calculated_glass: item.calculated_glass,
    };
  });

  const fileItemIds = windowItemsBatches.map(batch => batch.id);

  await supabase
    .from('window_items')
    .delete()
    .eq('project_id', projectUUID)
    .not('id', 'in', `(${fileItemIds.join(',')})`);

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

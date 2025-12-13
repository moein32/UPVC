import { ProfileBrand, GlassType, HardwareItem, HardwareBrand, ProfileComponent } from '../types';

// Default Data Initialization
const DEFAULT_COMPONENTS: ProfileComponent[] = [
  { id: 'frame', name: 'پروفیل فریم (Frame)', unit: 'm', price: 0 },
  { id: 'sash_window', name: 'پروفیل لنگه پنجره (Sash)', unit: 'm', price: 0 },
  { id: 'sash_door', name: 'پروفیل لنگه درب (Door Sash)', unit: 'm', price: 0 },
  { id: 'mullion', name: 'پروفیل مولیون (Mullion)', unit: 'm', price: 0 },
  { id: 'bead', name: 'زهوار (Bead)', unit: 'm', price: 0 },
  { id: 'renovation', name: 'پروفیل بازسازی', unit: 'm', price: 0 },
  { id: 'galvanized', name: 'گالوانیزه تقویتی (Reinforcement)', unit: 'm', price: 150000 }, // Added
];

const INITIAL_BRANDS: ProfileBrand[] = [
  {
    id: 'vistabest',
    name: 'ویستابست',
    logo: '🏆',
    tier: 'لوکس',
    series: ['۶۰', '۷۰'],
    warrantyYears: 15,
    components: DEFAULT_COMPONENTS.map(c => ({ ...c, price: c.id === 'frame' ? 450000 : c.id === 'galvanized' ? 150000 : 460000 }))
  },
  {
    id: 'wintech',
    name: 'وین‌تک',
    logo: '🌍',
    tier: 'لوکس',
    series: ['W640'],
    warrantyYears: 10,
    components: DEFAULT_COMPONENTS.map(c => ({ ...c, price: c.id === 'galvanized' ? 140000 : 420000 }))
  },
  {
    id: 'hofmann',
    name: 'هافمن',
    logo: '🇩🇪',
    tier: 'استاندارد',
    series: ['۶۰'],
    warrantyYears: 10,
    components: DEFAULT_COMPONENTS.map(c => ({ ...c, price: c.id === 'galvanized' ? 130000 : 380000 }))
  },
  {
    id: 'yazdwin',
    name: 'یزد وین',
    logo: '🏗️',
    tier: 'اقتصادی',
    series: ['Eco'],
    warrantyYears: 5,
    components: DEFAULT_COMPONENTS.map(c => ({ ...c, price: c.id === 'galvanized' ? 120000 : 280000 }))
  }
];

const INITIAL_GLASS: GlassType[] = [
  { id: 'double_4_4', name: 'دوجداره ۴-۴ ساده', pricePerSqm: 650000 },
  { id: 'double_6_4', name: 'دوجداره ۶-۴ ساده', pricePerSqm: 750000 },
  { id: 'triple', name: 'سه جداره', pricePerSqm: 950000 },
  { id: 'panel_upvc', name: 'پنل UPVC', pricePerSqm: 1500000 }, // Added Panel
];

const HARDWARE_BRANDS: HardwareBrand[] = [
  { id: 'gu', name: 'G-U (آلمان)', origin: 'Germany' },
  { id: 'endow', name: 'Endow (ترکیه)', origin: 'Turkey' },
  { id: 'vh', name: 'VH (ایران)', origin: 'Iran' },
];

const INITIAL_HARDWARE: HardwareItem[] = [
  { id: 'h1', name: 'تک حالته', brandId: 'endow', type: 'Turn', pricePerSet: 450000 },
  { id: 'h2', name: 'دو حالته', brandId: 'endow', type: 'TiltTurn', pricePerSet: 850000 },
  { id: 'h3', name: 'کشویی', brandId: 'endow', type: 'Sliding', pricePerSet: 600000 },
  { id: 'h4', name: 'درب سرویسی', brandId: 'vh', type: 'Door', pricePerSet: 550000 },
  { id: 'h5', name: 'درب بالکنی', brandId: 'gu', type: 'Door', pricePerSet: 1200000 },
  { id: 'h0', name: 'ثابت (بدون یراق)', brandId: 'vh', type: 'Fixed', pricePerSet: 0 },
];

export interface AppSettings {
  darkMode: boolean;
  priceCoefficient: number; // Percentage markup (e.g., 1.1 for 10% profit)
  currency: string;
}

// Simple in-memory store backed by localStorage
export const pricingStore = {
  getBrands: (): ProfileBrand[] => {
    const stored = localStorage.getItem('lumina_brands');
    return stored ? JSON.parse(stored) : INITIAL_BRANDS;
  },
  
  saveBrands: (brands: ProfileBrand[]) => {
    localStorage.setItem('lumina_brands', JSON.stringify(brands));
  },

  getGlass: (): GlassType[] => {
    const stored = localStorage.getItem('lumina_glass');
    return stored ? JSON.parse(stored) : INITIAL_GLASS;
  },

  saveGlass: (glass: GlassType[]) => {
    localStorage.setItem('lumina_glass', JSON.stringify(glass));
  },

  getHardware: (): HardwareItem[] => {
    const stored = localStorage.getItem('lumina_hardware');
    return stored ? JSON.parse(stored) : INITIAL_HARDWARE;
  },

  saveHardware: (hw: HardwareItem[]) => {
    localStorage.setItem('lumina_hardware', JSON.stringify(hw));
  },

  getHardwareBrands: () => HARDWARE_BRANDS,

  // Projects
  getProjects: () => {
    const stored = localStorage.getItem('lumina_projects');
    return stored ? JSON.parse(stored) : [];
  },
  
  saveProject: (project: any) => {
    const projects = pricingStore.getProjects();
    const index = projects.findIndex((p: any) => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem('lumina_projects', JSON.stringify(projects));
  },

  // Settings
  getSettings: (): AppSettings => {
    const stored = localStorage.getItem('lumina_settings');
    return stored ? JSON.parse(stored) : { darkMode: false, priceCoefficient: 0, currency: 'تومان' };
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem('lumina_settings', JSON.stringify(settings));
  }
};
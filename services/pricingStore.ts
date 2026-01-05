
import { ProfileBrand, GlassType, HardwareItem, HardwareBrand, ProfileComponent, AppSettings, SavedProject } from '../types';

const DEFAULT_COMPONENTS: ProfileComponent[] = [
  { id: 'frame', name: 'پروفیل فریم (Frame)', unit: 'm', price: 0 },
  { id: 'sash_window', name: 'پروفیل لنگه پنجره (Sash)', unit: 'm', price: 0 },
  { id: 'sash_door', name: 'پروفیل لنگه درب (Door Sash)', unit: 'm', price: 0 },
  { id: 'mullion', name: 'پروفیل مولیون (Mullion)', unit: 'm', price: 0 },
  { id: 'bead', name: 'زهوار (Bead)', unit: 'm', price: 0 },
  { id: 'renovation', name: 'پروفیل بازسازی', unit: 'm', price: 0 },
  { id: 'galvanized', name: 'گالوانیزه تقویتی (Reinforcement)', unit: 'm', price: 150000 },
];

const INITIAL_BRANDS: ProfileBrand[] = [
  {
    id: 'vistabest',
    name: 'ویستابست',
    logo: '🏆',
    tier: 'لوکس',
    series: ['۶۰', '۷۰'],
    warrantyYears: 15,
    components: DEFAULT_COMPONENTS.map(c => ({ 
        ...c, 
        price: c.id === 'frame' ? 450000 : 
               c.id === 'galvanized' ? 150000 : 
               c.id === 'bead' ? 60000 : 
               460000 
    }))
  },
  {
    id: 'wintech',
    name: 'وین‌تک',
    logo: '🌍',
    tier: 'لوکس',
    series: ['W640'],
    warrantyYears: 10,
    components: DEFAULT_COMPONENTS.map(c => ({ 
        ...c, 
        price: c.id === 'galvanized' ? 140000 : 
               c.id === 'bead' ? 55000 : 
               420000 
    }))
  },
  {
    id: 'hofmann',
    name: 'هافمن',
    logo: '🇩🇪',
    tier: 'استاندارد',
    series: ['۶۰'],
    warrantyYears: 10,
    components: DEFAULT_COMPONENTS.map(c => ({ 
        ...c, 
        price: c.id === 'galvanized' ? 130000 : 
               c.id === 'bead' ? 50000 : 
               380000 
    }))
  },
  {
    id: 'yazdwin',
    name: 'یزد وین',
    logo: '🏗️',
    tier: 'اقتصادی',
    series: ['Eco'],
    warrantyYears: 5,
    components: DEFAULT_COMPONENTS.map(c => ({ 
        ...c, 
        price: c.id === 'galvanized' ? 120000 : 
               c.id === 'bead' ? 40000 : 
               280000 
    }))
  }
];

const INITIAL_GLASS: GlassType[] = [
  { id: 'double_4_4', name: 'دوجداره ۴-۴ ساده', pricePerSqm: 650000 },
  { id: 'double_6_4', name: 'دوجداره ۶-۴ ساده', pricePerSqm: 750000 },
  { id: 'triple', name: 'سه جداره', pricePerSqm: 950000 },
];

const HARDWARE_BRANDS: HardwareBrand[] = [
  { id: 'gu', name: 'G-U (آلمان)', origin: 'Germany' },
  { id: 'endow', name: 'Endow (ترکیه)', origin: 'Turkey' },
  { id: 'vh', name: 'VH (ایران)', origin: 'Iran' },
  { id: 'vorne', name: 'Vorne (ترکیه)', origin: 'Turkey' },
  { id: 'accado', name: 'Accado (ترکیه)', origin: 'Turkey' }
];

const INITIAL_HARDWARE: HardwareItem[] = [
  { id: 'h1', name: 'تک حالته', brandId: 'endow', type: 'Turn', pricePerSet: 450000 },
  { id: 'h2', name: 'دو حالته', brandId: 'endow', type: 'TiltTurn', pricePerSet: 850000 },
  { id: 'h3', name: 'کشویی', brandId: 'endow', type: 'Sliding', pricePerSet: 600000 },
  { id: 'h4', name: 'درب سرویسی', brandId: 'vh', type: 'Door', pricePerSet: 550000 },
  { id: 'h5', name: 'درب بالکنی', brandId: 'gu', type: 'Door', pricePerSet: 1200000 },
  { id: 'h0', name: 'ثابت (بدون یراق)', brandId: 'vh', type: 'Fixed', pricePerSet: 0 },
  { id: 'panel_upvc', name: 'پنل UPVC (متر مربع)', brandId: 'vh', type: 'Fixed', pricePerSet: 1500000 },
];

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  priceCoefficient: 0,
  currency: 'تومان',
  invoice: {
    companyName: 'گروه صنعتی نکس‌وین (NexWin)',
    companyLogo: '',
    companyAddress: 'تهران، میدان آزادی',
    companyPhone: '021-12345678',
    footerNote: 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد.',
    layoutType: 'standard' 
  }
};

const DEFAULT_PROJECT: SavedProject = {
  id: 'nexwin-demo-v4', 
  customerName: 'نمایشگاه مرکزی نکس‌وین',
  address: 'تهران، بزرگراه ستاری، مجتمع کوروش، طبقه تجاری',
  installPercent: 12,
  companyName: 'گروه صنعتی نکس‌وین (NexWin)',
  date: new Date().toISOString(),
  status: 'Contract',
  defaultProfileId: 'vistabest',
  totalPrice: 42850000, 
  payments: [],
  items: [
    {
      id: 'demo-item-1',
      config: {
        id: 'conf-d1', width: 1500, height: 1200, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h0', type: 'پنجره دو لنگه ثابت', mullions: 1, frameType: 'standard',
        layout: { id: 'root1', type: 'container', dir: 'row', flex: 1, children: [{id:'c1-1', type:'leaf', openingType:'Fixed', flex:1}, {id:'c1-2', type:'leaf', openingType:'Fixed', flex:1}] }
      },
      quantity: 3,
      calculations: {
        profileMeters: 6.9, profilePrice: 3800000, glassArea: 1.8, glassPrice: 1170000, sashCount: 0, hardwarePrice: 0, totalPrice: 4970000, unitPrice: 4970000,
        details: [
          { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 5.4, unitPrice: 450000, totalPrice: 2430000 },
          { rowId: 2, name: 'پروفیل مولیون (وادار)', unit: 'متر طول', quantity: 1.5, unitPrice: 460000, totalPrice: 690000 },
          { rowId: 3, name: 'زهوار دوجداره', unit: 'متر طول', quantity: 6.9, unitPrice: 60000, totalPrice: 414000 },
          { rowId: 4, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: 6.9, unitPrice: 150000, totalPrice: 1035000 },
          { rowId: 5, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 1.8, unitPrice: 650000, totalPrice: 1170000 }
        ]
      }
    }
  ]
};

export const pricingStore = {
  getBrands: (): ProfileBrand[] => {
    const stored = localStorage.getItem('lumina_brands');
    return stored ? JSON.parse(stored) : INITIAL_BRANDS;
  },
  
  saveBrands: (brands: ProfileBrand[]) => {
    localStorage.setItem('lumina_brands', JSON.stringify(brands));
  },

  addBrand: (brand: ProfileBrand) => {
    const brands = pricingStore.getBrands();
    if (!brand.components || brand.components.length === 0) {
        brand.components = DEFAULT_COMPONENTS.map(c => ({...c, price: 0}));
    }
    brands.push(brand);
    localStorage.setItem('lumina_brands', JSON.stringify(brands));
  },
  
  deleteBrand: (id: string) => {
    const brands = pricingStore.getBrands().filter(b => b.id !== id);
    localStorage.setItem('lumina_brands', JSON.stringify(brands));
  },

  getGlass: (): GlassType[] => {
    const stored = localStorage.getItem('lumina_glass');
    return stored ? JSON.parse(stored) : INITIAL_GLASS;
  },

  saveGlass: (glass: GlassType[]) => {
    localStorage.setItem('lumina_glass', JSON.stringify(glass));
  },

  // Fix: Added missing addGlass method
  addGlass: (item: GlassType) => {
    const glass = pricingStore.getGlass();
    glass.push(item);
    pricingStore.saveGlass(glass);
  },

  // Fix: Added missing deleteGlass method
  deleteGlass: (id: string) => {
    const glass = pricingStore.getGlass().filter(g => g.id !== id);
    pricingStore.saveGlass(glass);
  },

  getHardware: (): HardwareItem[] => {
    const stored = localStorage.getItem('lumina_hardware');
    return stored ? JSON.parse(stored) : INITIAL_HARDWARE;
  },

  saveHardware: (hw: HardwareItem[]) => {
    localStorage.setItem('lumina_hardware', JSON.stringify(hw));
  },

  // Fix: Added missing getHardwareBrands method
  getHardwareBrands: (): HardwareBrand[] => {
    return HARDWARE_BRANDS;
  },

  // Fix: Added missing addHardware method
  addHardware: (item: HardwareItem) => {
    const hw = pricingStore.getHardware();
    hw.push(item);
    pricingStore.saveHardware(hw);
  },

  // Fix: Added missing deleteHardware method
  deleteHardware: (id: string) => {
    const hw = pricingStore.getHardware().filter(h => h.id !== id);
    pricingStore.saveHardware(hw);
  },

  getProjects: (): SavedProject[] => {
    const stored = localStorage.getItem('lumina_projects');
    let projects: SavedProject[] = stored ? JSON.parse(stored) : [];
    
    const demoExists = projects.some(p => p.id === DEFAULT_PROJECT.id);
    if (!demoExists) {
        // Return with demo unshifted but don't force write back every time unless necessary
        return [DEFAULT_PROJECT, ...projects];
    }
    return projects;
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

  getSettings: (): AppSettings => {
    const stored = localStorage.getItem('lumina_settings');
    const parsed = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed, invoice: { ...DEFAULT_SETTINGS.invoice, ...(parsed.invoice || {}) } };
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem('lumina_settings', JSON.stringify(settings));
  }
};

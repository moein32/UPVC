
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
    companyName: 'گروه صنعتی لومینا',
    companyLogo: '',
    companyAddress: 'تهران، میدان آزادی',
    companyPhone: '021-12345678',
    footerNote: 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد.',
    layoutType: 'standard' 
  }
};

const DEFAULT_PROJECT: SavedProject = {
  id: 'demo-project-v3', // Incremented ID to force fresh demo for users
  customerName: 'پروژه نمونه (تست نهایی)',
  address: 'تهران، سعادت آباد، بلوار دریا',
  installPercent: 10,
  companyName: 'گروه صنعتی لومینا',
  date: new Date().toISOString(),
  status: 'Draft',
  defaultProfileId: 'vistabest',
  totalPrice: 20437500, 
  payments: [],
  items: [
    {
      id: 'item-demo-1',
      config: {
        id: 'conf-1', width: 1500, height: 1500, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h1', type: 'Fixed', mullions: 0, frameType: 'standard',
        layout: { id: 'root', type: 'leaf', openingType: 'Fixed', flex: 1 }
      },
      calculations: {
        profileMeters: 6, profilePrice: 3000000, glassArea: 2.25, glassPrice: 1462500, sashCount: 0, hardwarePrice: 0, totalPrice: 4462500, unitPrice: 4462500,
        details: [
          { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 6, unitPrice: 450000, totalPrice: 2700000 },
          { rowId: 2, name: 'زهوار دوجداره', unit: 'متر طول', quantity: 6, unitPrice: 60000, totalPrice: 360000 },
          { rowId: 3, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: 6, unitPrice: 150000, totalPrice: 900000 },
          { rowId: 4, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 2.25, unitPrice: 650000, totalPrice: 1462500 }
        ]
      }
    },
    {
      id: 'item-demo-2',
      config: {
        id: 'conf-2', width: 2000, height: 1500, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h1', type: 'Custom', mullions: 1, frameType: 'standard',
        layout: {
            id: 'root', type: 'container', dir: 'row', 
            children: [
                { id: 'c1', type: 'leaf', openingType: 'TurnRight', flex: 1 },
                { id: 'c2', type: 'leaf', openingType: 'TiltTurnLeft', flex: 1 }
            ]
        }
      },
      calculations: {
        profileMeters: 12, profilePrice: 6000000, glassArea: 2.5, glassPrice: 1625000, sashCount: 2, hardwarePrice: 1300000, totalPrice: 8925000, unitPrice: 8925000,
        details: [
             { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 7, unitPrice: 450000, totalPrice: 3150000 },
             { rowId: 2, name: 'پروفیل لنگه پنجره', unit: 'متر طول', quantity: 8, unitPrice: 460000, totalPrice: 3680000 },
             { rowId: 3, name: 'پروفیل مولیون', unit: 'متر طول', quantity: 1.5, unitPrice: 460000, totalPrice: 690000 },
             { rowId: 4, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: 16.5, unitPrice: 150000, totalPrice: 2475000 },
             { rowId: 5, name: 'زهوار شیشه', unit: 'متر طول', quantity: 16, unitPrice: 60000, totalPrice: 960000 },
             { rowId: 6, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 2.5, unitPrice: 650000, totalPrice: 1625000 },
             { rowId: 7, name: 'یراق تک حالته', unit: 'دست', quantity: 1, unitPrice: 450000, totalPrice: 450000 },
             { rowId: 8, name: 'یراق دو حالته', unit: 'دست', quantity: 1, unitPrice: 850000, totalPrice: 850000 }
        ]
      }
    },
    {
      id: 'item-demo-3',
      config: {
        id: 'conf-3', width: 900, height: 2100, profileId: 'wintech', glassId: 'double_4_4', hardwareId: 'h5', type: 'Door', mullions: 0, frameType: 'standard',
        layout: { id: 'root', type: 'leaf', openingType: 'DoorRight', flex: 1 }
      },
      calculations: {
        profileMeters: 6, profilePrice: 4000000, glassArea: 1.5, glassPrice: 975000, sashCount: 1, hardwarePrice: 1200000, totalPrice: 6175000, unitPrice: 6175000,
        details: [
            { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 6, unitPrice: 420000, totalPrice: 2520000 },
            { rowId: 2, name: 'پروفیل لنگه درب', unit: 'متر طول', quantity: 6, unitPrice: 420000, totalPrice: 2520000 },
            { rowId: 3, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: 12, unitPrice: 140000, totalPrice: 1680000 },
            { rowId: 4, name: 'زهوار شیشه', unit: 'متر طول', quantity: 6, unitPrice: 55000, totalPrice: 330000 },
            { rowId: 5, name: 'شیشه دوجداره', unit: 'متر مربع', quantity: 1.5, unitPrice: 650000, totalPrice: 975000 },
            { rowId: 6, name: 'یراق درب سوئیچی', unit: 'دست', quantity: 1, unitPrice: 1200000, totalPrice: 1200000 }
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

  addGlass: (newItem: GlassType) => {
    const list = pricingStore.getGlass();
    list.push(newItem);
    localStorage.setItem('lumina_glass', JSON.stringify(list));
  },
  
  deleteGlass: (id: string) => {
    const list = pricingStore.getGlass().filter(i => i.id !== id);
    localStorage.setItem('lumina_glass', JSON.stringify(list));
  },

  getHardware: (): HardwareItem[] => {
    const stored = localStorage.getItem('lumina_hardware');
    return stored ? JSON.parse(stored) : INITIAL_HARDWARE;
  },

  saveHardware: (hw: HardwareItem[]) => {
    localStorage.setItem('lumina_hardware', JSON.stringify(hw));
  },
  
  addHardware: (newItem: HardwareItem) => {
    const list = pricingStore.getHardware();
    list.push(newItem);
    localStorage.setItem('lumina_hardware', JSON.stringify(list));
  },

  deleteHardware: (id: string) => {
    const list = pricingStore.getHardware().filter(i => i.id !== id);
    localStorage.setItem('lumina_hardware', JSON.stringify(list));
  },

  getHardwareBrands: () => HARDWARE_BRANDS,

  getProjects: (): SavedProject[] => {
    const stored = localStorage.getItem('lumina_projects');
    let projects: SavedProject[] = stored ? JSON.parse(stored) : [];
    
    // Check if demo project exists or needs updating
    const demoExists = projects.some(p => p.id === DEFAULT_PROJECT.id);
    if (!demoExists) {
        // Remove old demo projects to keep it clean
        projects = projects.filter(p => !p.id.startsWith('demo-project'));
        projects.unshift(DEFAULT_PROJECT);
        localStorage.setItem('lumina_projects', JSON.stringify(projects));
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

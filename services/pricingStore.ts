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
    },
    {
      id: 'demo-item-2',
      config: {
        id: 'conf-d2', width: 800, height: 1400, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h1', type: 'پنجره تک لنگه بازشو با کتیبه', mullions: 1, frameType: 'standard',
        layout: { id: 'root2', type: 'container', dir: 'col', flex: 1, children: [{id:'c2-1', type:'leaf', openingType:'Fixed', flex:400}, {id:'c2-2', type:'leaf', openingType:'TurnRight', flex:1000}] }
      },
      quantity: 5,
      calculations: {
        profileMeters: 8.8, profilePrice: 4800000, glassArea: 1.12, glassPrice: 728000, sashCount: 1, hardwarePrice: 450000, totalPrice: 5978000, unitPrice: 5978000,
        details: [
          { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 4.4, unitPrice: 450000, totalPrice: 1980000 },
          { rowId: 2, name: 'پروفیل لنگه پنجره', unit: 'متر طول', quantity: 3.6, unitPrice: 460000, totalPrice: 1656000 },
          { rowId: 3, name: 'پروفیل مولیون', unit: 'متر طول', quantity: 0.8, unitPrice: 460000, totalPrice: 368000 },
          { rowId: 4, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 1.12, unitPrice: 650000, totalPrice: 728000 },
          { rowId: 5, name: 'یراق تک حالته', unit: 'دست', quantity: 1, unitPrice: 450000, totalPrice: 450000 }
        ]
      }
    },
    {
      id: 'demo-item-3',
      config: {
        id: 'conf-d3', width: 900, height: 2200, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h5', type: 'درب بالکنی با مولیون افقی', mullions: 1, frameType: 'standard',
        layout: { id: 'root3', type: 'container', dir: 'col', openingType: 'DoorRight', flex: 1, children: [{id:'c3-1', type:'leaf', openingType:'Fixed', flex:1400}, {id:'c3-2', type:'leaf', openingType:'Fixed', flex:800}] }
      },
      quantity: 2,
      calculations: {
        profileMeters: 13.3, profilePrice: 7200000, glassArea: 1.98, glassPrice: 1287000, sashCount: 1, hardwarePrice: 1200000, totalPrice: 9687000, unitPrice: 9687000,
        details: [
          { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 6.2, unitPrice: 450000, totalPrice: 2790000 },
          { rowId: 2, name: 'پروفیل لنگه درب', unit: 'متر طول', quantity: 6.2, unitPrice: 480000, totalPrice: 2976000 },
          { rowId: 3, name: 'پروفیل مولیون', unit: 'متر طول', quantity: 0.9, unitPrice: 460000, totalPrice: 414000 },
          { rowId: 4, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 1.98, unitPrice: 650000, totalPrice: 1287000 },
          { rowId: 5, name: 'یراق درب بالکنی', unit: 'دست', quantity: 1, unitPrice: 1200000, totalPrice: 1200000 }
        ]
      }
    },
    {
      id: 'demo-item-4',
      config: {
        id: 'conf-d4', width: 2400, height: 1500, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h2', type: 'پنجره سه لنگه (وسط دوحالته)', mullions: 2, frameType: 'standard',
        layout: { id: 'root4', type: 'container', dir: 'row', flex: 1, children: [{id:'c4-1', type:'leaf', openingType:'Fixed', flex:1}, {id:'c4-2', type:'leaf', openingType:'TiltTurnRight', flex:1}, {id:'c4-3', type:'leaf', openingType:'Fixed', flex:1}] }
      },
      quantity: 4,
      calculations: {
        profileMeters: 15.4, profilePrice: 8400000, glassArea: 3.6, glassPrice: 2340000, sashCount: 1, hardwarePrice: 850000, totalPrice: 11590000, unitPrice: 11590000,
        details: [
          { rowId: 1, name: 'پروفیل فریم', unit: 'متر طول', quantity: 7.8, unitPrice: 450000, totalPrice: 3510000 },
          { rowId: 2, name: 'پروفیل مولیون', unit: 'متر طول', quantity: 3.0, unitPrice: 460000, totalPrice: 138000 },
          { rowId: 3, name: 'پروفیل لنگه پنجره', unit: 'متر طول', quantity: 4.6, unitPrice: 460000, totalPrice: 2116000 },
          { rowId: 4, name: 'شیشه دوجداره ۴-۴', unit: 'متر مربع', quantity: 3.6, unitPrice: 650000, totalPrice: 2340000 },
          { rowId: 5, name: 'یراق دو حالته', unit: 'دست', quantity: 1, unitPrice: 850000, totalPrice: 850000 }
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
    
    const demoExists = projects.some(p => p.id === DEFAULT_PROJECT.id);
    if (!demoExists) {
        // Keep the demo at the top but avoid duplicates from older versions
        projects = projects.filter(p => !p.id.startsWith('demo-project') && p.id !== 'nexwin-demo-v4');
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
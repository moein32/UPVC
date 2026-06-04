
import { ProfileBrand, GlassType, HardwareItem, HardwareBrand, ProfileComponent, AppSettings, SavedProject } from '../types';

const DEFAULT_COMPONENTS: ProfileComponent[] = [
  { id: 'frame', name: 'پروفیل فریم (Frame)', unit: 'm', price: 0 },
  { id: 'monorail_frame', name: 'پروفیل فریم تک‌ریل (Monorail)', unit: 'm', price: 0 },
  { id: 'sash_window', name: 'پروفیل لنگه پنجره (Sash)', unit: 'm', price: 0 },
  { id: 'sash_door', name: 'پروفیل لنگه درب (Door Sash)', unit: 'm', price: 0 },
  { id: 'mullion', name: 'پروفیل مولیون (Mullion)', unit: 'm', price: 0 },
  { id: 'floating_mullion', name: 'مولیون متحرک (French Mullion)', unit: 'm', price: 0 },
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
               c.id === 'monorail_frame' ? 620000 :
               c.id === 'floating_mullion' ? 510000 :
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
        price: c.id === 'monorail_frame' ? 580000 :
               c.id === 'floating_mullion' ? 480000 :
               c.id === 'galvanized' ? 140000 : 
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
        price: c.id === 'monorail_frame' ? 520000 :
               c.id === 'floating_mullion' ? 440000 :
               c.id === 'galvanized' ? 130000 : 
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
        price: c.id === 'monorail_frame' ? 380000 :
               c.id === 'floating_mullion' ? 320000 :
               c.id === 'galvanized' ? 120000 : 
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
  id: 'nexwin-demo-v5', 
  customerName: 'واحد کنترل کیفیت نکس‌وین',
  address: 'تهران، بلوار اصلی، پروژه نمونه نوسازی نکس‌وین',
  installPercent: 12,
  companyName: 'گروه صنعتی نکس‌وین (NexWin)',
  date: new Date().toISOString(),
  status: 'Contract',
  defaultProfileId: 'vistabest',
  totalPrice: 128450000, 
  payments: [],
  items: [
    {
      id: 'demo-item-1',
      config: {
        id: 'conf-d1', width: 1600, height: 1800, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h1', type: 'دو لنگه با کتیبه بالا', mullions: 2, frameType: 'standard',
        layout: { 
            id: 'root1', type: 'container', dir: 'col', flex: 1, 
            children: [
                { id: 'top', type: 'leaf', openingType: 'Fixed', flex: 0.38 },
                { id: 'bottom', type: 'container', dir: 'row', flex: 1, children: [
                    { id: 'b1', type: 'leaf', openingType: 'Fixed', flex: 1 },
                    { id: 'b2', type: 'leaf', openingType: 'TurnRight', flex: 1 }
                ]}
            ]
        }
      },
      quantity: 3,
      calculations: {
        profileMeters: 10.4, profilePrice: 5800000, glassArea: 2.8, glassPrice: 1820000, sashCount: 1, hardwarePrice: 450000, totalPrice: 8070000, unitPrice: 8070000,
        details: [
            { rowId: 1, name: 'پروفیل فریم استاندارد', unit: 'متر', quantity: 6.8, unitPrice: 450000, totalPrice: 3060000 },
            { rowId: 2, name: 'پروفیل مولیون (وادار)', unit: 'متر', quantity: 3.6, unitPrice: 460000, totalPrice: 1656000 },
            { rowId: 3, name: 'پروفیل سش (Sash) بازشو', unit: 'متر', quantity: 4.8, unitPrice: 460000, totalPrice: 2208000 },
            { rowId: 4, name: 'زهوار (Beading) پروفیل', unit: 'متر', quantity: 12.4, unitPrice: 60000, totalPrice: 744000 },
            { rowId: 5, name: 'شیشه دوجداره ۴-۴ ساده', unit: 'متر مربع', quantity: 2.8, unitPrice: 650000, totalPrice: 1820000 },
            { rowId: 6, name: 'یراق تک‌حالته برند Endow', unit: 'دست', quantity: 1, unitPrice: 450000, totalPrice: 450000 },
            { rowId: 7, name: 'گالوانیزه و متعلقات فنی', unit: 'متر', quantity: 10.4, unitPrice: 150000, totalPrice: 1560000 }
        ]
      }
    },
    {
      id: 'demo-item-2',
      config: {
        id: 'conf-d2', width: 2100, height: 1400, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h2', type: 'سه لنگه (وسط بازشو دوحالته)', mullions: 2, frameType: 'standard',
        layout: { 
            id: 'root2', type: 'container', dir: 'row', flex: 1, 
            children: [
                { id: 'l1', type: 'leaf', openingType: 'Fixed', flex: 1 },
                { id: 'l2', type: 'leaf', openingType: 'TiltTurnRight', flex: 1 },
                { id: 'l3', type: 'leaf', openingType: 'Fixed', flex: 1 }
            ]
        }
      },
      quantity: 2,
      calculations: {
        profileMeters: 12.8, profilePrice: 6500000, glassArea: 2.9, glassPrice: 1885000, sashCount: 1, hardwarePrice: 850000, totalPrice: 9235000, unitPrice: 9235000,
        details: [
            { rowId: 1, name: 'پروفیل فریم ویستابست', unit: 'متر', quantity: 7.0, unitPrice: 450000, totalPrice: 3150000 },
            { rowId: 2, name: 'پروفیل مولیون عمودی', unit: 'متر', quantity: 2.8, unitPrice: 460000, totalPrice: 1288000 },
            { rowId: 3, name: 'پروفیل سش (Sash) میانی', unit: 'متر', quantity: 4.2, unitPrice: 460000, totalPrice: 1932000 },
            { rowId: 4, name: 'زهوار دکوراتیو پروفیل', unit: 'متر', quantity: 14.8, unitPrice: 60000, totalPrice: 888000 },
            { rowId: 5, name: 'شیشه دوجداره ۴-۴ صنعتی', unit: 'متر مربع', quantity: 2.9, unitPrice: 650000, totalPrice: 1885000 },
            { rowId: 6, name: 'یراق دوحالته برند Endow', unit: 'دست', quantity: 1, unitPrice: 850000, totalPrice: 850000 },
            { rowId: 7, name: 'گالوانیزه تقویتی داخلی', unit: 'متر', quantity: 12.8, unitPrice: 150000, totalPrice: 1920000 }
        ]
      }
    },
    {
      id: 'demo-item-3',
      config: {
        id: 'conf-d3', width: 900, height: 2100, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h5', type: 'درب تراس (سنگین با پنل)', mullions: 1, frameType: 'standard',
        layout: { 
            id: 'root3', type: 'container', dir: 'col', flex: 1, openingType: 'DoorRight',
            children: [
                { id: 'd-top', type: 'leaf', openingType: 'Fixed', flex: 1.4 },
                { id: 'd-bot', type: 'leaf', openingType: 'PanelH', flex: 1 }
            ]
        }
      },
      quantity: 1,
      calculations: {
        profileMeters: 8.5, profilePrice: 5200000, glassArea: 1.2, glassPrice: 2200000, sashCount: 1, hardwarePrice: 1200000, totalPrice: 8600000, unitPrice: 8600000,
        details: [
            { rowId: 1, name: 'پروفیل فریم درب نوسازی', unit: 'متر', quantity: 6.0, unitPrice: 450000, totalPrice: 2700000 },
            { rowId: 2, name: 'پروفیل سش (Sash) درب سنگین', unit: 'متر', quantity: 6.0, unitPrice: 460000, totalPrice: 2760000 },
            { rowId: 3, name: 'زهوار (Beading) پنل و شیشه', unit: 'متر', quantity: 8.2, unitPrice: 60000, totalPrice: 492000 },
            { rowId: 4, name: 'پنل UPVC فشرده (ساندویچ)', unit: 'متر مربع', quantity: 0.8, unitPrice: 1500000, totalPrice: 1200000 },
            { rowId: 5, name: 'شیشه دوجداره سکوریت شده', unit: 'متر مربع', quantity: 1.1, unitPrice: 650000, totalPrice: 715000 },
            { rowId: 6, name: 'یراق درب بالکنی برند G-U', unit: 'دست', quantity: 1, unitPrice: 1200000, totalPrice: 1200000 },
            { rowId: 7, name: 'گالوانیزه و متعلقات درب', unit: 'متر', quantity: 12.0, unitPrice: 150000, totalPrice: 1800000 }
        ]
      }
    },
    {
      id: 'demo-item-4',
      config: {
        id: 'conf-d4', width: 600, height: 600, profileId: 'wintech', glassId: 'double_4_4', hardwareId: 'h1', type: 'پنجره تک لنگه سرویس (کلنگی)', mullions: 0, frameType: 'standard',
        layout: { id: 'root4', type: 'leaf', openingType: 'TiltTurnRight', flex: 1 }
      },
      quantity: 4,
      calculations: {
        profileMeters: 4.8, profilePrice: 2200000, glassArea: 0.36, glassPrice: 234000, sashCount: 1, hardwarePrice: 450000, totalPrice: 2884000, unitPrice: 2884000,
        details: [
            { rowId: 1, name: 'پروفیل فریم وین‌تک W640', unit: 'متر', quantity: 2.4, unitPrice: 420000, totalPrice: 1008000 },
            { rowId: 2, name: 'پروفیل سش (Sash) پنجره', unit: 'متر', quantity: 2.4, unitPrice: 420000, totalPrice: 1008000 },
            { rowId: 3, name: 'زهوار (Beading) استاندارد', unit: 'متر', quantity: 2.4, unitPrice: 55000, totalPrice: 132000 },
            { rowId: 4, name: 'شیشه دوجداره مشجر برفی', unit: 'متر مربع', quantity: 0.36, unitPrice: 650000, totalPrice: 234000 },
            { rowId: 5, name: 'یراق کلنگی برند Endow', unit: 'دست', quantity: 1, unitPrice: 450000, totalPrice: 450000 },
            { rowId: 6, name: 'گالوانیزه تقویتی سرویسی', unit: 'متر', quantity: 4.8, unitPrice: 140000, totalPrice: 672000 }
        ]
      }
    },
    {
      id: 'demo-item-5',
      config: {
        id: 'conf-d5', width: 1200, height: 2400, profileId: 'vistabest', glassId: 'double_6_4', hardwareId: 'h0', type: 'پنجره قدی ثابت (ویترینی)', mullions: 0, frameType: 'standard',
        layout: { id: 'root5', type: 'leaf', openingType: 'Fixed', flex: 1 }
      },
      quantity: 2,
      calculations: {
        profileMeters: 7.2, profilePrice: 3240000, glassArea: 2.88, glassPrice: 2160000, sashCount: 0, hardwarePrice: 0, totalPrice: 5400000, unitPrice: 5400000,
        details: [
            { rowId: 1, name: 'پروفیل فریم ویستابست ۷۰', unit: 'متر', quantity: 7.2, unitPrice: 450000, totalPrice: 3240000 },
            { rowId: 2, name: 'زهوار (Beading) دوجداره', unit: 'متر', quantity: 7.2, unitPrice: 60000, totalPrice: 432000 },
            { rowId: 3, name: 'شیشه ۶-۴ دوجداره صنعتی', unit: 'متر مربع', quantity: 2.88, unitPrice: 750000, totalPrice: 2160000 },
            { rowId: 4, name: 'گالوانیزه صنعتی ۲ میلی‌متر', unit: 'متر', quantity: 7.2, unitPrice: 180000, totalPrice: 1296000 }
        ]
      }
    },
    {
      id: 'demo-item-6',
      config: {
        id: 'conf-d6', width: 1400, height: 2200, profileId: 'vistabest', glassId: 'double_4_4', hardwareId: 'h5', type: 'درب فرانسوی (بدون ستون وسط)', mullions: 1, frameType: 'standard',
        layout: { 
            id: 'root6', type: 'container', dir: 'row', flex: 1, 
            children: [
                { id: 'f1', type: 'leaf', openingType: 'DoorLeft', flex: 1 },
                { id: 'f2', type: 'leaf', openingType: 'DoorRight', flex: 1 }
            ]
        }
      },
      quantity: 1,
      calculations: {
        profileMeters: 14.2, profilePrice: 7800000, glassArea: 3.0, glassPrice: 1950000, sashCount: 2, hardwarePrice: 2400000, totalPrice: 12150000, unitPrice: 12150000,
        details: [
            { rowId: 1, name: 'پروفیل فریم درب عریض', unit: 'متر', quantity: 7.2, unitPrice: 450000, totalPrice: 3240000 },
            { rowId: 2, name: 'پروفیل مولیون متحرک (Floating)', unit: 'متر', quantity: 2.2, unitPrice: 460000, totalPrice: 1012000 },
            { rowId: 3, name: 'پروفیل سش (Sash) درب دو عدد', unit: 'متر', quantity: 14.4, unitPrice: 460000, totalPrice: 6624000 },
            { rowId: 4, name: 'زهوار (Beading) پروفیل', unit: 'متر', quantity: 14.4, unitPrice: 60000, totalPrice: 864000 },
            { rowId: 5, name: 'شیشه دوجداره سکوریت ۶-۴', unit: 'متر مربع', quantity: 3.0, unitPrice: 650000, totalPrice: 1950000 },
            { rowId: 6, name: 'یراق فرانسوی برند G-U آلمان', unit: 'دست', quantity: 2, unitPrice: 1200000, totalPrice: 2400000 },
            { rowId: 7, name: 'گالوانیزه تقویتی ۲ میل', unit: 'متر', quantity: 23.8, unitPrice: 160000, totalPrice: 3808000 }
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

  addGlass: (item: GlassType) => {
    const glass = pricingStore.getGlass();
    glass.push(item);
    pricingStore.saveGlass(glass);
  },

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

  getHardwareBrands: (): HardwareBrand[] => {
    return HARDWARE_BRANDS;
  },

  addHardware: (item: HardwareItem) => {
    const hw = pricingStore.getHardware();
    hw.push(item);
    pricingStore.saveHardware(hw);
  },

  deleteHardware: (id: string) => {
    const hw = pricingStore.getHardware().filter(h => h.id !== id);
    pricingStore.saveHardware(hw);
  },

  getProjects: (): SavedProject[] => {
    const stored = localStorage.getItem('lumina_projects');
    let projects: SavedProject[] = stored ? JSON.parse(stored) : [];
    
    const demoExists = projects.some(p => p.id === DEFAULT_PROJECT.id);
    const demoDeleted = localStorage.getItem('lumina_demo_deleted') === 'true';
    if (!demoExists && !demoDeleted) {
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
    // Make sure we remove actual DEFAULT_PROJECT from stored list if it's there but not customized,
    // or just store everything. Let's make sure if we save the default project, it's considered saved
    // and not marked as deleted anymore (just in case they modify the default demo).
    if (project.id === DEFAULT_PROJECT.id) {
      localStorage.removeItem('lumina_demo_deleted');
    }
    // Filter out DEFAULT_PROJECT to avoid duplicate storage if it's unmodified,
    // but here we can just save all projects.
    const toStore = projects.filter(p => p.id !== DEFAULT_PROJECT.id || JSON.stringify(p) !== JSON.stringify(DEFAULT_PROJECT));
    localStorage.setItem('lumina_projects', JSON.stringify(toStore));
  },

  deleteProject: (id: string) => {
    const projects = pricingStore.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (id === DEFAULT_PROJECT.id) {
      localStorage.setItem('lumina_demo_deleted', 'true');
    }
    const toStore = filtered.filter(p => p.id !== DEFAULT_PROJECT.id || JSON.stringify(p) !== JSON.stringify(DEFAULT_PROJECT));
    localStorage.setItem('lumina_projects', JSON.stringify(toStore));
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

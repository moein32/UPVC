


export interface GlassDeductions {
  frameFix: number;      // glass deduction in fixed/kativeh frames (mm)
  sashWindow: number;    // glass deduction in standard window sash (mm)
  sashDoor: number;      // glass deduction in heavy door sash (mm)
  slidingSash: number;   // glass deduction in sliding sash (mm)
}

export interface ProfileComponent {
  id: string;
  name: string;
  unit: 'm' | 'm2' | 'count';
  price: number; // Toman
  weight?: number; // kg/m
}

export interface ProfileBrand {
  id: string;
  name: string;
  logo: string;
  tier: 'اقتصادی' | 'استاندارد' | 'لوکس';
  series: string[];
  warrantyYears: number;
  components: ProfileComponent[]; 
  glassDeductions?: GlassDeductions;
}

export interface GlassType {
  id: string;
  name: string; 
  pricePerSqm: number;
}

export interface HardwareBrand {
  id: string;
  name: string; 
  origin: string;
}

export interface HardwareItem {
  id: string;
  name: string; 
  brandId: string;
  type: 'Turn' | 'TiltTurn' | 'Sliding' | 'Door' | 'Fixed';
  pricePerSet: number;
}

export type OpeningDirection = 
  | 'Fixed' 
  | 'TurnLeft' 
  | 'TurnRight' 
  | 'TiltTurnLeft' 
  | 'TiltTurnRight' 
  | 'SlidingLeft' 
  | 'SlidingRight' 
  | 'DoorLeft' 
  | 'DoorRight' 
  | 'Panel' 
  | 'PanelV' 
  | 'PanelH'
  | 'SlidingMonorailLeft'
  | 'SlidingMonorailRight'
  | 'SlidingDoubleRail'
  | 'FrenchWindowLeft'
  | 'FrenchWindowRight'
  | 'VWSliding'
  | 'Awning'
  | 'Hopper';

export interface WindowNode {
  id: string;
  type: 'container' | 'leaf';
  dir?: 'row' | 'col'; 
  children?: WindowNode[]; 
  openingType?: OpeningDirection; 
  flex?: number; 
  systemType?: 'Casement' | 'Sliding'; 
  slidingRailType?: 'Monorail' | 'DoubleRail'; 
  slidingModelIndex?: number;
  isFrenchWindow?: boolean; 
  sashMullions?: { horizontal: number, vertical: number };
}

export interface WindowConfig {
  id: string;
  width: number;
  height: number;
  profileId: string;
  glassId: string;
  hardwareId: string;
  type: string; 
  mullions: number; 
  glassType?: string;
  spacerColor?: string;
  layout?: WindowNode;
  frameType?: 'standard' | 'renovation';
}

export interface ProjectDetails {
  id: string;
  customerName: string;
  address: string;
  installPercent: number;
  companyName: string; 
  date: string;
  status: 'Draft' | 'Contract' | 'Production' | 'Produced';
  defaultProfileId?: string; 
}

export interface Payment {
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
}

export interface InvoiceDetail {
  rowId: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceItem {
  id: string;
  config: WindowConfig;
  quantity: number; 
  calculations: {
    profileMeters: number;
    profilePrice: number;
    glassArea: number;
    glassPrice: number;
    sashCount: number;
    hardwarePrice: number;
    totalPrice: number;
    unitPrice: number;
    details: InvoiceDetail[]; 
  };
}

export interface SavedProject extends ProjectDetails {
  items: InvoiceItem[];
  totalPrice: number;
  payments: Payment[];
}

export type InvoiceLayoutType = 'standard' | 'modern' | 'technical' | 'classic';

export interface InvoiceSettings {
  companyName: string;
  companyLogo: string; 
  companyAddress: string;
  companyPhone: string;
  footerNote: string;
  layoutType: InvoiceLayoutType;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

export interface AppSettings {
  darkMode: boolean;
  priceCoefficient: number;
  currency: string;
  invoice: InvoiceSettings; 
}

export interface AppUser {
  id: string;
  owner_name: string;
  company_name: string;
  phone_number: string;
  tier: 'bronze' | 'silver' | 'gold';
  status: 'active' | 'suspended' | 'expired';
  register_date: string;
  expiry_date: string;
  max_devices: number;
  total_paid: number;
  is_trial?: boolean;
  trial_start_date?: string;
  expiry_timestamp?: number;
}

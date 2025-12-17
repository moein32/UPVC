
export interface ProfileComponent {
  id: string;
  name: string;
  unit: 'm' | 'm2' | 'count';
  price: number; // Toman
}

export interface ProfileBrand {
  id: string;
  name: string;
  logo: string;
  tier: 'اقتصادی' | 'استاندارد' | 'لوکس';
  series: string[];
  warrantyYears: number;
  components: ProfileComponent[]; 
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

export type OpeningDirection = 'Fixed' | 'TurnLeft' | 'TurnRight' | 'TiltTurnLeft' | 'TiltTurnRight' | 'SlidingLeft' | 'SlidingRight' | 'DoorLeft' | 'DoorRight' | 'Panel';

export interface WindowNode {
  id: string;
  type: 'container' | 'leaf';
  dir?: 'row' | 'col'; 
  children?: WindowNode[]; 
  openingType?: OpeningDirection; 
  flex?: number; 
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
}

export interface ProjectDetails {
  id: string;
  customerName: string;
  address: string;
  installPercent: number;
  companyName: string; 
  date: string;
  status: 'Draft' | 'Final';
  defaultProfileId?: string; 
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
}

export type InvoiceLayoutType = 'standard' | 'modern' | 'technical' | 'classic';

export interface InvoiceSettings {
  companyName: string;
  companyLogo: string; 
  companyAddress: string;
  companyPhone: string;
  footerNote: string;
  layoutType: InvoiceLayoutType; // New field
}

export interface AppSettings {
  darkMode: boolean;
  priceCoefficient: number;
  currency: string;
  invoice: InvoiceSettings; 
}

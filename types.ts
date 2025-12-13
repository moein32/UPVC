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
  components: ProfileComponent[]; // Detailed components like Frame, Sash, etc.
}

export interface GlassType {
  id: string;
  name: string; // e.g. "Double Glazed 4-4"
  pricePerSqm: number;
}

export interface HardwareBrand {
  id: string;
  name: string; // e.g. "G-U", "Endow"
  origin: string;
}

export interface HardwareItem {
  id: string;
  name: string; // e.g. "Single Axis", "Tilt & Turn"
  brandId: string;
  type: 'Turn' | 'TiltTurn' | 'Sliding' | 'Door' | 'Fixed';
  pricePerSet: number;
}

export type OpeningDirection = 'Fixed' | 'TurnLeft' | 'TurnRight' | 'TiltTurnLeft' | 'TiltTurnRight' | 'SlidingLeft' | 'SlidingRight' | 'DoorLeft' | 'DoorRight' | 'Panel';

export interface WindowNode {
  id: string;
  type: 'container' | 'leaf';
  dir?: 'row' | 'col'; // Only for container
  children?: WindowNode[]; // Only for container
  openingType?: OpeningDirection; // Updated for directional support
  flex?: number; // For sizing ratio (default 1)
}

export interface WindowConfig {
  id: string;
  width: number;
  height: number;
  profileId: string;
  glassId: string;
  hardwareId: string;
  type: string; // Legacy
  mullions: number; // Legacy
  glassType?: string;
  spacerColor?: string;
  layout?: WindowNode; // The new advanced structure
}

export interface ProjectDetails {
  id: string;
  customerName: string;
  address: string;
  installPercent: number;
  companyName: string; // Legacy support, prefer settings
  date: string;
  status: 'Draft' | 'Final';
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
    details: InvoiceDetail[]; // The detailed BOM list
  };
}

export interface SavedProject extends ProjectDetails {
  items: InvoiceItem[];
  totalPrice: number;
}

export interface InvoiceSettings {
  companyName: string;
  companyLogo: string; // URL or Base64
  companyAddress: string;
  companyPhone: string;
  footerNote: string;
}

export interface AppSettings {
  darkMode: boolean;
  priceCoefficient: number;
  currency: string;
  invoice: InvoiceSettings; // Added invoice settings
}
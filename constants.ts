import { ProfileBrand } from './types';

export const BRANDS: ProfileBrand[] = [
  {
    id: 'vistabest',
    name: 'ویستابست',
    logo: '🏆',
    tier: 'لوکس',
    series: ['۶۰ میلی‌متر', '۷۰ میلی‌متر', 'کشویی'],
    warrantyYears: 15,
    components: [],
  },
  {
    id: 'wintech',
    name: 'وین‌تک',
    logo: '🌍',
    tier: 'لوکس',
    series: ['W640', 'W260'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'hofmann',
    name: 'هافمن',
    logo: '🇩🇪',
    tier: 'استاندارد',
    series: ['۶۰ میلی‌متر', '۷۰ میلی‌متر'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'yazdwin',
    name: 'یزد وین',
    logo: '🏗️',
    tier: 'اقتصادی',
    series: ['اکونومی ۶۰'],
    warrantyYears: 5,
    components: [],
  },
  {
    id: 'sindaj',
    name: 'سیندژ',
    logo: '🛡️',
    tier: 'استاندارد',
    series: ['استاندارد ۶۰'],
    warrantyYears: 7,
    components: [],
  }
];

export const GLASS_PRICES = {
  'دوجداره': 650000, // Toman per sqm
  'سه جداره': 950000,
};

export const HARDWARE_PRICES = {
  'ثابت': 0,
  'تک حالته': 450000,
  'دو حالته': 850000,
  'کشویی': 600000,
};

export const MULLION_FACTOR = 1.0; // Same price as frame roughly
import { ProfileBrand } from './types';

export const BRANDS: ProfileBrand[] = [
  {
    id: 'wintech-w640-1',
    name: 'Wintech - وین‌تک سری ۶۰ لولایی ۴ کاناله (W640)',
    logo: '🌍',
    tier: 'لوکس',
    series: ['سری ۶۰ لولایی ۴ کاناله (W640)'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'wintech-w700-2',
    name: 'Wintech - وین‌تک سری ۷۰ لولایی ۵ کاناله (W700)',
    logo: '🌍',
    tier: 'لوکس',
    series: ['سری ۷۰ لولایی ۵ کاناله (W700)'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'wintech-w260-3',
    name: 'Wintech - وین‌تک سری کشویی تک ریل (W260)',
    logo: '🌍',
    tier: 'لوکس',
    series: ['سری کشویی تک ریل (W260)'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'wintech-w260-4',
    name: 'Wintech - وین‌تک سری کشویی جفت ریل (W260)',
    logo: '🌍',
    tier: 'لوکس',
    series: ['سری کشویی جفت ریل (W260)'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'pluspen-w640-eco-5',
    name: 'Pluspen - وین‌تک سری ۶۰ اقتصادی (پلاس‌پن)',
    logo: '🌍',
    tier: 'اقتصادی',
    series: ['سری ۶۰ اقتصادی (پلاس‌پن)'],
    warrantyYears: 5,
    components: [],
  },
  {
    id: 'vistabest-standard-6',
    name: 'Vistabest - ویستابست سری ۶۰ لولایی ۳ کاناله',
    logo: '🏆',
    tier: 'لوکس',
    series: ['سری ۶۰ لولایی ۳ کاناله'],
    warrantyYears: 15,
    components: [],
  },
  {
    id: 'vistabest-exclusive-7',
    name: 'Vistabest - ویستابست سری ۷۰ لولایی ۵ کاناله',
    logo: '🏆',
    tier: 'لوکس',
    series: ['سری ۷۰ لولایی ۵ کاناله'],
    warrantyYears: 15,
    components: [],
  },
  {
    id: 'vistabest-sliding-8',
    name: 'Vistabest - ویستابست سری کشویی جفت ریل',
    logo: '🏆',
    tier: 'لوکس',
    series: ['سری کشویی جفت ریل'],
    warrantyYears: 15,
    components: [],
  },
  {
    id: 'hofmann-60mm-9',
    name: 'Hofmann - هافمن سری ۶۰ لولایی ۴ کاناله',
    logo: '🇩🇪',
    tier: 'استاندارد',
    series: ['سری ۶۰ لولایی ۴ کاناله'],
    warrantyYears: 10,
    components: [],
  },
  {
    id: 'hofmann-70mm-10',
    name: 'Hofmann - هافمن سری ۷۰ لولایی ۵ کاناله',
    logo: '🇩🇪',
    tier: 'استاندارد',
    series: ['سری ۷۰ لولایی ۵ کاناله'],
    warrantyYears: 10,
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
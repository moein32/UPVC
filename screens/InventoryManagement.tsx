
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Package, TrendingUp, AlertCircle, Plus, Minus, Search, Layers, Box, Hammer, Grid, Save, RefreshCw, Factory, Maximize2, Ruler, Printer, PieChart, Activity, ChevronDown, ChevronUp, Beaker, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { SelectField, GlassCard } from '../components/UIComponents';
import { ProfileBrand } from '../types';

type InventoryTab = 'profiles' | 'galvanized' | 'glass' | 'hardware';

interface InventoryItem {
  id: string;
  name: string;
  brandId?: string; 
  currentStock: number;
  minStock: number;
  unit: string;
  category: InventoryTab;
  width?: number; 
  height?: number;
  glassTypeId?: string;
  sheetType?: 'long' | 'short';
}

const GlassSheetIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M14 7l-5 6" opacity="0.4" strokeWidth="1.5" />
    <path d="M11 7l-2 2.5" opacity="0.4" strokeWidth="1.5" />
  </svg>
);

// --- DASHBOARD SUB-COMPONENTS ---

const MetricCard = ({ label, value, unit, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-36">
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-2xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
        <Activity size={10} /> Live
      </div>
    </div>
    <div>
      <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-tight">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-2xl font-black text-slate-900">{toPersianDigits(value)}</h3>
        <span className="text-[10px] font-bold text-slate-400">{unit}</span>
      </div>
    </div>
  </div>
);

// Added React.FC to handle key prop correctly
const BrandStockCard: React.FC<{ brand: ProfileBrand, inventory: InventoryItem[] }> = ({ brand, inventory }) => {
  const brandItems = inventory.filter(i => i.brandId === brand.id);
  const totalStock = brandItems.reduce((acc, i) => acc + i.currentStock, 0);

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">{brand.logo}</span>
          <h4 className="font-black text-slate-900 text-sm">{brand.name}</h4>
        </div>
        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
          {toPersianDigits(totalStock)} شاخه کل
        </span>
      </div>
      <div className="space-y-2">
        {brand.components.filter(c => c.id !== 'galvanized').map(comp => {
          const item = inventory.find(i => i.id === `prof_${brand.id}_${comp.id}`);
          const stock = item?.currentStock || 0;
          return (
            <div key={comp.id} className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-500">{comp.name}</span>
              <span className={`${stock === 0 ? 'text-rose-500' : 'text-slate-900'}`}>{toPersianDigits(stock)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const InventoryManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InventoryTab>('profiles');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    setBrands(pricingStore.getBrands());
    const saved = localStorage.getItem('lumina_inventory_v3');
    if (saved) {
      setInventory(JSON.parse(saved));
    } else {
      // Default initialization to zero for testing as requested
      handleResetForTesting();
    }
  }, []);

  const handleResetForTesting = () => {
    if (inventory.length > 0 && !window.confirm('آیا مایلید تمام موجودی‌ها را جهت تست به صفر تغییر دهید؟')) return;
    
    // Initialize empty inventory based on existing brands and items
    const testInventory: InventoryItem[] = [];
    const brands = pricingStore.getBrands();
    
    // Profiles
    brands.forEach(b => {
      b.components.forEach(c => {
        testInventory.push({
          id: `prof_${b.id}_${c.id}`,
          name: c.name,
          brandId: b.id,
          currentStock: 0,
          minStock: 10,
          unit: 'شاخه',
          category: 'profiles'
        });
      });
    });

    // Glass & Others (Standard types)
    ['galv_125', 'galv_150', 'galv_200'].forEach(id => {
      testInventory.push({ id, name: 'گالوانیزه', currentStock: 0, minStock: 20, unit: 'شاخه', category: 'galvanized' });
    });

    localStorage.setItem('lumina_inventory_v3', JSON.stringify(testInventory));
    setInventory(testInventory);
  };

  const stats = useMemo(() => {
    const totalBars = inventory.filter(i => i.category === 'profiles').reduce((acc, i) => acc + i.currentStock, 0);
    const totalGalv = inventory.filter(i => i.category === 'galvanized').reduce((acc, i) => acc + i.currentStock, 0);
    const totalHardware = inventory.filter(i => i.category === 'hardware').reduce((acc, i) => acc + i.currentStock, 0);
    const totalGlassArea = inventory.filter(i => i.category === 'glass').reduce((acc, i) => {
      const areaPerSheet = ((i.width || 0) * (i.height || 0)) / 1000000;
      return acc + (i.currentStock * areaPerSheet);
    }, 0);

    return { totalBars, totalGalv, totalHardware, totalGlassArea };
  }, [inventory]);

  const handleSaveAll = () => {
    localStorage.setItem('lumina_inventory_v3', JSON.stringify(inventory));
    alert('موجودی انبار با موفقیت به‌روزرسانی شد.');
  };

  const updateStock = (itemId: string, delta: number, baseData: Partial<InventoryItem>) => {
    setInventory(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, currentStock: Math.max(0, i.currentStock + delta) } : i);
      } else {
        return [...prev, {
          id: itemId,
          name: baseData.name || '',
          brandId: baseData.brandId,
          currentStock: Math.max(0, delta),
          minStock: baseData.minStock || 10,
          unit: baseData.unit || 'واحد',
          category: activeTab,
          width: baseData.width,
          height: baseData.height,
          glassTypeId: baseData.glassTypeId,
          sheetType: baseData.sheetType
        } as InventoryItem];
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-full { width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .print-grid { display: grid !important; grid-template-cols: 1fr 1fr !important; gap: 20px !important; }
        }
      `}</style>

      {/* Modern Fixed Header */}
      <div className="no-print bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-50 rounded-2xl text-slate-700 active:scale-90 transition-transform"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900 tracking-tight">کنترل دارایی و انبار</h1>
           <div className="flex gap-2">
              <button onClick={handleResetForTesting} title="تست هوشمند (صفر کردن موجودی)" className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl active:scale-90 transition-transform"><Beaker size={20}/></button>
              <button onClick={handlePrint} className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-90 transition-transform"><Printer size={20}/></button>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] overflow-x-auto no-scrollbar gap-1.5">
            <TabBtn id="profiles" label="پروفیل‌ها" icon={Layers} active={activeTab} onClick={setActiveTab} color="blue" />
            <TabBtn id="galvanized" label="گالوانیزه" icon={Box} active={activeTab} onClick={setActiveTab} color="indigo" />
            <TabBtn id="glass" label="جام شیشه" icon={GlassSheetIcon} active={activeTab} onClick={setActiveTab} color="emerald" />
            <TabBtn id="hardware" label="یراق‌آلات" icon={Hammer} active={activeTab} onClick={setActiveTab} color="amber" />
        </div>
      </div>

      <div className="p-6 space-y-8 print-full">
        {/* SECTION: STOCK OVERVIEW (DASHBOARD) */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">گزارش جامع موجودی</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">آخرین تحلیل سیستمی خط تولید لومینا</p>
            </div>
            <button 
              onClick={() => setShowFullReport(!showFullReport)}
              className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-blue-100 transition-colors no-print"
            >
              {showFullReport ? <ChevronUp size={16}/> : <PieChart size={16}/>}
              {showFullReport ? 'بستن جزئیات' : 'مشاهده گزارش تفکیکی برند'}
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-grid">
            <MetricCard label="کل شاخه‌های پروفیل" value={stats.totalBars} unit="شاخه" icon={Layers} colorClass="bg-blue-50 text-blue-600" />
            <MetricCard label="مساحت کل شیشه‌ها" value={stats.totalGlassArea.toFixed(1)} unit="متر مربع" icon={GlassSheetIcon} colorClass="bg-emerald-50 text-emerald-600" />
            <MetricCard label="ست یراق‌آلات" value={stats.totalHardware} unit="ست کامل" icon={Hammer} colorClass="bg-amber-50 text-amber-600" />
            <MetricCard label="شاخه‌های گالوانیزه" value={stats.totalGalv} unit="شاخه ۶متری" icon={Box} colorClass="bg-indigo-50 text-indigo-600" />
          </div>

          <AnimatePresence>
            {showFullReport && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden no-print space-y-4"
              >
                {/* Brand-Specific Breakdown as requested */}
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">تفکیک موجودی بر اساس برند</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brands.map(brand => (
                    <BrandStockCard key={brand.id} brand={brand} inventory={inventory} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION: TAB-SPECIFIC INVENTORY LIST */}
        <section className="space-y-6 no-print">
            <div className="h-px bg-slate-200"></div>
            
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">ویرایش دستی موجودی</h3>
                <div className="relative w-48">
                    <input 
                        type="text" 
                        placeholder="جستجو..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-8 text-[10px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <Search className="absolute right-2.5 top-2.5 text-slate-300" size={14} />
                </div>
            </div>

            {activeTab === 'profiles' && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <SelectField 
                        label="انتخاب برند جهت مدیریت شاخه‌ها"
                        value={selectedBrandId}
                        onChange={(e: any) => setSelectedBrandId(e.target.value)}
                        options={[
                            { label: 'برند را انتخاب کنید...', value: '' },
                            ...brands.map(b => ({ label: `${b.name} (${b.tier})`, value: b.id }))
                        ]}
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab + selectedBrandId}
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {useMemo(() => {
                        const items = getItemsByTab(activeTab, selectedBrandId, brands, inventory);
                        const filtered = items.filter(i => i.name.includes(searchTerm));
                        if (filtered.length === 0) return <div className="col-span-full py-20 text-center text-slate-300 font-bold">موردی یافت نشد.</div>;
                        return filtered.map(item => (
                            <InventoryItemCard 
                                key={item.id}
                                item={item}
                                onUpdate={(delta: number) => updateStock(item.id, delta, item)}
                                color={activeTab === 'profiles' ? 'blue' : activeTab === 'galvanized' ? 'indigo' : activeTab === 'glass' ? 'emerald' : 'amber'}
                            />
                        ));
                    }, [activeTab, selectedBrandId, inventory, searchTerm, brands])}
                </motion.div>
            </AnimatePresence>
        </section>
      </div>

      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button 
                onClick={handleSaveAll}
                className="w-full bg-slate-900 text-white h-16 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                  <Save size={22} />
                  ذخیره و به‌روزرسانی نهایی انبار
              </button>
          </div>
      </div>
    </div>
  );
};

// --- HELPER LOGIC ---

const getItemsByTab = (tab: InventoryTab, selectedBrandId: string, brands: ProfileBrand[], inventory: InventoryItem[]): InventoryItem[] => {
    if (tab === 'profiles') {
        if (!selectedBrandId) return [];
        const brand = brands.find(b => b.id === selectedBrandId);
        if (!brand) return [];
        return brand.components.filter(c => c.id !== 'galvanized').map(comp => {
            const itemId = `prof_${selectedBrandId}_${comp.id}`;
            const stock = inventory.find(i => i.id === itemId);
            return { id: itemId, name: comp.name, brandId: selectedBrandId, currentStock: stock?.currentStock || 0, minStock: 10, unit: 'شاخه', category: 'profiles' } as InventoryItem;
        });
    } 
    if (tab === 'galvanized') {
        const types = [{ id: 'galv_125', name: 'گالوانیزه ۱.۲۵ رول‌فرم' }, { id: 'galv_150', name: 'گالوانیزه ۱.۵ سنگین' }, { id: 'galv_200', name: 'گالوانیزه ۲.۰ صنعتی' }];
        return types.map(t => ({ id: t.id, name: t.name, currentStock: inventory.find(i => i.id === t.id)?.currentStock || 0, minStock: 20, unit: 'شاخه', category: 'galvanized' } as InventoryItem));
    }
    if (tab === 'glass') {
        const GLASS_SHEET_SIZES = { long: { width: 3210, height: 2250, label: 'جام بلند' }, short: { width: 2250, height: 1605, label: 'جام کوتاه' } };
        const SINGLE_PANE_GLASS_TYPES = [ { id: 'sp_4_simple', name: 'شیشه ۴ میل ساده' }, { id: 'sp_6_simple', name: 'شیشه ۴ میل ساده' }, { id: 'sp_4_reflex', name: 'شیشه ۴ میل رفلکس' } ];
        const items: InventoryItem[] = [];
        SINGLE_PANE_GLASS_TYPES.forEach(g => {
            ['long', 'short'].forEach(type => {
                const sid = `glass_${g.id}_${type}`;
                const size = GLASS_SHEET_SIZES[type as 'long' | 'short'];
                items.push({ id: sid, name: `${g.name} - ${size.label}`, currentStock: inventory.find(i => i.id === sid)?.currentStock || 0, minStock: 5, unit: 'جام', category: 'glass', width: size.width, height: size.height, glassTypeId: g.id, sheetType: type as any } as InventoryItem);
            });
        });
        return items;
    }
    if (tab === 'hardware') {
        return pricingStore.getHardware().filter(h => h.id !== 'panel_upvc').map(h => ({ id: `hw_set_${h.id}`, name: h.name, currentStock: inventory.find(i => i.id === `hw_set_${h.id}`)?.currentStock || 0, minStock: 10, unit: 'ست کامل', category: 'hardware' } as InventoryItem));
    }
    return [];
};

const InventoryItemCard = ({ item, onUpdate, color }: any) => {
    const isLow = item.currentStock <= item.minStock;
    const barColors = { blue: 'bg-blue-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 relative group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLow ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                        {item.category === 'profiles' ? <Layers size={20}/> : item.category === 'glass' ? <GlassSheetIcon size={20}/> : item.category === 'galvanized' ? <Box size={20}/> : <Hammer size={20}/>}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 text-[13px] mb-0.5 leading-tight">{item.name}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.unit}</span>
                    </div>
                </div>
                <div className="text-left">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{toPersianDigits(item.currentStock)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-slate-50 rounded-xl p-1">
                    <button onClick={() => onUpdate(-1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-slate-400 shadow-sm active:scale-90 transition-all"><Minus size={18} /></button>
                    <span className="flex-1 text-center text-xs font-black text-slate-800">{toPersianDigits(item.currentStock)}</span>
                    <button onClick={() => onUpdate(1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-slate-900 shadow-sm active:scale-90 transition-all"><Plus size={18} /></button>
                </div>
                {isLow && (
                    <div className="bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-[8px] font-black border border-rose-100 flex items-center gap-1">
                        <AlertCircle size={10}/> بحرانی
                    </div>
                )}
            </div>
        </div>
    );
};

const TabBtn = ({ id, label, icon: Icon, active, onClick, color }: any) => {
    const isSelected = active === id;
    const colors = { blue: 'bg-blue-600 text-white', indigo: 'bg-indigo-600 text-white', emerald: 'bg-emerald-600 text-white', amber: 'bg-amber-600 text-white' };
    return (
        <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap text-xs font-black transition-all ${isSelected ? colors[color as keyof typeof colors] + ' shadow-lg scale-105' : 'text-slate-500 hover:bg-white'}`}>
            <Icon size={18} /> {label}
        </button>
    );
};

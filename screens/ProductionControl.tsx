import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Activity, Play, CheckCircle2, Factory, Layers, Grid, Box, Hammer, AlertTriangle, ChevronLeft, Loader2, Scissors, Zap, Info, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Add missing framer-motion imports
import { motion, AnimatePresence } from 'framer-motion';
import { pricingStore } from '../services/pricingStore';
import { SavedProject, ProfileBrand } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

// Fix: Define InventoryItem locally to ensure correct typing for arithmetic operations
interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  brandId?: string;
  [key: string]: any;
}

interface ShortageItem {
  id: string;
  name: string;
  required: number;
  available: number;
  deficit: number;
  unit: string;
  message: string;
}

// Interface for material calculation results
interface MaterialTotals {
  profiles: Record<string, number>;
  galvanized: number;
  glassArea: number;
  hardwareSets: Record<string, number>;
}

export const ProductionControl = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [productionStage, setProductionStage] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);
  // Fix: Explicitly type the inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const stages = [
    { id: 1, label: 'برش پروفیل و گالوانیزه', icon: Scissors, color: 'blue' },
    { id: 2, label: 'جوش و تمیزکاری گوشه‌ها', icon: Zap, color: 'indigo' },
    { id: 3, label: 'جایگذاری شیشه و یراق', icon: Grid, color: 'emerald' },
    { id: 4, label: 'کنترل کیفیت و بسته‌بندی', icon: CheckCircle2, color: 'rose' }
  ];

  useEffect(() => {
    const all = pricingStore.getProjects();
    setProjects(all.filter(p => p.status === 'Production'));
    
    const savedInv = localStorage.getItem('lumina_inventory_v3');
    if (savedInv) setInventory(JSON.parse(savedInv));
  }, []);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  // MATERIAL CALCULATION LOGIC - explicitly typed to fix 'unknown' errors
  const projectMaterials = useMemo<MaterialTotals | null>(() => {
    if (!selectedProject) return null;
    
    const totals: MaterialTotals = {
      profiles: {} as Record<string, number>,
      galvanized: 0,
      glassArea: 0,
      hardwareSets: {} as Record<string, number>
    };

    selectedProject.items.forEach(unit => {
        unit.calculations.details.forEach(detail => {
            if (detail.name.includes('پروفیل')) {
                totals.profiles[detail.name] = (totals.profiles[detail.name] || 0) + (detail.quantity * unit.quantity);
            }
            if (detail.name.includes('گالوانیزه')) {
                totals.galvanized += (detail.quantity * unit.quantity);
            }
            if (detail.name.includes('شیشه') || detail.name.includes('دوجداره')) {
                totals.glassArea += (detail.quantity * unit.quantity * 2);
            }
            if (detail.unit === 'دست') {
                totals.hardwareSets[detail.name] = (totals.hardwareSets[detail.name] || 0) + (detail.quantity * unit.quantity);
            }
        });
    });

    return totals;
  }, [selectedProject]);

  const shortages = useMemo<ShortageItem[]>(() => {
    if (!selectedProject || !projectMaterials || inventory.length === 0) return [];
    
    const list: ShortageItem[] = [];
    
    // 1. Check Profiles
    // Fix: Cast entries to [string, number][] to avoid unknown type errors in subtraction
    (Object.entries(projectMaterials.profiles) as [string, number][]).forEach(([name, req]) => {
        // Find by name in inventory
        const invItem = inventory.find(i => i.name === name || i.id.includes(name));
        const stock = invItem?.currentStock || 0;
        if (stock < req) {
            const deficit = req - stock;
            list.push({ 
                id: name, 
                name, 
                required: req, 
                available: stock, 
                deficit: deficit,
                unit: 'متر',
                message: `شما به ${toPersianDigits(Math.ceil(req))} متر ${name} نیاز دارید، اما موجودی فعلی ${toPersianDigits(Math.floor(stock))} است. لطفا ${toPersianDigits(Math.ceil(deficit))} متر تهیه کنید.`
            });
        }
    });

    // 2. Check Galvanized
    if (projectMaterials.galvanized > 0) {
        const galvItem = inventory.find(i => i.id.startsWith('galv'));
        const stock = galvItem?.currentStock || 0;
        if (stock < projectMaterials.galvanized) {
            const deficit = projectMaterials.galvanized - stock;
            list.push({ 
                id: 'galv', 
                name: 'گالوانیزه تقویتی', 
                required: projectMaterials.galvanized, 
                available: stock, 
                deficit: deficit,
                unit: 'متر',
                message: `شما به ${toPersianDigits(Math.ceil(projectMaterials.galvanized))} متر گالوانیزه تقویتی نیاز دارید، اما موجودی فعلی ${toPersianDigits(Math.floor(stock))} است. لطفا ${toPersianDigits(Math.ceil(deficit))} متر تهیه کنید.`
            });
        }
    }

    // 3. Check Glass (Sheets)
    const sheetsNeeded = Math.ceil(projectMaterials.glassArea / 7.2);
    const glassInv = inventory.find(i => i.category === 'glass');
    const glassStock = glassInv?.currentStock || 0;
    if (glassStock < sheetsNeeded) {
        const deficit = sheetsNeeded - glassStock;
        list.push({ 
            id: 'glass', 
            name: 'جام شیشه (تک‌جداره)', 
            required: sheetsNeeded, 
            available: glassStock, 
            deficit: deficit,
            unit: 'جام',
            message: `شما به ${toPersianDigits(sheetsNeeded)} جام شیشه نیاز دارید، اما موجودی فعلی ${toPersianDigits(glassStock)} است. لطفا ${toPersianDigits(deficit)} جام تهیه کنید.`
        });
    }

    // 4. Check Hardware
    // Fix: Cast entries to [string, number][] to avoid unknown type errors in subtraction
    (Object.entries(projectMaterials.hardwareSets) as [string, number][]).forEach(([name, req]) => {
        const invItem = inventory.find(i => i.name === name || i.id.includes(name));
        const stock = invItem?.currentStock || 0;
        if (stock < req) {
            const deficit = req - stock;
            list.push({ 
                id: name, 
                name, 
                required: req, 
                available: stock, 
                deficit: deficit,
                unit: 'ست',
                message: `شما به ${toPersianDigits(Math.ceil(req))} ست ${name} نیاز دارید، اما موجودی فعلی ${toPersianDigits(Math.floor(stock))} است. لطفا ${toPersianDigits(Math.ceil(deficit))} ست تهیه کنید.`
            });
        }
    });

    return list;
  }, [selectedProject, projectMaterials, inventory]);

  const canStartProduction = shortages.length === 0 && !!selectedProject;

  const handleStartProduction = async () => {
    if (!canStartProduction || !selectedProject || !projectMaterials) return;
    
    setIsProcessing(true);
    // Fix: Cast the copy to InventoryItem[]
    const newInventory = [...inventory] as InventoryItem[];
    const offcutsToAdd: any[] = [];

    selectedProject.items.forEach(unit => {
        unit.calculations.details.forEach(detail => {
            if (detail.name.includes('پروفیل')) {
                const invIdx = newInventory.findIndex(i => i.name === detail.name);
                if (invIdx >= 0) {
                    // Fix: Now correctly handles number subtraction as newInventory is typed
                    newInventory[invIdx].currentStock = Math.max(0, newInventory[invIdx].currentStock - (detail.quantity * unit.quantity));
                }
                
                const remainder = 6000 - (detail.quantity % 6000); 
                if (remainder > 1000) {
                    offcutsToAdd.push({
                        id: `offcut_${Date.now()}_${Math.random()}`,
                        name: `Profile_Offcut - ${detail.name}`,
                        currentStock: 1,
                        unit: 'قطعه',
                        length: remainder,
                        category: 'profiles',
                        brandId: selectedProject.defaultProfileId
                    });
                }
            }
            
            if (detail.name.includes('شیشه')) {
                const sheets = Math.ceil((detail.quantity * unit.quantity * 2) / 7.2);
                const glassIdx = newInventory.findIndex(i => i.category === 'glass');
                if (glassIdx >= 0) {
                    newInventory[glassIdx].currentStock = Math.max(0, newInventory[glassIdx].currentStock - sheets);
                }
            }
        });
    });

    const finalInventory = [...newInventory, ...offcutsToAdd];
    localStorage.setItem('lumina_inventory_v3', JSON.stringify(finalInventory));
    
    const updatedProject = { ...selectedProject, status: 'Produced' as const };
    pricingStore.saveProject(updatedProject);

    for (let i = 1; i <= 4; i++) {
        setProductionStage(i);
        await new Promise(r => setTimeout(r, 1200));
    }

    setIsProcessing(false);
    alert('عملیات تولید با موفقیت تکمیل شد. انبار به‌روزرسانی و ضایعات قابل استفاده ثبت شد.');
    navigate('/projects');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-['Vazirmatn'] pb-32">
       <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="flex items-center justify-between">
           <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-50 rounded-2xl text-slate-700 active:scale-90 transition-transform"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900 tracking-tight">خط تولید کارگاه</h1>
           <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl animate-pulse"><Activity size={20}/></div>
        </div>
      </div>

      <div className="p-6">
          {/* Project Queue Selector */}
          <div className="mb-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">صف انتظار تولید (تایید شده)</h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {projects.length === 0 ? (
                      <div className="w-full py-12 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                          <Factory size={40} className="mb-3 opacity-20" />
                          <span className="text-xs font-bold">پروژه آماده‌ای برای تولید یافت نشد</span>
                      </div>
                  ) : (
                    projects.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setSelectedProjectId(p.id)}
                            className={`min-w-[220px] p-5 rounded-3xl border transition-all text-right ${selectedProjectId === p.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'}`}
                        >
                            <h4 className="font-black text-sm mb-1">{p.customerName}</h4>
                            <p className="text-[10px] opacity-60 mb-3">{toPersianDigits(p.items.length)} یونیت طراحی شده</p>
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase">
                                <Activity size={12}/> کد: {toPersianDigits(p.id.slice(-6))}
                            </div>
                        </button>
                    ))
                  )}
              </div>
          </div>

          <AnimatePresence mode="wait">
              {selectedProject && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                      {/* DETAILED SHORTAGE MODAL/UI as requested */}
                      {shortages.length > 0 && (
                          <div className="bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] p-8 shadow-xl shadow-rose-100 animate-in fade-in slide-in-from-top duration-500">
                              <div className="flex items-center gap-4 text-rose-600 mb-6">
                                  <div className="p-3 bg-rose-600 text-white rounded-2xl">
                                      <AlertTriangle size={28} />
                                  </div>
                                  <div>
                                      <h3 className="font-black text-lg leading-tight">خطا: کمبود موجودی انبار برای شروع تولید</h3>
                                      <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">تولید پروژه تا زمان تامین متریال متوقف شد</p>
                                  </div>
                              </div>
                              
                              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                  {shortages.map((s, idx) => (
                                      <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        key={s.id} 
                                        className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden group"
                                      >
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg uppercase">{s.name}</span>
                                              <span className="text-[10px] font-black text-slate-400">کسری: {toPersianDigits(Math.ceil(s.deficit))} {s.unit}</span>
                                          </div>
                                          <p className="text-sm font-bold text-slate-800 leading-relaxed text-right">
                                              {s.message}
                                          </p>
                                          <div className="mt-3 flex gap-2">
                                              <div className="bg-slate-50 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500">نیاز پروژه: {toPersianDigits(Math.ceil(s.required))}</div>
                                              <div className="bg-rose-600 px-3 py-1 rounded-lg text-[10px] font-bold text-white">موجودی فعلی: {toPersianDigits(Math.floor(s.available))}</div>
                                          </div>
                                      </motion.div>
                                  ))}
                              </div>

                              <div className="mt-8 flex gap-3">
                                  <button 
                                    onClick={() => navigate('/inventory')}
                                    className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                  >
                                      <ShoppingCart size={20} />
                                      تامین موجودی انبار
                                  </button>
                                  <button 
                                    onClick={() => setSelectedProjectId(null)}
                                    className="bg-white border-2 border-rose-100 text-rose-600 px-6 rounded-2xl font-black text-xs active:scale-95 transition-all"
                                  >
                                      بستن
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* Production Workflow Track - Only shown if no shortages */}
                      {shortages.length === 0 && (
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden relative">
                           <h3 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                               <Factory size={20} className="text-blue-600" /> مانیتورینگ وضعیت تولید
                           </h3>
                           
                           <div className="relative flex flex-col gap-10">
                              <div className="absolute top-0 bottom-0 right-[23px] w-1 bg-slate-100 z-0"></div>
                              {stages.map((stage) => {
                                  const isDone = productionStage > stage.id;
                                  const isActive = productionStage === stage.id;
                                  return (
                                      <div key={stage.id} className="relative z-10 flex items-center gap-6">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 animate-pulse' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                                              {isDone ? <CheckCircle2 size={24}/> : <stage.icon size={24}/>}
                                          </div>
                                          <div>
                                              <h5 className={`font-black text-sm ${isActive ? 'text-blue-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>{stage.label}</h5>
                                              {isActive && <span className="text-[10px] font-bold text-blue-400">در حال انجام...</span>}
                                              {isDone && <span className="text-[10px] font-bold text-emerald-400">با موفقیت انجام شد</span>}
                                          </div>
                                      </div>
                                  );
                              })}
                           </div>

                           {isProcessing && (
                               <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                                   <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                                   <p className="font-black text-slate-900">بروزرسانی انبار و محاسبات ضایعات...</p>
                               </div>
                           )}
                        </div>
                      )}

                      {/* Final Material Summary */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-900 rounded-3xl p-5 text-white">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">کل پروفیل مصرفی</span>
                              <div className="text-xl font-black">
                                {/* Fix: Cast Object.values to number[] to avoid "Property 'toFixed' does not exist on type 'unknown'" error */}
                                {toPersianDigits(projectMaterials?.profiles ? (Object.values(projectMaterials.profiles) as number[]).reduce((acc: number, val: number) => acc + val, 0).toFixed(1) : 0)} 
                                <span className="text-xs font-bold opacity-40">متر</span>
                              </div>
                          </div>
                          <div className="bg-slate-900 rounded-3xl p-5 text-white">
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">مساحت شیشه (خام)</span>
                              <div className="text-xl font-black">{toPersianDigits(projectMaterials?.glassArea.toFixed(1) || 0)} <span className="text-xs font-bold opacity-40">m²</span></div>
                          </div>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* Primary Action Button */}
      {selectedProject && shortages.length === 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
            <div className="max-w-xl mx-auto pointer-events-auto">
                <button 
                  onClick={handleStartProduction}
                  disabled={!canStartProduction || isProcessing}
                  className={`w-full h-16 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${canStartProduction ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={22} />}
                    {isProcessing ? 'در حال ثبت نهایی...' : 'تایید و شروع تولید نهایی'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
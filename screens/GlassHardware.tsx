import React, { useState, useEffect } from 'react';
import { ArrowRight, Save, Edit2, Check, Grid, Hammer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { GlassType, HardwareItem } from '../types';
import { InputField, SelectField } from '../components/UIComponents';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const GlassHardware = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'glass' | 'hardware'>('glass');
  
  const [glassList, setGlassList] = useState<GlassType[]>([]);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
  const [hardwareBrands] = useState(pricingStore.getHardwareBrands());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  useEffect(() => {
    setGlassList(pricingStore.getGlass());
    setHardwareList(pricingStore.getHardware());
  }, []);

  const savePrice = (id: string, type: 'glass' | 'hardware') => {
    if (type === 'glass') {
      const updated = glassList.map(g => g.id === id ? { ...g, pricePerSqm: Number(tempPrice) } : g);
      setGlassList(updated);
      pricingStore.saveGlass(updated);
    } else {
      const updated = hardwareList.map(h => h.id === id ? { ...h, pricePerSet: Number(tempPrice) } : h);
      setHardwareList(updated);
      pricingStore.saveHardware(updated);
    }
    setEditingId(null);
  };

  const startEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setTempPrice(currentPrice.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10 pb-24">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">شیشه و یراق‌آلات</h1>
      </div>

      <div className="flex p-1 bg-white rounded-2xl mb-6 shadow-sm border border-slate-100">
        <button 
          onClick={() => setActiveTab('glass')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'glass' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <Grid size={18} /> شیشه‌ها
        </button>
        <button 
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'hardware' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <Hammer size={18} /> یراق‌آلات
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'glass' ? (
          glassList.map(glass => (
            <div key={glass.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{glass.name}</p>
                <p className="text-xs text-slate-400 mt-1">قیمت هر متر مربع</p>
              </div>
              <div className="flex items-center gap-3">
                 {editingId === glass.id ? (
                   <div className="flex items-center gap-2">
                     <input 
                       autoFocus
                       type="number" 
                       value={tempPrice}
                       onChange={(e) => setTempPrice(e.target.value)}
                       className="w-24 bg-slate-50 border border-blue-500 rounded-lg px-2 py-2 text-sm font-bold text-center outline-none"
                     />
                     <button onClick={() => savePrice(glass.id, 'glass')} className="p-2 bg-green-500 text-white rounded-lg shadow-lg shadow-green-200">
                       <Check size={18} />
                     </button>
                   </div>
                 ) : (
                   <>
                     <span className="font-bold text-lg text-slate-900">{formatPrice(glass.pricePerSqm)} <span className="text-xs font-normal text-slate-400">تومان</span></span>
                     <button onClick={() => startEdit(glass.id, glass.pricePerSqm)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg">
                       <Edit2 size={18} />
                     </button>
                   </>
                 )}
              </div>
            </div>
          ))
        ) : (
          hardwareList.map(hw => {
            const brand = hardwareBrands.find(b => b.id === hw.brandId);
            return (
              <div key={hw.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{brand?.name}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{hw.type}</span>
                  </div>
                  <p className="font-bold text-slate-800">{hw.name}</p>
                </div>
                <div className="flex items-center gap-3">
                   {editingId === hw.id ? (
                     <div className="flex items-center gap-2">
                       <input 
                         autoFocus
                         type="number" 
                         value={tempPrice}
                         onChange={(e) => setTempPrice(e.target.value)}
                         className="w-24 bg-slate-50 border border-blue-500 rounded-lg px-2 py-2 text-sm font-bold text-center outline-none"
                       />
                       <button onClick={() => savePrice(hw.id, 'hardware')} className="p-2 bg-green-500 text-white rounded-lg shadow-lg shadow-green-200">
                         <Check size={18} />
                       </button>
                     </div>
                   ) : (
                     <>
                       <span className="font-bold text-lg text-slate-900">{formatPrice(hw.pricePerSet)} <span className="text-xs font-normal text-slate-400">تومان</span></span>
                       <button onClick={() => startEdit(hw.id, hw.pricePerSet)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg">
                         <Edit2 size={18} />
                       </button>
                     </>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
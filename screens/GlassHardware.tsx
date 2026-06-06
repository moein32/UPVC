import React, { useState, useEffect } from 'react';
import { ArrowRight, Save, Edit2, Check, Grid, Hammer, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { GlassType, HardwareItem } from '../types';
import { InputField, SelectField, PrimaryButton } from '../components/UIComponents';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const GlassHardware = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'glass' | 'hardware'>('glass');
  
  const [glassList, setGlassList] = useState<GlassType[]>([]);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
  const [hardwareBrands] = useState(pricingStore.getHardwareBrands());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [confirmDeleteGlassId, setConfirmDeleteGlassId] = useState<string | null>(null);
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGlass, setNewGlass] = useState({ name: '', price: '' });
  const [newHw, setNewHw] = useState({ name: '', price: '', type: 'Turn', brandId: 'endow' });

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

  const handleAddGlass = () => {
      if(!newGlass.name || !newGlass.price) return;
      const item: GlassType = {
          id: Date.now().toString(),
          name: newGlass.name,
          pricePerSqm: Number(newGlass.price)
      };
      pricingStore.addGlass(item);
      setGlassList(pricingStore.getGlass());
      setShowAddForm(false);
      setNewGlass({name:'', price:''});
  };

  const handleDeleteGlass = (id: string) => {
      pricingStore.deleteGlass(id);
      setGlassList(pricingStore.getGlass());
      setConfirmDeleteGlassId(null);
  }

  const handleAddHw = () => {
      if(!newHw.name || !newHw.price) return;
      const item: HardwareItem = {
          id: Date.now().toString(),
          name: newHw.name,
          pricePerSet: Number(newHw.price),
          type: newHw.type as any,
          brandId: newHw.brandId
      };
      pricingStore.addHardware(item);
      setHardwareList(pricingStore.getHardware());
      setShowAddForm(false);
      setNewHw({name:'', price:'', type: 'Turn', brandId: 'endow'});
  };
  
  const handleDeleteHw = (id: string) => {
      pricingStore.deleteHardware(id);
      setHardwareList(pricingStore.getHardware());
      setConfirmDeleteHwId(null);
  }

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
          onClick={() => { setActiveTab('glass'); setShowAddForm(false); }}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'glass' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <Grid size={18} /> شیشه‌ها
        </button>
        <button 
          onClick={() => { setActiveTab('hardware'); setShowAddForm(false); }}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'hardware' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <Hammer size={18} /> یراق‌آلات
        </button>
      </div>

      {/* Add Button Area */}
      <div className="mb-6">
          {!showAddForm ? (
             <button onClick={() => setShowAddForm(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                 <Plus size={20} />
                 افزودن {activeTab === 'glass' ? 'شیشه' : 'یراق'} جدید
             </button>
          ) : (
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                 {activeTab === 'glass' ? (
                     <div className="flex flex-col gap-4">
                         <InputField label="نوع شیشه" value={newGlass.name} onChange={(e:any) => setNewGlass({...newGlass, name: e.target.value})} />
                         <InputField label="قیمت هر متر مربع" type="number" value={newGlass.price} onChange={(e:any) => setNewGlass({...newGlass, price: e.target.value})} />
                         <div className="flex gap-3">
                             <PrimaryButton onClick={handleAddGlass} className="flex-1 py-2">ثبت</PrimaryButton>
                             <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl font-bold">انصراف</button>
                         </div>
                     </div>
                 ) : (
                      <div className="flex flex-col gap-4">
                         <InputField label="نام یراق" value={newHw.name} onChange={(e:any) => setNewHw({...newHw, name: e.target.value})} />
                         <SelectField label="برند" value={newHw.brandId} onChange={(e:any) => setNewHw({...newHw, brandId: e.target.value})} options={hardwareBrands.map(b => ({label: b.name, value: b.id}))} />
                         <SelectField label="نوع عملکرد" value={newHw.type} onChange={(e:any) => setNewHw({...newHw, type: e.target.value})} 
                            options={[
                                {label: 'تک حالته', value: 'Turn'},
                                {label: 'دو حالته', value: 'TiltTurn'},
                                {label: 'کشویی', value: 'Sliding'},
                                {label: 'درب', value: 'Door'}
                            ]} 
                         />
                         <InputField label="قیمت هر ست" type="number" value={newHw.price} onChange={(e:any) => setNewHw({...newHw, price: e.target.value})} />
                         <div className="flex gap-3">
                             <PrimaryButton onClick={handleAddHw} className="flex-1 py-2">ثبت</PrimaryButton>
                             <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl font-bold">انصراف</button>
                         </div>
                     </div>
                 )}
             </div>
          )}
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
                     {confirmDeleteGlassId === glass.id ? (
                        <span className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => handleDeleteGlass(glass.id)} className="px-2 py-1 text-xs bg-red-650 hover:bg-red-700 text-white rounded font-bold">بله</button>
                          <button onClick={() => setConfirmDeleteGlassId(null)} className="px-2 py-1 text-xs bg-slate-200 text-slate-705 rounded font-bold">خیر</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteGlassId(glass.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      )}
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
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{brand?.name || 'متفرقه'}</span>
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
                       {confirmDeleteHwId === hw.id ? (
                          <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                            <button onClick={() => handleDeleteHw(hw.id)} className="px-2 py-1 text-xs bg-red-650 hover:bg-red-700 text-white rounded font-bold">بله</button>
                            <button onClick={() => setConfirmDeleteHwId(null)} className="px-2 py-1 text-xs bg-slate-200 text-slate-705 rounded font-bold">خیر</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteHwId(hw.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                     </button>
                    )}
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
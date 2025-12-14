import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Edit2, Check, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { ProfileBrand, ProfileComponent } from '../types';
import { InputField, PrimaryButton, SelectField } from '../components/UIComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const ProfileSelection = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [editingComponent, setEditingComponent] = useState<{brandId: string, compId: string} | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', tier: 'استاندارد' });

  useEffect(() => {
    setBrands(pricingStore.getBrands());
  }, []);

  const handleUpdatePrice = (brandId: string, compId: string) => {
    const updatedBrands = brands.map(brand => {
      if (brand.id !== brandId) return brand;
      return {
        ...brand,
        components: brand.components.map(c => 
          c.id === compId ? { ...c, price: Number(tempPrice) } : c
        )
      };
    });
    
    setBrands(updatedBrands);
    pricingStore.saveBrands(updatedBrands);
    setEditingComponent(null);
  };

  const startEditing = (brandId: string, comp: ProfileComponent) => {
    setEditingComponent({ brandId, compId: comp.id });
    setTempPrice(comp.price.toString());
  };

  const handleAddBrand = () => {
      if (!newBrand.name) return;
      const brand: ProfileBrand = {
          id: Date.now().toString(),
          name: newBrand.name,
          tier: newBrand.tier as any,
          logo: '🆕',
          series: ['Default'],
          warrantyYears: 10,
          components: [] // Store handles default components init
      };
      pricingStore.addBrand(brand);
      setBrands(pricingStore.getBrands());
      setShowAddForm(false);
      setNewBrand({ name: '', tier: 'استاندارد' });
  };
  
  const handleDeleteBrand = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("آیا از حذف این پروفیل اطمینان دارید؟")) {
          pricingStore.deleteBrand(id);
          setBrands(pricingStore.getBrands());
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10 pb-24">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">قیمت‌گذاری پروفیل‌ها</h1>
      </div>
      
      {/* Add New Brand Section */}
      <div className="mb-6">
          {!showAddForm ? (
             <button onClick={() => setShowAddForm(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                 <Plus size={20} />
                 افزودن پروفیل جدید
             </button>
          ) : (
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex flex-col gap-4">
                     <InputField 
                        label="نام برند پروفیل" 
                        value={newBrand.name} 
                        onChange={(e: any) => setNewBrand({...newBrand, name: e.target.value})} 
                     />
                     <SelectField 
                        label="درجه کیفی"
                        value={newBrand.tier}
                        onChange={(e: any) => setNewBrand({...newBrand, tier: e.target.value})}
                        options={[
                            {label: 'اقتصادی', value: 'اقتصادی'},
                            {label: 'استاندارد', value: 'استاندارد'},
                            {label: 'لوکس', value: 'لوکس'}
                        ]}
                     />
                     <div className="flex gap-3 mt-2">
                         <PrimaryButton onClick={handleAddBrand} className="flex-1 py-2">ثبت</PrimaryButton>
                         <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl font-bold">انصراف</button>
                     </div>
                 </div>
             </div>
          )}
      </div>

      <div className="grid gap-6">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200 border border-slate-100 transition-all">
            <div 
              onClick={() => setExpandedBrandId(expandedBrandId === brand.id ? null : brand.id)}
              className="p-6 flex justify-between items-center cursor-pointer bg-slate-50/50"
            >
               <div className="flex items-center gap-4">
                 <span className="text-3xl">{brand.logo}</span>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">{brand.name}</h2>
                    <span className="text-xs text-slate-400 font-bold">{brand.tier}</span>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                   <button onClick={(e) => handleDeleteBrand(e, brand.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                   <div className="p-2 bg-white rounded-full shadow-sm">
                     {expandedBrandId === brand.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                   </div>
               </div>
            </div>

            <AnimatePresence>
              {expandedBrandId === brand.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white border-t border-slate-100"
                >
                  <div className="p-4 space-y-4">
                    {brand.components.map((comp) => (
                      <div key={comp.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-bold text-slate-700 text-sm">{comp.name}</p>
                          <p className="text-xs text-slate-400 mt-1">واحد: {comp.unit === 'm' ? 'متر طول' : comp.unit === 'm2' ? 'متر مربع' : 'عدد'}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {editingComponent?.brandId === brand.id && editingComponent?.compId === comp.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                autoFocus
                                type="number" 
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                className="w-24 bg-slate-100 border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none"
                              />
                              <button onClick={() => handleUpdatePrice(brand.id, comp.id)} className="p-1.5 bg-green-500 text-white rounded-lg">
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">{formatPrice(comp.price)} <span className="text-[10px] text-slate-400 font-normal">تومان</span></span>
                              <button onClick={() => startEditing(brand.id, comp)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { ProfileBrand, ProfileComponent } from '../types';
import { InputField, PrimaryButton } from '../components/UIComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const ProfileSelection = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [editingComponent, setEditingComponent] = useState<{brandId: string, compId: string} | null>(null);
  const [tempPrice, setTempPrice] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10 pb-24">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">قیمت‌گذاری پروفیل‌ها</h1>
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
               <div className="p-2 bg-white rounded-full shadow-sm">
                 {expandedBrandId === brand.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
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
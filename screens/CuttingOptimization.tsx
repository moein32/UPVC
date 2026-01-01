
import React, { useState } from 'react';
import { ArrowRight, Scissors, Plus, Trash2, Calculator, Save, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard } from '../components/UIComponents';
import { toPersianDigits, formatPrice } from '../utils/formatting';

interface CutItem {
  id: string;
  length: number;
  quantity: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const [stockLength, setStockLength] = useState(6000);
  const [bladeWidth, setBladeWidth] = useState(4);
  const [items, setItems] = useState<CutItem[]>([
    { id: '1', length: 1250, quantity: 4 },
    { id: '2', length: 850, quantity: 8 },
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), length: 0, quantity: 1 }]);
  };

  const updateItem = (id: string, field: keyof CutItem, value: number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
           <button onClick={() => navigate('/dashboard')} className="p-2 bg-slate-100 rounded-xl text-slate-700"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900">بهینه‌سازی برش</h1>
           <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Settings Card */}
        <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Scissors size={20} className="text-rose-500" />
                <h2 className="font-bold text-slate-800">تنظیمات پایه تولید</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(e.target.value))} />
                <InputField label="ضخامت تیغه (mm)" type="number" value={bladeWidth} onChange={(e:any) => setBladeWidth(Number(e.target.value))} />
            </div>
        </GlassCard>

        {/* Cut List */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">لیست قطعات مورد نیاز</h3>
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
                    <Plus size={16}/> افزودن ابعاد
                </button>
            </div>

            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="flex-1">
                            <InputField label="طول قطعه" type="number" value={item.length || ''} onChange={(e:any) => updateItem(item.id, 'length', Number(e.target.value))} />
                        </div>
                        <div className="w-24">
                            <InputField label="تعداد" type="number" value={item.quantity || ''} onChange={(e:any) => updateItem(item.id, 'quantity', Number(e.target.value))} />
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors mt-5">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Calculation Result Simulation */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">نمای گرافیکی چیدمان (پیش‌فرض)</h3>
            </div>

            <div className="space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
                            <span>شاخه شماره {toPersianDigits(i)}</span>
                            <span>ضایعات: {toPersianDigits(450)} mm</span>
                        </div>
                        <div className="h-10 w-full bg-slate-100 rounded-lg flex overflow-hidden border border-slate-200">
                            <div className="h-full bg-blue-500 border-r border-white/20 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: '25%' }}>۱۲۵۰</div>
                            <div className="h-full bg-blue-500 border-r border-white/20 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: '25%' }}>۱۲۵۰</div>
                            <div className="h-full bg-indigo-500 border-r border-white/20 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: '15%' }}>۸۵۰</div>
                            <div className="h-full bg-indigo-500 border-r border-white/20 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: '15%' }}>۸۵۰</div>
                            <div className="h-full bg-slate-300 flex items-center justify-center text-[8px] text-slate-500" style={{ width: '20%' }}>ضایعات</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <PrimaryButton fullWidth icon={Calculator}>
            محاسبه بهینه‌ترین حالت برش
        </PrimaryButton>
      </div>
    </div>
  );
};

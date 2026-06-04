
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Folder, Calendar, CheckCircle2, Clock, Factory, ChevronDown, MoreVertical, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const handleUpdateStatus = (id: string, newStatus: SavedProject['status']) => {
    // Safety check: Cannot manually set to Produced from here anymore
    if (newStatus === 'Produced') {
        alert('تغییر وضعیت به "تولید شده" تنها از طریق بخش "کنترل تولید کارگاه" و پس از تایید کسر از انبار امکان‌پذیر است.');
        return;
    }
    
    const updated = projects.map(p => p.id === id ? { ...p, status: newStatus } : p);
    setProjects(updated);
    const target = updated.find(p => p.id === id);
    if (target) pricingStore.saveProject(target);
  };

  const activeProjects = useMemo(() => 
    projects.filter(p => p.status !== 'Produced'), 
  [projects]);

  const producedProjects = useMemo(() => 
    projects.filter(p => p.status === 'Produced'), 
  [projects]);

  // Unified Price Calculation: Total Material + Installation Cost
  const getProjectFinalPrice = (p: SavedProject) => {
    const totalMaterialPrice = p.items.reduce((acc, item) => 
        acc + (item.calculations.unitPrice * item.quantity), 0);
    const installationCost = Math.round(totalMaterialPrice * (p.installPercent / 100));
    return totalMaterialPrice + installationCost;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-tight">پیش‌فاکتور</span>;
      case 'Contract': return <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-tight">قرارداد نهایی</span>;
      case 'Production': return <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-tight">آماده تولید</span>;
      case 'Produced': return <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tight">تولید شده</span>;
      default: return null;
    }
  };

  const renderProjectCard = (p: SavedProject) => {
    const isProduced = p.status === 'Produced';
    const finalPrice = getProjectFinalPrice(p);
    
    return (
      <div 
        key={p.id} 
        className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-100 transition-all group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/breakdown', { state: { projectDetails: p, items: p.items } })}>
            <div className={`p-3 rounded-xl ${isProduced ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <Folder size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 leading-none mb-1">{p.customerName}</h3>
              <p className="text-[10px] text-slate-400 font-bold">{p.address || 'بدون آدرس'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
              {getStatusBadge(p.status)}
              <div className="relative">
                  <select 
                      value={p.status}
                      disabled={isProduced}
                      onChange={(e) => handleUpdateStatus(p.id, e.target.value as any)}
                      className={`text-[10px] font-black py-1 px-3 rounded-lg border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all ${isProduced ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed opacity-80' : 'bg-slate-100 text-slate-700 cursor-pointer'}`}
                  >
                      <option value="Draft">پیش‌فاکتور</option>
                      <option value="Contract">قرارداد نهایی</option>
                      <option value="Production">آماده تولید</option>
                      {isProduced && <option value="Produced">تولید شده</option>}
                  </select>
                  {!isProduced && <ChevronDown size={10} className="absolute left-1.5 top-2.5 text-slate-400 pointer-events-none" />}
              </div>
          </div>
        </div>
        
        <div className="h-px bg-slate-50 my-3"></div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold">
            {confirmDeleteId === p.id ? (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-2xl animate-pulse">
                <span>حذف شود؟</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    pricingStore.deleteProject(p.id);
                    setProjects(prev => prev.filter(proj => proj.id !== p.id));
                    setConfirmDeleteId(null);
                  }}
                  className="font-black hover:underline mr-1.5 px-2 py-0.5 bg-red-100 rounded-lg text-[9px]"
                >
                  بله
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(null);
                  }}
                  className="text-slate-500 hover:underline mr-1 px-2 py-0.5 bg-slate-100 rounded-lg text-[9px]"
                >
                  خیر
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{toPersianDigits(new Date(p.date).toLocaleDateString('fa-IR'))}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(p.id);
                  }}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all"
                  title="حذف پروژه"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold text-slate-400 mb-0.5">مبلغ نهایی (با نصب)</div>
            <div className="font-black text-blue-600 text-base">
              {formatPrice(finalPrice)} <span className="text-[9px] font-bold text-slate-400 mr-1">تومان</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 pt-12 pb-32 font-['Vazirmatn']">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm text-slate-700 active:scale-90 transition-transform">
            <ArrowRight size={22} />
            </button>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">مدیریت پروژه‌ها</h1>
        </div>
        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black">
            {toPersianDigits(projects.length)} کل
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-300">
          <Folder size={64} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="font-bold">هنوز پروژه‌ای ثبت نشده است</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Projects Section */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">پروژه‌های جاری</h3>
            <div className="grid gap-4">
                {activeProjects.length > 0 ? activeProjects.map(renderProjectCard) : (
                    <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold">پروژه فعالی یافت نشد.</div>
                )}
            </div>
          </div>

          {/* Produced Projects Section */}
          {producedProjects.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-emerald-600/60 uppercase tracking-widest mb-4 px-2">پروژه‌های تولید شده اخیر</h3>
              <div className="grid gap-4 opacity-75">
                  {producedProjects.map(renderProjectCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

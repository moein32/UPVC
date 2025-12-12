import React, { useState, useEffect } from 'react';
import { ArrowRight, Folder, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const openProject = (project: SavedProject) => {
    // Navigate to breakdown/invoice for this project
    navigate('/breakdown', { 
      state: { 
        projectDetails: project, 
        items: project.items 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">پروژه‌های من</h1>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
          <Folder size={64} strokeWidth={1} className="mb-4 opacity-50" />
          <p>هنوز پروژه‌ای ثبت نشده است</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div 
              key={p.id} 
              onClick={() => openProject(p)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Folder size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{p.customerName}</h3>
                    <p className="text-xs text-slate-400">{p.address || 'بدون آدرس'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">{toPersianDigits(p.items.length)} آیتم</span>
              </div>
              
              <div className="h-px bg-slate-100 my-3"></div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Calendar size={14} />
                  <span>{toPersianDigits(new Date(p.date).toLocaleDateString('fa-IR'))}</span>
                </div>
                <div className="font-bold text-slate-800">
                  {formatPrice(p.totalPrice)} <span className="text-xs font-normal text-slate-400">تومان</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
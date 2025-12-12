import React, { useState, useEffect } from 'react';
import { ArrowRight, User, MapPin, Wrench, Briefcase, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard } from '../components/UIComponents';
import { ProjectDetails } from '../types';
import { pricingStore } from '../services/pricingStore';

export const ProjectSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { projectDetails?: ProjectDetails, isEdit?: boolean } || {};

  const [details, setDetails] = useState<ProjectDetails>({
    id: '',
    customerName: '',
    address: '',
    installPercent: 15,
    companyName: 'گروه صنعتی لومینا', // Default
    date: new Date().toISOString(),
    status: 'Draft'
  });

  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (locationState.projectDetails) {
      setDetails(locationState.projectDetails);
      setIsEdit(!!locationState.isEdit);
    }
  }, [locationState]);

  const handleSave = () => {
    // Validate
    if(!details.customerName) return;

    if (isEdit) {
      // If editing, we need to save to store immediately to persist changes
      // We need to fetch the full project to preserve items
      const existingProject = pricingStore.getProjects().find((p: any) => p.id === details.id);
      if (existingProject) {
        const updatedProject = { ...existingProject, ...details };
        pricingStore.saveProject(updatedProject);
        // Navigate back to breakdown
        navigate('/breakdown', { state: { projectDetails: details, items: existingProject.items } });
      }
    } else {
      // New project flow
      navigate('/designer', { state: { projectDetails: details, items: [] } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
      <div className="flex items-center mb-8 pt-6">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'ویرایش مشخصات پروژه' : 'مشخصات پروژه جدید'}</h1>
      </div>

      <GlassCard className="flex-1 flex flex-col gap-6">
        <div className="mb-2">
            <h2 className="text-lg font-bold text-slate-800">اطلاعات مشتری</h2>
            <p className="text-slate-400 text-sm">لطفا اطلاعات {isEdit ? 'جدید' : 'اولیه'} پروژه را وارد کنید</p>
        </div>

        <div className="space-y-4">
            <InputField 
                label="نام تولید کننده (سربرگ فاکتور)"
                placeholder="مثال: گروه صنعتی لومینا"
                value={details.companyName}
                onChange={(e: any) => setDetails({...details, companyName: e.target.value})}
                suffix={<Briefcase size={16}/>}
            />

            <div className="h-px bg-slate-100 my-4"></div>

            <InputField 
                label="نام مشتری"
                placeholder="مثال: آقای رضایی"
                value={details.customerName}
                onChange={(e: any) => setDetails({...details, customerName: e.target.value})}
                suffix={<User size={16}/>}
            />

            <InputField 
                label="آدرس پروژه"
                placeholder="تهران، خیابان..."
                value={details.address}
                onChange={(e: any) => setDetails({...details, address: e.target.value})}
                suffix={<MapPin size={16}/>}
            />

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <InputField 
                    label="هزینه نصب (درصد)"
                    type="number"
                    value={details.installPercent}
                    onChange={(e: any) => setDetails({...details, installPercent: Number(e.target.value)})}
                    suffix={<span className="text-xs font-bold">%</span>}
                />
                <p className="text-xs text-blue-600 mt-2 leading-relaxed">
                    این درصد در انتهای فاکتور به جمع کل مبلغ مواد مصرفی اضافه خواهد شد.
                </p>
            </div>
        </div>

        <div className="mt-auto pt-6">
            <PrimaryButton fullWidth onClick={handleSave}>
                {isEdit ? 'ذخیره تغییرات' : 'تایید و شروع طراحی'}
            </PrimaryButton>
        </div>
      </GlassCard>
    </div>
  );
};
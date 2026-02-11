
import React, { useState, useEffect } from 'react';
import { ArrowRight, User, MapPin, Wrench, Briefcase, Save, Layers } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { ProjectDetails, ProfileBrand } from '../types';
import { pricingStore } from '../services/pricingStore';

export const ProjectSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  
  const [details, setDetails] = useState<ProjectDetails>(() => {
    const state = location.state as { projectDetails?: ProjectDetails } || {};
    if (state.projectDetails) return state.projectDetails;
    
    const settings = pricingStore.getSettings();

    return {
      id: '',
      customerName: '',
      address: '',
      installPercent: 10,
      companyName: settings.invoice.companyName, 
      date: new Date().toISOString(),
      status: 'Draft',
      defaultProfileId: ''
    };
  });

  const [isEdit, setIsEdit] = useState(() => {
    const state = location.state as { isEdit?: boolean } || {};
    return !!state.isEdit;
  });

  useEffect(() => {
    const loadedBrands = pricingStore.getBrands();
    setBrands(loadedBrands);
    
    if (!isEdit && !details.defaultProfileId && loadedBrands.length > 0) {
        setDetails(d => ({ ...d, defaultProfileId: loadedBrands[0].id }));
    }
  }, []); 

  const handleSave = () => {
    if(!details.customerName) {
        alert("لطفا نام مشتری را وارد کنید.");
        return;
    }

    if (isEdit) {
      const existingProject = pricingStore.getProjects().find((p: any) => p.id === details.id);
      if (existingProject) {
        const updatedProject = { ...existingProject, ...details };
        pricingStore.saveProject(updatedProject);
        navigate('/breakdown', { state: { projectDetails: details, items: existingProject.items } });
      } else {
        alert("خطا: پروژه اصلی یافت نشد.");
      }
    } else {
      const newDetails = { ...details, id: Date.now().toString() };
      navigate('/designer', { state: { projectDetails: newDetails, items: [] } });
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
            <h2 className="text-lg font-bold text-slate-800">اطلاعات کلی</h2>
            <p className="text-slate-400 text-sm">لطفا اطلاعات پروژه و نوع پروفیل مصرفی را وارد کنید</p>
        </div>

        <div className="space-y-4">
            <SelectField 
                label="برند پروفیل مصرفی"
                value={details.defaultProfileId}
                onChange={(e: any) => setDetails({...details, defaultProfileId: e.target.value})}
                options={brands.map(b => ({ label: `${b.name} (${b.tier})`, value: b.id }))}
            />

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


import React, { useState, useEffect } from 'react';
import { ArrowRight, User, MapPin, Wrench, Briefcase, Save, Layers, Phone, Search, X, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { ProjectDetails, ProfileBrand } from '../types';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits } from '../utils/formatting';

export const ProjectSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [previousCustomers, setPreviousCustomers] = useState<{name: string, phone?: string, address?: string, defaultProfileId?: string}[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  const [details, setDetails] = useState<ProjectDetails>(() => {
    const state = location.state as { projectDetails?: ProjectDetails } || {};
    if (state.projectDetails) return state.projectDetails;
    
    const settings = pricingStore.getSettings();

    return {
      id: '',
      customerName: '',
      customerPhone: '',
      address: '',
      installPercent: 10,
      companyName: settings.invoice.companyName, 
      date: new Date().toISOString(),
      status: 'Draft',
      defaultProfileId: '',
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

    // Populate previous unique customers
    const projs = pricingStore.getProjects();
    const uniqueMap: Record<string, {name: string, phone?: string, address?: string, defaultProfileId?: string}> = {};
    projs.forEach(p => {
      const name = (p.customerName || '').trim();
      if (name) {
        if (!uniqueMap[name]) {
          uniqueMap[name] = {
            name,
            phone: p.customerPhone,
            address: p.address,
            defaultProfileId: p.defaultProfileId
          };
        } else {
          if (!uniqueMap[name].phone && p.customerPhone) uniqueMap[name].phone = p.customerPhone;
          if (!uniqueMap[name].address && p.address) uniqueMap[name].address = p.address;
          if (!uniqueMap[name].defaultProfileId && p.defaultProfileId) uniqueMap[name].defaultProfileId = p.defaultProfileId;
        }
      }
    });
    setPreviousCustomers(Object.values(uniqueMap));
  }, []); 

  const selectCustomer = (cust: {name: string, phone?: string, address?: string, defaultProfileId?: string}) => {
    setDetails(d => ({
      ...d,
      customerName: cust.name,
      customerPhone: cust.phone || '',
      address: cust.address || '',
      defaultProfileId: cust.defaultProfileId || d.defaultProfileId
    }));
    setShowCustomerList(false);
  };

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
        navigate('/breakdown', { state: { projectDetails: details, items: existingProject.items, fromProjectsList: (location.state as any)?.fromProjectsList } });
      } else {
        alert("خطا: پروژه اصلی یافت نشد.");
      }
    } else {
      const newDetails = { ...details, id: Date.now().toString() };
      navigate('/designer', { state: { projectDetails: newDetails, items: [] } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col text-right" dir="rtl">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center mb-8 pt-6">
          <button onClick={() => {
            if ((location.state as any)?.fromProjectsList) {
              navigate('/projects');
            } else {
              navigate('/dashboard');
            }
          }} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'ویرایش مشخصات پروژه' : 'مشخصات پروژه جدید'}</h1>
        </div>

        <GlassCard className="flex-1 flex flex-col gap-6">
          <div className="mb-2">
              <h2 className="text-lg font-bold text-slate-800">اطلاعات کلی</h2>
              <p className="text-slate-400 text-sm">لطفا اطلاعات پروژه و نوع پروفیل مصرفی را وارد کنید</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <SelectField 
                  label="برند پروفیل مصرفی"
                  value={details.defaultProfileId || ''}
                  onChange={(e: any) => setDetails({...details, defaultProfileId: e.target.value})}
                  options={brands.map(b => ({ label: `${b.name} (${b.tier})`, value: b.id }))}
              />

              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <InputField 
                        label="نام مشتری"
                        placeholder="مثال: آقای رضایی"
                        value={details.customerName}
                        onChange={(e: any) => setDetails({...details, customerName: e.target.value})}
                        suffix={<User size={16}/>}
                    />
                  </div>
                  {previousCustomers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchTerm('');
                        setShowCustomerList(true);
                      }}
                      className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition-colors h-[48px] flex items-center justify-center gap-1 shrink-0 mb-0.5"
                      title="انتخاب از مشتریان قبلی"
                    >
                      <History size={18} />
                      <span className="hidden md:inline text-xs font-bold">مشتریان قبلی</span>
                    </button>
                  )}
                </div>
              </div>

              <InputField 
                  label="شماره تماس"
                  placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                  value={details.customerPhone || ''}
                  onChange={(e: any) => setDetails({...details, customerPhone: e.target.value})}
                  suffix={<Phone size={16}/>}
              />

              <div className="md:col-span-2">
                <InputField 
                    label="آدرس پروژه"
                    placeholder="تهران، خیابان..."
                    value={details.address}
                    onChange={(e: any) => setDetails({...details, address: e.target.value})}
                    suffix={<MapPin size={16}/>}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 md:col-span-2">
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

      <AnimatePresence>
        {showCustomerList && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">انتخاب از مشتریان قبلی</h3>
                    <p className="text-[10px] text-slate-400 font-bold">برای پر شدن خودکار مشخصات کلیک کنید</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCustomerList(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 relative">
                <input 
                  type="text"
                  placeholder="جستجوی نام یا شماره تلفن..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-right"
                />
                <Search className="absolute right-7 top-7 text-slate-400" size={16} />
              </div>

              <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-50">
                {previousCustomers.filter(c => 
                  c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                  (c.phone && c.phone.includes(customerSearchTerm))
                ).length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs font-bold">مشتری یافت نشد.</p>
                  </div>
                ) : (
                  previousCustomers.filter(c => 
                    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                    (c.phone && c.phone.includes(customerSearchTerm))
                  ).map((cust, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full p-4 hover:bg-blue-50/50 rounded-2xl transition-all text-right flex flex-col gap-1.5 group"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-black text-slate-800 text-xs group-hover:text-blue-600 transition-colors">{cust.name}</span>
                        {cust.phone && (
                          <span className="text-[10px] font-bold text-slate-400 font-mono" dir="ltr">{toPersianDigits(cust.phone)}</span>
                        )}
                      </div>
                      {cust.address && (
                        <p className="text-[10px] text-slate-400 font-medium truncate w-full text-right">{cust.address}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

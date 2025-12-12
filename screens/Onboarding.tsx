import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Box, Ruler, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    id: 1,
    title: "خوش آمدید به لومینا",
    description: "نسل جدید طراحی و محاسبه قیمت درب و پنجره‌های UPVC با دقت مهندسی.",
    image: <Sparkles size={80} className="text-amber-500" />,
    bg: "from-slate-800 to-slate-900"
  },
  {
    id: 2,
    title: "مدیریت قیمت‌ها",
    description: "تعریف دقیق قیمت پروفیل، شیشه و یراق‌آلات با جزئیات کامل فنی.",
    image: <Box size={80} className="text-blue-500" />,
    bg: "from-blue-600 to-blue-800"
  },
  {
    id: 3,
    title: "طراحی و صدور فاکتور",
    description: "طراحی ویژوال یونیت‌ها و دریافت فاکتور آنی و ذخیره پروژه‌ها.",
    image: <CheckCircle size={80} className="text-emerald-500" />,
    bg: "from-emerald-600 to-emerald-800"
  }
];

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-between relative overflow-hidden bg-gradient-to-br ${steps[currentStep].bg} transition-colors duration-700`}>
      
      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-white rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-20%] left-[-20%] w-[300px] h-[300px] bg-black rounded-full blur-[80px]"></div>
      </div>

      <div className="w-full flex justify-end p-8 z-10">
        <button onClick={() => navigate('/dashboard')} className="text-white/60 font-medium text-sm hover:text-white transition-colors">رد کردن</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 z-10">
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="flex flex-col items-center text-center"
          >
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
               className="mb-12 drop-shadow-2xl"
            >
               {steps[currentStep].image}
            </motion.div>
            
            <h1 className="text-4xl font-extrabold text-white mb-6 leading-tight">{steps[currentStep].title}</h1>
            <p className="text-white/80 leading-relaxed text-lg font-light">{steps[currentStep].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md p-8 z-10">
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} 
            />
          ))}
        </div>
        
        <button 
          onClick={handleNext}
          className="w-full bg-white text-slate-900 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:shadow-2xl"
        >
          {currentStep === steps.length - 1 ? "شروع کنید" : "ادامه"}
          <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  );
};
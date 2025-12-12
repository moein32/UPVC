import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

export const PrimaryButton = ({ children, onClick, icon: Icon, fullWidth = false, loading = false, variant = 'primary' }: any) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    disabled={loading}
    className={`
      ${fullWidth ? 'w-full' : ''}
      ${variant === 'secondary' 
        ? 'bg-white text-slate-700 border border-slate-200' 
        : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20'}
      py-4 px-6 rounded-xl font-semibold 
      flex items-center justify-center gap-3 transition-all
      disabled:opacity-70
    `}
  >
    {loading ? (
      <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
    ) : (
      <>
        {children}
        {Icon && <Icon size={20} />}
      </>
    )}
  </motion.button>
);

export const InputField = ({ label, value, onChange, type = "text", suffix, placeholder }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-medium text-slate-500 font-bold">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
        style={{ direction: 'rtl' }}
      />
      {suffix && (
        <span className="absolute left-4 top-3 text-slate-400 text-sm font-medium pointer-events-none">{suffix}</span>
      )}
    </div>
  </div>
);

export const SelectField = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-medium text-slate-500 font-bold">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
        style={{ direction: 'rtl' }}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-slate-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);
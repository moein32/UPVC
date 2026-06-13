
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Login } from './screens/Login';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { ProjectSetup } from './screens/ProjectSetup';
import { UnitDesigner } from './screens/UnitDesigner';
import { PriceBreakdown } from './screens/PriceBreakdown';
import { InvoicePrint } from './screens/InvoicePrint';
import { ProfileSelection } from './screens/ProfileSelection';
import { GlassHardware } from './screens/GlassHardware';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';
import { FinancialManagement } from './screens/FinancialManagement';
import { ProjectFinancials } from './screens/ProjectFinancials';
import { ProfileOptimization } from './screens/ProfileOptimization';
import { GlassOptimization } from './screens/GlassOptimization';
import { InventoryManagement } from './screens/InventoryManagement';
import { ProductionControl } from './screens/ProductionControl';

// نگهبان مسیرها بر اساس وضعیت لایسنس تایید شده در لوکال‌استوریج و سطح دسترسی اشتراک
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTiers?: ('bronze' | 'silver' | 'gold')[];
}

const ProtectedRoute = ({ children, allowedTiers }: ProtectedRouteProps) => {
  const userStr = localStorage.getItem('nexwin_user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTiers) {
    try {
      const user = JSON.parse(userStr);
      const userTier = user.tier || 'bronze';
      if (!allowedTiers.includes(userTier)) {
        // در صورت عدم دسترسی، کاربر را به داشبورد هدایت می‌کنیم
        return <Navigate to="/dashboard" replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const hasSession = !!localStorage.getItem('nexwin_user');

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to={hasSession ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/project-setup" element={<ProtectedRoute><ProjectSetup /></ProtectedRoute>} />
        <Route path="/designer" element={<ProtectedRoute><UnitDesigner /></ProtectedRoute>} />
        <Route path="/breakdown" element={<ProtectedRoute><PriceBreakdown /></ProtectedRoute>} />
        <Route path="/print-invoice" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />
        <Route path="/profiles" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProfileSelection /></ProtectedRoute>} />
        <Route path="/glass-hardware" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><GlassHardware /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/financial-mgmt" element={<ProtectedRoute allowedTiers={['gold']}><FinancialManagement /></ProtectedRoute>} />
        <Route path="/project-financials/:id" element={<ProtectedRoute allowedTiers={['gold']}><ProjectFinancials /></ProtectedRoute>} />
        <Route path="/optimization/profile" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProfileOptimization /></ProtectedRoute>} />
        <Route path="/optimization/glass" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><GlassOptimization /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><InventoryManagement /></ProtectedRoute>} />
        <Route path="/production-control" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProductionControl /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  );
}

export default App;


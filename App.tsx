
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project-setup" element={<ProjectSetup />} />
        <Route path="/designer" element={<UnitDesigner />} />
        <Route path="/breakdown" element={<PriceBreakdown />} />
        <Route path="/print-invoice" element={<InvoicePrint />} />
        <Route path="/profiles" element={<ProfileSelection />} />
        <Route path="/glass-hardware" element={<GlassHardware />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/financial-mgmt" element={<FinancialManagement />} />
        <Route path="/project-financials/:id" element={<ProjectFinancials />} />
        <Route path="/optimization/profile" element={<ProfileOptimization />} />
        <Route path="/optimization/glass" element={<GlassOptimization />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/production-control" element={<ProductionControl />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { ProjectSetup } from './screens/ProjectSetup';
import { UnitDesigner } from './screens/UnitDesigner';
import { PriceBreakdown } from './screens/PriceBreakdown';
import { ProfileSelection } from './screens/ProfileSelection';
import { GlassHardware } from './screens/GlassHardware';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Dynamically set direction based on language
    const dir = i18n.language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <HashRouter>
      <Routes>
        {/* Changed default route to Dashboard to prevent stuck navigation */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project-setup" element={<ProjectSetup />} />
        <Route path="/designer" element={<UnitDesigner />} />
        <Route path="/breakdown" element={<PriceBreakdown />} />
        <Route path="/profiles" element={<ProfileSelection />} />
        <Route path="/glass-hardware" element={<GlassHardware />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { EnhancedAppProvider } from '@/contexts/EnhancedAppContext';
import { Sidebar } from '@/components/Sidebar';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { ProjectsPage } from '@/components/ProjectsPage';
import { EnhancedUsersPage } from '@/components/EnhancedUsersPage';
import { EnhancedCampaignsPage } from '@/components/EnhancedCampaignsPage';
import { TemplatesPage } from '@/components/TemplatesPage';
import { ProfileManager } from '@/components/ProfileManager';
import { AIManagement } from '@/components/AIManagement';
import { TestCampaign } from '@/components/TestCampaign';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Toaster } from '@/components/ui/toaster';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { 
    profiles, 
    activeProfile, 
    setActiveProfile, 
    addProfile, 
    removeProfile,
    projects 
  } = useEnhancedApp();

  // Auto-select first profile if none selected
  useEffect(() => {
    if (!activeProfile && profiles.length > 0) {
      setActiveProfile(profiles[0].id);
    }
  }, [profiles, activeProfile, setActiveProfile]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EnhancedDashboard />;
      case 'projects':
        return <ProjectsPage />;
      case 'users':
        return <EnhancedUsersPage />;
      case 'campaigns':
        return <EnhancedCampaignsPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'profiles':
        return <ProfileManager />;
      case 'ai':
        return <AIManagement />;
      case 'test':
        return <TestCampaign />;
      default:
        return <EnhancedDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        profiles={profiles}
        activeProfile={activeProfile}
        onProfileChange={setActiveProfile}
        onAddProfile={addProfile}
        onRemoveProfile={removeProfile}
        projectCounts={profiles.reduce((acc, profile) => {
          acc[profile.id] = projects.filter(p => p.profileId === profile.id).length;
          return acc;
        }, {} as { [profileId: string]: number })}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
      <Toaster />
    </div>
  );
};

const Index = () => {
  return (
    <EnhancedAppProvider>
      <AppContent />
    </EnhancedAppProvider>
  );
};

export default Index;

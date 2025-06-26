
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { ProjectsPage } from '@/components/ProjectsPage';
import { EnhancedUsersPage } from '@/components/EnhancedUsersPage';
import { TemplatesPage } from '@/components/TemplatesPage';
import { EnhancedCampaignsPage } from '@/components/EnhancedCampaignsPage';
import { ProfileManager } from '@/components/ProfileManager';
import { EnhancedAppProvider, useEnhancedApp } from '@/contexts/EnhancedAppContext';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { profiles, activeProfile, setActiveProfile, projects } = useEnhancedApp();

  // Calculate project counts per profile
  const getProjectCounts = () => {
    const counts: { [profileId: string]: number } = {};
    profiles.forEach(profile => {
      counts[profile.id] = projects.filter(p => p.profileId === profile.id).length;
    });
    return counts;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EnhancedDashboard />;
      case 'profiles':
        return (
          <ProfileManager
            profiles={profiles}
            activeProfile={activeProfile}
            onProfileChange={setActiveProfile}
            onProfilesUpdate={() => {}} // Handled by context
            projectCounts={getProjectCounts()}
          />
        );
      case 'projects':
        return <ProjectsPage />;
      case 'users':
        return <EnhancedUsersPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'campaigns':
        return <EnhancedCampaignsPage />;
      default:
        return <EnhancedDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex w-full">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-hidden">
        <div className="p-8">
          {/* Active Profile Indicator */}
          {activeProfile && profiles.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Active Profile</h3>
                  <p className="text-purple-300">
                    {profiles.find(p => p.id === activeProfile)?.name || 'Unknown Profile'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Projects in this profile</p>
                  <p className="text-2xl font-bold text-white">
                    {projects.filter(p => p.profileId === activeProfile).length}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {renderPage()}
        </div>
      </main>
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

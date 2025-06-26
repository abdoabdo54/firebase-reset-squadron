
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { ProjectsPage } from '@/components/ProjectsPage';
import { EnhancedUsersPage } from '@/components/EnhancedUsersPage';
import { TemplatesPage } from '@/components/TemplatesPage';
import { EnhancedCampaignsPage } from '@/components/EnhancedCampaignsPage';
import { EnhancedAppProvider } from '@/contexts/EnhancedAppContext';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EnhancedDashboard />;
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
    <EnhancedAppProvider>
      <div className="min-h-screen bg-gray-900 flex w-full">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </EnhancedAppProvider>
  );
};

export default Index;

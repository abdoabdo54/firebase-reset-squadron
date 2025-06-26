
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { ProjectsPage } from '@/components/ProjectsPage';
import { UsersPage } from '@/components/UsersPage';
import { TemplatesPage } from '@/components/TemplatesPage';
import { CampaignsPage } from '@/components/CampaignsPage';
import { AppProvider } from '@/contexts/AppContext';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectsPage />;
      case 'users':
        return <UsersPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'campaigns':
        return <CampaignsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-900 flex w-full">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
};

export default Index;

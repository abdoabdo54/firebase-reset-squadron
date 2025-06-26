import { LayoutDashboard, Server, Users, FileText, Send, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'Profiles', icon: FolderOpen },
    { id: 'projects', label: 'Firebase Projects', icon: Server },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'templates', label: 'Email Templates', icon: FileText },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
  ];

  return (
    <div className="w-64 flex-shrink-0 bg-gray-800 border-r border-gray-700 h-full">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-white">Firebase Admin</h1>
      </div>
      <nav className="py-4">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`w-full justify-start px-4 py-2 text-gray-300 hover:bg-gray-700 ${
              currentPage === item.id ? 'bg-gray-700 text-white' : ''
            }`}
            onClick={() => onPageChange(item.id)}
          >
            <item.icon className="w-4 h-4 mr-2" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
};

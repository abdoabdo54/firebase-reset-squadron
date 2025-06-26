
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FirebaseProject {
  id: string;
  name: string;
  adminEmail: string;
  serviceAccount: any;
  createdAt: string;
}

interface User {
  uid: string;
  email: string;
  displayName?: string;
  disabled: boolean;
  emailVerified: boolean;
}

interface Campaign {
  id: string;
  projectIds: string[];
  selectedUsers: { [projectId: string]: string[] };
  workers: number;
  batchSize: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  processed: number;
  successful: number;
  failed: number;
  createdAt: string;
}

interface AppContextType {
  projects: FirebaseProject[];
  users: { [projectId: string]: User[] };
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  addProject: (project: Omit<FirebaseProject, 'id' | 'createdAt'>) => void;
  removeProject: (id: string) => void;
  loadUsers: (projectId: string) => Promise<void>;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'processed' | 'successful' | 'failed'>) => void;
  startCampaign: (campaignId: string) => Promise<void>;
  templates: { [projectId: string]: string };
  updateTemplate: (projectId: string, template: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<FirebaseProject[]>([]);
  const [users, setUsers] = useState<{ [projectId: string]: User[] }>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<{ [projectId: string]: string }>({});

  const addProject = (projectData: Omit<FirebaseProject, 'id' | 'createdAt'>) => {
    const newProject: FirebaseProject = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    
    // Initialize template for new project
    setTemplates(prev => ({
      ...prev,
      [newProject.id]: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <p>Click the link below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this reset, please ignore this email.</p>
        </div>
      `
    }));
  };

  const removeProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setUsers(prev => {
      const newUsers = { ...prev };
      delete newUsers[id];
      return newUsers;
    });
    setTemplates(prev => {
      const newTemplates = { ...prev };
      delete newTemplates[id];
      return newTemplates;
    });
  };

  const loadUsers = async (projectId: string) => {
    try {
      // Simulate API call to load users from Firebase project
      const mockUsers: User[] = [
        {
          uid: '1',
          email: 'user1@example.com',
          displayName: 'User One',
          disabled: false,
          emailVerified: true,
        },
        {
          uid: '2',
          email: 'user2@example.com',
          displayName: 'User Two',
          disabled: false,
          emailVerified: false,
        },
        {
          uid: '3',
          email: 'user3@example.com',
          disabled: true,
          emailVerified: true,
        },
      ];
      
      setUsers(prev => ({
        ...prev,
        [projectId]: mockUsers,
      }));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createCampaign = (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'processed' | 'successful' | 'failed'>) => {
    const newCampaign: Campaign = {
      ...campaignData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      processed: 0,
      successful: 0,
      failed: 0,
    };
    setCampaigns(prev => [...prev, newCampaign]);
    setCurrentCampaign(newCampaign);
  };

  const startCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Update campaign status to running
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, status: 'running' as const } : c
    ));
    setCurrentCampaign(prev => prev ? { ...prev, status: 'running' } : null);

    // Simulate campaign execution
    const totalUsers = Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0);
    
    for (let i = 0; i < totalUsers; i++) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
      
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? {
          ...c,
          processed: i + 1,
          successful: c.successful + (isSuccess ? 1 : 0),
          failed: c.failed + (isSuccess ? 0 : 1),
        } : c
      ));
      
      setCurrentCampaign(prev => prev ? {
        ...prev,
        processed: i + 1,
        successful: prev.successful + (isSuccess ? 1 : 0),
        failed: prev.failed + (isSuccess ? 0 : 1),
      } : null);
    }

    // Mark campaign as completed
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, status: 'completed' as const } : c
    ));
    setCurrentCampaign(prev => prev ? { ...prev, status: 'completed' } : null);
  };

  const updateTemplate = (projectId: string, template: string) => {
    setTemplates(prev => ({
      ...prev,
      [projectId]: template,
    }));
  };

  return (
    <AppContext.Provider value={{
      projects,
      users,
      campaigns,
      currentCampaign,
      addProject,
      removeProject,
      loadUsers,
      createCampaign,
      startCampaign,
      templates,
      updateTemplate,
    }}>
      {children}
    </AppContext.Provider>
  );
};

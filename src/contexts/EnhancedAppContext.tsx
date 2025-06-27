
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  disabled: boolean;
  emailVerified: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  adminEmail: string;
  apiKey: string;
  serviceAccount: any;
  status: 'loading' | 'active' | 'error';
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  projectIds: string[];
  selectedUsers: { [projectId: string]: string[] };
  batchSize: number;
  workers: number;
  template?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  projectStats: { [projectId: string]: { processed: number; successful: number; failed: number } };
}

export interface DailyCount {
  project_id: string;
  date: string;
  sent: number;
}

interface EnhancedAppContextType {
  // Projects
  projects: Project[];
  addProject: (projectData: any) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  
  // Users
  users: { [projectId: string]: User[] };
  loadUsers: (projectId: string) => Promise<void>;
  importUsers: (emails: string[], projectIds: string[]) => Promise<void>;
  bulkDeleteUsers: (projectIds: string[], userIds?: string[]) => Promise<void>;
  
  // Campaigns
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  createCampaign: (campaignData: any) => Promise<void>;
  updateCampaign: (campaignId: string, updates: any) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  startCampaign: (campaignId: string) => Promise<void>;
  pauseCampaign: (campaignId: string) => Promise<void>;
  resumeCampaign: (campaignId: string) => Promise<void>;
  
  // Daily counts
  dailyCounts: { [key: string]: DailyCount };
  getDailyCount: (projectId: string) => number;
  
  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const EnhancedAppContext = createContext<EnhancedAppContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const EnhancedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ [projectId: string]: User[] }>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [dailyCounts, setDailyCounts] = useState<{ [key: string]: DailyCount }>({});
  const [loading, setLoading] = useState(false);

  // Initialize
  useEffect(() => {
    loadCampaigns();
    loadDailyCounts();
    
    // Set up polling for active campaigns
    const interval = setInterval(() => {
      if (currentCampaign && currentCampaign.status === 'running') {
        updateCampaignProgress(currentCampaign.id);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentCampaign]);

  // API helpers
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  };

  // Project management
  const addProject = async (projectData: any) => {
    try {
      setLoading(true);
      const response = await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });
      
      if (response.success) {
        const newProject: Project = {
          id: response.project_id,
          name: projectData.name,
          adminEmail: projectData.adminEmail,
          apiKey: projectData.apiKey,
          serviceAccount: projectData.serviceAccount,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        
        setProjects(prev => [...prev, newProject]);
        
        toast({
          title: "Project Added",
          description: `${projectData.name} has been added successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add project. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeProject = async (id: string) => {
    try {
      await apiCall(`/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // Remove users for this project
      setUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[id];
        return newUsers;
      });
      
      toast({
        title: "Project Removed",
        description: "Project has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove project.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // User management
  const loadUsers = async (projectId: string) => {
    try {
      const response = await apiCall(`/projects/${projectId}/users`);
      setUsers(prev => ({ ...prev, [projectId]: response.users }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const importUsers = async (emails: string[], projectIds: string[]) => {
    try {
      setLoading(true);
      const response = await apiCall('/projects/users/import', {
        method: 'POST',
        body: JSON.stringify({ emails, projectIds }),
      });
      
      if (response.success) {
        // Reload users for affected projects
        await Promise.all(projectIds.map(id => loadUsers(id)));
        
        toast({
          title: "Import Successful",
          description: `Successfully imported ${response.total_imported} users across ${projectIds.length} projects.`,
        });
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import users. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteUsers = async (projectIds: string[], userIds?: string[]) => {
    try {
      setLoading(true);
      const response = await apiCall('/projects/users/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ projectIds, userIds }),
      });
      
      if (response.success) {
        // Reload users for affected projects
        await Promise.all(projectIds.map(id => loadUsers(id)));
        
        toast({
          title: "Deletion Successful",
          description: `Successfully deleted ${response.total_deleted} users across ${projectIds.length} projects.`,
        });
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete users. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Campaign management
  const loadCampaigns = async () => {
    try {
      const response = await apiCall('/campaigns');
      setCampaigns(response.campaigns);
      
      // Set current campaign if there's a running one
      const runningCampaign = response.campaigns.find((c: Campaign) => c.status === 'running');
      if (runningCampaign) {
        setCurrentCampaign(runningCampaign);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const createCampaign = async (campaignData: any) => {
    try {
      const response = await apiCall('/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });
      
      if (response.success) {
        setCampaigns(prev => [...prev, response.campaign]);
        
        toast({
          title: "Campaign Created",
          description: `Campaign "${campaignData.name}" has been created successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCampaign = async (campaignId: string, updates: any) => {
    try {
      const response = await apiCall(`/campaigns/${campaignId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      if (response.success) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? response.campaign : c));
        
        toast({
          title: "Campaign Updated",
          description: "Campaign has been updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      await apiCall(`/campaigns/${campaignId}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      
      if (currentCampaign?.id === campaignId) {
        setCurrentCampaign(null);
      }
      
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      await apiCall(`/campaigns/${campaignId}/start`, { method: 'POST' });
      
      // Update campaign status
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, status: 'running' as const, startedAt: new Date().toISOString() }
          : c
      ));
      
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        setCurrentCampaign({ ...campaign, status: 'running', startedAt: new Date().toISOString() });
      }
      
      toast({
        title: "Campaign Started",
        description: "Password reset campaign is now running across all selected projects.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start campaign.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    // Implementation for pause functionality
    console.log('Pause campaign:', campaignId);
  };

  const resumeCampaign = async (campaignId: string) => {
    // Implementation for resume functionality
    console.log('Resume campaign:', campaignId);
  };

  const updateCampaignProgress = async (campaignId: string) => {
    try {
      const response = await apiCall(`/campaigns/${campaignId}`);
      setCampaigns(prev => prev.map(c => c.id === campaignId ? response : c));
      
      if (currentCampaign?.id === campaignId) {
        setCurrentCampaign(response);
      }
    } catch (error) {
      console.error('Failed to update campaign progress:', error);
    }
  };

  // Daily counts
  const loadDailyCounts = async () => {
    try {
      const response = await apiCall('/daily-counts');
      setDailyCounts(response.daily_counts);
    } catch (error) {
      console.error('Failed to load daily counts:', error);
    }
  };

  const getDailyCount = (projectId: string): number => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${projectId}_${today}`;
    return dailyCounts[key]?.sent || 0;
  };

  const value: EnhancedAppContextType = {
    // Projects
    projects,
    addProject,
    removeProject,
    
    // Users
    users,
    loadUsers,
    importUsers,
    bulkDeleteUsers,
    
    // Campaigns
    campaigns,
    currentCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    
    // Daily counts
    dailyCounts,
    getDailyCount,
    
    // Loading
    loading,
    setLoading,
  };

  return (
    <EnhancedAppContext.Provider value={value}>
      {children}
    </EnhancedAppContext.Provider>
  );
};

export const useEnhancedApp = () => {
  const context = useContext(EnhancedAppContext);
  if (context === undefined) {
    throw new Error('useEnhancedApp must be used within an EnhancedAppProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Profile, localStorageService, StoredProject } from '@/services/LocalStorageService';
import { LightningCampaignService } from '@/services/LightningCampaignService';

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
  profileId?: string;
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
  
  // Profiles
  profiles: Profile[];
  activeProfile?: string;
  setActiveProfile: (profileId: string) => void;
  addProfile: (profile: Omit<Profile, 'id' | 'createdAt'>) => void;
  removeProfile: (profileId: string) => void;
  
  // Lightning mode
  startLightningCampaign: (campaignId: string) => Promise<void>;
  isLightningMode: boolean;
  
  // Individual user deletion
  deleteUser: (projectId: string, userId: string) => Promise<void>;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<string | undefined>();
  const [isLightningMode, setIsLightningMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize with local storage
  useEffect(() => {
    const data = localStorageService.loadData();
    setProfiles(data.profiles);
    setProjects(data.projects.map(p => ({
      ...p,
      status: 'loading' as const
    })));
    
    if (data.activeProfile) {
      setActiveProfileState(data.activeProfile);
    } else if (data.profiles.length > 0) {
      setActiveProfileState(data.profiles[0].id);
    }
    
    loadCampaigns();
    loadDailyCounts();
    
    // Auto-save projects to backend
    data.projects.forEach(project => {
      saveProjectToBackend(project);
    });
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    const data = localStorageService.loadData();
    data.profiles = profiles;
    data.projects = projects.map(p => ({
      id: p.id,
      name: p.name,
      adminEmail: p.adminEmail,
      apiKey: p.apiKey,
      serviceAccount: p.serviceAccount,
      status: p.status,
      createdAt: p.createdAt,
      profileId: p.profileId,
    }));
    data.activeProfile = activeProfile;
    localStorageService.saveData(data);
  }, [profiles, projects, activeProfile]);

  // Auto-save project to backend
  const saveProjectToBackend = async (project: any) => {
    try {
      await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify({
          id: project.id,
          name: project.name,
          adminEmail: project.adminEmail,
          apiKey: project.apiKey,
          serviceAccount: project.serviceAccount,
        }),
      });
      console.log(`Project ${project.name} auto-saved to backend`);
    } catch (error) {
      console.error(`Failed to auto-save project ${project.name}:`, error);
    }
  };

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
      
      const newProject: Project = {
        id: projectData.id || Date.now().toString(),
        name: projectData.name,
        adminEmail: projectData.adminEmail,
        apiKey: projectData.apiKey,
        serviceAccount: projectData.serviceAccount,
        status: 'active',
        createdAt: new Date().toISOString(),
        profileId: activeProfile,
      };
      
      setProjects(prev => [...prev, newProject]);
      
      // Auto-save to backend
      await saveProjectToBackend(newProject);
      
      toast({
        title: "Project Added",
        description: `${projectData.name} has been added successfully and saved to backend.`,
      });
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
      const response = await apiCall(`/campaigns/${campaignId}/start`, { method: 'POST' });
      
      if (response.success) {
        // Update campaign status
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId 
            ? { ...c, status: 'running' as const, startedAt: new Date().toISOString() }
            : c
        ));
        
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
          setCurrentCampaign({ ...campaign, status: 'running', startedAt: new Date().toISOString() });
          
          // Monitor campaign progress
          const progressInterval = setInterval(async () => {
            try {
              const progressResponse = await apiCall(`/campaigns/${campaignId}`);
              setCampaigns(prev => prev.map(c => c.id === campaignId ? progressResponse : c));
              setCurrentCampaign(progressResponse);
              
              if (progressResponse.status === 'completed' || progressResponse.status === 'failed') {
                clearInterval(progressInterval);
                setCurrentCampaign(null);
              }
            } catch (error) {
              console.error('Failed to update campaign progress:', error);
              clearInterval(progressInterval);
            }
          }, 2000);
        }
        
        toast({
          title: "Campaign Started",
          description: "Password reset campaign is now running across all selected projects.",
        });
      }
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

  // Profile management
  const setActiveProfile = (profileId: string) => {
    setActiveProfileState(profileId);
  };

  const addProfile = (profileData: Omit<Profile, 'id' | 'createdAt'>) => {
    const newProfile: Profile = {
      ...profileData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      projectIds: [],
    };
    setProfiles(prev => [...prev, newProfile]);
  };

  const removeProfile = (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    // Remove profile from projects
    setProjects(prev => prev.map(p => 
      p.profileId === profileId ? { ...p, profileId: undefined } : p
    ));
  };

  // Individual user deletion
  const deleteUser = async (projectId: string, userId: string) => {
    try {
      await apiCall(`/projects/${projectId}/users/${userId}`, { method: 'DELETE' });
      
      // Update local state immediately
      setUsers(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(user => user.uid !== userId)
      }));
      
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Lightning campaign
  const startLightningCampaign = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');

      setIsLightningMode(true);
      
      const lightningService = LightningCampaignService.getInstance();
      
      await lightningService.executeLightningCampaign({
        projectIds: campaign.projectIds,
        selectedUsers: campaign.selectedUsers,
        workers: campaign.workers,
        batchSize: campaign.batchSize,
        maxConcurrency: 1000, // Maximum parallelism for lightning mode
      }, (stats) => {
        // Update campaign progress in real-time
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId 
            ? { 
                ...c, 
                processed: stats.sent, 
                successful: stats.sent, 
                failed: 0,
                projectStats: stats.projectStats,
                status: stats.sent >= Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0) 
                  ? 'completed' as const 
                  : 'running' as const
              }
            : c
        ));
      });

      toast({
        title: "Lightning Campaign Fired! ⚡",
        description: "All emails have been fired at maximum speed. Firebase is processing them now.",
      });
      
    } catch (error) {
      toast({
        title: "Lightning Campaign Failed",
        description: error instanceof Error ? error.message : "Failed to execute lightning campaign",
        variant: "destructive",
      });
    } finally {
      setIsLightningMode(false);
    }
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
    
    // Profiles
    profiles,
    activeProfile,
    setActiveProfile,
    addProfile,
    removeProfile,
    
    // Lightning mode
    startLightningCampaign,
    isLightningMode,
    
    // Individual user deletion
    deleteUser,
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

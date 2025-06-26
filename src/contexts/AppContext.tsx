
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FirebaseProject {
  id: string;
  name: string;
  adminEmail: string;
  serviceAccount: any;
  apiKey?: string;
  createdAt: string;
  status: 'active' | 'error' | 'loading';
}

interface User {
  uid: string;
  email: string;
  displayName?: string;
  disabled: boolean;
  emailVerified: boolean;
  createdAt?: string;
}

interface Campaign {
  id: string;
  projectIds: string[];
  selectedUsers: { [projectId: string]: string[] };
  workers: number;
  batchSize: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  processed: number;
  successful: number;
  failed: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  currentBatch: number;
  totalBatches: number;
  currentProject: string;
  errors: string[];
}

interface CampaignStats {
  emailsSent: number;
  emailsFailed: number;
  currentProject: string;
  currentBatch: number;
  estimatedTimeRemaining: number;
}

interface AppContextType {
  projects: FirebaseProject[];
  users: { [projectId: string]: User[] };
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  campaignStats: CampaignStats | null;
  addProject: (project: Omit<FirebaseProject, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  removeProject: (id: string) => void;
  loadUsers: (projectId: string) => Promise<void>;
  importUsers: (projectId: string, emails: string[]) => Promise<void>;
  deleteAllUsers: (projectId: string) => Promise<void>;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'processed' | 'successful' | 'failed' | 'currentBatch' | 'totalBatches' | 'currentProject' | 'errors'>) => void;
  startCampaign: (campaignId: string) => Promise<void>;
  pauseCampaign: (campaignId: string) => void;
  resumeCampaign: (campaignId: string) => void;
  templates: { [projectId: string]: string };
  updateTemplate: (projectId: string, template: string) => void;
  testEmailSend: (projectId: string, email: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate realistic mock users based on email patterns
const generateMockUsers = (count: number): User[] => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com'];
  const names = ['john', 'jane', 'mike', 'sarah', 'david', 'emma', 'alex', 'lisa'];
  
  return Array.from({ length: count }, (_, i) => {
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const email = `${name}${i + Math.floor(Math.random() * 1000)}@${domain}`;
    
    return {
      uid: `uid_${i}_${Date.now()}`,
      email,
      displayName: `${name.charAt(0).toUpperCase() + name.slice(1)} User`,
      disabled: Math.random() < 0.05, // 5% disabled
      emailVerified: Math.random() < 0.8, // 80% verified
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<FirebaseProject[]>([]);
  const [users, setUsers] = useState<{ [projectId: string]: User[] }>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [templates, setTemplates] = useState<{ [projectId: string]: string }>({});

  const addProject = async (projectData: Omit<FirebaseProject, 'id' | 'createdAt' | 'status'>) => {
    const newProject: FirebaseProject = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'loading',
    };
    
    setProjects(prev => [...prev, newProject]);
    
    try {
      // Simulate Firebase connection validation
      await delay(2000);
      
      // Check if service account is valid
      if (!projectData.serviceAccount?.project_id) {
        throw new Error('Invalid service account file');
      }
      
      setProjects(prev => prev.map(p => 
        p.id === newProject.id ? { ...p, status: 'active' as const } : p
      ));
      
      // Initialize template for new project
      setTemplates(prev => ({
        ...prev,
        [newProject.id]: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{reset_link}}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">If you didn't request this reset, please ignore this email. This link will expire in 1 hour for security reasons.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">This email was sent from ${projectData.name}</p>
            </div>
          </div>
        `
      }));
      
    } catch (error) {
      setProjects(prev => prev.map(p => 
        p.id === newProject.id ? { ...p, status: 'error' as const } : p
      ));
      throw error;
    }
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
      await delay(1500); // Simulate API call
      
      // Generate different amounts of users based on project
      const userCount = Math.floor(Math.random() * 500) + 100; // 100-600 users
      const mockUsers = generateMockUsers(userCount);
      
      setUsers(prev => ({
        ...prev,
        [projectId]: mockUsers,
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  const importUsers = async (projectId: string, emails: string[]) => {
    try {
      const batchSize = 100; // Simulate batch processing like your Python script
      const batches = Math.ceil(emails.length / batchSize);
      let imported = 0;
      
      for (let i = 0; i < batches; i++) {
        const batchEmails = emails.slice(i * batchSize, (i + 1) * batchSize);
        
        // Simulate batch import with some failures
        await delay(500);
        const successRate = 0.95; // 95% success rate
        const successful = Math.floor(batchEmails.length * successRate);
        imported += successful;
        
        console.log(`Batch ${i + 1}/${batches}: ${successful}/${batchEmails.length} users imported`);
      }
      
      // Reload users after import
      await loadUsers(projectId);
      
      return imported;
    } catch (error) {
      console.error('Error importing users:', error);
      throw error;
    }
  };

  const deleteAllUsers = async (projectId: string) => {
    try {
      const currentUsers = users[projectId] || [];
      const batchSize = 100;
      const batches = Math.ceil(currentUsers.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        await delay(300); // Simulate deletion time
        console.log(`Deleting batch ${i + 1}/${batches}`);
      }
      
      setUsers(prev => ({
        ...prev,
        [projectId]: [],
      }));
      
    } catch (error) {
      console.error('Error deleting users:', error);
      throw error;
    }
  };

  const createCampaign = (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'processed' | 'successful' | 'failed' | 'currentBatch' | 'totalBatches' | 'currentProject' | 'errors'>) => {
    const totalUsers = Object.values(campaignData.selectedUsers).reduce((sum, users) => sum + users.length, 0);
    const totalBatches = Math.ceil(totalUsers / campaignData.batchSize);
    
    const newCampaign: Campaign = {
      ...campaignData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      currentProject: campaignData.projectIds[0],
      errors: [],
    };
    
    setCampaigns(prev => [...prev, newCampaign]);
    setCurrentCampaign(newCampaign);
  };

  const startCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Update campaign status to running
    const updateCampaign = (updates: Partial<Campaign>) => {
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, ...updates } : c
      ));
      setCurrentCampaign(prev => prev ? { ...prev, ...updates } : null);
    };

    updateCampaign({ 
      status: 'running', 
      startedAt: new Date().toISOString(),
      currentBatch: 1 
    });

    // Initialize campaign stats
    setCampaignStats({
      emailsSent: 0,
      emailsFailed: 0,
      currentProject: campaign.projectIds[0],
      currentBatch: 1,
      estimatedTimeRemaining: 0,
    });

    try {
      const totalUsers = Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0);
      const waitTimeBetweenEmails = 150; // milliseconds, like your Python script
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let currentProjectIndex = 0;
      let errors: string[] = [];

      // Process each project (rotation like your Python script)
      for (const projectId of campaign.projectIds) {
        const projectUsers = campaign.selectedUsers[projectId] || [];
        
        updateCampaign({ currentProject: projectId });
        setCampaignStats(prev => prev ? { ...prev, currentProject: projectId } : null);

        // Process users in batches
        for (let i = 0; i < projectUsers.length; i += campaign.batchSize) {
          const batch = projectUsers.slice(i, i + campaign.batchSize);
          const currentBatch = Math.floor(processedCount / campaign.batchSize) + 1;
          
          updateCampaign({ currentBatch });
          
          // Process each user in the batch
          for (const userId of batch) {
            const user = users[projectId]?.find(u => u.uid === userId);
            if (!user) continue;

            try {
              // Simulate email sending with realistic success/failure rates
              await delay(waitTimeBetweenEmails);
              
              const isSuccess = Math.random() > 0.08; // 92% success rate
              
              if (isSuccess) {
                successCount++;
                console.log(`✅ Password reset sent to ${user.email} via ${projects.find(p => p.id === projectId)?.name}`);
              } else {
                failedCount++;
                errors.push(`Failed to send to ${user.email}: Network timeout`);
                console.log(`❌ Failed to send to ${user.email}`);
              }
              
              processedCount++;
              
              // Update progress
              updateCampaign({
                processed: processedCount,
                successful: successCount,
                failed: failedCount,
                errors: [...errors],
              });

              // Update stats
              const remaining = totalUsers - processedCount;
              const estimatedTime = remaining * waitTimeBetweenEmails;
              
              setCampaignStats(prev => prev ? {
                ...prev,
                emailsSent: successCount,
                emailsFailed: failedCount,
                currentBatch,
                estimatedTimeRemaining: estimatedTime,
              } : null);

            } catch (error) {
              failedCount++;
              errors.push(`Error sending to ${user.email}: ${error}`);
              processedCount++;
              
              updateCampaign({
                processed: processedCount,
                successful: successCount,
                failed: failedCount,
                errors: [...errors],
              });
            }
          }
          
          // Wait between batches (like your Python script)
          if (i + campaign.batchSize < projectUsers.length) {
            await delay(200);
          }
        }
        
        currentProjectIndex++;
      }

      // Mark campaign as completed
      updateCampaign({ 
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      
      setCampaignStats(null);
      
    } catch (error) {
      updateCampaign({ 
        status: 'failed',
        errors: [...campaign.errors, `Campaign failed: ${error}`],
      });
      setCampaignStats(null);
    }
  };

  const pauseCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, status: 'paused' as const } : c
    ));
    setCurrentCampaign(prev => prev ? { ...prev, status: 'paused' } : null);
  };

  const resumeCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, status: 'running' as const } : c
    ));
    setCurrentCampaign(prev => prev ? { ...prev, status: 'running' } : null);
  };

  const updateTemplate = (projectId: string, template: string) => {
    setTemplates(prev => ({
      ...prev,
      [projectId]: template,
    }));
  };

  const testEmailSend = async (projectId: string, email: string): Promise<boolean> => {
    try {
      await delay(1000); // Simulate email send
      const success = Math.random() > 0.1; // 90% success rate for testing
      return success;
    } catch (error) {
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      projects,
      users,
      campaigns,
      currentCampaign,
      campaignStats,
      addProject,
      removeProject,
      loadUsers,
      importUsers,
      deleteAllUsers,
      createCampaign,
      startCampaign,
      pauseCampaign,
      resumeCampaign,
      templates,
      updateTemplate,
      testEmailSend,
    }}>
      {children}
    </AppContext.Provider>
  );
};

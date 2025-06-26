
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Send, Play, Users, Settings, Activity, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CampaignMonitor } from './CampaignMonitor';

export const CampaignsPage = () => {
  const { projects, users, createCampaign, startCampaign, campaigns, currentCampaign } = useApp();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<{ [projectId: string]: Set<string> }>({});
  const [workers, setWorkers] = useState(5);
  const [batchSize, setBatchSize] = useState(50);

  const handleProjectSelect = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
      if (!selectedUsers[projectId]) {
        setSelectedUsers(prev => ({ ...prev, [projectId]: new Set() }));
      }
    } else {
      newSelected.delete(projectId);
      setSelectedUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[projectId];
        return newUsers;
      });
    }
    setSelectedProjects(newSelected);
  };

  const handleUserSelect = (projectId: string, userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const projectUsers = new Set(prev[projectId] || []);
      if (checked) {
        projectUsers.add(userId);
      } else {
        projectUsers.delete(userId);
      }
      return { ...prev, [projectId]: projectUsers };
    });
  };

  const handleSelectAllUsers = (projectId: string) => {
    const projectUsers = users[projectId] || [];
    const currentSelected = selectedUsers[projectId] || new Set();
    
    setSelectedUsers(prev => ({
      ...prev,
      [projectId]: currentSelected.size === projectUsers.length 
        ? new Set() 
        : new Set(projectUsers.filter(u => !u.disabled).map(u => u.uid))
    }));
  };

  const handleCreateCampaign = () => {
    const totalUsers = Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0);
    
    if (selectedProjects.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one project.",
        variant: "destructive",
      });
      return;
    }

    if (totalUsers === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    if (workers < 1 || workers > 20) {
      toast({
        title: "Error",
        description: "Workers must be between 1 and 20.",
        variant: "destructive",
      });
      return;
    }

    if (batchSize < 1 || batchSize > 200) {
      toast({
        title: "Error",
        description: "Batch size must be between 1 and 200.",
        variant: "destructive",
      });
      return;
    }

    const campaignData = {
      projectIds: Array.from(selectedProjects),
      selectedUsers: Object.fromEntries(
        Object.entries(selectedUsers).map(([projectId, userSet]) => [
          projectId,
          Array.from(userSet)
        ])
      ),
      workers,
      batchSize,
    };

    createCampaign(campaignData);
    setShowCreateForm(false);
    
    toast({
      title: "Campaign Created",
      description: `Campaign created with ${totalUsers} users across ${selectedProjects.size} projects.`,
    });
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await startCampaign(campaignId);
      toast({
        title: "Campaign Started",
        description: "Password reset campaign is now running.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start campaign.",
        variant: "destructive",
      });
    }
  };

  // Filter out disabled users for display
  const getActiveUsers = (projectId: string) => {
    return (users[projectId] || []).filter(user => !user.disabled);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-gray-400">Create and monitor password reset email campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={currentCampaign?.status === 'running'}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Monitor */}
      {currentCampaign && (currentCampaign.status === 'running' || currentCampaign.status === 'paused') && (
        <CampaignMonitor />
      )}

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaign Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Workers</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={workers}
                  onChange={(e) => setWorkers(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Parallel processing threads (1-20)</p>
              </div>
              <div>
                <Label className="text-gray-300">Batch Size</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Users per batch (1-200)</p>
              </div>
              <div>
                <Label className="text-gray-300">Estimated Duration</Label>
                <div className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
                  <span className="text-white">
                    ~{Math.ceil((Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0) * 150) / 1000 / 60)} min
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1">Based on 150ms per email</p>
              </div>
            </div>

            {/* Project & User Selection */}
            <div>
              <Label className="text-gray-300 text-lg font-semibold">Select Projects & Users</Label>
              <div className="mt-4 space-y-4">
                {projects.filter(p => p.status === 'active').map((project) => {
                  const activeUsers = getActiveUsers(project.id);
                  const selectedCount = selectedUsers[project.id]?.size || 0;
                  
                  return (
                    <Card key={project.id} className="bg-gray-700 border-gray-600">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedProjects.has(project.id)}
                              onCheckedChange={(checked) => handleProjectSelect(project.id, checked as boolean)}
                            />
                            <div>
                              <h4 className="text-white font-medium">{project.name}</h4>
                              <p className="text-gray-400 text-sm">{project.adminEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-medium">
                              {activeUsers.length} active users
                            </p>
                            {selectedCount > 0 && (
                              <p className="text-blue-400 text-xs">
                                {selectedCount} selected
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {selectedProjects.has(project.id) && activeUsers.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-300 text-sm">
                              Available Users ({activeUsers.length})
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAllUsers(project.id)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-600"
                            >
                              {selectedCount === activeUsers.length ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {activeUsers.slice(0, 20).map((user) => (
                              <div key={user.uid} className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedUsers[project.id]?.has(user.uid) || false}
                                  onCheckedChange={(checked) => handleUserSelect(project.id, user.uid, checked as boolean)}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-sm truncate block">{user.email}</span>
                                  {user.displayName && (
                                    <span className="text-gray-400 text-xs">{user.displayName}</span>
                                  )}
                                </div>
                                {user.emailVerified && (
                                  <span className="text-green-400 text-xs">✓</span>
                                )}
                              </div>
                            ))}
                            {activeUsers.length > 20 && (
                              <p className="text-gray-500 text-xs text-center py-2">
                                ... and {activeUsers.length - 20} more users
                              </p>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Campaign Summary */}
            {Object.values(selectedUsers).some(userSet => userSet.size > 0) && (
              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <h4 className="text-blue-300 font-medium mb-2">Campaign Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Users</p>
                    <p className="text-white font-medium">
                      {Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Projects</p>
                    <p className="text-white font-medium">{selectedProjects.size}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Batches</p>
                    <p className="text-white font-medium">
                      {Math.ceil(Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0) / batchSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Est. Time</p>
                    <p className="text-white font-medium">
                      ~{Math.ceil((Object.values(selectedUsers).reduce((sum, userSet) => sum + userSet.size, 0) * 150) / 1000 / 60)} min
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCreateCampaign}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Create Campaign
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Campaign History</h2>
        {campaigns.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Send className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Yet</h3>
              <p className="text-gray-400">
                Create your first password reset campaign to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-white">Campaign #{campaign.id.slice(-4)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      campaign.status === 'running' ? 'bg-orange-500/20 text-orange-500' :
                      campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                      campaign.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                      'bg-gray-500/20 text-gray-500'
                    }`}>
                      {campaign.status}
                    </span>
                    {campaign.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartCampaign(campaign.id)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Projects</p>
                      <p className="text-white font-medium">{campaign.projectIds.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Users</p>
                      <p className="text-white font-medium">
                        {Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Success Rate</p>
                      <p className="text-white font-medium">
                        {campaign.processed > 0 ? Math.round((campaign.successful / campaign.processed) * 100) : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Workers</p>
                      <p className="text-white font-medium">{campaign.workers}</p>
                    </div>
                  </div>
                  
                  {campaign.status !== 'pending' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">
                          {campaign.processed} / {Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${(campaign.processed / Object.values(campaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Created: {new Date(campaign.createdAt).toLocaleString()}
                    {campaign.completedAt && (
                      <span> • Completed: {new Date(campaign.completedAt).toLocaleString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

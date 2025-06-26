
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Send, Play, Users, Settings, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export const CampaignsPage = () => {
  const { projects, users, createCampaign, startCampaign, campaigns, currentCampaign } = useApp();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<{ [projectId: string]: Set<string> }>({});
  const [workers, setWorkers] = useState(5);
  const [batchSize, setBatchSize] = useState(10);

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
        : new Set(projectUsers.map(u => u.uid))
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

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-gray-400">Create and monitor password reset email campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {currentCampaign && currentCampaign.status === 'running' && (
        <Card className="bg-gray-800 border-gray-700 border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
              Campaign Running
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{currentCampaign.processed}</p>
                <p className="text-gray-400 text-sm">Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{currentCampaign.successful}</p>
                <p className="text-gray-400 text-sm">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{currentCampaign.failed}</p>
                <p className="text-gray-400 text-sm">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{currentCampaign.workers}</p>
                <p className="text-gray-400 text-sm">Workers</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">
                  {Object.values(currentCampaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)} total users
                </span>
              </div>
              <Progress 
                value={(currentCampaign.processed / Object.values(currentCampaign.selectedUsers).reduce((sum, users) => sum + users.length, 0)) * 100} 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div>
                <Label className="text-gray-300">Batch Size</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-lg font-semibold">Select Projects & Users</Label>
              <div className="mt-4 space-y-4">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3">
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
                    </CardHeader>
                    
                    {selectedProjects.has(project.id) && users[project.id] && (
                      <CardContent className="pt-0">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-300 text-sm">Users ({users[project.id].length})</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllUsers(project.id)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-600"
                          >
                            {(selectedUsers[project.id]?.size || 0) === users[project.id].length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {users[project.id].map((user) => (
                            <div key={user.uid} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedUsers[project.id]?.has(user.uid) || false}
                                onCheckedChange={(checked) => handleUserSelect(project.id, user.uid, checked as boolean)}
                              />
                              <span className="text-white text-sm">{user.email}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>

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
                  <div className="grid grid-cols-3 gap-4 text-sm">
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

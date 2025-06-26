
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { Activity, Clock, Mail, AlertTriangle, Pause, Play, BarChart3, Zap, Users, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export const EnhancedCampaignMonitor = () => {
  const { currentCampaign, projects, pauseCampaign, resumeCampaign } = useEnhancedApp();

  if (!currentCampaign) return null;

  const totalUsers = Object.values(currentCampaign.selectedUsers).reduce((sum, users) => sum + users.length, 0);
  const progressPercentage = (currentCampaign.processed / totalUsers) * 100;
  const successRate = currentCampaign.processed > 0 ? (currentCampaign.successful / currentCampaign.processed) * 100 : 0;
  const totalWorkers = currentCampaign.workers * currentCampaign.projectIds.length;
  const estimatedTimeRemaining = ((totalUsers - currentCampaign.processed) * 150) / 1000 / 60; // minutes

  const handlePauseResume = () => {
    if (currentCampaign.status === 'running') {
      pauseCampaign(currentCampaign.id);
    } else if (currentCampaign.status === 'paused') {
      resumeCampaign(currentCampaign.id);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-orange-500/50 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className={`w-6 h-6 ${
              currentCampaign.status === 'running' ? 'text-orange-500 animate-pulse' : 'text-yellow-500'
            }`} />
            <div>
              <span className="text-xl">{currentCampaign.name}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                  {currentCampaign.status.toUpperCase()}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                  Multi-Project
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                  {currentCampaign.projectIds.length} Projects
                </Badge>
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {(currentCampaign.status === 'running' || currentCampaign.status === 'paused') && (
              <Button
                size="sm"
                onClick={handlePauseResume}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {currentCampaign.status === 'running' ? (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-white font-medium">
              {currentCampaign.processed} / {totalUsers} users ({progressPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-4" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Processed</span>
            </div>
            <p className="text-2xl font-bold text-white">{currentCampaign.processed}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Successful</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{currentCampaign.successful}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-gray-400 text-sm">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{currentCampaign.failed}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Success Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">{successRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 font-medium">Performance</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-white">Total Workers: <span className="font-medium">{totalWorkers}</span></p>
              <p className="text-white">Batch Size: <span className="font-medium">{currentCampaign.batchSize}</span></p>
              <p className="text-gray-400">~{Math.round(60000 / 150)} emails/min per project</p>
            </div>
          </div>
          
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 font-medium">Timing</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-white">Time Remaining: <span className="font-medium">~{Math.max(0, estimatedTimeRemaining).toFixed(0)} min</span></p>
              <p className="text-white">Started: <span className="font-medium">
                {currentCampaign.startedAt ? new Date(currentCampaign.startedAt).toLocaleTimeString() : 'Not started'}
              </span></p>
              <p className="text-gray-400">Parallel execution across all projects</p>
            </div>
          </div>
          
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 font-medium">Distribution</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-white">Projects: <span className="font-medium">{currentCampaign.projectIds.length}</span></p>
              <p className="text-white">Avg per project: <span className="font-medium">
                {Math.round(totalUsers / currentCampaign.projectIds.length)}
              </span></p>
              <p className="text-gray-400">Load balanced distribution</p>
            </div>
          </div>
        </div>

        {/* Per-Project Progress */}
        <div className="space-y-3">
          <h4 className="text-white font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Per-Project Progress
          </h4>
          <div className="space-y-2">
            {currentCampaign.projectIds.map(projectId => {
              const project = projects.find(p => p.id === projectId);
              const projectStats = currentCampaign.projectStats[projectId] || { processed: 0, successful: 0, failed: 0 };
              const projectUsers = currentCampaign.selectedUsers[projectId]?.length || 0;
              const projectProgress = projectUsers > 0 ? (projectStats.processed / projectUsers) * 100 : 0;
              
              return (
                <div key={projectId} className="bg-gray-700/30 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-white font-medium">{project?.name || projectId}</span>
                      <span className="text-gray-400 text-sm ml-2">({projectUsers} users)</span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-white">{projectStats.processed}/{projectUsers}</span>
                      <span className="text-gray-400 ml-2">({projectProgress.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <Progress value={projectProgress} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">{projectStats.successful} successful</span>
                    <span className="text-red-400">{projectStats.failed} failed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Log */}
        {currentCampaign.errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 font-medium">Recent Errors ({currentCampaign.errors.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {currentCampaign.errors.slice(-5).map((error, index) => (
                <p key={index} className="text-red-300 text-xs font-mono">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Info */}
        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-700 pt-4">
          <p>Campaign ID: {currentCampaign.id}</p>
          <p>Created: {new Date(currentCampaign.createdAt).toLocaleString()}</p>
          <p>Template: {currentCampaign.template || 'Default Firebase template'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

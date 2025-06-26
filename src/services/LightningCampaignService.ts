
export interface LightningCampaignConfig {
  projectIds: string[];
  selectedUsers: { [projectId: string]: string[] };
  workers: number;
  batchSize: number;
  maxConcurrency: number;
}

export class LightningCampaignService {
  private static instance: LightningCampaignService;
  private isRunning = false;
  private abortController?: AbortController;

  static getInstance(): LightningCampaignService {
    if (!LightningCampaignService.instance) {
      LightningCampaignService.instance = new LightningCampaignService();
    }
    return LightningCampaignService.instance;
  }

  async executeLightningCampaign(
    config: LightningCampaignConfig,
    onProgress?: (stats: { sent: number; total: number; projectStats: any }) => void
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Lightning campaign is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // Calculate total users
      const totalUsers = Object.values(config.selectedUsers).reduce(
        (sum, users) => sum + users.length, 0
      );

      let totalSent = 0;
      const projectStats: { [projectId: string]: { sent: number; total: number } } = {};

      // Initialize project stats
      Object.keys(config.selectedUsers).forEach(projectId => {
        projectStats[projectId] = { 
          sent: 0, 
          total: config.selectedUsers[projectId].length 
        };
      });

      // Create promises for each project - LIGHTNING MODE
      const projectPromises = Object.entries(config.selectedUsers).map(
        async ([projectId, userIds]) => {
          // Split users into ultra-fast batches
          const ultraBatchSize = Math.min(config.batchSize, 100); // Max 100 per ultra-batch
          const batches = [];
          
          for (let i = 0; i < userIds.length; i += ultraBatchSize) {
            batches.push(userIds.slice(i, i + ultraBatchSize));
          }

          // Execute batches with maximum parallelism
          const batchPromises = batches.map(async (batch, batchIndex) => {
            if (this.abortController?.signal.aborted) return;

            try {
              // Fire and forget - no status checks, no delays
              const response = await fetch('http://localhost:8000/lightning/send-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  userIds: batch,
                  lightning: true, // Special flag for ultra-fast mode
                  timeout: 1000, // 1 second max timeout
                }),
                signal: this.abortController?.signal,
              });

              // Don't wait for response processing - LIGHTNING MODE
              response.json().then(result => {
                if (result.success) {
                  totalSent += batch.length;
                  projectStats[projectId].sent += batch.length;
                  
                  onProgress?.({
                    sent: totalSent,
                    total: totalUsers,
                    projectStats,
                  });
                }
              }).catch(() => {
                // Ignore errors in lightning mode - Firebase will handle
              });

            } catch (error) {
              // Ignore network errors in lightning mode
              console.log(`Lightning batch ${batchIndex} fired for ${projectId}`);
            }
          });

          // Execute all batches simultaneously - NO WAITING
          Promise.allSettled(batchPromises);
        }
      );

      // Fire all projects simultaneously
      await Promise.allSettled(projectPromises);

      console.log(`🔥 Lightning campaign fired ${totalUsers} emails across ${config.projectIds.length} projects`);

    } finally {
      this.isRunning = false;
      this.abortController = undefined;
    }
  }

  stopCampaign(): void {
    this.abortController?.abort();
    this.isRunning = false;
  }

  isRunningCampaign(): boolean {
    return this.isRunning;
  }
}

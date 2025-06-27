
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TestTube, Mail, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';

export const TestCampaign = () => {
  const { projects, profiles, activeProfile } = useEnhancedApp();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Filter projects by active profile
  const activeProjects = projects.filter(p => 
    (!activeProfile || p.profileId === activeProfile) && p.status === 'active'
  );

  const activeProfileName = profiles.find(p => p.id === activeProfile)?.name || 'All Projects';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject) {
      toast({
        title: "Project Required",
        description: "Please select a project for testing.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/test-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          projectId: selectedProject,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Email Sent! ✨",
          description: `Password reset email sent to ${testEmail}. User was temporarily added and removed from the project.`,
        });
        
        // Clear form
        setTestEmail('');
        setSelectedProject('');
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Test Campaign</h1>
        <p className="text-gray-400">
          Profile: <span className="text-blue-400 font-medium">{activeProfileName}</span> • 
          Test password reset functionality with a single email
        </p>
      </div>

      <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TestTube className="w-5 h-5 text-green-500" />
            Quick Test Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-blue-300 text-sm">
                <p className="font-medium mb-1">How Test Mode Works:</p>
                <ul className="text-xs space-y-1">
                  <li>• Temporarily adds the test email to the selected project</li>
                  <li>• Sends a password reset email to that address</li>
                  <li>• Immediately removes the user from the project</li>
                  <li>• All happens in one quick operation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testEmail" className="text-gray-300">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={sendTestEmail}
              disabled={isTesting || !testEmail || !selectedProject}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {activeProjects.length === 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400">
                No active projects in current profile
              </Badge>
            )}
          </div>

          {testEmail && selectedProject && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-white font-medium">Test Configuration</span>
              </div>
              <div className="text-gray-400 text-sm space-y-1">
                <p>Email: <span className="text-white">{testEmail}</span></p>
                <p>Project: <span className="text-white">{activeProjects.find(p => p.id === selectedProject)?.name}</span></p>
                <p>Action: Temporary user creation → Send reset email → User deletion</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

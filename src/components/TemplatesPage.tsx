
import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { FileText, Eye, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export const TemplatesPage = () => {
  const { projects } = useEnhancedApp();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templates, setTemplates] = useState<{[key: string]: string}>({});

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setCurrentTemplate(templates[projectId] || '');
  };

  const handleSave = () => {
    if (!selectedProject) return;
    
    setTemplates(prev => ({ ...prev, [selectedProject]: currentTemplate }));
    toast({
      title: "Template Saved",
      description: "Email template has been saved successfully.",
    });
  };

  const previewTemplate = currentTemplate.replace('{{reset_link}}', 'https://example.com/reset?token=sample-token');

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Email Templates</h1>
        <p className="text-gray-400">Create and edit HTML templates for password reset emails</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Project Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a Firebase project" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-600">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                HTML Editor
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-400 font-medium mb-2">Template Variables</h4>
                  <p className="text-gray-300 text-sm">
                    Use <code className="bg-gray-700 px-2 py-1 rounded text-blue-300">{'{{reset_link}}'}</code> in your template. 
                    It will be replaced with the actual Firebase password reset link.
                  </p>
                </div>
                <Textarea
                  value={currentTemplate}
                  onChange={(e) => setCurrentTemplate(e.target.value)}
                  placeholder="Enter your HTML template here..."
                  className="min-h-[400px] bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {showPreview && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-4 min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: previewTemplate }} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedProject && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Project</h3>
            <p className="text-gray-400">
              Choose a Firebase project to edit its email template.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

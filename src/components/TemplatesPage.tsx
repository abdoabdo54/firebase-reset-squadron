
import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { FileText, Eye, Save, Sparkles, Bot, Wand2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const TemplatesPage = () => {
  const { projects, profiles, activeProfile } = useEnhancedApp();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templates, setTemplates] = useState<{[key: string]: string}>({});
  
  // AI Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gptApiKey, setGptApiKey] = useState('');
  const [selectedAI, setSelectedAI] = useState<'gemini' | 'gpt'>('gemini');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');

  // Filter projects by active profile
  const activeProjects = projects.filter(p => 
    (!activeProfile || p.profileId === activeProfile) && p.status === 'active'
  );

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

  const generateWithAI = async () => {
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    const apiKey = selectedAI === 'gemini' ? geminiApiKey : gptApiKey;
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: `Please enter your ${selectedAI === 'gemini' ? 'Gemini' : 'GPT'} API key.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const project = activeProjects.find(p => p.id === selectedProject);
      const basePrompt = `Generate a professional password reset email template for ${project?.name || 'our application'}. 
      
      Requirements:
      - Professional and trustworthy tone
      - Clear call-to-action
      - Include {{reset_link}} placeholder for the reset link
      - HTML format with inline CSS for email compatibility
      - Avoid spam trigger words
      - Include security best practices messaging
      - Company branding friendly
      - Mobile responsive design
      
      ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}
      
      Generate both the email template and a professional subject line.`;

      let response;
      let htmlTemplate = '';
      let subject = '';

      if (selectedAI === 'gemini') {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: basePrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          }),
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
          const content = data.candidates[0].content.parts[0].text;
          // Extract subject and template from the response
          const subjectMatch = content.match(/Subject:\s*(.+)/i);
          if (subjectMatch) {
            subject = subjectMatch[1].trim();
          }
          // Extract HTML template (everything after the subject line)
          const templateMatch = content.match(/(?:template|html):\s*([\s\S]+)/i);
          if (templateMatch) {
            htmlTemplate = templateMatch[1].trim();
          } else {
            htmlTemplate = content;
          }
        }
      } else {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a professional email template designer. Generate clean, professional HTML email templates with inline CSS.'
              },
              {
                role: 'user',
                content: basePrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          const content = data.choices[0].message.content;
          // Extract subject and template from the response
          const subjectMatch = content.match(/Subject:\s*(.+)/i);
          if (subjectMatch) {
            subject = subjectMatch[1].trim();
          }
          // Extract HTML template
          const templateMatch = content.match(/(?:template|html):\s*([\s\S]+)/i);
          if (templateMatch) {
            htmlTemplate = templateMatch[1].trim();
          } else {
            htmlTemplate = content;
          }
        }
      }

      if (htmlTemplate) {
        setCurrentTemplate(htmlTemplate);
        setGeneratedSubject(subject || 'Password Reset Request');
        toast({
          title: "Template Generated!",
          description: `Professional email template generated using ${selectedAI === 'gemini' ? 'Gemini' : 'GPT'}.`,
        });
      } else {
        throw new Error('No template generated');
      }

    } catch (error) {
      console.error('AI Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate template. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const previewTemplate = currentTemplate.replace('{{reset_link}}', 'https://example.com/reset?token=sample-token');
  const activeProfileName = profiles.find(p => p.id === activeProfile)?.name || 'All Projects';

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Email Templates</h1>
        <p className="text-gray-400">
          Profile: <span className="text-blue-400 font-medium">{activeProfileName}</span> • 
          Create and edit HTML templates for password reset emails with AI assistance
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Project Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a Firebase project from current profile" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {activeProjects.map((project) => (
                <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-600">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* AI Generation Section */}
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Template Generator
                <Badge className="bg-purple-500/20 text-purple-400">Beta</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">AI Provider</Label>
                  <Select value={selectedAI} onValueChange={(value: 'gemini' | 'gpt') => setSelectedAI(value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="gemini" className="text-white hover:bg-gray-600">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-blue-400" />
                          Google Gemini
                        </div>
                      </SelectItem>
                      <SelectItem value="gpt" className="text-white hover:bg-gray-600">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-400" />
                          OpenAI GPT
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">
                    {selectedAI === 'gemini' ? 'Gemini' : 'GPT'} API Key
                  </Label>
                  <Input
                    type="password"
                    value={selectedAI === 'gemini' ? geminiApiKey : gptApiKey}
                    onChange={(e) => selectedAI === 'gemini' 
                      ? setGeminiApiKey(e.target.value) 
                      : setGptApiKey(e.target.value)
                    }
                    placeholder={`Enter your ${selectedAI === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300">Custom Instructions (Optional)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add specific requirements for your email template (e.g., brand colors, specific messaging, etc.)"
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>

              {generatedSubject && (
                <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
                  <Label className="text-green-400 text-sm">Generated Subject Line:</Label>
                  <p className="text-white font-medium">{generatedSubject}</p>
                </div>
              )}

              <Button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

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
                    placeholder="Enter your HTML template here or generate one with AI..."
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
        </>
      )}

      {!selectedProject && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Project</h3>
            <p className="text-gray-400">
              Choose a Firebase project from the current profile to edit its email template.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

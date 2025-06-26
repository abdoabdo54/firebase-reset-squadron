
import { useState } from 'react';
import { useEnhancedApp } from '@/contexts/EnhancedAppContext';
import { FileText, Eye, Save, Sparkles, Bot, Wand2, Zap, Mail, Type, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export const TemplatesPage = () => {
  const { projects, profiles, activeProfile } = useEnhancedApp();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState('');
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentFrom, setCurrentFrom] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templates, setTemplates] = useState<{[key: string]: {template: string, subject: string, from: string}}>({});
  
  // AI Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<'template' | 'subject' | 'from' | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gptApiKey, setGptApiKey] = useState('');
  const [selectedAI, setSelectedAI] = useState<'gemini' | 'gpt'>('gemini');
  const [customPrompt, setCustomPrompt] = useState('');

  // Filter projects by active profile
  const activeProjects = projects.filter(p => 
    (!activeProfile || p.profileId === activeProfile) && p.status === 'active'
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    const saved = templates[projectId];
    if (saved) {
      setCurrentTemplate(saved.template || '');
      setCurrentSubject(saved.subject || '');
      setCurrentFrom(saved.from || '');
    } else {
      setCurrentTemplate('');
      setCurrentSubject('');
      setCurrentFrom('');
    }
  };

  const handleSave = () => {
    if (!selectedProject) return;
    
    setTemplates(prev => ({ 
      ...prev, 
      [selectedProject]: {
        template: currentTemplate,
        subject: currentSubject,
        from: currentFrom
      }
    }));
    toast({
      title: "Template Saved",
      description: "Email template, subject, and from fields have been saved successfully.",
    });
  };

  const generateWithAI = async (type: 'template' | 'subject' | 'from') => {
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
    setGeneratingType(type);
    
    try {
      const project = activeProjects.find(p => p.id === selectedProject);
      let basePrompt = '';

      switch (type) {
        case 'template':
          basePrompt = `Generate a professional password reset email template for ${project?.name || 'our application'}. 
          
          Requirements:
          - Professional and trustworthy tone
          - Clear call-to-action
          - Include {{reset_link}} placeholder for the reset link
          - HTML format with inline CSS for email compatibility
          - Avoid spam trigger words like "free", "urgent", "act now", "click here", "guaranteed"
          - Include security best practices messaging
          - Company branding friendly
          - Mobile responsive design
          - Use professional language without excessive exclamation marks
          - Focus on user security and trust
          - Include clear instructions for the user
          
          ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}
          
          Return only the HTML template without any additional text or formatting.`;
          break;
          
        case 'subject':
          basePrompt = `Generate a professional subject line for a password reset email from ${project?.name || 'our application'}.
          
          Requirements:
          - Professional and trustworthy tone
          - Clear and concise (under 50 characters)
          - Avoid spam trigger words like "free", "urgent", "act now", "guaranteed"
          - No excessive punctuation or caps
          - Focus on security and trust
          - Make it clear it's about password reset
          
          ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}
          
          Return only the subject line without quotes or additional text.`;
          break;
          
        case 'from':
          basePrompt = `Generate a professional "from" field for a password reset email from ${project?.name || 'our application'}.
          
          Requirements:
          - Professional format like "Company Name <noreply@domain.com>"
          - Trustworthy sender name
          - Use noreply or security related email prefix
          - Avoid spam trigger words
          - Professional appearance
          
          ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}
          
          Return only the from field in the format "Display Name <email@domain.com>" without additional text.`;
          break;
      }

      let response;
      let content = '';

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
              maxOutputTokens: type === 'template' ? 2048 : 256,
            }
          }),
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
          content = data.candidates[0].content.parts[0].text.trim();
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
                content: 'You are a professional email template designer. Generate clean, professional content that avoids spam triggers and focuses on user security.'
              },
              {
                role: 'user',
                content: basePrompt
              }
            ],
            temperature: 0.7,
            max_tokens: type === 'template' ? 2048 : 256,
          }),
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          content = data.choices[0].message.content.trim();
        }
      }

      if (content) {
        switch (type) {
          case 'template':
            setCurrentTemplate(content);
            break;
          case 'subject':
            setCurrentSubject(content);
            break;
          case 'from':
            setCurrentFrom(content);
            break;
        }
        
        toast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Generated Successfully! ✨`,
          description: `Professional ${type} generated using ${selectedAI === 'gemini' ? 'Gemini' : 'GPT'} AI.`,
        });
      } else {
        throw new Error('No content generated');
      }

    } catch (error) {
      console.error('AI Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  const previewTemplate = currentTemplate.replace('{{reset_link}}', 'https://example.com/reset?token=sample-token');
  const activeProfileName = profiles.find(p => p.id === activeProfile)?.name || 'All Projects';

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI-Powered Email Templates</h1>
        <p className="text-gray-400">
          Profile: <span className="text-blue-400 font-medium">{activeProfileName}</span> • 
          Create professional email templates with AI assistance
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
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* AI Configuration */}
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Configuration
                <Badge className="bg-purple-500/20 text-purple-400">Professional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Provider
                  </Label>
                  <Select value={selectedAI} onValueChange={(value: 'gemini' | 'gpt') => setSelectedAI(value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="gemini" className="text-white hover:bg-gray-600">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-blue-400" />
                          Google Gemini Pro
                        </div>
                      </SelectItem>
                      <SelectItem value="gpt" className="text-white hover:bg-gray-600">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-400" />
                          OpenAI GPT-4
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">
                    {selectedAI === 'gemini' ? 'Gemini Pro' : 'GPT-4'} API Key
                  </Label>
                  <Input
                    type="password"
                    value={selectedAI === 'gemini' ? geminiApiKey : gptApiKey}
                    onChange={(e) => selectedAI === 'gemini' 
                      ? setGeminiApiKey(e.target.value) 
                      : setGptApiKey(e.target.value)
                    }
                    placeholder={`Enter your ${selectedAI === 'gemini' ? 'Gemini Pro' : 'OpenAI'} API key`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300">Custom Instructions (Optional)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add specific requirements: brand colors, tone, additional security features, etc."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Generation Tabs */}
          <Tabs defaultValue="from" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="from" className="text-white data-[state=active]:bg-gray-700">
                <Mail className="w-4 h-4 mr-2" />
                From Field
              </TabsTrigger>
              <TabsTrigger value="subject" className="text-white data-[state=active]:bg-gray-700">
                <Type className="w-4 h-4 mr-2" />
                Subject Line
              </TabsTrigger>
              <TabsTrigger value="template" className="text-white data-[state=active]:bg-gray-700">
                <FileCode className="w-4 h-4 mr-2" />
                HTML Template
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="from" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">From Field Generator</CardTitle>
                  <Button
                    onClick={() => generateWithAI('from')}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating && generatingType === 'from' ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate From Field
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Input
                    value={currentFrom}
                    onChange={(e) => setCurrentFrom(e.target.value)}
                    placeholder="Company Name <noreply@company.com>"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="subject" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Subject Line Generator</CardTitle>
                  <Button
                    onClick={() => generateWithAI('subject')}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating && generatingType === 'subject' ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Subject
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Input
                    value={currentSubject}
                    onChange={(e) => setCurrentSubject(e.target.value)}
                    placeholder="Password Reset Request"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="template" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">HTML Template Generator</CardTitle>
                  <Button
                    onClick={() => generateWithAI('template')}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating && generatingType === 'template' ? (
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
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <h4 className="text-blue-400 font-medium mb-2">Template Variables</h4>
                    <p className="text-gray-300 text-sm">
                      Use <code className="bg-gray-700 px-2 py-1 rounded text-blue-300">{'{{reset_link}}'}</code> in your template. 
                      It will be replaced with the actual Firebase password reset link when sent.
                    </p>
                  </div>
                  <Textarea
                    value={currentTemplate}
                    onChange={(e) => setCurrentTemplate(e.target.value)}
                    placeholder="Enter your HTML template here or generate one with AI..."
                    className="min-h-[300px] bg-gray-700 border-gray-600 text-white font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save and Preview */}
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Fields
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Email Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">From:</div>
                  <div className="text-white">{currentFrom || 'No from field set'}</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Subject:</div>
                  <div className="text-white">{currentSubject || 'No subject set'}</div>
                </div>
                <div className="bg-white rounded-lg p-4 min-h-[400px] shadow-inner">
                  {currentTemplate ? (
                    <div dangerouslySetInnerHTML={{ __html: previewTemplate }} />
                  ) : (
                    <div className="text-gray-500 text-center py-8">No template content</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedProject && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Project</h3>
            <p className="text-gray-400">
              Choose a Firebase project from the current profile to create professional email templates with AI assistance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

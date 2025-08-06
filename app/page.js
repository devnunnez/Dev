'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  Code, 
  Play, 
  Download, 
  Sparkles, 
  Bot, 
  User, 
  FileCode, 
  Database, 
  Zap,
  Palette,
  Globe,
  Layers,
  Magic,
  Rocket
} from 'lucide-react'
import Editor from '@monaco-editor/react'

export default function App() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [projectType, setProjectType] = useState('component')
  const [previewUrl, setPreviewUrl] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          projectType: projectType,
          conversationHistory: messages.slice(-5) // Last 5 messages for context
        }),
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.explanation,
          code: data.code,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiMessage])
        setGeneratedCode(data.code)
        setActiveTab('code')
        
        // Generate preview if it's a React component
        if (data.code && projectType === 'component') {
          generatePreview(data.code)
        }
      } else {
        throw new Error(data.error || 'Failed to generate code')
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const generatePreview = async (code) => {
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      if (data.success) {
        setPreviewUrl(data.previewUrl)
      }
    } catch (error) {
      console.error('Preview generation failed:', error)
    }
  }

  const projectTypes = [
    { id: 'component', label: 'React Component', icon: <Code className="w-4 h-4" /> },
    { id: 'fullstack', label: 'Full-Stack App', icon: <Layers className="w-4 h-4" /> },
    { id: 'frontend', label: 'Frontend App', icon: <Palette className="w-4 h-4" /> },
    { id: 'backend', label: 'Backend API', icon: <Database className="w-4 h-4" /> },
  ]

  const examplePrompts = [
    "Create a modern todo app with drag and drop functionality",
    "Build a dashboard with charts and analytics",
    "Make a beautiful landing page for a SaaS product",
    "Create a chat application with real-time messaging",
    "Build a blog platform with markdown support"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto max-w-7xl h-screen flex flex-col p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <Magic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Code Generator
              </h1>
              <p className="text-sm text-muted-foreground">Build full-stack apps with AI assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              OpenAI GPT-4
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Rocket className="w-3 h-3" />
              Live Preview
            </Badge>
          </div>
        </header>

        {/* Project Type Selector */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {projectTypes.map((type) => (
              <Button
                key={type.id}
                variant={projectType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setProjectType(type.id)}
                className="gap-2"
              >
                {type.icon}
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Chat Section */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Welcome to AI Code Generator!</h3>
                    <p className="text-muted-foreground mb-6">
                      Describe what you want to build and I'll generate the code for you.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-left">Try these examples:</p>
                      {examplePrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full text-left justify-start h-auto p-3 text-xs"
                          onClick={() => setInputValue(prompt)}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div className={`flex gap-2 max-w-[80%] ${
                          message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg p-3 ${
                            message.type === 'user' 
                              ? 'bg-primary text-primary-foreground ml-2' 
                              : message.type === 'error'
                              ? 'bg-destructive/10 text-destructive border border-destructive/20 mr-2'
                              : 'bg-muted mr-2'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.code && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="mb-2">
                                  <FileCode className="w-3 h-3 mr-1" />
                                  Generated Code
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg p-3 mr-2">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span className="text-sm">Generating code...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe what you want to build..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isGenerating}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Editor & Preview Section */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Code Editor
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Play className="w-3 h-3" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="mx-4 mb-2">
                  <TabsTrigger value="chat" className="gap-1">
                    <Bot className="w-3 h-3" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-1">
                    <FileCode className="w-3 h-3" />
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1">
                    <Globe className="w-3 h-3" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 m-0 p-4">
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Chat with AI</h3>
                      <p className="text-muted-foreground">
                        Start a conversation to generate code
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="flex-1 m-0">
                  <div className="h-full">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      value={generatedCode || '// Generated code will appear here...'}
                      onChange={(value) => setGeneratedCode(value)}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 1.5,
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 m-0 p-4">
                  <div className="h-full bg-muted rounded-lg flex items-center justify-center">
                    {previewUrl ? (
                      <iframe 
                        src={previewUrl} 
                        className="w-full h-full rounded-lg border"
                        title="Code Preview"
                      />
                    ) : (
                      <div className="text-center">
                        <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Live Preview</h3>
                        <p className="text-muted-foreground">
                          Generate code to see live preview
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
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
  Wand2 as Magic,
  Rocket,
  MessageCircle,
  Settings,
  RefreshCw
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
  const [currentModel, setCurrentModel] = useState('Carregando...')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Verificar status da API ao carregar
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/')
      const data = await response.json()
      if (data.currentModel) {
        setCurrentModel(data.currentModel)
      }
    } catch (error) {
      console.error('Erro ao verificar status da API:', error)
    }
  }

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
          conversationHistory: messages.slice(-5) // Últimas 5 mensagens para contexto
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
        
        // Atualizar modelo atual se fornecido
        if (data.model) {
          setCurrentModel(data.model)
        }
        
        // Gerar preview se for um componente React
        if (data.code && projectType === 'component') {
          generatePreview(data.code)
        }
      } else {
        throw new Error(data.error || 'Falha ao gerar código')
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Erro: ${error.message}`,
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
      console.error('Falha na geração do preview:', error)
    }
  }

  const projectTypes = [
    { id: 'component', label: 'Componente React', icon: <Code className="w-4 h-4" /> },
    { id: 'fullstack', label: 'App Full-Stack', icon: <Layers className="w-4 h-4" /> },
    { id: 'frontend', label: 'App Frontend', icon: <Palette className="w-4 h-4" /> },
    { id: 'backend', label: 'API Backend', icon: <Database className="w-4 h-4" /> },
  ]

  const examplePrompts = [
    "Crie um app de tarefas moderno com funcionalidade de arrastar e soltar",
    "Construa um dashboard com gráficos e análises",
    "Faça uma landing page bonita para um produto SaaS",
    "Crie uma aplicação de chat com mensagens em tempo real",
    "Construa uma plataforma de blog com suporte a markdown"
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
                Gerador de Código IA
              </h1>
              <p className="text-sm text-muted-foreground">Construa apps full-stack com assistência de IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              {currentModel}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Rocket className="w-3 h-3" />
              Preview em Tempo Real
            </Badge>
          </div>
        </header>

        {/* Seletor de Tipo de Projeto */}
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

        {/* Conteúdo Principal */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Seção de Chat */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Assistente de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Bem-vindo ao Gerador de Código IA!</h3>
                    <p className="text-muted-foreground mb-6">
                      Descreva o que você quer construir e eu vou gerar o código para você.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-left">Experimente estes exemplos:</p>
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
                                  Código Gerado
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
                            <span className="text-sm">Gerando código...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Entrada */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Descreva o que você quer construir..."
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

          {/* Seção do Editor de Código e Preview */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Editor de Código
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Play className="w-3 h-3" />
                    Executar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="w-3 h-3" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="mx-4 mb-2">
                  <TabsTrigger value="chat" className="gap-1">
                    <MessageCircle className="w-3 h-3" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-1">
                    <FileCode className="w-3 h-3" />
                    Código
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
                      <h3 className="text-lg font-medium mb-2">Converse com a IA</h3>
                      <p className="text-muted-foreground">
                        Inicie uma conversa para gerar código
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="flex-1 m-0">
                  <div className="h-full">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      value={generatedCode || '// O código gerado aparecerá aqui...'}
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
                        title="Preview do Código"
                      />
                    ) : (
                      <div className="text-center">
                        <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Preview em Tempo Real</h3>
                        <p className="text-muted-foreground">
                          Gere código para ver o preview em tempo real
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
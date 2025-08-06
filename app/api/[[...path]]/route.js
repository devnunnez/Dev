import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Initialize AI services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// AI Code Generation Service with fallback
async function generateCode(prompt, projectType, conversationHistory = []) {
  const systemPrompts = {
    component: `Você é um desenvolvedor React especialista. Gere componentes React limpos e modernos usando:
- Componentes funcionais com hooks
- Tailwind CSS para estilização
- TypeScript quando apropriado
- Melhores práticas de acessibilidade
- Código limpo e legível

Sempre forneça código funcional e completo que possa ser usado imediatamente.`,

    fullstack: `Você é um desenvolvedor full-stack especialista. Gere aplicações completas com:
- Frontend React com hooks modernos
- APIs Node.js/Express backend
- Esquemas de banco MongoDB
- Tratamento adequado de erros
- Melhores práticas de segurança
- Arquitetura limpa

Forneça código tanto do frontend quanto do backend.`,

    frontend: `Você é um desenvolvedor frontend especialista. Crie aplicações web bonitas e responsivas usando:
- React moderno com hooks
- Tailwind CSS ou styled-components
- Design responsivo
- Otimização de performance
- Padrões de acessibilidade

Foque na experiência do usuário e apelo visual.`,

    backend: `Você é um desenvolvedor backend especialista. Crie serviços de API robustos com:
- Servidores Node.js/Express
- Operações de banco MongoDB
- Tratamento adequado de erros
- Validação de entrada
- Medidas de segurança
- Princípios de design RESTful

Forneça código backend completo e pronto para produção.`
  }

  const contextMessages = conversationHistory.map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.content
  }))

  const fullPrompt = `${prompt}\n\nPor favor, forneça:\n1. Uma breve explicação do que você está construindo\n2. Código completo e funcional\n3. Instruções de configuração, se necessário\n\nResponda em português.`

  // Try OpenAI first
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompts[projectType] || systemPrompts.component
        },
        ...contextMessages,
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const response = completion.choices[0].message.content
    
    // Extract code blocks from the response
    const codeBlocks = response.match(/```[\s\S]*?```/g) || []
    const code = codeBlocks.length > 0 ? 
      codeBlocks.map(block => block.replace(/```[\w]*\n?/, '').replace(/\n?```$/, '')).join('\n\n') : 
      ''
    
    // Extract explanation (text before first code block)
    const explanation = response.split('```')[0].trim()

    return {
      success: true,
      explanation: explanation || response,
      code: code || response,
      model: 'OpenAI GPT-4'
    }
  } catch (openaiError) {
    console.log('OpenAI failed, trying Gemini...', openaiError.message)
    
    // Fallback to Gemini
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" })
      
      const systemContext = systemPrompts[projectType] || systemPrompts.component
      const fullContextPrompt = `${systemContext}\n\n${fullPrompt}`
      
      const result = await model.generateContent(fullContextPrompt)
      const response = result.response.text()
      
      // Extract code blocks from the response
      const codeBlocks = response.match(/```[\s\S]*?```/g) || []
      const code = codeBlocks.length > 0 ? 
        codeBlocks.map(block => block.replace(/```[\w]*\n?/, '').replace(/\n?```$/, '')).join('\n\n') : 
        ''
      
      // Extract explanation (text before first code block)
      const explanation = response.split('```')[0].trim()

      return {
        success: true,
        explanation: explanation || response,
        code: code || response,
        model: 'Google Gemini'
      }
    } catch (geminiError) {
      console.log('Gemini failed, trying DeepSeek...', geminiError.message)
      
      // Fallback to DeepSeek (via OpenAI-compatible API)
      try {
        const deepseekOpenAI = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com'
        })

        const completion = await deepseekOpenAI.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: systemPrompts[projectType] || systemPrompts.component
            },
            ...contextMessages,
            {
              role: "user",
              content: fullPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        })

        const response = completion.choices[0].message.content
        
        // Extract code blocks from the response
        const codeBlocks = response.match(/```[\s\S]*?```/g) || []
        const code = codeBlocks.length > 0 ? 
          codeBlocks.map(block => block.replace(/```[\w]*\n?/, '').replace(/\n?```$/, '')).join('\n\n') : 
          ''
        
        // Extract explanation (text before first code block)
        const explanation = response.split('```')[0].trim()

        return {
          success: true,
          explanation: explanation || response,
          code: code || response,
          model: 'DeepSeek'
        }
      } catch (deepseekError) {
        console.log('DeepSeek failed, using fallback response...', deepseekError.message)
        
        // Final fallback - generate a basic template
        const fallbackCode = generateFallbackCode(projectType, prompt)
        return {
          success: true,
          explanation: `Gerei um código básico baseado no seu pedido: "${prompt}". Este é um template inicial que você pode customizar.`,
          code: fallbackCode,
          model: 'Template Interno'
        }
      }
    }
  }
}

// Generate basic fallback code when all AI services fail
function generateFallbackCode(projectType, prompt) {
  const templates = {
    component: `import React, { useState } from 'react'

// Componente gerado para: ${prompt}
export default function MeuComponente() {
  const [count, setCount] = useState(0)
  
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Meu Componente
      </h2>
      <p className="text-gray-600 mb-4">
        Este é um componente básico baseado em: {prompt}
      </p>
      <button 
        onClick={() => setCount(count + 1)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Contador: {count}
      </button>
    </div>
  )
}`,
    
    frontend: `import React, { useState, useEffect } from 'react'

// Aplicação frontend para: ${prompt}
function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setData(['Item 1', 'Item 2', 'Item 3'])
      setLoading(false)
    }, 1000)
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Aplicação Frontend
          </h1>
          <p className="text-gray-600">${prompt}</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center">Carregando...</div>
        ) : (
          <div className="grid gap-4">
            {data.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded shadow">
                {item}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App`,

    backend: `const express = require('express')
const { MongoClient } = require('mongodb')
const cors = require('cors')

// API Backend para: ${prompt}
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Conexão com MongoDB
let db

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  db = client.db('minha_aplicacao')
}

// Rota principal
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API funcionando!',
    description: '${prompt}'
  })
})

// CRUD endpoints
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.collection('items').find({}).toArray()
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/items', async (req, res) => {
  try {
    const result = await db.collection('items').insertOne(req.body)
    res.json({ id: result.insertedId, ...req.body })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(\`Servidor rodando na porta \${PORT}\`)
  })
})`,

    fullstack: `// Frontend - React App
import React, { useState, useEffect } from 'react'

function App() {
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  
  // Carregar itens da API
  useEffect(() => {
    fetchItems()
  }, [])
  
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Erro ao carregar items:', error)
    }
  }
  
  const addItem = async () => {
    if (!newItem.trim()) return
    
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem })
      })
      
      if (response.ok) {
        setNewItem('')
        fetchItems()
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error)
    }
  }
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">App Full-Stack</h1>
      <p className="text-gray-600 mb-4">${prompt}</p>
      
      <div className="mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="border rounded px-3 py-2 mr-2"
          placeholder="Adicionar item..."
        />
        <button
          onClick={addItem}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Adicionar
        </button>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded">
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

// Backend - API Server (código separado)
/*
const express = require('express')
const app = express()
app.use(express.json())

let items = []

app.get('/api/items', (req, res) => {
  res.json(items)
})

app.post('/api/items', (req, res) => {
  const item = { id: Date.now(), ...req.body }
  items.push(item)
  res.json(item)
})

app.listen(3001, () => console.log('API rodando na porta 3001'))
*/`
  }
  
  return templates[projectType] || templates.component
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ 
        message: "API do Gerador de Código IA",
        status: "funcionando",
        services: ["OpenAI GPT-4", "Google Gemini", "DeepSeek", "MongoDB"],
        currentModel: "Sistema Multi-IA"
      }))
    }

    // Generate code endpoint
    if (route === '/generate' && method === 'POST') {
      const body = await request.json()
      
      if (!body.message) {
        return handleCORS(NextResponse.json(
          { error: "Mensagem é obrigatória" }, 
          { status: 400 }
        ))
      }

      const result = await generateCode(
        body.message, 
        body.projectType || 'component',
        body.conversationHistory || []
      )

      // Save conversation to database
      try {
        const conversation = {
          id: uuidv4(),
          message: body.message,
          projectType: body.projectType || 'component',
          result: result,
          timestamp: new Date()
        }
        await db.collection('conversations').insertOne(conversation)
      } catch (dbError) {
        console.error('Erro ao salvar no banco:', dbError)
        // Continue even if DB save fails
      }

      return handleCORS(NextResponse.json(result))
    }

    // Preview generation endpoint
    if (route === '/preview' && method === 'POST') {
      const body = await request.json()
      
      if (!body.code) {
        return handleCORS(NextResponse.json(
          { error: "Código é obrigatório" }, 
          { status: 400 }
        ))
      }

      // For now, return a simple preview URL
      // In a full implementation, you'd create a sandboxed preview environment
      const previewId = uuidv4()
      
      try {
        await db.collection('previews').insertOne({
          id: previewId,
          code: body.code,
          timestamp: new Date()
        })
        
        return handleCORS(NextResponse.json({
          success: true,
          previewUrl: `/preview/${previewId}`,
          previewId: previewId
        }))
      } catch (error) {
        return handleCORS(NextResponse.json({
          success: false,
          error: 'Falha ao criar preview'
        }, { status: 500 }))
      }
    }

    // Get conversations history
    if (route === '/conversations' && method === 'GET') {
      const conversations = await db.collection('conversations')
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray()

      const cleanedConversations = conversations.map(({ _id, ...rest }) => rest)
      
      return handleCORS(NextResponse.json(cleanedConversations))
    }

    // Templates endpoint
    if (route === '/templates' && method === 'GET') {
      const templates = [
        {
          id: 'todo-app',
          name: 'Aplicação de Tarefas',
          description: 'Um app completo de tarefas com operações CRUD',
          type: 'fullstack',
          tags: ['React', 'Node.js', 'MongoDB']
        },
        {
          id: 'dashboard',
          name: 'Dashboard de Analytics',
          description: 'Dashboard com gráficos e visualização de dados',
          type: 'frontend',
          tags: ['React', 'Gráficos', 'Tailwind']
        },
        {
          id: 'landing-page',
          name: 'Landing Page SaaS',
          description: 'Landing page moderna com seção hero e recursos',
          type: 'frontend',
          tags: ['React', 'Tailwind', 'Responsivo']
        },
        {
          id: 'chat-app',
          name: 'Chat em Tempo Real',
          description: 'Aplicação de chat com mensagens em tempo real',
          type: 'fullstack',
          tags: ['React', 'Socket.io', 'MongoDB']
        },
        {
          id: 'blog-platform',
          name: 'Plataforma de Blog',
          description: 'Blog com suporte a markdown e CMS',
          type: 'fullstack',
          tags: ['React', 'Markdown', 'CMS']
        }
      ]

      return handleCORS(NextResponse.json(templates))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Rota ${route} não encontrada` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('Erro na API:', error)
    return handleCORS(NextResponse.json(
      { error: "Erro interno do servidor" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
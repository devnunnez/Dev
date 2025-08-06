import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

// AI Code Generation Service
async function generateCode(prompt, projectType, conversationHistory = []) {
  const systemPrompts = {
    component: `You are an expert React developer. Generate clean, modern React components using:
- Functional components with hooks
- Tailwind CSS for styling
- TypeScript when appropriate
- Best practices for accessibility
- Clean, readable code

Always provide working, complete code that can be used immediately.`,

    fullstack: `You are an expert full-stack developer. Generate complete applications with:
- React frontend with modern hooks
- Node.js/Express backend APIs
- MongoDB database schemas
- Proper error handling
- Security best practices
- Clean architecture

Provide both frontend and backend code.`,

    frontend: `You are an expert frontend developer. Create beautiful, responsive web applications using:
- Modern React with hooks
- Tailwind CSS or styled-components
- Responsive design
- Performance optimization
- Accessibility standards

Focus on user experience and visual appeal.`,

    backend: `You are an expert backend developer. Create robust API services with:
- Node.js/Express servers
- MongoDB database operations
- Proper error handling
- Input validation
- Security measures
- RESTful design principles

Provide complete, production-ready backend code.`
  }

  const contextMessages = conversationHistory.map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.content
  }))

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
          content: `${prompt}\n\nPlease provide:\n1. A brief explanation of what you're building\n2. Complete, working code\n3. Any setup instructions if needed`
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
      model: 'gpt-4-turbo'
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate code'
    }
  }
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
        message: "AI Code Generator API",
        status: "running",
        services: ["OpenAI GPT-4", "MongoDB", "Code Generation"]
      }))
    }

    // Generate code endpoint
    if (route === '/generate' && method === 'POST') {
      const body = await request.json()
      
      if (!body.message) {
        return handleCORS(NextResponse.json(
          { error: "Message is required" }, 
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
        console.error('Database save error:', dbError)
        // Continue even if DB save fails
      }

      return handleCORS(NextResponse.json(result))
    }

    // Preview generation endpoint
    if (route === '/preview' && method === 'POST') {
      const body = await request.json()
      
      if (!body.code) {
        return handleCORS(NextResponse.json(
          { error: "Code is required" }, 
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
          error: 'Failed to create preview'
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
          name: 'Todo Application',
          description: 'A complete todo app with CRUD operations',
          type: 'fullstack',
          tags: ['React', 'Node.js', 'MongoDB']
        },
        {
          id: 'dashboard',
          name: 'Analytics Dashboard',
          description: 'Dashboard with charts and data visualization',
          type: 'frontend',
          tags: ['React', 'Charts', 'Tailwind']
        },
        {
          id: 'landing-page',
          name: 'SaaS Landing Page',
          description: 'Modern landing page with hero section and features',
          type: 'frontend',
          tags: ['React', 'Tailwind', 'Responsive']
        },
        {
          id: 'chat-app',
          name: 'Real-time Chat',
          description: 'Chat application with real-time messaging',
          type: 'fullstack',
          tags: ['React', 'Socket.io', 'MongoDB']
        },
        {
          id: 'blog-platform',
          name: 'Blog Platform',
          description: 'Blog with markdown support and CMS',
          type: 'fullstack',
          tags: ['React', 'Markdown', 'CMS']
        }
      ]

      return handleCORS(NextResponse.json(templates))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
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
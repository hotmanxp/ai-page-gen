
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env')
console.log(`Loading environment variables from ${envPath}`)
dotenv.config({ path: envPath })
import pageRoutes, { setSocketIO } from './routes/pageRoutes'
import { setupWebSocket } from './services/websocketService'
import { loggers } from './utils/logger'
import { BusinessModule } from './utils/logger'



const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/pages', pageRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Setup WebSocket
setupWebSocket(io)

// Set Socket.IO instance for routes
setSocketIO(io)

// 全局错误处理器
process.on('uncaughtException', (error) => {
  loggers.system.error('uncaught_exception', error)
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  loggers.system.error('unhandled_rejection', error)
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// 优雅关闭
process.on('SIGTERM', () => {
  loggers.system.success('server_shutdown')
  console.log('Received SIGTERM, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  loggers.system.success('server_shutdown')
  console.log('Received SIGINT, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

server.listen(PORT, () => {
  loggers.system.success('server_started')
  console.log(`Server running on port ${PORT}`)
  console.log(`WebSocket server ready`)
  console.log(`Logging system initialized - logs directory: ${path.join(process.cwd(), 'logs')}`)
})
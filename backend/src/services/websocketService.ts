import { Server, Socket } from 'socket.io'

export interface WebSocketMessage {
  type: 'page_update' | 'generation_start' | 'generation_complete' | 'error'
  pageId: string
  data?: any
  message?: string
}

export function setupWebSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join_page', (pageId: string) => {
      try {
        socket.join(`page_${pageId}`)
        console.log(`Client ${socket.id} joined page ${pageId}`)
        
        // Send confirmation back to client
        socket.emit('joined_page', { pageId, status: 'success' })
      } catch (error) {
        console.error(`Error joining page ${pageId}:`, error)
        socket.emit('error', { message: 'Failed to join page' })
      }
    })

    socket.on('leave_page', (pageId: string) => {
      try {
        socket.leave(`page_${pageId}`)
        console.log(`Client ${socket.id} left page ${pageId}`)
      } catch (error) {
        console.error(`Error leaving page ${pageId}:`, error)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
    })

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error)
    })
  })

  // Handle server-level errors
  io.on('error', (error) => {
    console.error('WebSocket server error:', error)
  })
}

export function broadcastPageUpdate(io: Server, pageId: string, content: string): void {
  const message: WebSocketMessage = {
    type: 'page_update',
    pageId,
    data: { content }
  }
  
  io.to(`page_${pageId}`).emit('page_message', message)
}

export function broadcastGenerationStart(io: Server, pageId: string): void {
  const message: WebSocketMessage = {
    type: 'generation_start',
    pageId,
    message: 'AI开始生成页面...'
  }
  
  io.to(`page_${pageId}`).emit('page_message', message)
}

export function broadcastGenerationComplete(io: Server, pageId: string): void {
  const message: WebSocketMessage = {
    type: 'generation_complete',
    pageId,
    message: '页面生成完成'
  }
  
  io.to(`page_${pageId}`).emit('page_message', message)
}

export function broadcastError(io: Server, pageId: string, error: string): void {
  const message: WebSocketMessage = {
    type: 'error',
    pageId,
    message: error
  }
  
  io.to(`page_${pageId}`).emit('page_message', message)
}
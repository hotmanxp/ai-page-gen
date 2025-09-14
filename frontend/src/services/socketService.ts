import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private pageId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(pageId: string) {
    this.pageId = pageId
    this.reconnectAttempts = 0
    
    this.createConnection()
    return this.socket
  }

  private createConnection() {
    if (this.socket) {
      this.socket.disconnect()
    }

    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully')
      this.reconnectAttempts = 0
      if (this.socket && this.pageId) {
        this.socket.emit('join_page', this.pageId)
      }
    })

    this.socket.on('joined_page', (data) => {
      console.log('Successfully joined page:', data)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.handleConnectionError()
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt', attemptNumber)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after maximum attempts')
    })
  }

  private handleConnectionError() {
    this.reconnectAttempts++
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      setTimeout(() => {
        if (this.socket?.disconnected) {
          this.createConnection()
        }
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max WebSocket reconnection attempts reached')
    }
  }

  disconnect() {
    if (this.socket && this.pageId) {
      this.socket.emit('leave_page', this.pageId)
      this.socket.disconnect()
      this.socket = null
      this.pageId = null
      this.reconnectAttempts = 0
    }
  }

  onPageMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('page_message', callback)
    }
  }

  offPageMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('page_message', callback)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export default new SocketService()
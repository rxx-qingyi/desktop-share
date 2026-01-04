import { SignalingMessage } from '@/types'

export class SignalingService {
  private ws: WebSocket | null = null
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map()

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket closed')
      }

      this.ws.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data)
          console.log('Received message:', message)

          const handler = this.messageHandlers.get(message.type)
          if (handler) {
            handler(message)
          }
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }
    })
  }

  send(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  on(type: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(type, handler)
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

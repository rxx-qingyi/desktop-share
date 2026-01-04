export interface Room {
  id: string
  name: string
}

export interface SignalingMessage {
  type: 'join' | 'joined' | 'offer' | 'answer' | 'ice' | 'error'
  roomId?: string
  role?: 'publisher' | 'subscriber'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  error?: string
}

export interface StreamConfig {
  video: {
    frameRate: number
    width: number
    height: number
  }
  audio: boolean
}

declare global {
  interface Window {
    electronAPI: {
      platform: string
    }
  }
}

export {}

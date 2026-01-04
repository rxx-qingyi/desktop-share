export interface Room {
  id: string
  name: string
  hasPublisher: boolean
  subscriberCount: number
}

export interface SignalingMessage {
  type: 'join' | 'joined' | 'offer' | 'answer' | 'ice' | 'error'
  roomId?: string
  role?: 'publisher' | 'subscriber'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  error?: string
}

export interface WebRTCStats {
  bytesReceived: number
  packetsReceived: number
  packetsLost: number
  jitter: number
  frameRate: number
}

import { useEffect, useRef, useState } from 'react'
import { SignalingService } from '@/services/signaling'
import { WebRTCService } from '@/services/webrtc'

export const useWebRTC = (roomId: string) => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signalingRef = useRef<SignalingService>()
  const webrtcRef = useRef<WebRTCService>()

  useEffect(() => {
    const signaling = new SignalingService()
    const webrtc = new WebRTCService()

    signalingRef.current = signaling
    webrtcRef.current = webrtc

    const connect = async () => {
      try {
        // 连接 WebSocket
        const wsUrl = `ws://localhost:8080/ws`
        await signaling.connect(wsUrl)

        // 创建 PeerConnection
        await webrtc.createPeerConnection((stream) => {
          console.log('Got remote stream')
          console.log('Stream tracks:', stream.getTracks().map(t => ({
            kind: t.kind,
            id: t.id,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          })))
          setStream(stream)
          setIsConnected(true)
        })

        // 设置 ICE candidate 处理
        webrtc.onIceCandidate((candidate) => {
          signaling.send({
            type: 'ice',
            candidate: candidate.toJSON(),
          })
        })

        // 监听信令消息
        signaling.on('joined', async () => {
          console.log('Joined room, creating offer...')
          const offer = await webrtc.createOffer()
          signaling.send({
            type: 'offer',
            roomId,
            sdp: offer,
          })
        })

        signaling.on('answer', async (message) => {
          console.log('Received answer')
          if (message.sdp) {
            await webrtc.handleAnswer(message.sdp)
          }
        })

        signaling.on('ice', async (message) => {
          console.log('Received ICE candidate')
          if (message.candidate) {
            await webrtc.addIceCandidate(message.candidate)
          }
        })

        signaling.on('error', (message) => {
          console.error('Signaling error:', message.error)
          setError(message.error || 'Unknown error')
        })

        // 加入房间
        signaling.send({
          type: 'join',
          roomId,
          role: 'subscriber',
        })
      } catch (err) {
        console.error('Connection failed:', err)
        setError(err instanceof Error ? err.message : 'Connection failed')
      }
    }

    connect()

    return () => {
      signaling.close()
      webrtc.close()
      setStream(null)
      setIsConnected(false)
    }
  }, [roomId])

  return { stream, isConnected, error }
}

import { useEffect, useRef, useState } from 'react'
import { SignalingService } from '@/services/signaling'
import { WebRTCPublisher } from '@/services/webrtc'

interface PublisherProps {
  roomId: string
  onLeave: () => void
}

export default function Publisher({ roomId, onLeave }: PublisherProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const signalingRef = useRef<SignalingService>()
  const publisherRef = useRef<WebRTCPublisher>()

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
      console.log('Set video srcObject:', localStream)
    }
  }, [localStream])

  const startStreaming = async () => {
    try {
      const signaling = new SignalingService()
      const publisher = new WebRTCPublisher()

      signalingRef.current = signaling
      publisherRef.current = publisher

      // 采集屏幕
      const stream = await publisher.startCapture({
        video: {
          frameRate: 60, // 提高到60fps
          width: 1920,
          height: 1080,
        },
        audio: false,
      })

      setLocalStream(stream)

      // 连接信令服务器
      await signaling.connect('ws://localhost:8080/ws')

      // 创建 PeerConnection
      await publisher.createPeerConnection()

      // 设置 ICE candidate 处理
      publisher.onIceCandidate((candidate) => {
        signaling.send({
          type: 'ice',
          candidate: candidate.toJSON(),
        })
      })

      // 监听信令消息
      signaling.on('joined', async () => {
        console.log('Joined room as publisher')
        const offer = await publisher.createOffer()
        signaling.send({
          type: 'offer',
          roomId,
          sdp: offer,
        })
        setIsConnected(true)
      })

      signaling.on('answer', async (message) => {
        console.log('Received answer')
        if (message.sdp) {
          await publisher.handleAnswer(message.sdp)

          // 连接成功后，定期检查统计信息
          setInterval(async () => {
            const stats = await publisher.getStats()
            if (stats) {
              for (const [id, stat] of stats) {
                if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
                  console.log('📊 Outbound video stats:', {
                    bytesSent: stat.bytesSent,
                    packetsSent: stat.packetsSent,
                    framesEncoded: stat.framesEncoded,
                    framesSent: stat.framesSent
                  })
                }
              }
            }
          }, 3000) // 每3秒检查一次
        }
      })

      signaling.on('ice', async (message) => {
        console.log('Received ICE candidate')
        if (message.candidate) {
          await publisher.addIceCandidate(message.candidate)
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
        role: 'publisher',
      })

      setIsStreaming(true)
      setError(null)
    } catch (err) {
      console.error('Failed to start streaming:', err)
      setError(err instanceof Error ? err.message : 'Failed to start streaming')
      cleanup()
    }
  }

  const stopStreaming = () => {
    cleanup()
    setIsStreaming(false)
    setIsConnected(false)
    setLocalStream(null)
  }

  const cleanup = () => {
    signalingRef.current?.close()
    publisherRef.current?.close()
  }

  const handleLeave = () => {
    stopStreaming()
    onLeave()
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-xl font-bold text-white">房间: {roomId}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-white">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                开始推流
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                停止推流
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 px-6 py-3 rounded z-10">
            错误: {error}
          </div>
        )}

        {localStream ? (
          <div className="w-full max-w-5xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-auto bg-black rounded-lg shadow-2xl"
            />
            <p className="text-white text-center mt-4">本地预览 - 正在推流</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-white text-2xl mb-4">
              点击"开始推流"选择要共享的屏幕
            </div>
            <p className="text-gray-400">
              需要授予屏幕录制权限
            </p>
          </div>
        )}
      </div>

      {isStreaming && (
        <div className="bg-gray-800 px-6 py-4">
          <div className="text-gray-300 text-sm">
            <div className="flex items-center justify-between">
              <span>推流状态: {isConnected ? '正在推流' : '连接中...'}</span>
              <span>房间 ID: {roomId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

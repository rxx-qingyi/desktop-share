import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebRTC } from '@/hooks/useWebRTC'

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const { stream, isConnected, error } = useWebRTC(roomId!)

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Setting video srcObject')
      console.log('Stream:', stream)
      console.log('Stream ID:', stream.id)
      console.log('Stream active:', stream.active)
      console.log('All tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })))

      videoRef.current.srcObject = stream

      // 确保视频播放
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video is playing successfully')
          })
          .catch(err => {
            console.error('❌ Failed to play video:', err)
          })
      }

      // 监听video元素事件
      const video = videoRef.current
      video.onloadedmetadata = () => {
        console.log('📹 Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration
        })
      }
      video.onloadeddata = () => {
        console.log('📹 Video data loaded')
      }
      video.onplay = () => {
        console.log('📹 Video started playing')
      }
      video.onerror = (e) => {
        console.error('📹 Video error:', e)
      }

      // 定期检查video尺寸是否更新
      const checkInterval = setInterval(() => {
        if (video.videoWidth > 2 && video.videoHeight > 2) {
          console.log('✅ Video resolution updated:', video.videoWidth, 'x', video.videoHeight)
          clearInterval(checkInterval)
        } else {
          console.log('⏳ Waiting for video data... current:', video.videoWidth, 'x', video.videoHeight)
        }
      }, 1000)

      return () => {
        clearInterval(checkInterval)
      }
    }
  }, [stream])

  const handleLeave = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-white">房间: {roomId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-white">
              {isConnected ? '已连接' : '连接中...'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            错误: {error}
          </div>
        )}

        <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              controls
              className="w-full h-auto"
              style={{ maxHeight: '80vh' }}
            />
          ) : (
            <div className="flex items-center justify-center" style={{ height: '80vh' }}>
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4" />
                <p className="text-white text-xl">等待视频流...</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">连接信息</h3>
          <div className="text-gray-400 text-sm space-y-1">
            <div>房间 ID: {roomId}</div>
            <div>连接状态: {isConnected ? '已连接' : '未连接'}</div>
            <div>视频流: {stream ? '正常' : '等待中'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

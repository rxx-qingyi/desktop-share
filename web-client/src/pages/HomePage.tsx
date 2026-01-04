import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Room } from '@/types'

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    loadRooms()
    const interval = setInterval(loadRooms, 5000) // 每5秒刷新
    return () => clearInterval(interval)
  }, [])

  const loadRooms = async () => {
    try {
      const data = await api.getRooms()
      setRooms(data)
      setError(null)
    } catch (err) {
      setError('无法加载房间列表')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return

    setIsCreating(true)
    try {
      const { roomId } = await api.createRoom(roomName)
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError('创建房间失败')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            桌面共享直播
          </h1>
          <p className="text-xl text-gray-600">
            选择一个房间观看直播，或创建新房间
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">创建新房间</h2>
          <form onSubmit={handleCreateRoom} className="flex gap-4">
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="输入房间名称"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !roomName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? '创建中...' : '创建房间'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">房间列表</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无房间</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-2">{room.name}</h3>
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          room.hasPublisher ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span>
                        {room.hasPublisher ? '正在直播' : '未开始'}
                      </span>
                    </div>
                    <div>观众数: {room.subscriberCount}</div>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={!room.hasPublisher}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {room.hasPublisher ? '加入观看' : '等待主播'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

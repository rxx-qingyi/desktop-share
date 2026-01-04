import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Room } from '@/types'

interface RoomSelectorProps {
  onRoomSelect: (roomId: string) => void
}

export default function RoomSelector({ onRoomSelect }: RoomSelectorProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadRooms()
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
      onRoomSelect(roomId)
    } catch (err) {
      setError('创建房间失败')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            桌面共享推流端
          </h1>
          <p className="text-xl text-gray-600">
            创建或选择房间开始推流
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
              {isCreating ? '创建中...' : '创建并推流'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">已有房间</h2>
            <button
              onClick={loadRooms}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              刷新
            </button>
          </div>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无房间</p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="text-lg font-semibold">{room.name}</h3>
                    <p className="text-sm text-gray-500">ID: {room.id}</p>
                  </div>
                  <button
                    onClick={() => onRoomSelect(room.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    选择推流
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

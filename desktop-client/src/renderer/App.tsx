import { useState } from 'react'
import RoomSelector from './components/RoomSelector'
import Publisher from './components/Publisher'

function App() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId)
  }

  const handleLeave = () => {
    setSelectedRoomId(null)
  }

  return (
    <div className="h-screen bg-gray-100">
      {!selectedRoomId ? (
        <RoomSelector onRoomSelect={handleRoomSelect} />
      ) : (
        <Publisher roomId={selectedRoomId} onLeave={handleLeave} />
      )}
    </div>
  )
}

export default App

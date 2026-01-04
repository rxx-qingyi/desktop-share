import { Room } from '@/types'

const API_BASE_URL = 'http://localhost:8080/api'

export const api = {
  async getRooms(): Promise<Room[]> {
    const response = await fetch(`${API_BASE_URL}/rooms`)
    if (!response.ok) {
      throw new Error('Failed to fetch rooms')
    }
    const rooms = await response.json()
    return rooms.map((r: any) => ({ id: r.id, name: r.name }))
  },

  async createRoom(name: string): Promise<{ roomId: string; name: string }> {
    const response = await fetch(`${API_BASE_URL}/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error('Failed to create room')
    }

    return response.json()
  },
}

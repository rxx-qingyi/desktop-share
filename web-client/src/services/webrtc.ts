export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private onTrackCallback?: (stream: MediaStream) => void
  private remoteStream: MediaStream | null = null

  async createPeerConnection(onTrack: (stream: MediaStream) => void): Promise<RTCPeerConnection> {
    this.onTrackCallback = onTrack
    this.remoteStream = new MediaStream()

    const config: RTCConfiguration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    }

    this.peerConnection = new RTCPeerConnection(config)

    // 添加 transceiver 明确声明要接收视频
    this.peerConnection.addTransceiver('video', {
      direction: 'recvonly'
    })

    // 添加 transceiver 明确声明要接收音频
    this.peerConnection.addTransceiver('audio', {
      direction: 'recvonly'
    })

    this.peerConnection.ontrack = (event) => {
      console.log('🎬 Received track:', event.track.kind, 'id:', event.track.id)
      console.log('Track state:', event.track.readyState, 'enabled:', event.track.enabled, 'muted:', event.track.muted)
      console.log('Event streams:', event.streams)

      // 监听track事件
      event.track.onended = () => {
        console.log('❌ Track ended:', event.track.id)
      }
      event.track.onmute = () => {
        console.log('🔇 Track muted:', event.track.id)
      }
      event.track.onunmute = () => {
        console.log('🔊 Track unmuted:', event.track.id)
      }

      // 将track添加到统一的remoteStream中
      if (this.remoteStream) {
        this.remoteStream.addTrack(event.track)
        console.log('✅ Added track to remote stream. Total tracks:', this.remoteStream.getTracks().length)
        console.log('Remote stream active:', this.remoteStream.active)
        console.log('Remote stream tracks:', this.remoteStream.getTracks().map(t => ({
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted
        })))

        // 每次添加track后都触发回调，确保UI更新
        this.onTrackCallback?.(this.remoteStream)
      }
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState)
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState)
    }

    return this.peerConnection
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not created')
    }

    const offer = await this.peerConnection.createOffer()

    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not created')
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not created')
    }

    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not created')
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not created')
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          callback(event.candidate)
        }
      }
    }
  }

  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop())
      this.remoteStream = null
    }
  }

  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) {
      return null
    }

    return await this.peerConnection.getStats()
  }
}

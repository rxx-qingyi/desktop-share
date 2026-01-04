import { StreamConfig } from '@/types'

export class WebRTCPublisher {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null

  async startCapture(config: StreamConfig): Promise<MediaStream> {
    try {
      console.log('Starting screen capture with config:', config)

      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: config.video.frameRate,
          width: config.video.width,
          height: config.video.height,
          // @ts-ignore - 某些浏览器支持这些高级设置
          displaySurface: 'monitor',
          logicalSurface: true,
          cursor: 'always',
        },
        audio: config.audio,
        // @ts-ignore - 某些浏览器支持preferCurrentTab
        preferCurrentTab: false,
      })

      console.log('Screen capture successful!')
      console.log('Stream tracks:', this.localStream.getTracks().map(t => ({
        kind: t.kind,
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        label: t.label
      })))

      // 获取视频track的实际设置
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        console.log('Video track settings:', {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          aspectRatio: settings.aspectRatio
        })

        // 如果分辨率太小，警告
        if (settings.width && settings.width < 100) {
          console.error('⚠️ Video track width is too small:', settings.width)
        }

        // 尝试应用关键帧间隔约束
        try {
          await videoTrack.applyConstraints({
            // @ts-ignore - 实验性API
            advanced: [{
              // 设置关键帧间隔为2秒
              keyFrameInterval: 2
            }]
          })
          console.log('✅ Applied keyframe interval constraint')
        } catch (e) {
          console.log('ℹ️ Keyframe interval constraint not supported, will use alternative method')
        }
      }

      return this.localStream
    } catch (error) {
      console.error('Failed to capture screen:', error)
      throw error
    }
  }

  async createPeerConnection(): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    }

    this.peerConnection = new RTCPeerConnection(config)

    if (this.localStream) {
      console.log('Adding tracks to peer connection:')
      this.localStream.getTracks().forEach((track) => {
        console.log('Adding track:', {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        })

        const sender = this.peerConnection!.addTrack(track, this.localStream!)
        console.log('Track added, sender:', sender ? 'created' : 'null')

        // 设置视频编码参数，提高画质
        if (track.kind === 'video' && sender) {
          const parameters = sender.getParameters()
          if (!parameters.encodings) {
            parameters.encodings = [{}]
          }

          // 设置更高的比特率
          parameters.encodings[0].maxBitrate = 8 * 1000000 * 5  // 40 Mbps
          parameters.encodings[0].maxFramerate = 60 // 60fps

          sender.setParameters(parameters).then(() => {
            console.log('✅ Video encoding parameters set:', {
              maxBitrate: '40 Mbps',
              maxFramerate: 60
            })
          }).catch(err => {
            console.error('Failed to set encoding parameters:', err)
          })

          // 备用方案：每2秒手动触发关键帧生成
          // 通过监听RTCRtpSender的stats来检测是否需要关键帧
          let lastKeyFrameTime = Date.now()
          const keyFrameInterval = setInterval(async () => {
            if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') {
              clearInterval(keyFrameInterval)
              return
            }

            const now = Date.now()
            // 每2秒强制请求一次关键帧
            if (now - lastKeyFrameTime >= 2000) {
              try {
                // 通过修改编码参数触发关键帧
                const params = sender.getParameters()
                if (params.encodings && params.encodings[0]) {
                  // 临时修改会触发重新编码
                  const currentBitrate = params.encodings[0].maxBitrate
                  params.encodings[0].maxBitrate = currentBitrate ? currentBitrate - 1 : 8000000 * 5
                  await sender.setParameters(params)

                  // 立即恢复
                  params.encodings[0].maxBitrate = currentBitrate || 8000000 * 5
                  await sender.setParameters(params)

                  lastKeyFrameTime = now
                  console.log('🔑 Forced keyframe generation')
                }
              } catch (e) {
                console.log('Failed to force keyframe:', e)
              }
            }
          }, 500) // 每500ms检查一次
        }

        // 监听track状态
        track.onended = () => {
          console.log('❌ Track ended:', track.id)
        }
        track.onmute = () => {
          console.log('🔇 Track muted:', track.id)
        }
        track.onunmute = () => {
          console.log('🔊 Track unmuted:', track.id)
        }
      })
    } else {
      console.error('⚠️ No local stream available when creating peer connection!')
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

  stopCapture(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }
  }

  close(): void {
    this.stopCapture()
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) {
      return null
    }
    return await this.peerConnection.getStats()
  }
}

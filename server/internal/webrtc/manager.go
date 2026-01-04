package webrtc

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/pion/rtcp"
	"github.com/pion/webrtc/v3"
)

// Manager 管理 WebRTC 连接
type Manager struct {
	peers           map[string]*webrtc.PeerConnection
	roomTracks      map[string][]*webrtc.TrackLocalStaticRTP // 每个房间的媒体轨道
	roomSubscribers map[string][]string                       // 每个房间的订阅者 peerID 列表
	mutex           sync.RWMutex
	api             *webrtc.API
}

// NewManager 创建 WebRTC 管理器
func NewManager() *Manager {
	// 创建 MediaEngine
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		log.Fatal(err)
	}

	// 创建 API
	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))

	return &Manager{
		peers:           make(map[string]*webrtc.PeerConnection),
		roomTracks:      make(map[string][]*webrtc.TrackLocalStaticRTP),
		roomSubscribers: make(map[string][]string),
		api:             api,
	}
}

// HandleOffer 处理 Offer 并生成 Answer
func (m *Manager) HandleOffer(peerID string, sdpData json.RawMessage, role string, roomID string) (json.RawMessage, error) {
	// 创建 PeerConnection
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
	}

	peerConnection, err := m.api.NewPeerConnection(config)
	if err != nil {
		return nil, err
	}

	// 保存 PeerConnection
	m.mutex.Lock()
	m.peers[peerID] = peerConnection
	m.mutex.Unlock()

	if role == "publisher" {
		// 发布端：接收媒体流并保存
		peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
			log.Printf("Got track from publisher: %s, type: %s", track.ID(), track.Kind())

			// 创建本地轨道用于转发
			localTrack, err := webrtc.NewTrackLocalStaticRTP(track.Codec().RTPCodecCapability, track.ID(), track.StreamID())
			if err != nil {
				log.Printf("Failed to create local track: %v", err)
				return
			}

			// 保存到房间轨道列表
			m.mutex.Lock()
			m.roomTracks[roomID] = append(m.roomTracks[roomID], localTrack)

			// 将轨道添加到所有已存在的订阅端
			subscriberIDs := m.roomSubscribers[roomID]
			for _, subID := range subscriberIDs {
				if subPC, exists := m.peers[subID]; exists {
					if _, addErr := subPC.AddTrack(localTrack); addErr != nil {
						log.Printf("Failed to add track to subscriber %s: %v", subID, addErr)
					} else {
						log.Printf("Added track to existing subscriber: %s", subID)
					}
				}
			}
			m.mutex.Unlock()

			// 读取并转发 RTP 包
			go func() {
				log.Printf("Starting RTP forwarding for track %s in room %s", track.ID(), roomID)
				rtpBuf := make([]byte, 1500)
				packetCount := 0
				for {
					i, _, readErr := track.Read(rtpBuf)
					if readErr != nil {
						log.Printf("RTP read error for track %s: %v", track.ID(), readErr)
						return
					}

					packetCount++
					if packetCount%100 == 0 {
						log.Printf("Forwarded %d RTP packets for track %s", packetCount, track.ID())
					}

					if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil {
						log.Printf("RTP write error for track %s: %v", track.ID(), writeErr)
						return
					}
				}
			}()
		})
	} else {
		// 订阅端：记录订阅者
		m.mutex.Lock()
		m.roomSubscribers[roomID] = append(m.roomSubscribers[roomID], peerID)
		m.mutex.Unlock()
	}

	// 设置 ICE 连接状态回调
	peerConnection.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State has changed for %s: %s", peerID, state.String())
	})

	// 如果是订阅端，在 SetRemoteDescription 之前添加轨道
	if role == "subscriber" {
		m.mutex.RLock()
		tracks := m.roomTracks[roomID]
		m.mutex.RUnlock()

		log.Printf("Subscriber %s joining room %s, available tracks: %d", peerID, roomID, len(tracks))

		// 添加现有轨道到订阅端（必须在 SetRemoteDescription 之前）
		for _, track := range tracks {
			rtpSender, err := peerConnection.AddTrack(track)
			if err != nil {
				log.Printf("Failed to add track to subscriber %s: %v", peerID, err)
			} else {
				log.Printf("Added track to subscriber %s: %s (sender: %v)", peerID, track.ID(), rtpSender != nil)

				// 立即请求关键帧，让订阅者快速看到画面
				if rtpSender != nil {
					go func(sender *webrtc.RTPSender, trackID string) {
						// 等待连接建立后请求关键帧
						time.Sleep(500 * time.Millisecond) // 等待连接稳定

						// 发送PLI请求关键帧
						err := peerConnection.WriteRTCP([]rtcp.Packet{
							&rtcp.PictureLossIndication{
								MediaSSRC: 0, // 0表示请求所有SSRC
							},
						})
						if err != nil {
							log.Printf("Failed to send PLI: %v", err)
						} else {
							log.Printf("✅ Sent PLI (keyframe request) for track %s", trackID)
						}
					}(rtpSender, track.ID())
				}
			}
		}
	}

	// 解析 Offer
	var offer webrtc.SessionDescription
	if err := json.Unmarshal(sdpData, &offer); err != nil {
		return nil, err
	}

	// 设置远端描述
	if err := peerConnection.SetRemoteDescription(offer); err != nil {
		return nil, err
	}

	// 创建 Answer
	answer, err := peerConnection.CreateAnswer(nil)
	if err != nil {
		return nil, err
	}

	// 设置本地描述
	if err := peerConnection.SetLocalDescription(answer); err != nil {
		return nil, err
	}

	// 序列化 Answer
	answerJSON, err := json.Marshal(answer)
	if err != nil {
		return nil, err
	}

	return answerJSON, nil
}

// HandleAnswer 处理 Answer
func (m *Manager) HandleAnswer(peerID string, sdpData json.RawMessage) error {
	m.mutex.RLock()
	peerConnection, exists := m.peers[peerID]
	m.mutex.RUnlock()

	if !exists {
		log.Printf("PeerConnection not found for %s", peerID)
		return nil
	}

	var answer webrtc.SessionDescription
	if err := json.Unmarshal(sdpData, &answer); err != nil {
		return err
	}

	return peerConnection.SetRemoteDescription(answer)
}

// HandleICECandidate 处理 ICE Candidate
func (m *Manager) HandleICECandidate(peerID string, candidateData json.RawMessage) error {
	m.mutex.RLock()
	peerConnection, exists := m.peers[peerID]
	m.mutex.RUnlock()

	if !exists {
		log.Printf("PeerConnection not found for %s", peerID)
		return nil
	}

	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(candidateData, &candidate); err != nil {
		return err
	}

	return peerConnection.AddICECandidate(candidate)
}

// ClosePeer 关闭 Peer 连接
func (m *Manager) ClosePeer(peerID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if peerConnection, exists := m.peers[peerID]; exists {
		delete(m.peers, peerID)
		return peerConnection.Close()
	}

	return nil
}

// CleanupRoomTracks 清理房间的所有tracks（当publisher断开时调用）
func (m *Manager) CleanupRoomTracks(roomID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.roomTracks, roomID)
	delete(m.roomSubscribers, roomID)
	log.Printf("Cleaned up tracks for room %s", roomID)
}

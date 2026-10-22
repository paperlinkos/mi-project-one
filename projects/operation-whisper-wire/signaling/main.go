package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Zero-Knowledge WebRTC Signaling Message
type SignalMessage struct {
	Type    string          `json:"type"`              // "join", "peer_joined", "peer_left", "offer", "answer", "candidate", "room_full", "ping", "pong"
	Room    string          `json:"room"`              // Frequency/Room identifier
	Sender  string          `json:"sender"`            // Ephemeral Operative Call Sign
	Target  string          `json:"target,omitempty"`  // Target peer ID if specific
	Payload json.RawMessage `json:"payload,omitempty"` // Raw SDP or ICE candidate
}

type Client struct {
	id     string
	room   string
	conn   *websocket.Conn
	send   chan []byte
	hub    *Hub
}

type Hub struct {
	sync.RWMutex
	rooms map[string]map[string]*Client // roomID -> peerID -> Client
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]map[string]*Client),
	}
}

func (h *Hub) Register(roomID, peerID string, client *Client) bool {
	h.Lock()
	defer h.Unlock()

	peers, exists := h.rooms[roomID]
	if !exists {
		peers = make(map[string]*Client)
		h.rooms[roomID] = peers
	}

	// For P2P audio wire, limit to 2 peers per secure frequency for 1:1 encrypted link
	if len(peers) >= 2 {
		return false
	}

	peers[peerID] = client

	// Notify existing peer that a new peer arrived
	for otherID, otherClient := range peers {
		if otherID != peerID {
			msg, _ := json.Marshal(SignalMessage{
				Type:   "peer_joined",
				Room:   roomID,
				Sender: peerID,
			})
			select {
			case otherClient.send <- msg:
			default:
			}
		}
	}

	return true
}

func (h *Hub) Unregister(roomID, peerID string) {
	h.Lock()
	defer h.Unlock()

	if peers, exists := h.rooms[roomID]; exists {
		delete(peers, peerID)

		// Notify remaining peer of departure
		for otherID, otherClient := range peers {
			msg, _ := json.Marshal(SignalMessage{
				Type:   "peer_left",
				Room:   roomID,
				Sender: peerID,
			})
			select {
			case otherClient.send <- msg:
			default:
			}
			_ = otherID
		}

		// Purge empty room from volatile RAM
		if len(peers) == 0 {
			delete(h.rooms, roomID)
		}
	}
}

func (h *Hub) Relay(msg *SignalMessage) {
	h.RLock()
	defer h.RUnlock()

	peers, exists := h.rooms[msg.Room]
	if !exists {
		return
	}

	raw, err := json.Marshal(msg)
	if err != nil {
		return
	}

	// Route to target peer or all other peers in the room
	for peerID, client := range peers {
		if peerID != msg.Sender {
			if msg.Target == "" || msg.Target == peerID {
				select {
				case client.send <- raw:
				default:
				}
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all cross-origins for tactical P2P mesh
	},
	ReadBufferSize:  2048,
	WriteBufferSize: 2048,
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c.room, c.id)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(65536)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var signal SignalMessage
		if err := json.Unmarshal(message, &signal); err != nil {
			continue
		}

		// Overwrite sender with authenticated socket identity
		signal.Sender = c.id
		signal.Room = c.room

		if signal.Type == "ping" {
			pong, _ := json.Marshal(SignalMessage{Type: "pong"})
			c.send <- pong
			continue
		}

		c.hub.Relay(&signal)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Drain queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	peerID := r.URL.Query().Get("peer")

	if roomID == "" || peerID == "" {
		http.Error(w, "Missing room or peer parameter", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		id:   peerID,
		room: roomID,
		conn: conn,
		send: make(chan []byte, 256),
		hub:  hub,
	}

	if !hub.Register(roomID, peerID, client) {
		fullMsg, _ := json.Marshal(SignalMessage{
			Type: "room_full",
			Room: roomID,
		})
		_ = conn.WriteMessage(websocket.TextMessage, fullMsg)
		conn.Close()
		return
	}

	go client.writePump()
	go client.readPump()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	hub := NewHub()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ONLINE","service":"Operation Whisper Wire Signaling Relay","security":"Zero-Log Ephemeral P2P"}`))
	})

	// WebRTC Signaling WebSocket
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(hub, w, r)
	})

	// Static frontend assets serving
	frontendDist := filepath.Join("..", "frontend", "dist")
	if _, err := os.Stat(frontendDist); err == nil {
		fs := http.FileServer(http.Dir(frontendDist))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := filepath.Join(frontendDist, r.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) && !strings.HasPrefix(r.URL.Path, "/ws") && !strings.HasPrefix(r.URL.Path, "/health") {
				http.ServeFile(w, r, filepath.Join(frontendDist, "index.html"))
				return
			}
			fs.ServeHTTP(w, r)
		})
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Printf("============================================================\n")
	fmt.Printf("⚡ OPERATION WHISPER WIRE // WebRTC Signaling Relay Active\n")
	fmt.Printf("🔒 Security Protocol: Zero-Log Volatile Ephemeral P2P\n")
	fmt.Printf("📡 Listening on http://0.0.0.0:%s\n", port)
	fmt.Printf("============================================================\n")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

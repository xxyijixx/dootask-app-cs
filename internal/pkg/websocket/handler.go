package websocket

import (
	"chatdesk/internal/pkg/dootask"
	"chatdesk/internal/pkg/logger"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	// 写入超时时间
	writeWait = 10 * time.Second

	// 读取超时时间
	pongWait = 60 * time.Second

	// 发送ping的频率，必须小于pongWait
	pingPeriod = (pongWait * 9) / 10

	// 最大消息大小
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// 允许所有CORS请求
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ServeWs 处理WebSocket请求
func ServeWs(c *gin.Context) {
	// 获取会话UUID
	convUUID := c.Query("conv_uuid")
	if convUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing conversation UUID"})
		return
	}

	// 获取客户端类型
	clientType := c.Query("client_type")
	if clientType != "agent" && clientType != "customer" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client type, must be 'agent' or 'customer'"})
		return
	}
	agentID := "0"
	if clientType == "agent" {
		// 客服端需要验证Token
		// TODO: 验证Token
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
			return
		}

		dootaskService := dootask.NewIDootaskService()
		userInfoResp, err := dootaskService.GetUserInfo(token)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token 2"})
			return
		}
		agentID = fmt.Sprintf("%d", userInfoResp.Userid)
	}

	// 升级HTTP连接为WebSocket连接
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// 创建新的客户端
	client := &Client{
		Conn:       conn,
		Send:       make(chan []byte, 256),
		ConvUUID:   convUUID,
		ClientType: clientType,
		AgentID:    agentID,
	}
	// 注册新客户端
	logger.App.Info("准备发送客户端到注册通道",
		zap.String("remoteAddr", client.Conn.RemoteAddr().String()),
		zap.String("ClientType", client.ClientType),
		zap.String("ConvUUID", client.ConvUUID),
		zap.String("AgentID", client.AgentID))
	logger.App.Info("尝试注册新客户端", zap.String("remoteAddr", client.Conn.RemoteAddr().String()), zap.String("ClientType", client.ClientType))
	WebSocketManager.Register <- client
	logger.App.Info("新客户端已发送到注册通道", zap.String("remoteAddr", client.Conn.RemoteAddr().String()), zap.String("ClientType", client.ClientType))

	// 启动goroutine处理读写操作
	go client.writePump()
	go client.readPump()
}

// readPump 从WebSocket连接读取消息
func (c *Client) readPump() {
	defer func() {
		WebSocketManager.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// 解析消息
		var msg Message
		if err := json.Unmarshal(message, &msg.Data); err != nil {
			log.Printf("error unmarshalling message: %v", err)
			continue
		}

		// 设置发送者和会话UUID
		msg.Sender = c.ClientType
		msg.ConvUUID = c.ConvUUID

		// 广播消息
		WebSocketManager.Broadcast <- &msg
	}
}

// writePump 向WebSocket连接写入消息
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// 通道已关闭
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// 添加队列中的所有消息
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// 向所以客服端广播消息
func BroadcastToAllAgents(data interface{}, msgType MessageType) {
	// msgBytes, err := json.Marshal({"content":})
	logger.App.Info("准备BroadcastToAllAgents广播消息", zap.Any("ConvUUID", data), zap.Any("msgType", msgType))

	// 将匿名结构体序列化为json.RawMessage
	// dataBytes, err := json.Marshal(data)
	// if err != nil {
	// 	logger.App.Error("Failed to marshal new message data content", zap.Error(err))
	// 	return
	// }

	// // 创建新消息通知
	// message := &Message{
	// 	Data:     json.RawMessage(dataBytes),
	// 	Type:     msgType,
	// }

	// // 将消息转换为JSON
	// msgBytes, err := json.Marshal(message)
	// if err != nil {
	// 	logger.App.Error("广播消息时出错 Failed to marshal new message notification", zap.Error(err))
	// 	return
	// }

	WebSocketManager.SendToAllAgents(data, msgType)
}

// BroadcastMessage 向特定会话广播消息
func BroadcastMessage(convUUID string, data interface{}, msgType MessageType) error {
	logger.App.Info("准备广播消息", zap.String("ConvUUID", convUUID), zap.Any("msgType", msgType))
	// msgBytes, err := json.Marshal({"content":})
	// 将匿名结构体序列化为json.RawMessage
	dataBytes, err := json.Marshal(data)
	if err != nil {
		logger.App.Error("Failed to marshal new message data content", zap.Error(err))
		return err
	}

	// 创建新消息通知
	message := &Message{
		ConvUUID: convUUID,
		Data:     json.RawMessage(dataBytes),
		Type:     msgType,
	}

	// 将消息转换为JSON
	msgBytes, err := json.Marshal(message)
	if err != nil {
		logger.App.Error("广播消息时出错 Failed to marshal new message notification", zap.Error(err))
		return err
	}

	WebSocketManager.SendToConversation(convUUID, msgBytes)
	return nil
}

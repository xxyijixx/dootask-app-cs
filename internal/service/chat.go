package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"chatdesk/internal/config"
	"chatdesk/internal/i18n"
	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/dootask"
	"chatdesk/internal/pkg/eventbus"
	"chatdesk/internal/pkg/logger"
	"chatdesk/internal/pkg/websocket"
)

type ChatService struct{}

var Chat = ChatService{}

// CreateConversation 创建新对话（基础版本，保留向后兼容性）
func (s *ChatService) CreateConversation() (string, error) {
	return s.CreateConversationWithDetails(0, 0, "", "widget")
}

// CreateConversationWithDetails 创建新对话（详细版本）
func (s *ChatService) CreateConversationWithDetails(agentID, customerID uint, title, source string) (string, error) {
	// 生成UUID
	uuidStr := uuid.New().String()
	csSource := models.CustomerServiceSource{}

	// 如果没有提供来源，设置默认值
	if source == "" {
		source = "widget"
	}
	if err := database.DB.Model(&models.CustomerServiceSource{}).Where("source_key =?", source).First(&csSource).Error; err != nil {
		logger.App.Error("来源不存在", zap.String("source", source), zap.Error(err))
		return "", err
	}

	// 创建对话记录
	conversation := models.Conversations{
		Uuid:       uuidStr,
		AgentID:    agentID,
		CustomerID: customerID,
		Title:      title,
		Source:     csSource.Name,
		SourceKey:  csSource.SourceKey,
		Status:     "open",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// 保存到数据库
	result := database.DB.Create(&conversation)
	if result.Error != nil {
		return "", result.Error
	}
	title = fmt.Sprintf("%s %d", "会话", conversation.ID)
	database.DB.Model(&conversation).Updates(map[string]interface{}{
		"title": title,
	})
	conversation.Title = title

	// 异步广播到WebSocket客户端
	go websocket.BroadcastToAllAgents(conversation, websocket.MessageTypeNewConversation)

	return uuidStr, nil
}

// SendMessage 发送消息（基础版本，保留向后兼容性）
func (s *ChatService) SendMessage(conversationUUID, content, sender string) (*models.Message, error) {
	return s.SendMessageWithDetails(conversationUUID, content, sender, "text", "")
}

// SendMessageWithDetails 发送消息（详细版本）
func (s *ChatService) SendMessageWithDetails(conversationUUID, content, sender, msgType, metadata string) (*models.Message, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", conversationUUID).First(&conversation)
	if result.Error != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "对话不存在",
		}
	}
	// 查找来源
	var csSource models.CustomerServiceSource
	result = database.DB.Where("source_key =?", conversation.SourceKey).First(&csSource)
	if result.Error != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeSourceNotFound,
			Message: "来源不存在",
		}
	}
	dialogID := ""
	if csSource.DialogID != nil {
		dialogID = fmt.Sprintf("%d", *csSource.DialogID)
	}

	// 如果消息类型为空，设置默认值
	if msgType == "" {
		msgType = "text"
	}

	// 获取当前时间
	now := time.Now()

	// 创建消息
	message := models.Message{
		ConversationID: conversation.ID,
		Content:        content,
		Sender:         sender,
		Type:           msgType,
		Metadata:       metadata,
		CreatedAt:      now,
	}

	// 保存消息
	result = database.DB.Create(&message)
	if result.Error != nil {
		return nil, result.Error
	}

	// 更新对话的最后更新时间和最后消息时间
	database.DB.Model(&conversation).Updates(map[string]interface{}{
		"updated_at":      now,
		"last_message_at": now,
	})

	// 异步发布消息创建事件到事件总线
	if eventbus.GlobalEventBus != nil {
		logger.App.Info("消息创建事件正在发布",
			zap.Uint("messageID", message.ID),
			zap.Uint("conversationID", conversation.ID),
			zap.String("sender", sender))
		messageEvent := eventbus.NewMessageCreatedEvent(message.ID, conversation.ID, content, sender, msgType)
		if err := eventbus.GlobalEventBus.Publish(messageEvent); err != nil {
			logger.App.Error("发布消息创建事件失败",
				zap.Uint("messageID", message.ID),
				zap.Uint("conversationID", conversation.ID),
				zap.String("sender", sender),
				zap.Error(err))
		} else {
			logger.App.Info("消息创建事件已发布",
				zap.Uint("messageID", message.ID),
				zap.Uint("conversationID", conversation.ID),
				zap.String("sender", sender))
		}
	} else {
		logger.App.Info("消息创建事件总线未初始化，跳过事件发布",
			zap.Uint("messageID", message.ID),
			zap.Uint("conversationID", conversation.ID),
			zap.String("sender", sender))
	}

	fmt.Println("发送消息到机器人", sender)

	if sender == "customer" {
		// 通过WebSocket广播消息
		go websocket.BroadcastToAllAgents(message, websocket.MessageTypeNewMessage)
		go func(content, dialogID string) {
			CustomerServiceConfigData, err := models.LoadConfig[models.CustomerServiceConfigData](database.DB, models.CSConfigKeySystem)
			if err != nil {
				return
			}
			fmt.Println("发送消息到机器人")
			robot := dootask.DootaskRobot{
				Webhook: config.Cfg.DooTask.WebHook,
				Token:   CustomerServiceConfigData.DooTaskIntegration.BotToken,
				Version: config.Cfg.DooTask.Version,
			}
			// robot := dootask.DootaskRobot{
			// 	Webhook: config.Cfg.DooTask.WebHook,
			// 	Token:   config.Cfg.DooTask.Token,
			// 	Version: config.Cfg.DooTask.Version,
			// }

			robot.Message = &dootask.DootaskMessage{
				Text:     fmt.Sprintf("[%s]有一条新消息:\n%s", conversation.Title, content),
				DialogId: dialogID,
				Token:    CustomerServiceConfigData.DooTaskIntegration.BotToken,
				Version:  config.Cfg.DooTask.Version,
			}
			result, err := robot.SendMsg()
			fmt.Println("发送消息到机器人", result, err)
		}(content, dialogID)
	}

	if sender == "agent" {
		// 通过WebSocket广播消息
		go websocket.BroadcastMessage(conversationUUID, map[string]interface{}{
			"content": content,
		}, websocket.MessageTypeNewMessage)
	}

	return &message, nil
}

// SendMessageWithDetails 发送消息（详细版本）
func (s *ChatService) SendMessageWithDetailsByID(conversationUUID int, content, sender, msgType, metadata string) (*models.Message, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("id = ?", conversationUUID).First(&conversation)
	if result.Error != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "对话不存在",
		}
	}
	// 查找来源
	var csSource models.CustomerServiceSource
	result = database.DB.Where("source_key =?", conversation.SourceKey).First(&csSource)
	if result.Error != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeSourceNotFound,
			Message: "来源不存在",
		}
	}
	dialogID := ""
	if csSource.DialogID != nil {
		dialogID = fmt.Sprintf("%d", *csSource.DialogID)
	}

	// 如果消息类型为空，设置默认值
	if msgType == "" {
		msgType = "text"
	}

	// 获取当前时间
	now := time.Now()

	// 创建消息
	message := models.Message{
		ConversationID: conversation.ID,
		Content:        content,
		Sender:         sender,
		Type:           msgType,
		Metadata:       metadata,
		CreatedAt:      now,
	}

	// 保存消息
	result = database.DB.Create(&message)
	if result.Error != nil {
		return nil, result.Error
	}

	// 更新对话的最后更新时间和最后消息时间
	database.DB.Model(&conversation).Updates(map[string]interface{}{
		"updated_at":      now,
		"last_message_at": now,
	})

	// 异步发布消息创建事件到事件总线
	if eventbus.GlobalEventBus != nil {
		logger.App.Info("消息创建事件正在发布",
			zap.Uint("messageID", message.ID),
			zap.Uint("conversationID", conversation.ID),
			zap.String("sender", sender))
		messageEvent := eventbus.NewMessageCreatedEvent(message.ID, conversation.ID, content, sender, msgType)
		if err := eventbus.GlobalEventBus.Publish(messageEvent); err != nil {
			logger.App.Error("发布消息创建事件失败",
				zap.Uint("messageID", message.ID),
				zap.Uint("conversationID", conversation.ID),
				zap.String("sender", sender),
				zap.Error(err))
		} else {
			logger.App.Info("消息创建事件已发布",
				zap.Uint("messageID", message.ID),
				zap.Uint("conversationID", conversation.ID),
				zap.String("sender", sender))
		}
	} else {
		logger.App.Info("消息创建事件总线未初始化，跳过事件发布",
			zap.Uint("messageID", message.ID),
			zap.Uint("conversationID", conversation.ID),
			zap.String("sender", sender))
	}

	fmt.Println("发送消息到机器人", sender)

	if sender == "customer" {
		// 通过WebSocket广播消息
		go websocket.BroadcastToAllAgents(message, websocket.MessageTypeNewMessage)
		go func(content, dialogID string) {
			CustomerServiceConfigData, err := models.LoadConfig[models.CustomerServiceConfigData](database.DB, models.CSConfigKeySystem)
			if err != nil {
				return
			}
			fmt.Println("发送消息到机器人")
			robot := dootask.DootaskRobot{
				Webhook: config.Cfg.DooTask.WebHook,
				Token:   CustomerServiceConfigData.DooTaskIntegration.BotToken,
				Version: config.Cfg.DooTask.Version,
			}
			// robot := dootask.DootaskRobot{
			// 	Webhook: config.Cfg.DooTask.WebHook,
			// 	Token:   config.Cfg.DooTask.Token,
			// 	Version: config.Cfg.DooTask.Version,
			// }

			robot.Message = &dootask.DootaskMessage{
				Text:     fmt.Sprintf("[%s]有一条新消息:\n%s", conversation.Title, content),
				DialogId: dialogID,
				Token:    CustomerServiceConfigData.DooTaskIntegration.BotToken,
				Version:  config.Cfg.DooTask.Version,
			}
			result, err := robot.SendMsg()
			fmt.Println("发送消息到机器人", result, err)
		}(content, dialogID)
	}

	if sender == "agent" {
		// 通过WebSocket广播消息
		go websocket.BroadcastMessage(conversation.Uuid, map[string]interface{}{
			"content": content,
		}, websocket.MessageTypeNewMessage)
	}

	return &message, nil
}

// GetMessages 获取对话消息列表
func (s *ChatService) GetMessageListByConversationUUID(conversationUUID string, page, pageSize int) ([]models.Message, int64, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", conversationUUID).First(&conversation)
	if result.Error != nil {
		return nil, 0, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "对话不存在",
		}
	}

	// 计算总数
	var total int64
	database.DB.Model(&models.Message{}).Where("conversation_id = ?", conversation.ID).Count(&total)

	// 查询最新的消息
	var messages []models.Message
	result = database.DB.Where("conversation_id = ?", conversation.ID).
		Order("created_at DESC"). // 降序排列，获取最新消息
		Limit(pageSize).          // 限制返回数量
		Find(&messages)

	// 反转切片，使消息按时间正序排列
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return messages, total, nil
}

// GetMessages 获取对话消息列表
func (s *ChatService) GetMessageListByConversationID(conversationID, page, pageSize int) ([]models.Message, int64, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("id = ?", conversationID).First(&conversation)
	if result.Error != nil {
		return nil, 0, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "对话不存在",
		}
	}

	// 计算总数
	var total int64
	database.DB.Model(&models.Message{}).Where("conversation_id = ?", conversation.ID).Count(&total)

	// 查询最新的消息
	var messages []models.Message
	result = database.DB.Where("conversation_id = ?", conversation.ID).
		Order("created_at DESC"). // 降序排列，获取最新消息
		Limit(pageSize).          // 限制返回数量
		Find(&messages)

	// 反转切片，使消息按时间正序排列
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return messages, total, nil
}

// GetConversationByUUID 通过UUID获取对话
func (s *ChatService) GetConversationByUUID(uuid string) (*models.Conversations, error) {
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", uuid).First(&conversation)
	if result.Error != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "对话不存在",
		}
	}

	return &conversation, nil
}

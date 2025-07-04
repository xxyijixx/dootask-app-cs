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
	bizErrors "chatdesk/internal/pkg/errors"
	"chatdesk/internal/pkg/eventbus"
	"chatdesk/internal/pkg/logger"
	"chatdesk/internal/pkg/websocket"
)

type ChatPublicService struct{}

var ChatPublic = ChatPublicService{}

// CreateConversation 创建新对话
func (s *ChatPublicService) CreateConversation(agentID, customerID uint, title, source string) (string, error) {
	// 生成UUID
	uuidStr := uuid.New().String()
	csSource := models.CustomerServiceSource{}

	// 如果没有提供来源，设置默认值
	if source == "" {
		source = "widget"
	}
	if err := database.DB.Model(&models.CustomerServiceSource{}).Where("source_key =?", source).First(&csSource).Error; err != nil {
		logger.App.Error("来源不存在", zap.String("source", source), zap.Error(err))
		return "", &i18n.ErrorInfo{
			Code:    i18n.ErrCodeSourceNotFound,
			Message: "Token is required",
		}
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

	// 广播新对话给所有客服
	go websocket.BroadcastToAllAgents(conversation, websocket.MessageTypeNewConversation)

	// 异步发布对话创建事件到事件总线
	if eventbus.GlobalEventBus != nil {
		fmt.Println("发布对话创建事件")
		conversationEvent := eventbus.NewConversationCreatedEvent(conversation.ID)
		if err := eventbus.GlobalEventBus.Publish(conversationEvent); err != nil {
			logger.App.Error("发布对话创建事件失败", zap.Uint("会话ID", conversation.ID), zap.Error(err))
		}
	} else {
		fmt.Println("GlobalEventBusGlobalEventBus发布对话创建事件")
	}

	return uuidStr, nil
}

// SendMessage 发送消息
func (s *ChatPublicService) SendMessage(conversationUUID, content, sender, msgType, metadata string) (*models.Message, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", conversationUUID).First(&conversation)
	if result.Error != nil {
		return nil, bizErrors.ErrConversationNotFound
	}

	// 检查对话状态
	if conversation.Status == "closed" {
		return nil, bizErrors.ErrConversationClosed
	}

	// 查找来源
	var csSource models.CustomerServiceSource
	result = database.DB.Where("source_key =?", conversation.SourceKey).First(&csSource)
	if result.Error != nil {
		return nil, bizErrors.ErrSourceNotFound
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
		"last_message":    content,
		"last_message_at": now,
	})

	// 如果是客户发送的消息，需要通知客服和机器人
	if sender == "customer" {
		// 通过WebSocket广播消息给所有客服
		go websocket.BroadcastToAllAgents(message, websocket.MessageTypeNewMessage)

		// 发送消息到机器人
		// go s.sendToBot(content, dialogID, conversation.Title)
		go s.sendDooTaskMessage(&message, &conversation, &csSource)
	}

	return &message, nil
}

// GetMessages 获取对话消息列表
func (s *ChatPublicService) GetMessages(conversationUUID string, page, pageSize int) ([]models.Message, int64, error) {
	// 查找对话
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", conversationUUID).First(&conversation)
	if result.Error != nil {
		return nil, 0, bizErrors.ErrConversationNotFound
	}

	// 检查对话状态 - 对于获取消息，即使关闭的对话也应该能查看历史消息
	// 但可以在这里添加其他业务逻辑
	if conversation.Status == "closed" {
		// 可以选择返回错误或者允许查看历史消息
		// return nil, 0, errors.New("对话已关闭")
		// 这里我们允许查看已关闭对话的历史消息
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

// GetConversation 通过UUID获取对话
func (s *ChatPublicService) GetConversation(uuid string) (*models.Conversations, error) {
	var conversation models.Conversations
	result := database.DB.Where("uuid = ?", uuid).First(&conversation)
	if result.Error != nil {
		// return nil, bizErrors.ErrConversationNotFound
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConversationNotFound,
			Message: "Token is required", // 这里可以是任意消息，实际显示会根据客户端语言决定
		}
	}

	return &conversation, nil
}

func (s *ChatPublicService) sendDooTaskMessage(message *models.Message, conversation *models.Conversations, source *models.CustomerServiceSource) {
	customerServiceConfigData, err := models.LoadConfig[models.CustomerServiceConfigData](database.DB, models.CSConfigKeySystem)
	if err != nil {
		return
	}
	// if customerServiceConfigData
	hasTask := false
	if conversation.DooTaskDialogID != 0 && conversation.DooTaskTaskID != 0 {
		hasTask = true
		s.sendToBot(customerServiceConfigData, message.Content, fmt.Sprintf("%d", conversation.DooTaskDialogID))
	}
	content := ""
	if !hasTask {
		content = fmt.Sprintf("【%s】\n有一条新消息:\n%s", conversation.Title, message.Content)
	} else {
		content = fmt.Sprintf("[任务ID:%d][%s]\n有一条新消息:\n%s", conversation.DooTaskTaskID, conversation.Title, message.Content)
	}
	s.sendToBot(customerServiceConfigData, content, fmt.Sprintf("%d", *source.DialogID))
}

// sendToBot 发送消息到机器人
func (s *ChatPublicService) sendToBot(CustomerServiceConfigData *models.CustomerServiceConfigData, content, dialogID string) {

	robot := dootask.DootaskRobot{
		Webhook: config.Cfg.DooTask.WebHook,
		Token:   CustomerServiceConfigData.DooTaskIntegration.BotToken,
		Version: config.Cfg.DooTask.Version,
	}

	robot.Message = &dootask.DootaskMessage{
		Text:     content,
		DialogId: dialogID,
		Token:    CustomerServiceConfigData.DooTaskIntegration.BotToken,
		Version:  config.Cfg.DooTask.Version,
	}

	result, err := robot.SendMsg()
	fmt.Println("发送消息到机器人", result, err)
}

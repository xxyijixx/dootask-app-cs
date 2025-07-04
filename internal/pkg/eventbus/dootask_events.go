package eventbus

import (
	"context"
	"fmt"
	"time"

	"chatdesk/internal/i18n"
	"chatdesk/internal/models"
	"chatdesk/internal/models/dto"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/dootask"
	"chatdesk/internal/pkg/logger"

	"go.uber.org/zap"
)

// 事件类型常量
const (
	EventTypeConversationCreated = "conversation.created"
	EventTypeMessageCreated      = "message.created"
)

// ConversationCreatedEvent 对话创建事件
type ConversationCreatedEvent struct {
	ConversationID uint
}

// NewConversationCreatedEvent 创建对话创建事件
func NewConversationCreatedEvent(conversationID uint) *ConversationCreatedEvent {
	return &ConversationCreatedEvent{
		ConversationID: conversationID,
	}
}

// GetType 实现Event接口
func (e *ConversationCreatedEvent) GetType() string {
	return EventTypeConversationCreated
}

// GetData 实现Event接口
func (e *ConversationCreatedEvent) GetData() interface{} {
	return map[string]interface{}{
		"conversation_id": e.ConversationID,
	}
}

// GetTimestamp 实现Event接口
func (e *ConversationCreatedEvent) GetTimestamp() time.Time {
	return time.Now()
}

// MessageCreatedEvent 消息创建事件
type MessageCreatedEvent struct {
	MessageID      uint
	ConversationID uint
	Content        string
	Sender         string
	MessageType    string
}

// NewMessageCreatedEvent 创建消息创建事件
func NewMessageCreatedEvent(messageID, conversationID uint, content, sender, messageType string) *MessageCreatedEvent {
	return &MessageCreatedEvent{
		MessageID:      messageID,
		ConversationID: conversationID,
		Content:        content,
		Sender:         sender,
		MessageType:    messageType,
	}
}

// GetType 实现Event接口
func (e *MessageCreatedEvent) GetType() string {
	return EventTypeMessageCreated
}

// GetData 实现Event接口
func (e *MessageCreatedEvent) GetData() interface{} {
	return map[string]interface{}{
		"message_id":      e.MessageID,
		"conversation_id": e.ConversationID,
		"content":         e.Content,
		"sender":          e.Sender,
		"message_type":    e.MessageType,
	}
}

// GetTimestamp 实现Event接口
func (e *MessageCreatedEvent) GetTimestamp() time.Time {
	return time.Now()
}

// DooTaskEventHandlers DooTask事件处理器集合
type DooTaskEventHandlers struct{}

// NewDooTaskEventHandlers 创建DooTask事件处理器
func NewDooTaskEventHandlers() *DooTaskEventHandlers {
	return &DooTaskEventHandlers{}
}

// HandleConversationCreated 处理对话创建事件
func (h *DooTaskEventHandlers) HandleConversationCreated(ctx context.Context, event Event) error {
	convEvent, ok := event.(*ConversationCreatedEvent)
	if !ok {
		return &i18n.ErrorInfo{
			Code:    i18n.ErrCodeEventTypeError,
			Message: "事件类型错误: 期望 ConversationCreatedEvent",
		}
	}

	logger.App.Info("处理对话创建事件", zap.Uint("conversationID", convEvent.ConversationID))
	customerServiceConfigData, err := models.LoadConfig[models.CustomerServiceConfigData](database.DB, models.CSConfigKeySystem)
	if customerServiceConfigData.DooTaskIntegration.CreateTask == false {
		logger.App.Info("DooTask任务创建功能未启用，跳过任务创建")
		return nil
	}
	// 从数据库查询对话信息
	var conversation models.Conversations
	if err := database.DB.First(&conversation, convEvent.ConversationID).Error; err != nil {
		logger.App.Error("查询对话信息失败",
			zap.Uint("conversationID", convEvent.ConversationID),
			zap.Error(err))
		return err
	}

	// 从数据库查询来源信息
	var source models.CustomerServiceSource
	if err := database.DB.Where("source_key = ?", conversation.SourceKey).First(&source).Error; err != nil {
		logger.App.Error("查询来源信息失败",
			zap.String("sourceKey", conversation.SourceKey),
			zap.Error(err))
		return err
	}

	// 检查是否需要创建DooTask任务
	if source.ProjectID == nil {
		logger.App.Info("来源未配置DooTask项目，跳过任务创建",
			zap.String("sourceKey", source.SourceKey))
		return nil
	}

	// TODO: 在这里实现DooTask任务创建逻辑
	// 可以直接调用DooTask API或者通过其他方式实现
	// 示例：
	taskReq := &dto.CreateTaskReq{
		ProjectID: *source.ProjectID,
		Name:      fmt.Sprintf("[%s] - %s", source.Name, conversation.Title),
		Content:   fmt.Sprintf("来源: %s", source.Name),
		ColumnID:  source.ColumnID,
		Assist:    []int{},
		Owner:     []int{*customerServiceConfigData.DooTaskIntegration.BotId},
	}
	// 调用DooTask API创建任务...
	dootaskService := dootask.NewIDootaskService()
	createTaskResp, err := dootaskService.CreateTask(customerServiceConfigData.DooTaskIntegration.BotToken, taskReq)
	if err != nil {
		logger.App.Error("创建DooTask任务失败", zap.Error(err))
		return err
	}
	openTaskDialogResp, err := dootaskService.OpenTaskDialog(customerServiceConfigData.DooTaskIntegration.BotToken, createTaskResp.ID)
	if err != nil {
		logger.App.Error("打开DooTask任务对话框失败", zap.Error(err))
		return err
	}
	// 打印DooTask任务创建结果
	logger.App.Info("DooTask任务创建结果",
		zap.Any("taskID", createTaskResp.ID),
		zap.Any("dialogID", openTaskDialogResp.DialogID))

	// 更新会话信息
	conversation.DooTaskTaskID = createTaskResp.ID
	conversation.DooTaskDialogID = openTaskDialogResp.DialogID
	logger.App.Debug("更新对话信息", zap.Any("conversation", conversation))
	if err := database.DB.Save(&conversation).Error; err != nil {
		logger.App.Error("更新对话信息失败", zap.Error(err))
		return err
	}
	return nil
}

// HandleMessageCreated 处理消息创建事件
func (h *DooTaskEventHandlers) HandleMessageCreated(ctx context.Context, event Event) error {
	msgEvent, ok := event.(*MessageCreatedEvent)
	if !ok {
		return &i18n.ErrorInfo{
			Code:    i18n.ErrCodeEventTypeError,
			Message: "事件类型错误: 期望 MessageCreatedEvent",
		}
	}

	logger.App.Info("处理消息创建事件",
		zap.Uint("messageID", msgEvent.MessageID),
		zap.Uint("conversationID", msgEvent.ConversationID),
		zap.String("sender", msgEvent.Sender),
		zap.String("messageType", msgEvent.MessageType))

	// 从数据库查询对话信息
	var conversation models.Conversations
	if err := database.DB.First(&conversation, msgEvent.ConversationID).Error; err != nil {
		logger.App.Error("查询对话信息失败",
			zap.Uint("conversationID", msgEvent.ConversationID),
			zap.Error(err))
		return err
	}

	// 从数据库查询来源信息
	var source models.CustomerServiceSource
	if err := database.DB.Where("source_key = ?", conversation.SourceKey).First(&source).Error; err != nil {
		logger.App.Error("查询来源信息失败",
			zap.String("sourceKey", conversation.SourceKey),
			zap.Error(err))
		return err
	}

	logger.App.Info("消息创建事件处理完成",
		zap.String("conversationUUID", conversation.Uuid),
		zap.String("sourceName", source.Name),
		zap.String("content", msgEvent.Content))

	// TODO: 在这里可以添加消息相关的业务逻辑
	// 比如消息统计、通知处理等

	return nil
}

// RegisterDooTaskEventHandlers 注册DooTask事件处理器
func RegisterDooTaskEventHandlers() {
	handlers := NewDooTaskEventHandlers()

	// 注册对话创建事件处理器
	GlobalEventBus.Subscribe(EventTypeConversationCreated, handlers.HandleConversationCreated)

	// 注册消息创建事件处理器
	GlobalEventBus.Subscribe(EventTypeMessageCreated, handlers.HandleMessageCreated)

	logger.App.Info("DooTask事件处理器注册完成")
}

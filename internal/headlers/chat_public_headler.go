package headlers

import (
	"strconv"

	"chatdesk/internal/i18n"
	"chatdesk/internal/models"
	bizErrors "chatdesk/internal/pkg/errors"
	"chatdesk/internal/pkg/response"
	"chatdesk/internal/service"

	"github.com/gin-gonic/gin"
)

type ChatPublicHeadler struct {
}

var ChatPublic = ChatPublicHeadler{}

// @Summary 创建新对话
// @Description 创建客服和客户之间的新对话
// @Accept json
// @Produce json
// @Param request body models.CreateConversationRequest true "创建对话请求参数"
// @Success 200 {object} models.Response{data=models.ConversationResponse}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /chat [post]
func (h ChatPublicHeadler) CreateConversation(c *gin.Context) {
	// 解析请求参数
	var req models.CreateConversationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequestWithCode(c, i18n.ErrCodeInvalidParams)
		return
	}

	// 创建对话
	uuid, err := service.ChatPublic.CreateConversation(req.AgentID, req.CustomerID, req.Title, req.Source)
	if err != nil {
		// 检查是否为i18n错误
		if i18nErr, ok := err.(*i18n.ErrorInfo); ok {
			response.UnauthorizedWithCode(c, i18nErr.Code)
		} else {
			response.ServerError(c, "", nil)
		}
		return
	}

	response.SuccessWithCode(c, models.ConversationResponse{
		UUID: uuid,
	})
}

// @Summary 发送消息
// @Description 在指定对话中发送新消息
// @Accept json
// @Produce json
// @Param request body models.SendMessageRequest true "发送消息请求参数"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /chat/messages [post]
func (h ChatPublicHeadler) SendMessage(c *gin.Context) {
	// 解析请求参数
	var req models.SendMessageRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequestWithCode(c, i18n.ErrCodeInvalidParams)
		return
	}

	// 发送消息
	message, err := service.ChatPublic.SendMessage(req.UUID, req.Content, req.Sender, req.Type, req.Metadata)
	if err != nil {
		// 检查是否为i18n错误
		if i18nErr, ok := err.(*i18n.ErrorInfo); ok {
			response.BadRequestWithCode(c, i18nErr.Code)
		} else {
			response.BadRequestWithCode(c, i18n.ErrCodeMessageSendFailed)
		}
		return
	}

	// 为客户端简化消息数据
	simplifiedMessage := map[string]interface{}{
		"id":         message.ID,
		"content":    message.Content,
		"sender":     message.Sender,
		"type":       message.Type,
		"created_at": message.CreatedAt,
	}

	response.SuccessWithCode(c, simplifiedMessage)
}

// @Summary 获取对话消息列表
// @Description 获取指定对话的消息历史记录
// @Accept json
// @Produce json
// @Param uuid path string true "对话UUID"
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认20"
// @Success 200 {object} models.Response{data=models.PaginationData}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /chat/{uuid}/messages [get]
func (h ChatPublicHeadler) GetMessages(c *gin.Context) {
	// 获取路径参数
	uuid := c.Param("uuid")
	if uuid == "" {
		response.BadRequestWithCode(c, i18n.ErrCodeInvalidParams)
		return
	}

	// 获取分页参数
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 获取消息列表
	messages, total, err := service.ChatPublic.GetMessages(uuid, page, pageSize)
	if err != nil {
		// 检查是否为i18n错误
		if i18nErr, ok := err.(*i18n.ErrorInfo); ok {
			response.BadRequestWithCode(c, i18nErr.Code)
		} else {
			response.ServerError(c, "", err)
		}
		return
	}

	// 为客户端简化消息数据
	simplifiedMessages := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		simplifiedMessages[i] = map[string]interface{}{
			"id":         msg.ID,
			"content":    msg.Content,
			"sender":     msg.Sender,
			"type":       msg.Type,
			"created_at": msg.CreatedAt,
		}
	}

	// 使用通用成功消息的分页响应
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		lang = "zh-CN"
	}
	message := i18n.T(i18n.Language(lang), string(i18n.ErrCodeSuccess))
	response.SuccessWithPagination(c, message, simplifiedMessages, total, page, pageSize)
}

// @Summary 获取对话信息
// @Description 获取指定对话的详细信息
// @Accept json
// @Produce json
// @Param uuid path string true "对话UUID"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /chat/{uuid} [get]
func (h ChatPublicHeadler) GetConversation(c *gin.Context) {
	// 获取路径参数
	uuid := c.Param("uuid")
	if uuid == "" {
		response.BadRequestWithCode(c, i18n.ErrCodeInvalidParams)
		return
	}

	// 获取对话信息
	conversation, err := service.ChatPublic.GetConversation(uuid)
	if err != nil {
		// 检查是否为i18n错误
		if i18nErr, ok := err.(*i18n.ErrorInfo); ok {
			response.ErrorWithCode(c, i18nErr.Code)
			return
		}
		// 检查是否是业务错误
		if bizErr, ok := bizErrors.IsBusinessError(err); ok {
			response.ErrorWithCode(c, i18n.ErrorCode(bizErr.Code), bizErr)
			return
		}
		response.ServerError(c, "", err)
		return
	}

	// 为客户端简化对话数据
	simplifiedConversation := map[string]interface{}{
		"uuid":            conversation.Uuid,
		"title":           conversation.Title,
		"status":          conversation.Status,
		"source":          conversation.Source,
		"last_message":    conversation.LastMessage,
		"last_message_at": conversation.LastMessageAt,
		"created_at":      conversation.CreatedAt,
	}

	response.SuccessWithCode(c, simplifiedConversation)
}

package headlers

import (
	"chatdesk/internal/config"
	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/dootask"
	"chatdesk/internal/pkg/response"
	"chatdesk/internal/service"
	"chatdesk/internal/utils/common"

	"github.com/gin-gonic/gin"
)

type DooTaskHeadler struct {
}

var DooTask = DooTaskHeadler{}

// swagger
// @Summary 机器人聊天
// @Description 机器人聊天
// @Tags 机器人
// @Accept json
// @Produce json
// @Param chatKey path string true "chatKey"
// @Param message body dootask.Message true "message"
// @Success 200 {object} response.Response
// @Router
// @Router /dootask/{chatKey}/chat [post]
func (d DooTaskHeadler) Chat(c *gin.Context) {
	chatKey := c.Param("chatKey")
	chatConfig, err := models.LoadConfig[models.DooTaskChat](database.GetDB(), models.CSConfigKeyDooTaskChat)
	if err != nil {
		return
	}
	if chatConfig.ChatKey != chatKey {
		return
	}
	// 发送消息
	robot := dootask.DootaskRobot{
		Webhook: config.Cfg.DooTask.WebHook,
		Token:   config.Cfg.DooTask.Token,
		Version: config.Cfg.DooTask.Version,
	}
	message := robot.ConvertToMessage(c)
	// message.Text = "接收到信息：" + message.Text
	// fmt.Println(message)
	// robot.SendMsg()
	dialogID := common.StringToInt(message.DialogId)

	conversation, err := service.ChatAgent.GetConversationByDooTasDialogID(dialogID)
	if err != nil {
		return
	}

	_, err = service.ChatAgent.SendMessageByAgent(conversation.ID, message.Text, "text", "dootask")
	if err != nil {
		// response.ServerError(c, "发送消息失败", err)
		return
	}
	response.Success(c, "服务运行正常", gin.H{
		"status": "ok",
	})
}

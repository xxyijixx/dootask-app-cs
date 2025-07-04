package initialize

import (
	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/utils/common"
	"encoding/json"
	"log"

	"gorm.io/gorm"
)

// InitDefaultConfig 初始化默认配置
func InitDefaultConfig() {
	db := database.GetDB()

	// 初始化DooTaskChat配置
	initDooTaskChatConfig(db)

	// 初始化系统配置
	initSystemConfig(db)
}

// initDooTaskChatConfig 初始化DooTaskChat配置
func initDooTaskChatConfig(db *gorm.DB) {
	var count int64
	db.Model(models.CSConfig{}).Where("config_key = ?", models.CSConfigKeyDooTaskChat).Count(&count)

	if count != 0 {
		log.Println("DooTaskChat配置已存在")
		return
	}

	chatKey := common.RandString(32)
	chatConfig := models.DooTaskChat{
		ChatKey: chatKey,
	}
	jsonBytes, err := json.Marshal(chatConfig)
	if err != nil {
		log.Printf("序列化DooTaskChat配置失败: %v", err)
		return
	}

	defaultConfig := models.CSConfig{
		ConfigKey:  models.CSConfigKeyDooTaskChat,
		ConfigJSON: string(jsonBytes),
	}
	result := db.Create(&defaultConfig)
	if result.Error != nil {
		log.Printf("创建DooTaskChat配置失败: %v", result.Error)
		return
	}
	log.Println("DooTaskChat配置初始化完成")
}

// initSystemConfig 初始化系统配置
func initSystemConfig(db *gorm.DB) {
	var count int64
	db.Model(models.CSConfig{}).Where("config_key = ?", models.CSConfigKeySystem).Count(&count)

	if count != 0 {
		log.Println("系统配置已存在")
		return
	}

	// 创建默认系统配置
	defaultSystemConfig := models.CustomerServiceConfigData{
		ServiceName:    "客服中心",
		WelcomeMessage: "欢迎来到客服中心，请问有什么可以帮助您的？",
		OfflineMessage: "当前客服不在线，请留言，我们会尽快回复您。",
		DooTaskIntegration: models.DooTaskIntegrationData{
			BotId:      nil,
			BotToken:   "",
			ProjectId:  nil,
			TaskId:     nil,
			DialogId:   nil,
			CreateTask: false,
		},
		WorkingHours: models.WorkingHoursData{
			Enabled:   false,
			StartTime: "09:00",
			EndTime:   "18:00",
			WorkDays:  []int{1, 2, 3, 4, 5}, // 周一到周五
		},
		AutoReply: models.AutoReplyData{
			Enabled: false,
			Delay:   30,
			Message: "感谢您的咨询，我们会尽快为您处理。",
		},
		AgentAssignment: models.AgentAssignmentData{
			Method:          "round-robin",
			Timeout:         300, // 5分钟
			FallbackAgentId: nil,
		},
		UI: models.UIData{
			PrimaryColor:       "#007bff",
			LogoUrl:            "",
			ChatBubblePosition: "right",
		},
		Reserved1: "",
		Reserved2: "",
	}

	jsonBytes, err := json.Marshal(defaultSystemConfig)
	if err != nil {
		log.Printf("序列化系统配置失败: %v", err)
		return
	}

	systemConfig := models.CSConfig{
		ConfigKey:  models.CSConfigKeySystem,
		ConfigJSON: string(jsonBytes),
	}

	result := db.Create(&systemConfig)
	if result.Error != nil {
		log.Printf("创建系统配置失败: %v", result.Error)
		return
	}
	log.Println("系统配置初始化完成")
}

package initialize

import (
	"log"
	"time"

	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
)

// InitDefaultAgent 初始化默认客服账号
func InitDefaultAgent() {
	db := database.GetDB()

	// 检查是否已存在客服账号
	var count int64
	db.Model(&models.Agent{}).Count(&count)
	if count > 0 {
		log.Println("已存在客服账号，跳过初始化默认账号")
		return
	}

	defaultAgent := models.Agent{
		Username:  "admin",
		Name:      "系统管理员",
		Avatar:    "",
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := db.Create(&defaultAgent)
	if result.Error != nil {
		log.Printf("创建默认客服账号失败: %v\n", result.Error)
		return
	}

	log.Println("已创建默认客服账号: admin / admin123")
}

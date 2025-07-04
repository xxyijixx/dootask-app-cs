package initialize

import (
	"chatdesk/internal/i18n"
	"log"
	"path/filepath"
)

// Init 执行所有初始化操作
func Init() {
	log.Println("开始执行初始化操作...")

	// 初始化i18n
	InitI18n()

	// 初始化默认客服账号
	// InitDefaultAgent()

	InitDefaultConfig()

	log.Println("初始化操作完成")
}

// InitI18n 初始化国际化
func InitI18n() {
	log.Println("初始化国际化...")

	// 获取翻译文件目录路径
	translationsDir := filepath.Join("internal", "i18n")

	// 初始化i18n管理器
	if err := i18n.Init(translationsDir); err != nil {
		log.Printf("初始化i18n失败: %v", err)
		// 不阻止应用启动，只是记录错误
	} else {
		log.Println("i18n初始化成功")
	}
}

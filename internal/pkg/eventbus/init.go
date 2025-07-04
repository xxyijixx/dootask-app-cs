package eventbus

import (
	"chatdesk/internal/pkg/logger"

	"go.uber.org/zap"
)

// InitEventBus 初始化事件总线系统
func InitEventBus() {
	// 初始化全局事件总线
	// workers: 工作协程数量，建议根据CPU核心数设置
	// queueSize: 事件队列大小，根据业务量调整
	InitGlobalEventBus(4, 1000)

	logger.App.Info("事件总线系统初始化完成",
		zap.Int("workers", 4),
		zap.Int("queueSize", 1000))
}

// RegisterAllEventHandlers 注册所有事件处理器
func RegisterAllEventHandlers() {
	if GlobalEventBus == nil {
		logger.App.Error("事件总线未初始化")
		return
	}

	// 注册DooTask事件处理器
	RegisterDooTaskEventHandlers()

	logger.App.Info("所有事件处理器已注册")
}

// ShutdownEventBus 关闭事件总线系统
func ShutdownEventBus() {
	logger.App.Info("正在关闭事件总线系统...")
	StopGlobalEventBus()
	logger.App.Info("事件总线系统已关闭")
}

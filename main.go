package main

import (
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"chatdesk/internal/config"
	"chatdesk/internal/middleware"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/eventbus"
	"chatdesk/internal/pkg/initialize"
	"chatdesk/internal/pkg/logger"
	"chatdesk/internal/pkg/websocket"
	"chatdesk/internal/routes"

	"github.com/gin-gonic/gin"
)

// @title Support Plugin API
// @version 1.0
// @description Support Plugin API
// @host localhost:8888
// @BasePath /api/v1
// @schemes http
func main() {
	// 初始化配置
	config.Init()

	// 打印配置信息
	config.Cfg.Print()

	logger.InitLogger()

	database.InitDB()

	// 执行初始化操作
	initialize.Init()

	// 初始化事件总线
	eventbus.InitEventBus()

	// 注册所有事件处理器
	eventbus.RegisterAllEventHandlers()

	// 启动WebSocket管理器
	go websocket.WebSocketManager.Start()

	// 创建Gin实例
	r := gin.Default()

	// 禁用自动重定向，避免301重定向问题
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// 注册全局中间件
	middleware.RegisterGlobal(r)

	// 注册路由
	routes.RegisterRoutes(r)

	// 设置优雅关闭
	setupGracefulShutdown()

	// 启动服务器
	serverAddr := fmt.Sprintf(":%d", config.Cfg.App.Port)
	fmt.Printf("服务器启动在 http://localhost:%s\n", strconv.Itoa(config.Cfg.App.Port))
	r.Run(serverAddr)
}

// setupGracefulShutdown 设置优雅关闭
func setupGracefulShutdown() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		fmt.Println("\n正在优雅关闭服务器...")

		// 关闭事件总线
		eventbus.ShutdownEventBus()

		fmt.Println("服务器已关闭")
		os.Exit(0)
	}()
}

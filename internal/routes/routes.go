package routes

import (
	"chatdesk/internal/config"
	"chatdesk/internal/headlers"
	"chatdesk/internal/middleware"
	"chatdesk/internal/pkg/websocket"
	"chatdesk/internal/web"
	"net/http"
	"strings"

	_ "chatdesk/docs"

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// RegisterRoutes 注册所有路由
func RegisterRoutes(r *gin.Engine) {
	// API 路由组 v1
	v1 := r.Group("/api/v1", middleware.LoggerMiddleware(), middleware.ErrorHandlerMiddleware())
	{

		// 健康检查
		v1.GET("/health", headlers.HealthCheck)

		// DooTask相关路由
		dooTaskRoutes := v1.Group("/dootask")
		{
			dooTaskRoutes.POST("/:chatKey/chat", headlers.DooTask.Chat)
		}

		// // 认证相关路由
		// authRoutes := v1.Group("/auth")
		// {
		// 	// 客服登录
		// 	authRoutes.POST("/login", headlers.Auth.Login)

		// 	// 需要认证的路由
		// 	authProtected := authRoutes.Group("", middleware.AgentAuthMiddleware())
		// 	{
		// 		// 获取当前客服信息
		// 		authProtected.GET("/me", headlers.Auth.GetCurrentAgent)
		// 		// 创建客服账号
		// 		authProtected.POST("/agents", headlers.Auth.CreateAgent)
		// 	}
		// }

		// 服务器配置相关路由（无需认证）
		v1.GET("/server/config", middleware.AgentAuthMiddleware(), headlers.Config.GetServerConfig)

		// 配置相关路由
		configRoutes := v1.Group("/configs", middleware.AgentAuthMiddleware(), middleware.AdminAuthMiddleware())
		{
			// 获取所有配置
			configRoutes.GET("", headlers.Config.GetAllConfigs)
			// 获取指定配置
			configRoutes.GET("/:config_key", headlers.Config.GetConfig)
			// 保存配置
			configRoutes.POST("/:config_key", headlers.Config.SaveConfig)
			// 删除配置
			// configRoutes.DELETE("/:config_key", headlers.Config.DeleteConfig)
		}

		// 客服来源相关路由
		sourceRoutes := v1.Group("/sources", middleware.AgentAuthMiddleware(), middleware.AdminAuthMiddleware())
		{
			// 创建来源
			sourceRoutes.POST("", headlers.Source.CreateSource)
			// 获取所有来源
			sourceRoutes.GET("", headlers.Source.GetSourceList)
			// 根据ID获取来源
			sourceRoutes.GET("/:id", headlers.Source.GetSourceById)
			// 更新来源
			sourceRoutes.PUT("/:id", headlers.Source.UpdateSource)
			// 删除来源
			sourceRoutes.DELETE("/:id", headlers.Source.DeleteSource)
		}

		// 对话相关路由
		chatRoutes := v1.Group("/chat")
		{
			// 公共路由 - 客户可访问
			// 创建对话
			chatRoutes.POST("", headlers.ChatPublic.CreateConversation)
			// 发送消息
			chatRoutes.POST("/messages", headlers.ChatPublic.SendMessage)
			// 获取对话消息列表
			chatRoutes.GET("/:uuid/messages", headlers.ChatPublic.GetMessages)
			// 获取对话信息
			chatRoutes.GET("/:uuid", headlers.ChatPublic.GetConversation)
			// WebSocket连接
			chatRoutes.GET("/ws", func(c *gin.Context) {
				websocket.ServeWs(c)
			})

			// 需要客服认证的路由
			chatProtected := chatRoutes.Group("/agent", middleware.AgentAuthMiddleware())
			{
				// 发送消息
				chatProtected.POST("/messages", headlers.ChatAgent.SendMessageByAgent)
				// 获取客服的所有对话
				chatProtected.GET("/conversations", headlers.ChatAgent.GetAgentConversations)
				// 根据UUID获取对话信息
				chatProtected.GET("/conversations/:uuid", headlers.ChatAgent.GetConversationByUUID)
				// 获取对话消息列表
				chatProtected.GET("/:id/messages", headlers.ChatAgent.GetMessageListByConversationID)
				// 关闭对话
				chatProtected.PUT("/conversations/:id/close", headlers.ChatAgent.CloseConversation)
				// 重新打开对话
				chatProtected.PUT("/conversations/:id/reopen", headlers.ChatAgent.ReopenConversation)
			}
		}

		// 客服验证接口（只需要基础认证）
		agentVerifyRoutes := v1.Group("/agents", middleware.AgentAuthMiddleware())
		{
			// 验证客服身份
			agentVerifyRoutes.GET("/verify", headlers.Agent.Verify)
		}

		// 客服管理接口（需要管理员权限）
		agentRoutes := v1.Group("/agents", middleware.AgentAuthMiddleware(), middleware.AdminAuthMiddleware())
		{
			// 获取所有客服
			agentRoutes.GET("", headlers.Agent.List)
			// 设置客服ID,提交一组DooTask用户ID，不存在则创建对应的客服人员
			agentRoutes.PUT("", headlers.Agent.Edit)

			agentRoutes.DELETE("/:id", headlers.Agent.Delete)
		}
	}
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	// // 静态文件服务
	// r.StaticFS("/apps/chatdesk", http.Dir("./web/admin/dist"))

	// // 404处理，将所有未匹配的路由重定向到前端的index.html
	// r.NoRoute(func(c *gin.Context) {
	// 	c.File("./web/admin/dist/index.html")
	// })
	// 静态文件服务
	staticGroup := r.Group(config.Cfg.App.Base)
	{
		staticGroup.GET("", func(c *gin.Context) {
			c.Data(http.StatusOK, "text/html; charset=utf-8", web.IndexByte)

		})
		staticGroup.GET("/*filepath", func(c *gin.Context) {
			path := c.Param("filepath")

			if path == "/" || path == "" {
				path = "/index.html"
			}
			// 优先处理 widget/script.js
			if path == "/widget/bundle.js" {

				file, err := web.WidgetDist.ReadFile("widget/dist/bundle.js")
				if err != nil {
					c.String(http.StatusNotFound, "Widget script not found")
					return
				}

				// 检查是否有下载或预览参数
				download := c.Query("download")
				preview := c.Query("preview")

				if download == "true" {
					c.Header("Content-Disposition", "attachment; filename=\"bundle.js\"")
					c.Data(http.StatusOK, "application/javascript", file)
				} else if preview == "true" {
					c.Data(http.StatusOK, "text/plain; charset=utf-8", file)
				} else {
					c.Data(http.StatusOK, "application/javascript", file)
				}
				return
			}

			filePath := "admin/dist" + path

			// 尝试读取文件
			file, err := web.Dist.ReadFile(filePath)
			if err != nil {
				// 文件不存在返回 index.html（用于 SPA 路由兼容）
				if strings.Contains(err.Error(), "file does not exist") {
					c.Data(http.StatusOK, "text/html; charset=utf-8", web.IndexByte)
					return
				} else {
					c.String(http.StatusInternalServerError, "Error: %v", err)
				}
				if strings.HasSuffix(path, ".html") || path == "/index.html" {
					c.Data(http.StatusOK, "text/html; charset=utf-8", web.IndexByte)
					return
				}

				// 非 HTML 文件，直接返回 404
				c.String(http.StatusNotFound, "Not Found")
				return
			}
			// 可选：简单的 MIME 类型推断
			mimeType := func(path string) string {
				switch {
				case strings.HasSuffix(path, ".html"):
					return "text/html; charset=utf-8"
				case strings.HasSuffix(path, ".js"):
					return "application/javascript"
				case strings.HasSuffix(path, ".css"):
					return "text/css"
				case strings.HasSuffix(path, ".svg"):
					return "image/svg+xml"
				case strings.HasSuffix(path, ".png"):
					return "image/png"
				case strings.HasSuffix(path, ".jpg"), strings.HasSuffix(path, ".jpeg"):
					return "image/jpeg"
				case strings.HasSuffix(path, ".json"):
					return "application/json"
				default:
					return "application/octet-stream"
				}
			}
			// 根据后缀设置 MIME 类型
			contentType := mimeType(path)
			c.Data(http.StatusOK, contentType, file)
		})
	}

	// 404处理，将所有未匹配的路由重定向到前端的index.html
	// r.NoRoute(func(c *gin.Context) {
	// 	c.File("./web/admin/dist/index.html")
	// })
}

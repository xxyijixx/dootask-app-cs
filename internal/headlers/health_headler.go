package headlers

import (
	"chatdesk/internal/config"
	"chatdesk/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

// HealthCheck 健康检查接口
func HealthCheck(c *gin.Context) {
	response.Success(c, "服务运行正常", gin.H{
		"status": "ok",
		"app": gin.H{
			"name":    config.Cfg.App.Name,
			"version": config.Cfg.DooTask.Version,
		},
	})
}

// NotFound 404处理
func NotFound(c *gin.Context) {
	response.NotFound(c, "请求的资源不存在")
}

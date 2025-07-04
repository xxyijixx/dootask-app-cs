package headlers

import (
	"encoding/json"

	"github.com/gin-gonic/gin"

	"chatdesk/internal/config"
	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/response"
	"chatdesk/internal/utils/common"
)

type ConfigHeadler struct{}

var Config = ConfigHeadler{}

// @Summary 获取服务器配置
// @Description 获取服务器基础配置信息
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=map[string]interface{}}
// @Router /server/config [get]
func (h ConfigHeadler) GetServerConfig(c *gin.Context) {
	// common.
	// 返回硬编码的服务器配置
	serverConfig := models.ServerConfigResp{
		BaseUrl:   common.GetCurrentDomain(c) + config.Cfg.App.Base,
		DockerUrl: "http://customer:8888/api/v1",
		Mode:      "dev",
	}
	// serverConfig := map[string]interface{}{
	// 	"baseUrl": "http://192.168.0.4",
	// }

	response.Success(c, "success", serverConfig)
}

// @Summary 获取配置
// @Description 根据配置键获取配置信息
// @Accept json
// @Produce json
// @Param config_key path string true "配置键"
// @Success 200 {object} models.Response{data=interface{}}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /config/{config_key} [get]
func (h ConfigHeadler) GetConfig(c *gin.Context) {
	configKey := c.Param("config_key")
	if configKey == "" {
		response.BadRequest(c, "配置键不能为空", nil)
		return
	}

	var config models.CSConfig
	result := database.DB.Where("config_key = ?", configKey).First(&config)
	if result.Error != nil {
		response.NotFound(c, "配置不存在")
		return
	}

	// 解析JSON配置
	var configData interface{}
	if err := json.Unmarshal([]byte(config.ConfigJSON), &configData); err != nil {
		response.InternalServerError(c, "配置解析失败", err)
		return
	}

	response.Success(c, "获取配置成功", configData)
}

// @Summary 保存配置
// @Description 保存或更新配置信息
// @Accept json
// @Produce json
// @Param config_key path string true "配置键"
// @Param request body interface{} true "配置数据"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /config/{config_key} [post]
func (h ConfigHeadler) SaveConfig(c *gin.Context) {
	configKey := c.Param("config_key")
	if configKey == "" {
		response.BadRequest(c, "配置键不能为空", nil)
		return
	}

	// 解析请求体
	var configData interface{}
	if err := c.ShouldBindJSON(&configData); err != nil {
		response.BadRequest(c, "参数错误", err)
		return
	}

	// 将配置数据转换为JSON字符串
	configJSON, err := json.Marshal(configData)
	if err != nil {
		response.InternalServerError(c, "配置序列化失败", err)
		return
	}

	// 查找现有配置
	var config models.CSConfig
	result := database.DB.Where("config_key = ?", configKey).First(&config)

	if result.Error != nil {
		// 配置不存在，创建新配置
		config = models.CSConfig{
			ConfigKey:  configKey,
			ConfigJSON: string(configJSON),
		}
		if err := database.DB.Create(&config).Error; err != nil {
			response.InternalServerError(c, "创建配置失败", err)
			return
		}
	} else {
		// 配置存在，更新配置
		config.ConfigJSON = string(configJSON)
		if err := database.DB.Save(&config).Error; err != nil {
			response.InternalServerError(c, "更新配置失败", err)
			return
		}
	}

	response.Success(c, "保存配置成功", nil)
}

// @Summary 删除配置
// @Description 删除指定的配置
// @Accept json
// @Produce json
// @Param config_key path string true "配置键"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /config/{config_key} [delete]
func (h ConfigHeadler) DeleteConfig(c *gin.Context) {
	configKey := c.Param("config_key")
	if configKey == "" {
		response.BadRequest(c, "配置键不能为空", nil)
		return
	}

	result := database.DB.Where("config_key = ?", configKey).Delete(&models.CSConfig{})
	if result.Error != nil {
		response.InternalServerError(c, "删除配置失败", result.Error)
		return
	}

	if result.RowsAffected == 0 {
		response.NotFound(c, "配置不存在")
		return
	}

	response.Success(c, "删除配置成功", nil)
}

// @Summary 获取所有配置
// @Description 获取所有配置列表
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=[]models.CSConfig}
// @Failure 500 {object} models.Response
// @Router /config [get]
func (h ConfigHeadler) GetAllConfigs(c *gin.Context) {
	var configs []models.CSConfig
	if err := database.DB.Find(&configs).Error; err != nil {
		response.InternalServerError(c, "获取配置列表失败", err)
		return
	}

	response.Success(c, "获取配置列表成功", configs)
}

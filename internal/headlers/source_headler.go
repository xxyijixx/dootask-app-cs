package headlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"chatdesk/internal/models"
	"chatdesk/internal/pkg/database"
	"chatdesk/internal/pkg/logger"
	"chatdesk/internal/pkg/response"
	"chatdesk/internal/utils/common"
)

type SourceHeadler struct{}

var Source = SourceHeadler{}

// @Summary 创建客服来源
// @Description 创建新的客服来源
// @Accept json
// @Produce json
// @Param request body models.CreateSourceRequest true "创建来源请求"
// @Success 200 {object} models.Response{data=models.CreateSourceResponse}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /sources [post]
func (h SourceHeadler) CreateSource(c *gin.Context) {
	var req models.CreateSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误", err)
		return
	}

	// 生成唯一的来源标识
	sourceKey := generateSourceKey(req.Name)

	// 检查来源标识是否已存在
	var existingSource models.CustomerServiceSource
	if err := database.DB.Where("source_key = ?", sourceKey).First(&existingSource).Error; err == nil {
		response.BadRequest(c, "来源标识已存在，请使用不同的名称", nil)
		return
	}

	// 序列化配置
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		response.InternalServerError(c, "配置序列化失败", err)
		return
	}

	// 创建来源记录
	source := models.CustomerServiceSource{
		Name:      req.Name,
		SourceKey: sourceKey,
		TaskID:    req.TaskID,
		DialogID:  req.DialogID,
		ProjectID: req.ProjectID,
		ColumnID:  req.ColumnID,
		Config:    string(configJSON),
		Status:    1, // 默认启用
	}

	if err := database.DB.Create(&source).Error; err != nil {
		response.InternalServerError(c, "创建来源失败", err)
		return
	}

	// 返回创建结果
	resp := models.CreateSourceResponse{
		ID:        source.ID,
		Name:      source.Name,
		SourceKey: source.SourceKey,
		TaskID:    source.TaskID,
		DialogID:  source.DialogID,
		ProjectID: source.ProjectID,
		ColumnID:  source.ColumnID,
	}

	response.Success(c, "创建来源成功", resp)
}

// @Summary 获取所有客服来源
// @Description 获取所有客服来源列表
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=[]models.CustomerServiceSource}
// @Failure 500 {object} models.Response
// @Router /sources [get]
func (h SourceHeadler) GetSourceList(c *gin.Context) {
	var sources []models.CustomerServiceSource
	if err := database.DB.Where("status = ?", 1).Find(&sources).Error; err != nil {
		response.InternalServerError(c, "获取来源列表失败", err)
		return
	}

	response.Success(c, "获取来源列表成功", sources)
}

// @Summary 根据ID获取客服来源
// @Description 根据ID获取客服来源详情
// @Accept json
// @Produce json
// @Param id path int true "来源ID"
// @Success 200 {object} models.Response{data=models.CustomerServiceSource}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /sources/{id} [get]
func (h SourceHeadler) GetSourceById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.BadRequest(c, "无效的来源ID", err)
		return
	}

	var source models.CustomerServiceSource
	if err := database.DB.Where("id = ? AND status = ?", id, 1).First(&source).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "来源不存在")
		} else {
			response.InternalServerError(c, "获取来源失败", err)
		}
		return
	}

	response.Success(c, "获取来源成功", source)
}

// @Summary 更新客服来源
// @Description 更新客服来源配置
// @Accept json
// @Produce json
// @Param id path int true "来源ID"
// @Param request body models.CustomerServiceSource true "更新数据"
// @Success 200 {object} models.Response{data=models.CustomerServiceSource}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /sources/{id} [put]
func (h SourceHeadler) UpdateSource(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.BadRequest(c, "无效的来源ID", err)
		return
	}

	// 获取现有来源
	var source models.CustomerServiceSource
	if err := database.DB.Where("id = ? AND status = ?", id, 1).First(&source).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "来源不存在")
		} else {
			response.InternalServerError(c, "获取来源失败", err)
		}
		return
	}

	// 解析更新数据
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		response.BadRequest(c, "参数错误", err)
		return
	}

	// 更新允许的字段
	allowedFields := map[string]bool{
		"name":     true,
		"config":   true,
		"taskId":   true,
		"dialogId": true,
		"status":   true,
	}

	updateMap := make(map[string]interface{})
	for key, value := range updateData {
		if allowedFields[key] {
			updateMap[key] = value
		}
	}

	if len(updateMap) == 0 {
		response.BadRequest(c, "没有有效的更新字段", nil)
		return
	}

	// 更新时间
	updateMap["updated_at"] = time.Now()

	// 执行更新
	if err := database.DB.Model(&source).Updates(updateMap).Error; err != nil {
		response.InternalServerError(c, "更新来源失败", err)
		return
	}

	// 重新获取更新后的数据
	if err := database.DB.Where("id = ?", id).First(&source).Error; err != nil {
		response.InternalServerError(c, "获取更新后的来源失败", err)
		return
	}

	response.Success(c, "更新来源成功", source)
}

// @Summary 删除客服来源
// @Description 软删除客服来源
// @Accept json
// @Produce json
// @Param id path int true "来源ID"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /sources/{id} [delete]
func (h SourceHeadler) DeleteSource(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.BadRequest(c, "无效的来源ID", err)
		return
	}

	// 检查来源是否存在
	var source models.CustomerServiceSource
	if err := database.DB.Where("id = ? AND status = ?", id, 1).First(&source).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "来源不存在")
		} else {
			response.InternalServerError(c, "获取来源失败", err)
		}
		return
	}

	// 软删除（更新状态为0）
	if err := database.DB.Model(&source).Update("status", 0).Error; err != nil {
		response.InternalServerError(c, "删除来源失败", err)
		return
	}

	response.Success(c, "删除来源成功", nil)
}

// generateSourceKey 生成来源唯一标识
func generateSourceKey(name string) string {
	// 生成6位随机字符串
	randomStr := common.RandString(20)
	logger.App.Info("正在为来源生成唯一标识", zap.String("name", name), zap.String("key", string(randomStr)))
	return fmt.Sprintf("CS-%s", randomStr)
}

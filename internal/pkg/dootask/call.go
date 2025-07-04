package dootask

import (
	"chatdesk/internal/config"
	"chatdesk/internal/i18n"
	"chatdesk/internal/models/dto"
	"chatdesk/internal/pkg/logger"
	"chatdesk/internal/utils/common"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// 只需要用户的基础信息

type DootaskService struct {
	client *common.HTTPClient
}

type IDootaskService interface {
	GetUserInfo(token string) (*dto.UserInfoResp, error)
	GetVersoinInfo() (*dto.VersionInfoResp, error)
	CreateTask(token string, task *dto.CreateTaskReq) (*dto.CreateTaskResp, error)
	OpenTaskDialog(token string, taskId int) (*dto.TaskDialogResp, error)
}

func NewIDootaskService() IDootaskService {
	return &DootaskService{
		client: common.NewHTTPClient(5 * time.Second),
	}
}

// GetUserInfo 获取用户信息
func (d *DootaskService) GetUserInfo(token string) (*dto.UserInfoResp, error) {
	if token == "" {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeTokenInvalid,
			Message: "Token is required", // 这里可以是任意消息，实际显示会根据客户端语言决定
		}
	}

	url := fmt.Sprintf("%s%s?token=%s", config.Cfg.DooTask.Url, "/api/users/info", token)
	result, err := d.client.Get(url)
	if err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskRequestFailed,
			Message: err.Error(),
		}
	}

	info, err := d.UnmarshalAndCheckResponse(result)
	if err != nil {
		return nil, err
	}
	userInfo := new(dto.UserInfoResp)
	if err := common.MapToStruct(info, userInfo); err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeInternalError,
			Message: err.Error(),
		}
	}
	return userInfo, nil
}

// GetVersionInfo 获取版本信息
func (d *DootaskService) GetVersoinInfo() (*dto.VersionInfoResp, error) {
	// url := fmt.Sprintf("%s%s", constant.DooTaskUrl, "/api/system/version")
	url := fmt.Sprintf("%s%s", config.Cfg.DooTask.Url, "/api/system/version")
	result, err := d.client.Get(url)
	if err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskRequestFailed,
			Message: err.Error(),
		}
	}
	versionInfo := &dto.VersionInfoResp{}

	if err := common.StrToStruct(string(result), &versionInfo); err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeInternalError,
			Message: err.Error(),
		}
	}
	return versionInfo, nil
}

func (d *DootaskService) CreateTask(token string, task *dto.CreateTaskReq) (*dto.CreateTaskResp, error) {
	url := fmt.Sprintf("%s%s?token=%s", config.Cfg.DooTask.Url, "/api/project/task/add", token)
	result, err := d.client.Post(url, task)
	if err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskRequestFailed,
			Message: err.Error(),
		}
	}

	resp, err := d.UnmarshalAndCheckResponse(result)
	if err != nil {
		logger.App.Error("UnmarshalAndCheckResponse failed", zap.Error(err))
		return nil, err
	}
	logger.App.Info("create task resp", zap.Any("resp", resp))
	createTaskResp := new(dto.CreateTaskResp)
	if err := common.MapToStruct(resp, createTaskResp); err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeInternalError,
			Message: err.Error(),
		}
	}
	return createTaskResp, nil
}

func (d *DootaskService) OpenTaskDialog(token string, taskId int) (*dto.TaskDialogResp, error) {
	// /api/project/task/dialog
	url := fmt.Sprintf("%s%s?task_id=%d&token=%s", config.Cfg.DooTask.Url, "/api/project/task/dialog", taskId, token)
	result, err := d.client.Get(url)
	if err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskRequestFailed,
			Message: err.Error(),
		}
	}
	resp, err := d.UnmarshalAndCheckResponse(result)
	if err != nil {
		return nil, err
	}
	taskDialogResp := new(dto.TaskDialogResp)
	if err := common.MapToStruct(resp, taskDialogResp); err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeInternalError,
			Message: err.Error(),
		}
	}
	return taskDialogResp, nil
}

// 解码并检查返回数据
func (d *DootaskService) UnmarshalAndCheckResponse(resp []byte) (map[string]interface{}, error) {
	var ret map[string]interface{}
	if err := json.Unmarshal(resp, &ret); err != nil {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskUnmarshalResponse,
			Message: err.Error(),
		}
	}

	retCode, ok := ret["ret"].(float64)
	if !ok {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskResponseFormat,
			Message: "DooTask response format error",
		}
	}

	if retCode != 1 {
		msg, ok := ret["msg"].(string)
		if !ok {
			return nil, &i18n.ErrorInfo{
				Code:    i18n.ErrCodeDooTaskRequestFailed,
				Message: "DooTask request failed",
			}
		}
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeDooTaskRequestFailedWithErr,
			Message: msg,
		}
	}

	data, ok := ret["data"].(map[string]interface{})
	if !ok {
		dataList, isList := ret["data"].([]interface{})
		if !isList {
			return nil, &i18n.ErrorInfo{
				Code:    i18n.ErrCodeDooTaskDataFormat,
				Message: "DooTask data format error",
			}
		}

		data = make(map[string]interface{})
		data["list"] = dataList
	}

	return data, nil
}

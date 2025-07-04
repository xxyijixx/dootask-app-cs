package response

import (
	"chatdesk/internal/i18n"
	"chatdesk/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

const StatusSuccess = 200
const StatusError = 0

// Success 成功响应
func Success(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, models.Response{
		Code:    StatusSuccess,
		Message: message,
		Data:    data,
	})
}

// Fail 失败响应
func Fail(c *gin.Context, statusCode int, message string, err error) {
	response := models.Response{
		Code:    statusCode,
		Message: message,
	}

	if err != nil {
		response.Error = err.Error()
	}

	c.JSON(statusCode, response)
}

func Error(c *gin.Context, message string, err error) {
	response := models.Response{
		Code:    StatusError,
		Message: message,
	}

	if err != nil {
		response.Error = err.Error()
	}

	c.JSON(http.StatusOK, response)
}

// BadRequest 400错误响应
func BadRequest(c *gin.Context, message string, err error) {
	Fail(c, http.StatusBadRequest, message, err)
}

// ServerError 500错误响应
func ServerError(c *gin.Context, message string, err error) {
	Fail(c, http.StatusInternalServerError, message, err)
}

// NotFound 404错误响应
func NotFound(c *gin.Context, message string) {
	Fail(c, http.StatusNotFound, message, nil)
}

// Unauthorized 401错误响应
func Unauthorized(c *gin.Context, message string) {
	Fail(c, http.StatusUnauthorized, message, nil)
}

// 403 Forbidden
func Forbidden(c *gin.Context, message string, err error) {
	Fail(c, http.StatusForbidden, message, err)
}

// InternalServerError
func InternalServerError(c *gin.Context, message string, err error) {
	Fail(c, http.StatusInternalServerError, message, err)
}

// SuccessWithPagination 带分页的成功响应
func SuccessWithPagination(c *gin.Context, message string, items interface{}, total int64, page, pageSize int) {
	pages := int64(0)
	if pageSize > 0 {
		pages = (total + int64(pageSize) - 1) / int64(pageSize)
	}

	pagination := models.PaginationData{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Pages:    pages,
		Items:    items,
	}

	Success(c, message, pagination)
}

// GetLanguageFromContext 从上下文获取语言
func GetLanguageFromContext(c *gin.Context) i18n.Language {
	// 优先从查询参数获取语言
	if lang := c.Query("lang"); lang != "" {
		switch lang {
		case "zh-CN", "zh":
			return i18n.LanguageZhCN
		case "en-US", "en":
			return i18n.LanguageEnUS
		case "ja-JP", "ja":
			return i18n.LanguageJaJP
		}
	}

	// 从Accept-Language头部获取
	acceptLanguage := c.GetHeader("Accept-Language")
	return i18n.GetLanguageFromHeader(acceptLanguage)
}

// ErrorWithCode 使用错误代码返回错误响应
func ErrorWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	lang := GetLanguageFromContext(c)
	errorInfo := i18n.NewError(code, lang, args...)

	response := models.Response{
		Code:    StatusError,
		Message: errorInfo.Message,
		Error:   string(errorInfo.Code),
	}

	c.JSON(http.StatusOK, response)
}

// ErrorWithCodeAndData 使用错误代码和数据返回错误响应
func ErrorWithCodeAndData(c *gin.Context, code i18n.ErrorCode, data interface{}, args ...interface{}) {
	lang := GetLanguageFromContext(c)
	errorInfo := i18n.NewErrorWithData(code, lang, data, args...)

	response := models.Response{
		Code:    StatusError,
		Message: errorInfo.Message,
		Data:    errorInfo.Data,
		Error:   string(errorInfo.Code),
	}

	c.JSON(http.StatusOK, response)
}

// ErrorWithCodeAndStatus 使用错误代码和HTTP状态码返回错误响应
func ErrorWithCodeAndStatus(c *gin.Context, httpStatus int, code i18n.ErrorCode, args ...interface{}) {
	lang := GetLanguageFromContext(c)
	errorInfo := i18n.NewError(code, lang, args...)

	response := models.Response{
		Code:    httpStatus,
		Message: errorInfo.Message,
		Error:   string(errorInfo.Code),
	}

	c.JSON(httpStatus, response)
}

// SuccessWithCode 使用成功代码返回成功响应
func SuccessWithCode(c *gin.Context, data interface{}) {
	lang := GetLanguageFromContext(c)
	message := i18n.T(lang, string(i18n.ErrCodeSuccess))

	Success(c, message, data)
}

// BadRequestWithCode 400错误响应（使用错误代码）
func BadRequestWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	ErrorWithCodeAndStatus(c, http.StatusBadRequest, code, args...)
}

// UnauthorizedWithCode 401错误响应（使用错误代码）
func UnauthorizedWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	ErrorWithCodeAndStatus(c, http.StatusUnauthorized, code, args...)
}

// ForbiddenWithCode 403错误响应（使用错误代码）
func ForbiddenWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	ErrorWithCodeAndStatus(c, http.StatusForbidden, code, args...)
}

// NotFoundWithCode 404错误响应（使用错误代码）
func NotFoundWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	ErrorWithCodeAndStatus(c, http.StatusNotFound, code, args...)
}

// InternalServerErrorWithCode 500错误响应（使用错误代码）
func InternalServerErrorWithCode(c *gin.Context, code i18n.ErrorCode, args ...interface{}) {
	ErrorWithCodeAndStatus(c, http.StatusInternalServerError, code, args...)
}

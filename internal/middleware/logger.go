package middleware

import (
	"bytes"
	"io"
	"time"

	"log"

	"github.com/gin-gonic/gin"
)

// ResponseWriter 包装以捕获响应体
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 获取请求方法、路径和查询参数
		method := c.Request.Method
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// 读取请求体
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err == nil {
				requestBody = string(bodyBytes)
				// 重新赋值 c.Request.Body，供后续处理
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		// 设置响应记录器
		writer := &responseBodyWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = writer

		// 处理请求
		c.Next()

		// 获取响应体
		responseBody := writer.body.String()

		// 日志输出
		log.Printf("[GIN] %v | %3d | %13v | %s | %s?%s\nReq: %s\nRes: %s\n",
			start.Format("2006/01/02 - 15:04:05"),
			writer.Status(),
			time.Since(start),
			method,
			path,
			query,
			requestBody,
			responseBody,
		)
	}
}

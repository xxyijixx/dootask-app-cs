package logger

import (
	"fmt"
	"os"
	"path/filepath"

	"chatdesk/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	// App 应用日志
	App *zap.Logger
	// Access 访问日志
	Access *zap.Logger
)

// InitLogger 初始化日志记录器
func InitLogger() {
	// 创建日志目录
	logDir := config.Cfg.Log.Dir
	if logDir == "" {
		logDir = "logs"
	}

	if err := os.MkdirAll(logDir, 0755); err != nil {
		fmt.Printf("创建日志目录失败: %v\n", err)
		os.Exit(1)
	}

	// 初始化应用日志
	App = initLoggerWithConfig(
		filepath.Join(logDir, "app.log"),
		zap.NewDevelopmentEncoderConfig(),
		zapcore.DebugLevel,
	)

	// 初始化访问日志
	Access = initLoggerWithConfig(
		filepath.Join(logDir, "access.log"),
		zapcore.EncoderConfig{
			TimeKey:        "time",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.SecondsDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
		zapcore.InfoLevel,
	)
}

// initLoggerWithConfig 使用指定配置初始化日志记录器
func initLoggerWithConfig(filename string, encoderConfig zapcore.EncoderConfig, level zapcore.Level) *zap.Logger {
	// 配置日志轮转
	lumberJackLogger := &lumberjack.Logger{
		Filename:   filename,
		MaxSize:    100,  // 每个日志文件最大尺寸（MB）
		MaxBackups: 30,   // 保留的旧日志文件最大数量
		MaxAge:     30,   // 保留的旧日志文件最大天数
		Compress:   true, // 是否压缩旧日志文件
	}

	// 创建核心
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.NewMultiWriteSyncer(
			zapcore.AddSync(os.Stdout),
			zapcore.AddSync(lumberJackLogger),
		),
		level,
	)

	// 创建日志记录器
	return zap.New(
		core,
		zap.AddCaller(),
		zap.AddCallerSkip(1),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)
}

// Sync 同步所有日志
func Sync() {
	if App != nil {
		_ = App.Sync()
	}
	if Access != nil {
		_ = Access.Sync()
	}
}

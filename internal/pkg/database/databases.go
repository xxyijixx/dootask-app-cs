package database

import (
	"fmt"
	"log"
	"path/filepath"
	"time"

	"chatdesk/internal/config"
	"chatdesk/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB 全局数据库连接
var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {

	dbCfg := config.Cfg.DB
	var (
		dialector gorm.Dialector
	)

	switch dbCfg.Type {
	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbCfg.User,
			dbCfg.Password,
			dbCfg.Host,
			dbCfg.Port,
			dbCfg.DBName,
		)
		dialector = mysql.Open(dsn)
	case "sqlite":
		absPath, err := filepath.Abs(dbCfg.SQLitePath)
		if err != nil {
			log.Fatalf("获取 SQLite 路径失败: %v", err)
		}
		dialector = sqlite.Open(absPath)
	default:
		log.Fatalf("不支持的数据库类型: %s", dbCfg.Type)
	}

	// 配置 GORM 日志
	newLogger := logger.New(
		log.New(log.Writer(), "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second, // 慢 SQL 阈值
			LogLevel:                  logger.Info, // 日志级别
			IgnoreRecordNotFoundError: true,        // 忽略 ErrRecordNotFound 错误
			Colorful:                  true,        // 彩色打印
		},
	)

	// 连接数据库
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	// 设置连接池
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("获取 DB 实例失败: %v", err)
	}

	if dbCfg.Type != "sqlite" {
		// 设置空闲连接池中的最大连接数
		sqlDB.SetMaxIdleConns(10)

		// 设置打开数据库连接的最大数量
		sqlDB.SetMaxOpenConns(100)

		// 设置连接可复用的最大时间
		sqlDB.SetConnMaxLifetime(time.Hour)
	}
	DB = db
	log.Println("数据库连接成功")

	db.AutoMigrate(&models.CSConfig{}, &models.Agent{}, &models.Customer{}, &models.Message{}, &models.Conversations{}, &models.CustomerServiceSource{})
}

// GetDB 获取数据库连接
func GetDB() *gorm.DB {
	return DB
}

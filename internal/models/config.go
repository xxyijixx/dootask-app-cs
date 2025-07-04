package models

import (
	"encoding/json"
	"fmt"
	"time"

	"chatdesk/internal/i18n"

	"gorm.io/gorm"
)

const (
	CSConfigKeyWelcome         = "welcome_config"
	CSConfigKeyDooTask         = "dootask_config"
	CSConfigKeyAuth            = "auth_config"
	CSConfigKeyOther           = "other_config"
	CSConfigKeyCustomerService = "customer_service_config"
	CSConfigKeySystem          = "customer_service_system_config"
	CSConfigKeyDooTaskChat     = "dootask_chat"
	// 后续扩展可统一添加
)

type CSConfig struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ConfigKey  string    `gorm:"column:config_key" json:"config_key"`
	ConfigJSON string    `gorm:"column:config_json" json:"config_json"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName 指定表名
func (m *CSConfig) TableName() string {
	return "cs_config"
}

// config_key = welcome_config
type WelcomeConfig struct {
	Enabled      bool   `json:"enabled"`
	Text         string `json:"text"`
	ShowDelaySec int    `json:"show_delay_sec"`
}

// config_key = dootask_config
type DooTaskConfig struct {
	Token   string `json:"token" default:""`
	Version string `json:"version" default:"1.0.0"`
	WebHook string `json:"webhook" default:""`
}

// config_key = auth_config
type AuthConfig struct {
	JWTSecret              string `json:"jwt_secret"`                              // JWT密钥
	TokenExpireHours       int    `json:"token_expire_hours" default:"24"`         // 令牌过期时间（小时）
	RequireAgentAuth       bool   `json:"require_agent_auth" default:"true"`       // 是否要求客服认证
	AllowCustomerAnonymous bool   `json:"allow_customer_anonymous" default:"true"` // 是否允许客户匿名访问
}

// config_key = customer_service_config
type CustomerServiceConfigData struct {
	// 基本设置
	ServiceName    string `json:"service_name"`
	WelcomeMessage string `json:"welcome_message"`
	OfflineMessage string `json:"offline_message"`

	// DooTask集成设置
	DooTaskIntegration DooTaskIntegrationData `json:"dootask_integration"`

	// 工作时间设置
	WorkingHours WorkingHoursData `json:"working_hours"`

	// 自动回复设置
	AutoReply AutoReplyData `json:"auto_reply"`

	// 客服分配设置
	AgentAssignment AgentAssignmentData `json:"agent_assignment"`

	// 界面设置
	UI UIData `json:"ui"`

	Reserved1 string `json:"reserved1"`
	Reserved2 string `json:"reserved2"`
}

// DooTask集成设置子结构
type DooTaskIntegrationData struct {
	BotId      *int   `json:"bot_id"`
	BotToken   string `json:"bot_token"`
	ProjectId  *int   `json:"project_id"`
	TaskId     *int   `json:"task_id"`
	DialogId   *int   `json:"dialog_id"`
	CreateTask bool   `json:"create_task"`
}

// 工作时间设置子结构
type WorkingHoursData struct {
	Enabled   bool   `json:"enabled"`
	StartTime string `json:"start_time"` // 格式: "HH:MM"
	EndTime   string `json:"end_time"`   // 格式: "HH:MM"
	WorkDays  []int  `json:"work_days"`  // 0-6, 0表示周日
}

// 自动回复设置子结构
type AutoReplyData struct {
	Enabled bool   `json:"enabled"`
	Delay   int    `json:"delay"` // 延迟时间（秒）
	Message string `json:"message"`
}

// 客服分配设置子结构
type AgentAssignmentData struct {
	Method          string `json:"method"`  // 'round-robin' | 'least-busy' | 'manual'
	Timeout         int    `json:"timeout"` // 超时时间（秒）
	FallbackAgentId *int   `json:"fallback_agent_id"`
}

// 界面设置子结构
type UIData struct {
	PrimaryColor       string `json:"primary_color"` // 十六进制颜色代码
	LogoUrl            string `json:"logo_url"`
	ChatBubblePosition string `json:"chat_bubble_position"` // 'left' | 'right'
}

type DooTaskChat struct {
	ChatKey string `json:"chat_key"`
}

var ConfigTypeRegistry = map[string]func() interface{}{
	CSConfigKeyWelcome:         func() interface{} { return &WelcomeConfig{} },
	CSConfigKeyDooTask:         func() interface{} { return &DooTaskConfig{} },
	CSConfigKeyAuth:            func() interface{} { return &AuthConfig{} },
	CSConfigKeyCustomerService: func() interface{} { return &CustomerServiceConfigData{} },
	CSConfigKeySystem:          func() interface{} { return &CustomerServiceConfigData{} },
	CSConfigKeyDooTaskChat:     func() interface{} { return &DooTaskChat{} },
}

func LoadConfig[T any](db *gorm.DB, key string) (*T, error) {
	var cfg CSConfig
	if err := db.First(&cfg, "config_key = ?", key).Error; err != nil {
		return nil, err
	}

	constructor, ok := ConfigTypeRegistry[key]
	if !ok {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeConfigNotFound,
			Message: fmt.Sprintf("unregistered config key: %s", key),
		}
	}

	target := constructor()
	if err := json.Unmarshal([]byte(cfg.ConfigJSON), target); err != nil {
		return nil, err
	}

	result, ok := target.(*T)
	if !ok {
		// 实际使用泛型时，这一步通常可以省略，除非你从 map 拿出来后还需转类型
		casted := any(target).(*T)
		return casted, nil
	}

	return result, nil
}

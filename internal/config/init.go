package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"reflect"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

var Cfg *Config // 全局配置变量

func Init() {
	// 加载 .env
	_ = godotenv.Load(".env")

	//  设置默认值，自动从结构体读
	SetDefaultsFromStruct(Config{}, "")

	// 设置 Viper 配置
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".") // 或者 "./config"

	// 设置环境变量前缀和自动读取环境变量
	viper.SetEnvPrefix("CHATDESK") // 环境变量前缀，如 SUPPORT_PLUGIN_APP_NAME
	viper.AutomaticEnv()                 // 自动读取环境变量
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_")) // 将配置键中的点替换为下划线

	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("读取配置失败: %v", err)
	}

	// 替换配置中的 ${ENV_VAR}
	replaceEnvVars()

	// 绑定结构体
	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		log.Fatalf("绑定配置到结构体失败: %v", err)
	}

	Cfg = &config
	fmt.Println("配置初始化成功")
}

// 遍历结构体，自动设置默认值到 viper
func SetDefaultsFromStruct(s interface{}, prefix string) {
	val := reflect.ValueOf(s)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldType := typ.Field(i)

		// 拼接key，形如 "app.name"
		mapTag := fieldType.Tag.Get("mapstructure")
		if mapTag == "" {
			mapTag = strings.ToLower(fieldType.Name)
		}
		key := mapTag
		if prefix != "" {
			key = prefix + "." + mapTag
		}

		// 递归结构体字段
		if field.Kind() == reflect.Struct {
			SetDefaultsFromStruct(field.Interface(), key)
			continue
		}

		// 获取 default tag
		defVal := fieldType.Tag.Get("default")
		if defVal == "" {
			continue
		}

		// 如果字段类型是int，要把字符串转成int
		switch field.Kind() {
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			if iv, err := strconv.Atoi(defVal); err == nil {
				viper.SetDefault(key, iv)
			}
		case reflect.String:
			viper.SetDefault(key, defVal)
		case reflect.Bool:
			if bv, err := strconv.ParseBool(defVal); err == nil {
				viper.SetDefault(key, bv)
			}
		// 其他类型你也可以根据需要扩展
		default:
			viper.SetDefault(key, defVal)
		}
	}
}

func replaceEnvVars() {
	settings := viper.AllSettings()
	flat := flatten(settings, "")
	for key, val := range flat {
		if str, ok := val.(string); ok && strings.Contains(str, "${") {
			viper.Set(key, os.ExpandEnv(str))
		}
	}
}

func flatten(input map[string]interface{}, prefix string) map[string]interface{} {
	out := make(map[string]interface{})
	for k, v := range input {
		fullKey := k
		if prefix != "" {
			fullKey = prefix + "." + k
		}

		if m, ok := v.(map[string]interface{}); ok {
			for nk, nv := range flatten(m, fullKey) {
				out[nk] = nv
			}
		} else {
			out[fullKey] = v
		}
	}
	return out
}

// Print 打印配置，用于调试
func (c *Config) Print() {
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		fmt.Println("打印配置失败:", err)
		return
	}
	fmt.Println(string(b))
}

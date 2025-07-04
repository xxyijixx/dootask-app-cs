package config

type AppConfig struct {
	Name string `mapstructure:"name" default:"DefaultAppName"`
	Port int    `mapstructure:"port" default:"8888"`
	Mode string `mapstructure:"mode" default:"dootask"` // debug or release
	Base string `mapstructure:"base" default:"/apps/chatdesk"`
}

type DBConfig struct {
	Type string `mapstructure:"type" default:"sqlite"` // mysql or sqlite

	// MySQL 配置
	Host     string `mapstructure:"host" default:"127.0.0.1"`
	Port     int    `mapstructure:"port" default:"3306"`
	User     string `mapstructure:"user" default:"root"`
	Password string `mapstructure:"password" default:""`
	DBName   string `mapstructure:"dbname" default:"app_db"`

	// SQLite 配置
	SQLitePath string `mapstructure:"sqlite_path" default:"./app.db"`
}

type RedisConfig struct {
	Host string `mapstructure:"host" default:"127.0.0.1"`
	Port int    `mapstructure:"port" default:"6379"`
}

type DooTaskConfig struct {
	Url     string `mapstructure:"url" default:"http://nginx"`
	Token   string `mapstructure:"token" default:""`
	Version string `mapstructure:"version" default:"1.0.0"`
	WebHook string `mapstructure:"webhook" default:"http://nginx/api/dialog/msg/sendtext"`
}

type LoggerConfig struct {
	Dir string `mapstructure:"dir" default:"logs"`
}

type Config struct {
	App     AppConfig     `mapstructure:"app"`
	DB      DBConfig      `mapstructure:"db"`
	Redis   RedisConfig   `mapstructure:"redis"`
	DooTask DooTaskConfig `mapstructure:"dootask"`
	Log     LoggerConfig  `mapstructure:"log"`
}

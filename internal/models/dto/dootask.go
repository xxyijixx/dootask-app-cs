package dto

import (
	"fmt"
	"strconv"
	"strings"

	"chatdesk/internal/i18n"
)

// UserInfoResp 返回用户信息
type UserInfoResp struct {
	*UserBasicResp
	Token            string   `json:"token"`             // token
	Identity         []string `json:"identity"`          // 身份
	Tel              string   `json:"tel"`               // 手机号
	Changepass       int      `json:"changepass"`        // 是否需要修改密码 1-是 0-否
	CreatedIp        string   `json:"created_ip"`        // 创建ip
	EmailVerity      int      `json:"email_verity"`      // 邮箱是否验证 1-是 0-否
	LastAt           string   `json:"last_at"`           // 最后登录时间
	LastIp           string   `json:"last_ip"`           // 最后登录ip
	LineIp           string   `json:"line_ip"`           // 在线ip
	LoginNum         int      `json:"login_num"`         // 登录次数
	NicknameOriginal string   `json:"nickname_original"` // 昵称原始值
	TaskDialogId     int      `json:"task_dialog_id"`    // 任务对话框id
	CreatedAt        string   `json:"created_at"`        // 创建时间
	DepartmentOwner  bool     `json:"department_owner"`  // 是否是部门负责人 false-不是 true-是
	OkrAdminOwner    bool     `json:"okr_admin_owner"`   // okr普通人员是否拥有管理员有权限 false-不是 true-是
}

// 用户基础信息
type UserBasicResp struct {
	Az             string `json:"az"`              // 首字母
	Bot            int    `json:"bot"`             // 是否是机器人 1-是 0-否
	Department     []int  `json:"department"`      // 部门
	DepartmentName string `json:"department_name"` // 部门名称
	DisableAt      string `json:"disable_at"`      // 禁用时间
	Userid         int    `json:"userid"`          // 用户id
	Nickname       string `json:"nickname"`        // 昵称
	Userimg        string `json:"userimg"`         // 头像
	Email          string `json:"email"`           // 邮箱
	LineAt         string `json:"line_at"`         // 在线时间
	Pinyin         string `json:"pinyin"`          // 拼音
	Profession     string `json:"profession"`      // 职业
}

// 判断是否是管理员
func (u *UserInfoResp) IsAdmin() bool {
	for _, v := range u.Identity {
		if v == "admin" {
			return true
		}
	}
	return false
}

type CreateTaskResp struct {
	ID             int         `json:"id"`
	ParentID       int         `json:"parent_id"`
	ProjectID      int         `json:"project_id"`
	ColumnID       int         `json:"column_id"`
	DialogID       int         `json:"dialog_id"`
	FlowItemID     int         `json:"flow_item_id"`
	FlowItemName   string      `json:"flow_item_name"`
	Name           string      `json:"name"`
	Color          string      `json:"color"`
	Desc           string      `json:"desc"`
	StartAt        string      `json:"start_at"`
	EndAt          string      `json:"end_at"`
	ArchivedAt     interface{} `json:"archived_at"`
	ArchivedUserid int         `json:"archived_userid"`
	ArchivedFollow int         `json:"archived_follow"`
	CompleteAt     interface{} `json:"complete_at"`
	Userid         int         `json:"userid"`
	Visibility     int         `json:"visibility"`
	PLevel         int         `json:"p_level"`
	PName          string      `json:"p_name"`
	PColor         string      `json:"p_color"`
	Sort           int         `json:"sort"`
	Loop           string      `json:"loop"`
	LoopAt         interface{} `json:"loop_at"`
	CreatedAt      string      `json:"created_at"`
	UpdatedAt      string      `json:"updated_at"`
	DeletedAt      interface{} `json:"deleted_at"`
	DeletedUserid  int         `json:"deleted_userid"`
	Owner          int         `json:"owner"`
	Assist         int         `json:"assist"`
	IsVisible      int         `json:"is_visible"`
	FileNum        int         `json:"file_num"`
	MsgNum         int         `json:"msg_num"`
	SubNum         int         `json:"sub_num"`
	SubComplete    int         `json:"sub_complete"`
	Percent        int         `json:"percent"`
	Today          bool        `json:"today"`
	Overdue        bool        `json:"overdue"`
	TaskUser       []struct {
		ID        int    `json:"id"`
		ProjectID int    `json:"project_id"`
		TaskID    int    `json:"task_id"`
		TaskPid   int    `json:"task_pid"`
		Userid    int    `json:"userid"`
		Owner     int    `json:"owner"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"task_user"`
	TaskTag []interface{} `json:"task_tag"`
}

type CreateTaskReq struct {
	Name      string `json:"name"`
	Content   string `json:"content"`
	Owner     []int  `json:"owner"`
	Assist    []int  `json:"assist"`
	ProjectID int    `json:"project_id"`
	ColumnID  int    `json:"column_id"`
}

type TaskDialogResp struct {
	ID         int `json:"id"`
	DialogID   int `json:"dialog_id"`
	DialogData struct {
		ID         int           `json:"id"`
		Type       string        `json:"type"`
		GroupType  string        `json:"group_type"`
		SessionID  int           `json:"session_id"`
		Name       string        `json:"name"`
		Avatar     string        `json:"avatar"`
		OwnerID    int           `json:"owner_id"`
		LinkID     int           `json:"link_id"`
		TopUserid  int           `json:"top_userid"`
		TopMsgID   int           `json:"top_msg_id"`
		CreatedAt  string        `json:"created_at"`
		UpdatedAt  string        `json:"updated_at"`
		DeletedAt  interface{}   `json:"deleted_at"`
		TopAt      interface{}   `json:"top_at"`
		LastAt     interface{}   `json:"last_at"`
		MarkUnread int           `json:"mark_unread"`
		Silence    int           `json:"silence"`
		Hide       int           `json:"hide"`
		Color      string        `json:"color"`
		UserAt     string        `json:"user_at"`
		UserMs     int64         `json:"user_ms"`
		Unread     int           `json:"unread"`
		UnreadOne  int           `json:"unread_one"`
		Mention    int           `json:"mention"`
		MentionIds []interface{} `json:"mention_ids"`
		People     int           `json:"people"`
		PeopleUser int           `json:"people_user"`
		PeopleBot  int           `json:"people_bot"`
		TodoNum    int           `json:"todo_num"`
		LastMsg    interface{}   `json:"last_msg"`
		Pinyin     string        `json:"pinyin"`
		QuickMsgs  []interface{} `json:"quick_msgs"`
		DialogUser interface{}   `json:"dialog_user"`
		GroupInfo  struct {
			ID         int         `json:"id"`
			Name       string      `json:"name"`
			CompleteAt interface{} `json:"complete_at"`
			ArchivedAt interface{} `json:"archived_at"`
			DeletedAt  interface{} `json:"deleted_at"`
		} `json:"group_info"`
		Bot int `json:"bot"`
	} `json:"dialog_data"`
}

type VersionInfoResp struct {
	Version string `json:"version"`
	Publish struct {
		Provider string `json:"provider"`
		URL      string `json:"url"`
	} `json:"publish"`
}

type UserBotInfo struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Avatar     string `json:"avatar"`
	ClearDay   int    `json:"clear_day"`
	WebhookURL string `json:"webhook_url"`
	SystemName string `json:"system_name"`
}

func (v *VersionInfoResp) CheckVersion(requiredVersion string) (bool, error) {
	current, err := v.parseVersion(v.Version)
	if err != nil {
		return false, err
	}

	required, err := v.parseVersion(requiredVersion)
	if err != nil {
		return false, err
	}

	// 比较每一个版本位
	for i := 0; i < 3; i++ {
		if current[i] > required[i] {
			return true, nil
		} else if current[i] < required[i] {
			return false, nil
		}
	}

	return true, nil
}

// parseVersion 解析版本字符串，返回主版本号、次版本号、补丁版本号
func (v *VersionInfoResp) parseVersion(version string) ([]int, error) {
	parts := strings.Split(version, ".")
	if len(parts) != 3 {
		return nil, &i18n.ErrorInfo{
			Code:    i18n.ErrCodeVersionFormatError,
			Message: fmt.Sprintf("版本号格式不正确: %s", version),
		}
	}

	var numbers []int
	for _, part := range parts {
		num, err := strconv.Atoi(part)
		if err != nil {
			return nil, &i18n.ErrorInfo{
				Code:    i18n.ErrCodeVersionParseError,
				Message: fmt.Sprintf("解析版本号失败: %s", version),
			}
		}
		numbers = append(numbers, num)
	}

	return numbers, nil
}

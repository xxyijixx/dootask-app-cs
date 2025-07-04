package eventbus

import (
	"chatdesk/internal/i18n"
	"context"
	"fmt"
	"time"
)

// 这个文件展示了如何使用事件总线系统

// ExampleUsage 展示事件总线的基本用法
func ExampleUsage() {
	// 1. 创建事件总线
	eventBus := NewEventBus(2, 100)
	eventBus.Start()
	defer eventBus.Stop()

	// 2. 注册事件处理器
	eventBus.Subscribe("test.event", func(ctx context.Context, event Event) error {
		fmt.Printf("处理事件: %s, 数据: %v\n", event.GetType(), event.GetData())
		return nil
	})

	// 3. 发布事件
	testEvent := &BaseEvent{
		Type:      "test.event",
		Data:      map[string]interface{}{"message": "Hello, EventBus!"},
		Timestamp: time.Now(),
	}

	eventBus.Publish(testEvent)

	// 等待事件处理完成
	time.Sleep(time.Second)
}

// ExampleDooTaskIntegration 展示DooTask集成的用法
func ExampleDooTaskIntegration() {
	// 模拟对话ID
	conversationID := uint(123)

	// 1. 发布对话创建事件
	conversationEvent := NewConversationCreatedEvent(conversationID)
	if err := GlobalEventBus.Publish(conversationEvent); err != nil {
		fmt.Printf("发布对话创建事件失败: %v\n", err)
		return
	}

	fmt.Println("对话创建事件已发布到事件总线")
}

// ExampleCustomEventHandler 展示如何创建自定义事件处理器
func ExampleCustomEventHandler() {
	// 自定义事件类型
	const CustomEventType = "custom.business.event"

	// 自定义事件结构
	type CustomEvent struct {
		*BaseEvent
		BusinessData string `json:"business_data"`
	}

	// 创建自定义事件处理器
	customHandler := func(ctx context.Context, event Event) error {
		customEvent, ok := event.(*CustomEvent)
		if !ok {
			return &i18n.ErrorInfo{
				Code:    i18n.ErrCodeEventTypeError,
				Message: "Event type error",
			}
		}

		fmt.Printf("处理自定义业务事件: %s\n", customEvent.BusinessData)
		// 在这里添加具体的业务逻辑
		return nil
	}

	// 注册处理器
	GlobalEventBus.Subscribe(CustomEventType, customHandler)

	// 创建并发布自定义事件
	customEvent := &CustomEvent{
		BaseEvent: &BaseEvent{
			Type:      CustomEventType,
			Data:      map[string]interface{}{"business_data": "重要业务数据"},
			Timestamp: time.Now(),
		},
		BusinessData: "重要业务数据",
	}

	if err := GlobalEventBus.Publish(customEvent); err != nil {
		fmt.Printf("发布自定义事件失败: %v\n", err)
	}
}

// ExampleErrorHandling 展示错误处理
func ExampleErrorHandling() {
	// 注册一个会失败的处理器
	GlobalEventBus.Subscribe("error.test", func(ctx context.Context, event Event) error {
		return &i18n.ErrorInfo{
			Code:    i18n.ErrCodeInternalError,
			Message: "Simulated processing failure",
		}
	})

	// 注册一个正常的处理器
	GlobalEventBus.Subscribe("error.test", func(ctx context.Context, event Event) error {
		fmt.Println("这个处理器正常执行")
		return nil
	})

	// 发布事件
	errorEvent := &BaseEvent{
		Type:      "error.test",
		Data:      map[string]interface{}{"test": "error handling"},
		Timestamp: time.Now(),
	}

	if err := GlobalEventBus.Publish(errorEvent); err != nil {
		fmt.Printf("发布事件失败: %v\n", err)
	}

	// 即使一个处理器失败，其他处理器仍会继续执行
}

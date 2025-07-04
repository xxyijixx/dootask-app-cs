package eventbus

import (
	"context"
	"sync"
	"time"

	"chatdesk/internal/i18n"
	"chatdesk/internal/pkg/logger"

	"go.uber.org/zap"
)

// Event 定义事件接口
type Event interface {
	GetType() string
	GetData() interface{}
	GetTimestamp() time.Time
}

// BaseEvent 基础事件结构
type BaseEvent struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

func (e *BaseEvent) GetType() string {
	return e.Type
}

func (e *BaseEvent) GetData() interface{} {
	return e.Data
}

func (e *BaseEvent) GetTimestamp() time.Time {
	return e.Timestamp
}

// EventHandler 事件处理器函数类型
type EventHandler func(ctx context.Context, event Event) error

// EventBus 事件总线结构
type EventBus struct {
	handlers map[string][]EventHandler
	mutex    sync.RWMutex
	queue    chan Event
	workers  int
	ctx      context.Context
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

// NewEventBus 创建新的事件总线
func NewEventBus(workers int, queueSize int) *EventBus {
	ctx, cancel := context.WithCancel(context.Background())
	return &EventBus{
		handlers: make(map[string][]EventHandler),
		queue:    make(chan Event, queueSize),
		workers:  workers,
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Subscribe 订阅事件
func (eb *EventBus) Subscribe(eventType string, handler EventHandler) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()

	eb.handlers[eventType] = append(eb.handlers[eventType], handler)
	logger.App.Info("事件处理器已注册", zap.String("eventType", eventType))
}

// Publish 发布事件（异步）
func (eb *EventBus) Publish(event Event) error {
	select {
	case eb.queue <- event:
		logger.App.Debug("事件已发布到队列", zap.String("eventType", event.GetType()))
		return nil
	case <-eb.ctx.Done():
		return &i18n.ErrorInfo{
			Code:    i18n.ErrCodeEventBusClosed,
			Message: "事件总线已关闭",
		}
	default:
		return &i18n.ErrorInfo{
			Code:    i18n.ErrCodeEventQueueFull,
			Message: "事件队列已满",
		}
	}
}

// PublishSync 发布事件（同步）
func (eb *EventBus) PublishSync(event Event) error {
	eb.mutex.RLock()
	handlers, exists := eb.handlers[event.GetType()]
	eb.mutex.RUnlock()

	if !exists {
		logger.App.Warn("没有找到事件处理器", zap.String("eventType", event.GetType()))
		return nil
	}

	for _, handler := range handlers {
		if err := handler(eb.ctx, event); err != nil {
			logger.App.Error("事件处理失败",
				zap.String("eventType", event.GetType()),
				zap.Error(err))
			return err
		}
	}

	return nil
}

// Start 启动事件总线
func (eb *EventBus) Start() {
	logger.App.Info("启动事件总线", zap.Int("workers", eb.workers))

	for i := 0; i < eb.workers; i++ {
		eb.wg.Add(1)
		go eb.worker(i)
	}
}

// Stop 停止事件总线
func (eb *EventBus) Stop() {
	logger.App.Info("停止事件总线")
	eb.cancel()
	close(eb.queue)
	eb.wg.Wait()
}

// worker 工作协程
func (eb *EventBus) worker(id int) {
	defer eb.wg.Done()
	logger.App.Info("事件总线工作协程启动", zap.Int("workerID", id))

	for {
		select {
		case event, ok := <-eb.queue:
			if !ok {
				logger.App.Info("事件总线工作协程退出", zap.Int("workerID", id))
				return
			}
			eb.processEvent(event, id)
		case <-eb.ctx.Done():
			logger.App.Info("事件总线工作协程被取消", zap.Int("workerID", id))
			return
		}
	}
}

// processEvent 处理事件
func (eb *EventBus) processEvent(event Event, workerID int) {
	start := time.Now()
	defer func() {
		if r := recover(); r != nil {
			logger.App.Error("事件处理发生panic",
				zap.String("eventType", event.GetType()),
				zap.Int("workerID", workerID),
				zap.Any("panic", r))
		}
	}()

	eb.mutex.RLock()
	handlers, exists := eb.handlers[event.GetType()]
	eb.mutex.RUnlock()

	if !exists {
		logger.App.Warn("没有找到事件处理器",
			zap.String("eventType", event.GetType()),
			zap.Int("workerID", workerID))
		return
	}

	logger.App.Debug("开始处理事件",
		zap.String("eventType", event.GetType()),
		zap.Int("workerID", workerID),
		zap.Int("handlersCount", len(handlers)))

	for _, handler := range handlers {
		if err := handler(eb.ctx, event); err != nil {
			logger.App.Error("事件处理失败",
				zap.String("eventType", event.GetType()),
				zap.Int("workerID", workerID),
				zap.Error(err))
			// 继续处理其他处理器，不因为一个失败而停止
		}
	}

	logger.App.Debug("事件处理完成",
		zap.String("eventType", event.GetType()),
		zap.Int("workerID", workerID),
		zap.Duration("duration", time.Since(start)))
}

// 全局事件总线实例
var GlobalEventBus *EventBus

// InitGlobalEventBus 初始化全局事件总线
func InitGlobalEventBus(workers, queueSize int) {
	GlobalEventBus = NewEventBus(workers, queueSize)
	GlobalEventBus.Start()
}

// StopGlobalEventBus 停止全局事件总线
func StopGlobalEventBus() {
	if GlobalEventBus != nil {
		GlobalEventBus.Stop()
	}
}

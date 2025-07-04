# Go 应用程序名称
APP_NAME := chatdesk

# Go 源文件目录
SRC_DIR := .

# 构建输出目录
BUILD_DIR := ./bin

# Swagger 文档目录
SWAG_DIR := ./docs

.PHONY: all build run clean swag frontend-build-widget frontend-build-admin

build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(SRC_DIR)/main.go
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

run:
	@echo "Running $(APP_NAME) directly with go run..."
	@go run $(SRC_DIR)/main.go

clean:
	@echo "Cleaning up..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(SWAG_DIR)/*.go $(SWAG_DIR)/*.json $(SWAG_DIR)/*.yaml
	@echo "Clean complete."

swag:
	@echo "Generating Swagger documentation..."
	@swag init
	@echo "Swagger documentation generated."

frontend-build-widget:
	@echo "Building widget frontend..."
	@cd web/widget && npm install && npm run build

frontend-copy-widget:
	@echo "Copying widget frontend assets..."
	@rm -rf internal/web/widget/dist/*
	@cp -r web/widget/dist/* internal/web/widget/dist/

frontend-build-admin:
	@echo "Building admin frontend..."
	@cd web/admin && npm install && npm run build

frontend-copy-admin:
	@echo "Copying admin frontend assets..."
	@rm -rf internal/web/admin/dist/*
	@cp -r web/admin/dist/* internal/web/admin/dist/

# 将前端构建添加到 all 目标，或者单独执行
all: frontend-build-widget frontend-build-admin frontend-copy-admin build
build-admin: frontend-build-admin frontend-copy-admin
build-widget: frontend-build-widget frontend-copy-widget
build-web: frontend-build-widget frontend-copy-widget frontend-build-admin frontend-copy-admin
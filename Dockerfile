# 多阶段构建 Dockerfile
# 第一阶段：构建 Widget 前端
FROM node:20-alpine AS widget-builder

WORKDIR /app/web/widget

# 复制 widget package.json 和相关文件
COPY web/widget/package*.json ./
RUN npm install

# 复制 widget 源代码并构建
COPY web/widget/ ./
RUN npm run build

# 第二阶段：构建 Admin 前端
FROM node:20-alpine AS admin-builder

WORKDIR /app/web/admin

# 设置构建时环境变量
ENV VITE_BASE_PATH=/apps/chatdesk

# 复制 admin package.json 和相关文件
COPY web/admin/package*.json ./
RUN npm install

# 复制 admin 源代码并构建
COPY web/admin/ ./
RUN npm run build

# 第三阶段：构建 Go 应用
FROM golang:1.24-alpine AS go-builder

# 安装必要的工具
RUN apk add --no-cache gcc musl-dev sqlite-dev git make

# 启用 CGO
ENV CGO_ENABLED=1

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 创建目录
RUN mkdir -p internal/web/admin/dist internal/web/widget/dist
# 复制 admin 构建产物
COPY --from=admin-builder /app/web/admin/dist/ internal/web/admin/dist/
# 复制 widget 构建产物
COPY --from=widget-builder /app/web/widget/dist/ internal/web/widget/dist/

# 构建 Go 应用
RUN make build

# 第四阶段：运行时镜像
FROM alpine:latest

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata

# 设置时区
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo 'Asia/Shanghai' > /etc/timezone

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=go-builder /app/bin/chatdesk .

# 复制配置文件
COPY --from=go-builder /app/config.yaml .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口（根据你的应用配置调整）
EXPOSE 8888

# 运行应用
CMD ["./chatdesk"]
#!/bin/bash

# 构建和运行 Support Plugin Docker 镜像的脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目名称
PROJECT_NAME="chatdesk"
IMAGE_NAME="chatdesk:latest"

echo -e "${GREEN}开始构建 Support Plugin Docker 镜像...${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装或未在 PATH 中找到${NC}"
    exit 1
fi

# 构建 Docker 镜像
echo -e "${YELLOW}正在构建 Docker 镜像...${NC}"
docker build -t $IMAGE_NAME .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker 镜像构建成功!${NC}"
else
    echo -e "${RED}Docker 镜像构建失败!${NC}"
    exit 1
fi

# 询问是否运行容器
read -p "是否要运行容器? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}正在启动容器...${NC}"
    
    # 停止并删除已存在的容器
    docker stop $PROJECT_NAME 2>/dev/null || true
    docker rm $PROJECT_NAME 2>/dev/null || true
    
    # 运行新容器
    docker run -d \
        --name $PROJECT_NAME \
        -p 8888:8888 \
        -v $(pwd)/docker/logs:/root/logs \
        -v $(pwd)/docker/config.yaml:/root/config.yaml \
        $IMAGE_NAME
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}容器启动成功!${NC}"
        echo -e "${GREEN}应用访问地址: http://localhost:8888${NC}"
        echo -e "${GREEN}管理界面访问地址: http://localhost:8888/apps/cs/${NC}"
        echo -e "${YELLOW}查看日志: docker logs -f $PROJECT_NAME${NC}"
        echo -e "${YELLOW}停止容器: docker stop $PROJECT_NAME${NC}"
    else
        echo -e "${RED}容器启动失败!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}完成!${NC}"
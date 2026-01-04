#!/bin/bash

echo "🚀 Starting Desktop Sharing System..."
echo ""

# 检查是否在项目根目录
if [ ! -d "server" ] || [ ! -d "web-client" ] || [ ! -d "desktop-client" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# 启动后端服务
echo "📡 Starting Go backend server..."
cd server
go run cmd/server/main.go &
SERVER_PID=$!
cd ..

# 等待服务器启动
sleep 2

# 启动 Web 客户端
echo "🌐 Starting Web client..."
cd web-client
npm run dev &
WEB_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Endpoints:"
echo "   - Backend API: http://localhost:8080"
echo "   - Web Client: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# 捕获退出信号，清理进程
trap "echo ''; echo '🛑 Stopping services...'; kill $SERVER_PID $WEB_PID 2>/dev/null; exit" INT TERM

# 等待
wait

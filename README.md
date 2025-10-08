# AI Page Generate App

基于AI的前端页面生成应用，通过自然语言描述快速生成H5移动端、管理后台和PC端网页。

## 🌟 功能特性

- 🤖 **AI智能生成**: 基于Kimi K2大模型，根据自然语言描述生成前端页面
- 📱 **多类型支持**: 支持H5移动端、管理后台、PC端三种页面类型
- 🔧 **实时预览**: 左侧预览区实时显示生成的页面，移动端带有手机外框
- 💬 **对话式交互**: 右侧AI对话区，通过对话方式迭代优化页面
- ⚡ **热更新**: 支持开发环境热重载，实时预览修改效果
- 🔄 **WebSocket通信**: 实时推送页面更新，支持多人协作

## 🏗️ 项目架构

```
ai-page-generate-app/
├── frontend/          # 前端项目 (React + Vite + TypeScript)
├── backend/           # 后端服务 (Node.js + Express + WebSocket)
├── templates/         # 页面模板
├── generated-pages/   # 生成的页面文件
└── pnpm-workspace.yaml # pnpm工作区配置
```

## 🚀 技术栈

### 前端 (Frontend)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router
- **UI组件库**: Ant Design
- **样式**: Tailwind CSS + Less Modules
- **状态管理**: React Hooks
- **通信**: WebSocket (Socket.IO Client)

### 后端 (Backend)
- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **AI集成**: OpenAI SDK (Kimi K2模型)
- **实时通信**: Socket.IO
- **文件处理**: fs-extra
- **环境配置**: dotenv

## 📦 安装与运行

### 前置要求
- Node.js ≥ 16.0.0
- pnpm ≥ 8.0.0

### 一键安装
```bash
# 安装所有依赖
pnpm run init
```

### 开发模式
```bash
# 同时启动前后端开发服务器
pnpm run dev
```

### 单独启动
```bash
# 仅启动前端
pnpm run dev:frontend

# 仅启动后端
pnpm run dev:backend
```

### 构建生产版本
```bash
# 构建前后端
pnpm run build

# 单独构建前端
pnpm run build:frontend

# 单独构建后端
pnpm run build:backend
```

## ⚙️ 环境配置

### 后端环境变量
复制 `.env.example` 为 `.env` 并配置：

```env
# 服务端口
PORT=3001

# AI模型配置
ANTHROPIC_AUTH_TOKEN=your_kimi_api_key_here
BASE_URL=https://api.moonshot.cn/anthropic
MODEL_NAME=kimi-k2

# 文件存储
TEMPLATES_DIR=./templates
GENERATED_PAGES_DIR=./generated-pages
```

## 🎯 使用说明

1. **启动应用**: 运行 `pnpm run dev` 启动前后端服务
2. **选择页面类型**: 在页面顶部选择 H5移动端、管理后台或PC端
3. **输入需求**: 在右侧AI对话区输入页面需求描述
4. **生成页面**: 点击发送按钮，AI将生成对应页面
5. **预览效果**: 左侧预览区实时显示生成的页面
6. **迭代优化**: 继续对话修改页面内容和样式

## 📁 项目结构

### 前端目录
```
frontend/
├── src/
│   ├── components/     # 通用组件
│   │   ├── Layout.tsx       # 页面布局
│   │   ├── PreviewArea.tsx  # 预览区域
│   │   └── ChatArea.tsx     # 对话区域
│   ├── pages/         # 页面组件
│   │   └── HomePage.tsx     # 主页面
│   ├── hooks/         # 自定义Hooks
│   ├── utils/         # 工具函数
│   ├── App.tsx        # 根组件
│   └── main.tsx       # 应用入口
├── public/            # 静态资源
└── package.json       # 前端依赖配置
```

### 后端目录
```
backend/
├── src/
│   ├── routes/        # API路由
│   │   └── pageRoutes.ts    # 页面相关接口
│   ├── services/      # 业务逻辑
│   │   ├── aiService.ts      # AI生成功能
│   │   ├── fileService.ts    # 文件操作
│   │   └── websocketService.ts # WebSocket通信
│   └── index.ts       # 服务入口
├── templates/         # 页面模板
├── generated-pages/   # 生成的页面
└── package.json       # 后端依赖配置
```

## 🔌 API 接口

### 页面初始化
- **POST** `/api/pages/initialize`
- 初始化新的页面项目

### 页面生成
- **POST** `/api/pages/generate`
- 根据需求生成页面内容

### 获取页面内容
- **GET** `/api/pages/:pageId/content`
- 获取指定页面的HTML内容

### 更新页面内容
- **PUT** `/api/pages/:pageId/content`
- 手动更新页面内容

## 🔄 WebSocket 事件

### 客户端 → 服务器
- `join_page`: 加入页面房间
- `leave_page`: 离开页面房间

### 服务器 → 客户端
- `page_message`: 页面相关消息
  - `page_update`: 页面内容更新
  - `generation_start`: 开始生成
  - `generation_complete`: 生成完成
  - `error`: 错误信息

## 🛠️ 开发指南

### 添加新页面类型
1. 在 `frontend/src/pages/HomePage.tsx` 中添加新的页面类型选项
2. 在 `backend/src/services/fileService.ts` 中添加对应的模板逻辑
3. 更新AI系统提示以适配新的页面类型

### 自定义模板
在 `backend/templates/` 目录下添加对应类型的HTML模板文件：
- `h5.html`: 移动端模板
- `admin.html`: 管理后台模板
- `pc.html`: PC端模板

### 集成其他AI模型
修改 `backend/src/services/aiService.ts` 中的 `generatePage` 方法，适配其他AI服务提供商。

## 🧪 测试

```bash
# 运行前端测试
pnpm run test:frontend

# 运行后端测试
pnpm run test:backend
```

## 📋 代码规范

```bash
# 运行代码检查
pnpm run lint

# 自动修复代码格式
pnpm run lint:fix
```

## 🚧 常见问题

### 1. WebSocket连接失败
- 检查前后端端口配置是否正确
- 确保防火墙没有阻止WebSocket连接

### 2. AI生成失败
- 检查 `ANTHROPIC_AUTH_TOKEN` 是否配置正确
- 确认API配额是否充足

### 3. 页面预览不更新
- 检查浏览器控制台是否有错误信息
- 确认WebSocket连接是否正常

### 4. 组件构建失败
- 系统会自动解析和报告构建错误
- 查看前端控制台或页面提示获取详细错误信息
- 根据错误类型检查代码语法、依赖或配置问题

## 🛠️ 错误处理

本项目包含完整的组件打包错误处理机制：

- **语法错误检测**: 自动识别和报告代码语法问题
- **依赖错误处理**: 检测缺失的模块和库
- **配置错误提示**: 提供配置相关的错误信息
- **用户友好提示**: 将技术性错误信息转换为易于理解的提示
- **实时错误推送**: 通过WebSocket将错误信息实时推送到前端
- **详细日志记录**: 所有错误都会被记录到日志文件中便于调试
- **自动代码修复**: 当组件构建失败时，系统会自动将错误信息和代码发送给AI模型进行修复，然后重新尝试构建

了解更多关于错误处理的信息，请查看 [组件错误处理文档](./backend/docs/component-error-handling.md)。

## 📄 许可证

MIT License

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**Made with ❤️ by AI Page Generate Team**
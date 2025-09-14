# Ai Page Generate App

## 功能说明
这是一个基于Ai的前端页面生成应用。包含前端（frontend）和后台服务(backend)两个项目。

## 前端项目
### 功能说明
前端页面包含页面生成, 生成类型可选 H5移动端、管理端、和PC端网页。页面布局为：左边有预览区，和右边AI对话区。移动端的预览区 要有手机预览的外框
### 技术栈
- React
- React-Router
- antd
- tailwind css
- vite
- less module
- websocket (实时预览刷新通信)
- pnpm 包管理

## 后台项目

### 功能说明
nodejs的后台服务，提供Ai生成页面的服务、websocket通信；Ai 生成页面时，以pageId作为前端页面文件夹，使用模版文件初始化到文件中， 并将用户需求和当前页面的文件内容发送给LLM大模型，将LLM大模型对文件的修改更新到文件的文件，并发送给前端，然后前端更新页面预览.LLM大模型使用 Kimi K2模型，authKey通过环节变量 ANTHROPIC_AUTH_TOKEN 获取， 大模型BASE_URL="https://api.moonshot.cn/anthropic"

### 技术栈

- NodeJs
- openAI js sdk
- websocket
- pnpm 包管理

## 项目开发

- 根目录提供一键依赖安装（pnpm run init)
- 一键启动前后端项目进行 开发联调(pnpm run dev)
- 前后端项目均支持开发的热更新能力
export class FallbackAIService {
  async generatePage(request: { 
    pageId?: string, 
    pageType: 'h5' | 'admin' | 'pc', 
    userPrompt: string, 
    currentCode?: string,
    useLocalModel?: boolean 
  }): Promise<string> {
    const { pageId, pageType, userPrompt, currentCode, useLocalModel } = request
    
    console.log('Using fallback AI service for:', { 
      pageId, 
      pageType, 
      useLocalModel: useLocalModel || false,
      userPrompt: userPrompt.substring(0, 50) + '...' 
    })
    
    // 如果存在当前代码，尝试进行简单修改
    if (currentCode) {
      const modifiedCode = this.modifyExistingCode(currentCode, userPrompt)
      // 包装成markdown格式以保持一致性
      return this.wrapInMarkdown(modifiedCode)
    }
    
    // 根据页面类型和需求生成简单的HTML模板
    const templates = {
      h5: this.generateH5Template(userPrompt),
      admin: this.generateAdminTemplate(userPrompt),
      pc: this.generatePCTemplate(userPrompt)
    }
    
    const template = templates[pageType as keyof typeof templates] || templates.h5
    
    // 包装成markdown格式以保持一致性
    return this.wrapInMarkdown(template)
  }
  
  private generateH5Template(userPrompt: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.extractTitle(userPrompt)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div class="bg-blue-500 text-white p-4 text-center">
            <h1 class="text-xl font-bold">${this.extractTitle(userPrompt)}</h1>
        </div>
        <div class="p-4">
            <div class="bg-white rounded-lg p-4 mb-4 shadow-sm border">
                <h2 class="text-lg font-semibold text-gray-800 mb-2">${userPrompt}</h2>
                <p class="text-gray-600 mb-4">这是一个使用Tailwind CSS构建的移动端页面。当前使用的是离线模板模式。</p>
                <button class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                    点击按钮
                </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-500">100+</div>
                    <div class="text-sm text-gray-600">用户</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-500">50+</div>
                    <div class="text-sm text-gray-600">产品</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
  }
  
  private generateAdminTemplate(userPrompt: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - ${this.extractTitle(userPrompt)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="flex h-screen">
        <!-- 侧边栏 -->
        <div class="w-64 bg-gray-800 text-white shadow-lg">
            <div class="p-6 bg-gray-900 border-b border-gray-700">
                <h2 class="text-xl font-bold">管理后台</h2>
            </div>
            <nav class="p-4">
                <ul class="space-y-2">
                    <li><a href="#" class="block px-4 py-2 rounded-lg bg-blue-600 text-white font-medium">📊 仪表板</a></li>
                    <li><a href="#" class="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">👥 用户管理</a></li>
                    <li><a href="#" class="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">📝 内容管理</a></li>
                    <li><a href="#" class="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">⚙️ 系统设置</a></li>
                </ul>
            </nav>
        </div>
        
        <!-- 主内容区 -->
        <div class="flex-1 flex flex-col">
            <!-- 顶部导航 -->
            <header class="bg-white shadow-sm border-b border-gray-200 p-6">
                <h1 class="text-2xl font-bold text-gray-800">${this.extractTitle(userPrompt)}</h1>
                <p class="text-gray-600 mt-1">${userPrompt}</p>
            </header>
            
            <!-- 主要内容 -->
            <main class="flex-1 p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">总用户数</p>
                                <p class="text-2xl font-bold text-gray-900">1,234</p>
                            </div>
                            <div class="p-3 bg-blue-100 rounded-full">
                                <div class="w-6 h-6 bg-blue-500 rounded-full"></div>
                            </div>
                        </div>
                        <p class="text-xs text-green-600 mt-2">↗ +12% 较上月</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">今日访问</p>
                                <p class="text-2xl font-bold text-gray-900">567</p>
                            </div>
                            <div class="p-3 bg-green-100 rounded-full">
                                <div class="w-6 h-6 bg-green-500 rounded-full"></div>
                            </div>
                        </div>
                        <p class="text-xs text-green-600 mt-2">↗ +8% 较昨日</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-sm border">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800">最近活动</h3>
                    </div>
                    <div class="p-6">
                        <p class="text-gray-600">这里是管理后台的内容区域，可以显示各种数据和图表。</p>
                    </div>
                </div>
            </main>
        </div>
    </div>
</body>
</html>`
  }
  
  private generatePCTemplate(userPrompt: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.extractTitle(userPrompt)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
    <!-- 英雄区域 -->
    <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div class="container mx-auto px-6 text-center">
            <h1 class="text-5xl font-bold mb-4">${this.extractTitle(userPrompt)}</h1>
            <p class="text-xl opacity-90 max-w-2xl mx-auto">${userPrompt}</p>
            <button class="mt-8 bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg">
                了解更多
            </button>
        </div>
    </header>
    
    <!-- 导航栏 -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-6">
            <div class="flex items-center justify-between py-4">
                <div class="text-2xl font-bold text-gray-800">品牌Logo</div>
                <ul class="hidden md:flex space-x-8">
                    <li><a href="#" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">首页</a></li>
                    <li><a href="#" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">产品</a></li>
                    <li><a href="#" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">服务</a></li>
                    <li><a href="#" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">关于</a></li>
                    <li><a href="#" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">联系</a></li>
                </ul>
                <button class="md:hidden text-gray-700 hover:text-blue-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    </nav>
    
    <!-- 主要内容 -->
    <main class="py-20">
        <div class="container mx-auto px-6">
            <h2 class="text-4xl font-bold text-center text-gray-800 mb-12">我们的优势</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-center text-gray-800 mb-3">专业设计</h3>
                    <p class="text-gray-600 text-center">基于您的需求生成的专业页面设计，使用现代化的Tailwind CSS样式。</p>
                </div>
                
                <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-6 3 3-6 3-3z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-center text-gray-800 mb-3">响应式布局</h3>
                    <p class="text-gray-600 text-center">适配各种设备屏幕尺寸，确保在不同设备上都有良好的显示效果。</p>
                </div>
                
                <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-center text-gray-800 mb-3">现代风格</h3>
                    <p class="text-gray-600 text-center">采用现代化设计理念和视觉效果，使用Tailwind CSS实现精美的界面。</p>
                </div>
            </div>
        </div>
    </main>
    
    <!-- CTA区域 -->
    <section class="bg-gray-50 py-16">
        <div class="container mx-auto px-6 text-center">
            <h2 class="text-3xl font-bold text-gray-800 mb-4">准备好开始了吗？</h2>
            <p class="text-xl text-gray-600 mb-8">体验AI驱动的页面生成技术</p>
            <button class="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-lg">
                立即体验
            </button>
        </div>
    </section>
    
    <!-- 页脚 -->
    <footer class="bg-gray-800 text-white py-12">
        <div class="container mx-auto px-6 text-center">
            <p>&copy; 2025 AI页面生成器. 保留所有权利.</p>
        </div>
    </footer>
</body>
</html>`
  }
  
  private extractTitle(userPrompt: string): string {
    // 从用户提示中提取标题或关键词
    if (userPrompt.length < 20) {
      return userPrompt
    }
    return userPrompt.substring(0, 20) + '...'
  }
  
  private modifyExistingCode(currentCode: string, userPrompt: string): string {
    // 简单的文本替换逻辑，根据关键词修改现有代码
    let modifiedCode = currentCode
    
    // 根据提示中的关键词进行简单修改
    if (userPrompt.includes('颜色') || userPrompt.includes('color')) {
      modifiedCode = modifiedCode.replace(/#1890ff/g, '#ff4d4f')
      modifiedCode = modifiedCode.replace(/background: \#667eea/g, 'background: #ff4d4f')
    }
    
    if (userPrompt.includes('标题') || userPrompt.includes('title')) {
      const newTitle = this.extractTitle(userPrompt)
      modifiedCode = modifiedCode.replace(/<title>.*?<\/title>/g, `<title>${newTitle}</title>`)
      modifiedCode = modifiedCode.replace(/<h1>.*?<\/h1>/g, `<h1>${newTitle}</h1>`)
    }
    
    return modifiedCode
  }

  private wrapInMarkdown(htmlContent: string): string {
    return '```html\n' + htmlContent.trim() + '\n```'
  }
}

export default new FallbackAIService()
import fs from 'fs-extra'
import path from 'path'
import { loggers } from '../utils/logger'
import { BusinessModule } from '../utils/logger'

export interface PageMetadata {
  id: string
  title: string
  pageType: 'h5' | 'admin' | 'pc'
  createdAt: Date
  updatedAt: Date
  description?: string
  tags?: string[]
}

export class FileService {
  private templatesDir: string
  private generatedPagesDir: string

  constructor() {
    this.templatesDir = process.env.TEMPLATES_DIR || './templates'
    this.generatedPagesDir = process.env.GENERATED_PAGES_DIR || './generated-pages'
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.templatesDir)
    await fs.ensureDir(this.generatedPagesDir)
  }

  async initializePage(pageId: string, pageType: 'h5' | 'admin' | 'pc', customTitle?: string): Promise<string> {

    const startTime = Date.now()
    loggers.file.start('initialize_page', {
      pageId,
      pageType,
      customTitle: customTitle || 'default'
    })

    try {
      const pageDir = path.join(this.generatedPagesDir, pageId)
      await fs.ensureDir(pageDir)
      loggers.file.progress('created_directory', `Created page directory: ${pageDir}`, {
        pageId,
        pageType
      })

      const templatePath = path.join(this.templatesDir, `${pageType}.tsx`)
      const indexPath = path.join(pageDir, 'index.html')
      const componentPath = path.join(pageDir, 'app.tsx')
      const metadataPath = path.join(pageDir, 'page.json')

      let templateContent: string
      
      try {
        templateContent = await fs.readFile(templatePath, 'utf-8')
        loggers.file.progress('loaded_template', `Loaded template for ${pageType}`, {
          pageId,
          pageType,
          templatePath
        })
      } catch (error) {
        // Create default template if not exists
        loggers.file.progress('creating_default_template', `Creating default template for ${pageType}`, {
          pageId,
          pageType
        })
        templateContent = this.getDefaultReactTemplate(pageType)
        await fs.writeFile(templatePath, templateContent)
        loggers.file.success('created_default_template', {
          pageId,
          pageType,
          templatePath
        })
      }

      // Create page metadata
      const now = new Date()
      const metadata: PageMetadata = {
        id: pageId,
        title: customTitle || this.getDefaultTitle(pageType),
        pageType,
        createdAt: now,
        updatedAt: now,
        description: `这是一个${this.getPageTypeLabel(pageType)}页面`
      }

      // Save the React component
      await fs.writeFile(componentPath, templateContent)
      loggers.file.progress('wrote_component_file', 'Wrote app.tsx file', {
        pageId,
        pageType,
        filePath: componentPath,
        contentLength: templateContent.length
      })

      // Create HTML wrapper
      const htmlContent = this.generateHTMLWrapper(pageId);
      await fs.writeFile(indexPath, htmlContent)
      loggers.file.progress('wrote_index_file', 'Wrote index.html file', {
        pageId,
        pageType,
        filePath: indexPath,
        contentLength: htmlContent.length
      })

      await fs.writeJson(metadataPath, metadata, { spaces: 2 })
      loggers.file.progress('wrote_metadata', 'Wrote page metadata', {
        pageId,
        pageType,
        filePath: metadataPath,
        metadata
      })

      const duration = Date.now() - startTime
      loggers.file.end('initialize_page', duration, {
        pageId,
        pageType,
        title: metadata.title,
        contentLength: templateContent.length
      })
      
      return templateContent
    } catch (error) {
      loggers.file.error('initialize_page_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageId,
        pageType,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      throw error
    }
  }

  async updatePageComponent(pageId: string, componentCode: string): Promise<void> {
    const startTime = Date.now()
    loggers.file.start('update_page_component', {
      pageId,
      contentLength: componentCode.length
    })

    try {
      const pageDir = path.join(this.generatedPagesDir, pageId)
      const componentPath = path.join(pageDir, 'app.tsx')
      const metadataPath = path.join(pageDir, 'page.json')
      
      await fs.ensureDir(pageDir)
      await fs.writeFile(componentPath, componentCode)
      loggers.file.progress('updated_component', 'Updated page component', {
        pageId,
        filePath: componentPath,
        contentLength: componentCode.length
      })
      
      // Update metadata updatedAt timestamp if metadata exists
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJson(metadataPath) as PageMetadata
          metadata.updatedAt = new Date()
          await fs.writeJson(metadataPath, metadata, { spaces: 2 })
          loggers.file.progress('updated_metadata', 'Updated page metadata timestamp', {
            pageId,
            filePath: metadataPath,
            updatedAt: metadata.updatedAt
          })
        } catch (error) {
          loggers.file.error('update_metadata_error', error instanceof Error ? error : new Error('Unknown error'), {
            pageId,
            errorType: error?.constructor?.name || 'UnknownError'
          })
        }
      }

      const duration = Date.now() - startTime
      loggers.file.end('update_page_component', duration, {
        pageId,
        contentLength: componentCode.length
      })
    } catch (error) {
      loggers.file.error('update_page_component_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageId,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      throw error
    }
  }

  async updatePageContent(pageId: string, content: string): Promise<void> {
    const startTime = Date.now()
    loggers.file.start('update_page_content', {
      pageId,
      contentLength: content.length
    })

    try {
      const pageDir = path.join(this.generatedPagesDir, pageId)
      const indexPath = path.join(pageDir, 'index.html')
      const metadataPath = path.join(pageDir, 'page.json')
      
      await fs.ensureDir(pageDir)
      await fs.writeFile(indexPath, content)
      loggers.file.progress('updated_content', 'Updated page content', {
        pageId,
        filePath: indexPath,
        contentLength: content.length
      })
      
      // Update metadata updatedAt timestamp if metadata exists
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJson(metadataPath) as PageMetadata
          metadata.updatedAt = new Date()
          await fs.writeJson(metadataPath, metadata, { spaces: 2 })
          loggers.file.progress('updated_metadata', 'Updated page metadata timestamp', {
            pageId,
            filePath: metadataPath,
            updatedAt: metadata.updatedAt
          })
        } catch (error) {
          loggers.file.error('update_metadata_error', error instanceof Error ? error : new Error('Unknown error'), {
            pageId,
            errorType: error?.constructor?.name || 'UnknownError'
          })
        }
      }

      const duration = Date.now() - startTime
      loggers.file.end('update_page_content', duration, {
        pageId,
        contentLength: content.length
      })
    } catch (error) {
      loggers.file.error('update_page_content_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageId,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      throw error
    }
  }

  async getPageContent(pageId: string): Promise<string> {
    const startTime = Date.now()
    const indexPath = path.join(this.generatedPagesDir, pageId, 'index.html')
    
    loggers.file.start('get_page_content', {
      pageId,
      filePath: indexPath
    })
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8')
      const duration = Date.now() - startTime
      loggers.file.end('get_page_content', duration, {
        pageId,
        contentLength: content.length,
        filePath: indexPath
      })
      return content
    } catch (error) {
      loggers.file.error('get_page_content_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageId,
        filePath: indexPath,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      throw new Error(`Page ${pageId} not found: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getGeneratedPagesList(pageType?: 'h5' | 'admin' | 'pc' | 'all'): Promise<Array<PageMetadata>> {
    const startTime = Date.now()
    loggers.file.start('get_generated_pages_list', {
      pageType: pageType || 'all'
    })

    try {
      const pageDirs = await fs.readdir(this.generatedPagesDir)
      const pages = []
      
      loggers.file.progress('scanning_directories', `Scanning ${pageDirs.length} directories`, {
        totalDirectories: pageDirs.length
      })
      
      for (const dir of pageDirs) {
        const pagePath = path.join(this.generatedPagesDir, dir)
        const stat = await fs.stat(pagePath)
        
        if (stat.isDirectory()) {
          const metadataPath = path.join(pagePath, 'page.json')
          const metadataExists = await fs.pathExists(metadataPath)
          
          if (metadataExists) {
            try {
              const metadata = await fs.readJson(metadataPath) as PageMetadata
              
              // Filter by page type if specified
              if (pageType === 'all' || !pageType || metadata.pageType === pageType) {
                pages.push(metadata)
              }
            } catch (error) {
              loggers.file.error('read_metadata_error', error instanceof Error ? error : new Error('Unknown error'), {
                pageId: dir,
                metadataPath,
                errorType: error?.constructor?.name || 'UnknownError'
              })
              continue
            }
          } else {
            // Fallback: if no metadata exists, try to detect from content
            loggers.file.progress('detecting_type', `No metadata found, detecting type for ${dir}`, {
              pageId: dir
            })
            
            try {
              const indexPath = path.join(pagePath, 'index.html')
              const content = await fs.readFile(indexPath, 'utf-8')
              const detectedType = this.detectPageType(content)
              
              if (pageType === 'all' || !pageType || detectedType === pageType) {
                pages.push({
                  id: dir,
                  title: dir,
                  pageType: detectedType,
                  createdAt: stat.birthtime,
                  updatedAt: stat.mtime
                })
              }
            } catch (error) {
              loggers.file.error('detect_type_error', error instanceof Error ? error : new Error('Unknown error'), {
                pageId: dir,
                errorType: error?.constructor?.name || 'UnknownError'
              })
              continue
            }
          }
        }
      }
      
      // Sort by creation date (newest first)
      pages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      const duration = Date.now() - startTime
      loggers.file.end('get_generated_pages_list', duration, {
        pageType: pageType || 'all',
        foundPages: pages.length
      })
      
      return pages
    } catch (error) {
      loggers.file.error('get_generated_pages_list_error', error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }

  getDefaultTitle(pageType: string): string {
    switch (pageType) {
      case 'h5': return '移动端页面'
      case 'admin': return '管理后台'
      case 'pc': return 'PC端网页'
      default: return '默认页面'
    }
  }

  private getPageTypeLabel(pageType: string): string {
    switch (pageType) {
      case 'h5': return 'H5移动端'
      case 'admin': return '管理端'
      case 'pc': return 'PC端'
      default: return '未知类型'
    }
  }

  private generateHTMLWrapper(pageId: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Component Page</title>
    
    <!-- React and ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Ant Design -->
    <link rel="stylesheet" href="https://unpkg.com/antd@5/dist/reset.css" />
    <script src="https://unpkg.com/antd@5/dist/antd.min.js"></script>
    
    <!-- Ant Design Icons -->
    <script src="https://unpkg.com/@ant-design/icons@5/dist/index.umd.min.js"></script>
    
    <!-- Lodash -->
    <script src="https://unpkg.com/lodash@4/lodash.min.js"></script>
    
    <!-- React Router (if needed) -->
    <script src="https://unpkg.com/react-router@6/umd/react-router.production.min.js"></script>
    <script src="https://unpkg.com/react-router-dom@6/umd/react-router-dom.production.min.js"></script>
    
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
        // Wait for all dependencies to load
        window.addEventListener('DOMContentLoaded', function() {
            // Load the React component
            const script = document.createElement('script');
            script.src = '/api/pages/${pageId}/component';
            script.onload = function() {
                // Render the component once the script loads
                if (window.renderReactComponent) {
                    window.renderReactComponent('root');
                }
            };
            document.body.appendChild(script);
        });
    </script>
</body>
</html>`;
  }

  private getDefaultReactTemplate(pageType: any): string {
    const templatePath = path.join(this.templatesDir, `${pageType}.tsx`);
    
    try {
      // Try to read the specific template for the page type
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      loggers.file.progress('loaded_specific_template', `Loaded specific template for ${pageType}`, {
        pageType,
        templatePath
      });
      return templateContent;
    } catch (error) {
      loggers.file.warn('template_not_found', `Template for ${pageType} not found, using default`, {
        pageType,
        templatePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to default templates if specific template not found
      switch (pageType) {
        case 'h5':
          return `import React, { useState } from 'react';

const H5App: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-500 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">移动端页面</h1>
          <button 
            className="bg-white text-blue-500 rounded-full w-8 h-8 flex items-center justify-center font-bold"
            onClick={() => setCount(count + 1)}
          >
            {count}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">欢迎使用移动端页面模板</h2>
          <p className="text-gray-600 mb-4">
            这是一个基于React和TailwindCSS构建的移动端页面模板。
          </p>
          <div className="flex space-x-2">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              onClick={() => setCount(count + 1)}
            >
              点击计数
            </button>
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              onClick={() => setCount(0)}
            >
              重置
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-md font-semibold mb-3">功能特点</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
              <span className="text-gray-700">响应式设计，适配各种移动设备</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
              <span className="text-gray-700">使用TailwindCSS进行样式设计</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
              <span className="text-gray-700">轻量级React组件实现</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-4 text-center text-gray-500 text-sm">
        <p>© 2025 移动端页面模板</p>
      </footer>
    </div>
  );
};

export default H5App;`
        
        case 'admin':
          return `import React, { useState } from 'react';

const AdminApp: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('1');

  const menuItems = [
    { key: '1', label: '仪表盘' },
    { key: '2', label: '用户管理' },
    { key: '3', label: '设置' }
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">管理后台</h1>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            {menuItems.map(item => (
              <li key={item.key}>
                <button
                  className={\`w-full text-left px-4 py-3 rounded-lg transition-colors \${
                    activeMenu === item.key 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }\`}
                  onClick={() => setActiveMenu(item.key)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4">
          <h2 className="text-xl font-semibold text-gray-800">欢迎使用管理后台</h2>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {menuItems.find(item => item.key === activeMenu)?.label}
            </h3>
            <p className="text-gray-600">
              这是管理后台的内容区域。当前选中：{menuItems.find(item => item.key === activeMenu)?.label}
            </p>
            
            {/* Dashboard Content */}
            {activeMenu === '1' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800">用户总数</h4>
                  <p className="text-2xl font-bold text-blue-600">1,234</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800">订单数量</h4>
                  <p className="text-2xl font-bold text-green-600">567</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800">收入统计</h4>
                  <p className="text-2xl font-bold text-purple-600">¥89,000</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminApp;`
        
        case 'pc':
          return `import React, { useState } from 'react';

const PCApp: React.FC = () => {
  const [counter, setCounter] = useState(0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">PC端网页</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">欢迎使用PC端网页模板</h2>
          
          <p className="text-gray-600 mb-8">
            这是一个基于React和TailwindCSS构建的PC端网页模板，具有响应式设计和现代化的UI组件。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">功能特性</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>响应式布局设计</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>现代化UI组件</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>高性能React实现</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">交互演示</h3>
              <div className="flex items-center space-x-4">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  onClick={() => setCounter(counter + 1)}
                >
                  点击计数
                </button>
                <span className="text-lg font-medium text-gray-700">计数器: {counter}</span>
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                  onClick={() => setCounter(0)}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">页面信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">页面类型</p>
                <p className="font-medium">PC端网页</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">技术栈</p>
                <p className="font-medium">React + TailwindCSS</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">计数器值</p>
                <p className="font-medium">{counter}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <p>© 2025 PC端网页模板 - 基于React和TailwindCSS构建</p>
        </div>
      </footer>
    </div>
  );
};

export default PCApp;`
        
        default:
          return `import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">默认页面</h1>
        <p className="text-gray-600 mt-2">这是一个默认的React页面模板</p>
      </div>
    </div>
  );
};

export default App;`
      }
    }
  }

  private detectPageType(content: string): 'h5' | 'admin' | 'pc' {
    // Detect page type based on content patterns
    if (content.includes('移动端页面') || content.includes('antd-mobile') || content.includes('viewport') && content.includes('width=device-width')) {
      return 'h5'
    } else if (content.includes('管理后台') || content.includes('Sider') || content.includes('Menu') && content.includes('admin')) {
      return 'admin'
    } else if (content.includes('PC端网页') || content.includes('Layout') && content.includes('Header')) {
      return 'pc'
    }
    
    // Default to h5 if can't determine
    return 'h5'
  }

  private getDefaultTemplate(pageType: string): string {
    switch (pageType) {
      case 'h5':
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>移动端页面</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { padding: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>移动端页面</h1>
        <p>这是一个移动端页面模板</p>
    </div>
</body>
</html>`
      
      case 'admin':
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .admin-container { display: flex; height: 100vh; }
        .sidebar { width: 200px; background: #001529; color: white; padding: 20px; }
        .main-content { flex: 1; padding: 20px; background: #f0f2f5; }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="sidebar">
            <h2>管理后台</h2>
        </div>
        <div class="main-content">
            <h1>欢迎使用管理后台</h1>
        </div>
    </div>
</body>
</html>`
      
      case 'pc':
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PC端网页</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background: #1890ff; color: white; padding: 16px 0; text-align: center; }
        .content { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PC端网页</h1>
    </div>
    <div class="content">
        <p>这是一个PC端网页模板</p>
    </div>
</body>
</html>`
      
      default:
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>默认页面</title>
</head>
<body>
    <h1>默认页面</h1>
</body>
</html>`
    }
  }
}
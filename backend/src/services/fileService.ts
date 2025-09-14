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

      const templatePath = path.join(this.templatesDir, `${pageType}.html`)
      const indexPath = path.join(pageDir, 'index.html')
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
        templateContent = this.getDefaultTemplate(pageType)
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

      await fs.writeFile(indexPath, templateContent)
      loggers.file.progress('wrote_index_file', 'Wrote index.html file', {
        pageId,
        pageType,
        filePath: indexPath,
        contentLength: templateContent.length
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

  private detectPageType(content: string): 'h5' | 'admin' | 'pc' {
    // Detect page type based on content patterns
    if (content.includes('移动端页面') || content.includes('viewport') && content.includes('width=device-width')) {
      return 'h5'
    } else if (content.includes('管理后台') || content.includes('admin-container') || content.includes('sidebar')) {
      return 'admin'
    } else if (content.includes('PC端网页') || content.includes('header') && content.includes('max-width: 1200px')) {
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
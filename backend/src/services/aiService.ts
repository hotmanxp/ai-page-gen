import OpenAI from 'openai'
import fallbackAIService from './fallbackAIService'
import { loggers } from '../utils/logger'
import { formatMsg } from './utils'
import { BusinessModule } from '../utils/logger'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || 'your-kimi-api-key-here',
  baseURL: process.env.BASE_URL || 'https://api.moonshot.cn/v1',
})

// 本地模型客户端（如果启用）
let localModelClient: OpenAI | null = null
if (process.env.LOCAL_MODEL_ENABLED === 'true' && process.env.LOCAL_MODEL_URL) {
  localModelClient = new OpenAI({
    apiKey: process.env.LOCAL_MODEL_API_KEY || 'not-needed', // LM Studio doesn't require API key
    baseURL: process.env.LOCAL_MODEL_URL,
  })
  loggers.system.progress('local_model_initialized', 'Local model client initialized', {
    url: process.env.LOCAL_MODEL_URL,
    model: process.env.LOCAL_MODEL_NAME || 'default'
  })
}


export interface GenerationRequest {
  pageId: string
  pageType: 'h5' | 'admin' | 'pc'
  userPrompt: string
  currentCode?: string
  useLocalModel?: boolean
}

export class AIService {
  async generatePage(request: GenerationRequest): Promise<string> {
    const startTime = Date.now()
    const { pageType, userPrompt, currentCode, useLocalModel } = request
    
    loggers.ai.start('generate_page', {
      pageType,
      pageId: request.pageId,
      userPrompt: userPrompt.substring(0, 200) + (userPrompt.length > 200 ? '...' : ''),
      hasCurrentCode: !!currentCode,
      currentCodeLength: currentCode?.length || 0,
      useLocalModel: useLocalModel || false
    })
    
    const systemPrompt = this.getSystemPrompt(pageType)
    const userMessage = this.buildUserMessage(userPrompt, currentCode)
    
    loggers.ai.debug('build_prompt', 'System prompt built', {
      pageType,
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length
    })
    
    try {
      // 如果用户选择使用本地模型或没有配置API密钥，则使用本地模型
      if (useLocalModel || !process.env.ANTHROPIC_AUTH_TOKEN) {
        if (useLocalModel) {
          loggers.ai.progress('local_model_selected', 'User selected local model, using LM Studio service', {
            pageType,
            pageId: request.pageId
          })
        } else {
          loggers.ai.warn('missing_api_key', 'No API key configured, using fallback service', {
            pageType,
            pageId: request.pageId
          })
        }
        
        // 如果启用了本地模型并且配置了本地模型URL，则调用本地模型
        if (localModelClient && process.env.LOCAL_MODEL_ENABLED === 'true') {
          try {
            loggers.ai.progress('calling_local_model', 'Calling local LM Studio model', {
              pageType,
              pageId: request.pageId,
              model: process.env.LOCAL_MODEL_NAME || 'default',
              promptLength: userMessage.length
            })

            const completion = await localModelClient.chat.completions.create({
              model: process.env.LOCAL_MODEL_NAME || 'qwen3-4b-mix@8bit',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
              ],
              temperature: 0.7,
              max_tokens: 8000,
            })

            const content = completion.choices[0]?.message?.content || ''
            loggers.ai.debug('local_model_response', 'Received local model response', {
              pageType,
              pageId: request.pageId,
              contentLength: content.length,
              rawContentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
            })
            
            // 提取HTML内容，去除markdown包裹
            const extractedHtml = this.extractHtmlFromMarkdown(content)
            loggers.ai.debug('content_extracted', 'HTML content extracted', {
              pageType,
              pageId: request.pageId,
              extractedLength: extractedHtml.length
            })

            const duration = Date.now() - startTime
            loggers.ai.end('generate_page', duration, {
              pageType,
              pageId: request.pageId,
              method: 'local_model',
              contentLength: extractedHtml.length,
              model: process.env.LOCAL_MODEL_NAME || 'default'
            })

            return extractedHtml
          } catch (localModelError) {
            loggers.ai.error('local_model_error', localModelError instanceof Error ? localModelError : new Error('Unknown error'), {
              pageType,
              pageId: request.pageId,
              errorType: localModelError?.constructor?.name || 'UnknownError'
            })
            // 如果本地模型调用失败，回退到备用服务
          }
        }
        
        // 如果没有启用本地模型或本地模型调用失败，使用备用服务
        const fallbackResult = await fallbackAIService.generatePage(request)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_page', duration, {
          pageType,
          pageId: request.pageId,
          method: 'local_template',
          contentLength: fallbackResult.length
        })
        return fallbackResult
      }

      loggers.ai.progress('calling_api', 'Calling OpenAI API', {
        pageType,
        pageId: request.pageId,
        promptLength: userMessage.length
      })

      const completion = await openai.chat.completions.create({
        model: process.env.MODEL_NAME || "kimi-k2-0905-preview",     
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 8000,  // Reduced token limit to avoid API issues
      })

      const content = completion.choices[0]?.message?.content || ''
      loggers.ai.debug('api_response', 'Received API response', {
        pageType,
        pageId: request.pageId,
        contentLength: content.length,
        rawContentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      })
      
      // 提取HTML内容，去除markdown包裹
      const extractedHtml = this.extractHtmlFromMarkdown(content)
      loggers.ai.debug('content_extracted', 'HTML content extracted', {
        pageType,
        pageId: request.pageId,
        extractedLength: extractedHtml.length
      })

      const duration = Date.now() - startTime
      loggers.ai.end('generate_page', duration, {
        pageType,
        pageId: request.pageId,
        method: 'ai_api',
        contentLength: extractedHtml.length,
        apiResponseLength: content.length
      })

      return extractedHtml
    } catch (error) {
      loggers.ai.error('api_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageType,
        pageId: request.pageId,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      
      if (error instanceof Error) {
        console.error('Error details:', error.message)
        if ('response' in error) {
          console.error('API Response error:', (error as any).response?.data)
        }
      }
      
      // 如果AI API调用失败，使用备用服务
      loggers.ai.progress('fallback', 'Falling back to local template service', {
        pageType,
        pageId: request.pageId
      })
      
      const fallbackResult = await fallbackAIService.generatePage(request)
      const duration = Date.now() - startTime
      loggers.ai.end('generate_page', duration, {
        pageType,
        pageId: request.pageId,
        method: 'fallback',
        contentLength: fallbackResult.length
      })
      return fallbackResult
    }
  }

  private getSystemPrompt(pageType: string): string {
    const basePrompt = `You are an expert frontend developer. Generate clean, modern HTML/CSS/JavaScript code based on user requirements. Use Tailwind CSS via CDN for styling - include <script src="https://cdn.tailwindcss.com"></script> in the head section and use Tailwind classes throughout the HTML. Create beautiful, responsive designs with modern UI components.`
    
    switch (pageType) {
      case 'h5':
        return `${basePrompt} Focus on mobile-first responsive design with touch-friendly interfaces. Use appropriate Tailwind classes for mobile layouts and spacing.`
      case 'admin':
        return `${basePrompt} Create professional admin dashboard layouts with data tables, charts, and management interfaces. Use Tailwind's utility classes for professional styling and layouts.`
      case 'pc':
        return `${basePrompt} Design desktop-optimized layouts with comprehensive functionality and professional styling. Use Tailwind classes for sophisticated desktop interfaces.`
      default:
        return basePrompt
    }
  }

  private buildUserMessage(userPrompt: string, currentCode?: string): string {
    let message = `(/no_think)Generate HTML/CSS/JavaScript code for the following requirements: ${userPrompt}`
    
    if (currentCode) {
      message += `\n\nCurrent code (modify this):\n\`\`\`html\n${currentCode}\n\`\`\``
    }
    
    message += `\n\nReturn only the complete HTML code with embedded CSS and JavaScript, wrapped in markdown code blocks like \`\`\`html. No explanations needed.`
    
    return message
  }

  async generatePageTitle(userPrompt: string, pageType: 'h5' | 'admin' | 'pc', useLocalModel?: boolean): Promise<string> {
    console.log('==>Generating page title...')
    const startTime = Date.now()
    loggers.ai.start('generate_title', {
      pageType,
      userPrompt: userPrompt.substring(0, 100) + (userPrompt.length > 100 ? '...' : ''),
      useLocalModel: useLocalModel || false
    })
    
    const systemPrompt = `You are a creative title generator. Based on the user's page requirements and page type, generate a concise, descriptive Chinese title (5-15 characters) that accurately reflects the page content and purpose.`
    
    const userMessage = `(/no_think)Please generate a suitable Chinese title for this ${pageType === 'h5' ? 'mobile' : pageType === 'admin' ? 'admin dashboard' : 'desktop'} page requirement: "${userPrompt}".
    
Return only the title text, no explanations or quotes. Title should be:
- 5-15 Chinese characters
- Descriptive and accurate
- Professional and engaging
- Suitable for the page type`
    
    try {
      // 如果用户选择使用本地模型或没有配置API密钥，则使用本地模型
      if (useLocalModel || !process.env.ANTHROPIC_AUTH_TOKEN) {
        if (useLocalModel) {
          loggers.ai.progress('local_model_selected_title', 'User selected local model for title generation', {
            pageType,
            userPrompt: userPrompt.substring(0, 50) + '...'
          })
        } else {
          loggers.ai.warn('missing_api_key_title', 'No API key configured, using fallback title', {
            pageType,
            userPrompt: userPrompt.substring(0, 50) + '...'
          })
        }
        
        // 如果启用了本地模型并且配置了本地模型URL，则调用本地模型
        if (localModelClient && process.env.LOCAL_MODEL_ENABLED === 'true') {
          try {
            loggers.ai.progress('calling_local_model_title', 'Calling local LM Studio model for title generation', {
              pageType,
              model: process.env.LOCAL_MODEL_NAME || 'default',
              promptLength: userMessage.length
            })

            const completion = await localModelClient.chat.completions.create({
              model: process.env.LOCAL_MODEL_NAME || 'qwen3-4b-mix@8bit',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
              ],
              temperature: 0.3,
              max_tokens: 100,  // Sufficient for title generation
            })

            const title = formatMsg(completion.choices[0]?.message?.content?.trim() || '')
            loggers.ai.debug('local_model_title_response', 'Received local model title response', {
              pageType,
              generatedTitle: title,
              titleLength: title.length
            })
            
            // 验证标题合理性
            if (title.length >= 2 && title.length <= 20) {
              const duration = Date.now() - startTime
              loggers.ai.end('generate_title', duration, {
                pageType,
                method: 'local_model',
                generatedTitle: title,
                model: process.env.LOCAL_MODEL_NAME || 'default'
              })
              return title
            } else {
              loggers.ai.warn('unreasonable_local_title', 'Generated title seems unreasonable, using fallback', {
                pageType,
                generatedTitle: title,
                titleLength: title.length
              })
            }
          } catch (localModelError) {
            loggers.ai.error('local_model_title_error', localModelError instanceof Error ? localModelError : new Error('Unknown error'), {
              pageType,
              userPrompt: userPrompt.substring(0, 50) + '...',
              errorType: localModelError?.constructor?.name || 'UnknownError'
            })
            // 如果本地模型调用失败，回退到备用服务
          }
        }
        
        // 如果没有启用本地模型或本地模型调用失败，使用备用服务
        const fallbackTitle = this.getFallbackTitle(userPrompt, pageType)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_title', duration, {
          pageType,
          method: 'local_template',
          generatedTitle: fallbackTitle
        })
        return fallbackTitle
      }
      
      // 原来的API调用逻辑
      const completion = await openai.chat.completions.create({
        model: process.env.MODEL_NAME || "kimi-k2-0905-preview",     
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 100,  // Sufficient for title generation
      })

      const title = completion.choices[0]?.message?.content?.trim() || ''
      loggers.ai.debug('title_generated', 'Title generated successfully', {
        pageType,
        generatedTitle: title,
        titleLength: title.length
      })
      
      // 验证标题合理性
      if (title.length < 2 || title.length > 20) {
        loggers.ai.warn('unreasonable_title', 'Generated title seems unreasonable, using fallback', {
          pageType,
          generatedTitle: title,
          titleLength: title.length
        })
        const fallbackTitle = this.getFallbackTitle(userPrompt, pageType)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_title', duration, {
          pageType,
          method: 'fallback',
          generatedTitle: fallbackTitle,
          reason: 'unreasonable_title'
        })
        return fallbackTitle
      }
      
      const duration = Date.now() - startTime
      loggers.ai.end('generate_title', duration, {
        pageType,
        method: 'ai_api',
        generatedTitle: title
      })
      
      return title
    } catch (error) {
      loggers.ai.error('title_generation_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageType,
        userPrompt: userPrompt.substring(0, 50) + '...',
        errorType: error?.constructor?.name || 'UnknownError'
      })
      
      const fallbackTitle = this.getFallbackTitle(userPrompt, pageType)
      const duration = Date.now() - startTime
      loggers.ai.end('generate_title', duration, {
        pageType,
        method: 'fallback',
        generatedTitle: fallbackTitle,
        reason: 'error_fallback'
      })
      
      return fallbackTitle
    }
  }

  private getFallbackTitle(userPrompt: string, pageType: 'h5' | 'admin' | 'pc'): string {
    // Simple fallback based on keywords and page type
    const keywords = userPrompt.toLowerCase()
    
    // Common keywords mapping
    if (keywords.includes('登录') || keywords.includes('login')) {
      return pageType === 'admin' ? '管理员登录' : '用户登录'
    }
    if (keywords.includes('注册') || keywords.includes('register')) {
      return '用户注册'
    }
    if (keywords.includes('首页') || keywords.includes('home')) {
      return '首页'
    }
    if (keywords.includes('产品') || keywords.includes('商品')) {
      return '产品展示'
    }
    if (keywords.includes('新闻') || keywords.includes('资讯')) {
      return '新闻资讯'
    }
    if (keywords.includes('关于') || keywords.includes('about')) {
      return '关于我们'
    }
    if (keywords.includes('联系') || keywords.includes('contact')) {
      return '联系我们'
    }
    if (keywords.includes('仪表') || keywords.includes('dashboard')) {
      return '数据仪表板'
    }
    if (keywords.includes('用户管理') || keywords.includes('用户列表')) {
      return '用户管理'
    }
    if (keywords.includes('订单') || keywords.includes('order')) {
      return '订单管理'
    }
    
    // Default by page type
    switch (pageType) {
      case 'h5': return '移动端页面'
      case 'admin': return '管理后台'
      case 'pc': return 'PC端网页'
      default: return '新建页面'
    }
  }

  private extractHtmlFromMarkdown(content: string): string {
    if (!content) return ''
    
    // 移除markdown代码块标记
    let cleanedContent = content.trim()
    
    // 匹配 ```html 开头的代码块
    const htmlBlockPattern = /```html\s*\n([\s\S]*?)\n```$/i
    const match = cleanedContent.match(htmlBlockPattern)
    
    if (match) {
      return match[1].trim()
    }
    
    // 如果没有找到html标记，尝试通用的 ``` 代码块
    const genericBlockPattern = /^```\s*\n([\s\S]*?)\n```$/
    const genericMatch = cleanedContent.match(genericBlockPattern)
    
    if (genericMatch) {
      return genericMatch[1].trim()
    }
    
    // 如果都没有找到，返回原始内容（假设已经是HTML）
    return cleanedContent
  }
}
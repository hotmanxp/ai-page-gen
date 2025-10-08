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
            const extractedContent = this.extractHtmlFromMarkdown(content)
            
            const duration = Date.now() - startTime
            loggers.ai.end('generate_page', duration, {
              pageType,
              pageId: request.pageId,
              method: 'local',
              contentLength: extractedContent.length
            })
            
            return extractedContent
          } catch (localError) {
            loggers.ai.error('local_model_error', localError instanceof Error ? localError : new Error('Unknown local model error'), {
              pageType,
              pageId: request.pageId,
              errorType: localError?.constructor?.name || 'UnknownError'
            })
          }
        }
        
        // 如果本地模型不可用或失败，使用备用服务
        loggers.ai.progress('using_fallback_service', 'Using fallback service for page generation', {
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

      // 使用默认模型（Kimi）
      loggers.ai.progress('calling_kimi', 'Calling Kimi API', {
        pageType,
        pageId: request.pageId,
        model: process.env.MODEL_NAME || 'moonshot-v1-8k',
        promptLength: userMessage.length
      })

      const completion = await openai.chat.completions.create({
        model: process.env.MODEL_NAME || 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      })

      const content = completion.choices[0]?.message?.content || ''
      loggers.ai.debug('kimi_response', 'Received Kimi API response', {
        pageType,
        pageId: request.pageId,
        contentLength: content.length,
        rawContentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      })
      
      // 提取HTML内容，去除markdown包裹
      const extractedContent = this.extractHtmlFromMarkdown(content)
      
      const duration = Date.now() - startTime
      loggers.ai.end('generate_page', duration, {
        pageType,
        pageId: request.pageId,
        method: 'kimi',
        contentLength: extractedContent.length
      })
      
      return extractedContent
    } catch (error) {
      loggers.ai.error('generate_page_error', error instanceof Error ? error : new Error('Unknown error'), {
        pageType,
        pageId: request.pageId,
        errorType: error?.constructor?.name || 'UnknownError'
      })
      
      // 如果主服务失败，使用备用服务
      try {
        loggers.ai.progress('fallback_attempt', 'Attempting fallback service after main service failure', {
          pageType,
          pageId: request.pageId
        })
        const fallbackResult = await fallbackAIService.generatePage(request)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_page', duration, {
          pageType,
          pageId: request.pageId,
          method: 'fallback_after_error',
          contentLength: fallbackResult.length,
          reason: 'main_service_error'
        })
        return fallbackResult
      } catch (fallbackError) {
        loggers.ai.error('fallback_error', fallbackError instanceof Error ? fallbackError : new Error('Unknown fallback error'), {
          pageType,
          pageId: request.pageId,
          errorType: fallbackError?.constructor?.name || 'UnknownError'
        })
        
        const duration = Date.now() - startTime
        loggers.ai.end('generate_page', duration, {
          pageType,
          pageId: request.pageId,
          method: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        throw error
      }
    }
  }

  async generatePageTitle(userPrompt: string, pageType: 'h5' | 'admin' | 'pc', useLocalModel = false): Promise<string> {
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
              temperature: 0.7,
              max_tokens: 100,
            })

            const title = completion.choices[0]?.message?.content?.trim() || ''
            const duration = Date.now() - startTime
            
            if (title) {
              loggers.ai.end('generate_title', duration, {
                pageType,
                method: 'local',
                generatedTitle: title
              })
              return title
            }
          } catch (localError) {
            loggers.ai.error('local_model_title_error', localError instanceof Error ? localError : new Error('Unknown local model error'), {
              pageType,
              userPrompt: userPrompt.substring(0, 50) + '...',
              errorType: localError?.constructor?.name || 'UnknownError'
            })
          }
        }
        
        // 如果本地模型不可用或失败，使用备用方法
        const fallbackTitle = this.getFallbackTitle(userPrompt, pageType)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_title', duration, {
          pageType,
          method: 'fallback',
          generatedTitle: fallbackTitle,
          reason: 'local_model_unavailable'
        })
        
        return fallbackTitle
      }

      // 使用默认模型（Kimi）
      loggers.ai.progress('calling_kimi_title', 'Calling Kimi API for title generation', {
        pageType,
        model: process.env.MODEL_NAME || 'moonshot-v1-8k',
        promptLength: userMessage.length
      })

      const completion = await openai.chat.completions.create({
        model: process.env.MODEL_NAME || 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 100,
      })

      const title = completion.choices[0]?.message?.content?.trim() || ''
      const duration = Date.now() - startTime
      
      if (title) {
        loggers.ai.end('generate_title', duration, {
          pageType,
          method: 'kimi',
          generatedTitle: title
        })
        return title
      } else {
        // 如果API没有返回标题，使用备用方法
        const fallbackTitle = this.getFallbackTitle(userPrompt, pageType)
        const duration = Date.now() - startTime
        loggers.ai.end('generate_title', duration, {
          pageType,
          method: 'fallback',
          generatedTitle: fallbackTitle,
          reason: 'api_returned_empty'
        })
        
        return fallbackTitle
      }
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

  async fixComponentCode(prompt: string): Promise<string> {
    const startTime = Date.now();
    
    loggers.ai.start('fix_component_code', {
      promptLength: prompt.length
    });
    
    try {
      // 使用默认模型（Kimi）进行代码修复
      const completion = await openai.chat.completions.create({
        model: process.env.MODEL_NAME || 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的前端开发专家，擅长修复React TypeScript代码中的各种错误。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // 使用较低的温度以获得更稳定的修复结果
        max_tokens: 4000,
      });
      
      const fixedCode = completion.choices[0].message.content || '';
      const duration = Date.now() - startTime;
      
      loggers.ai.aiCall('fix_component_code', prompt, fixedCode.length, duration);
      
      // 验证返回的代码是否有效（简单检查）
      if (fixedCode.trim().length === 0) {
        throw new Error('AI返回的修复代码为空');
      }
      
      return fixedCode;
    } catch (error) {
      loggers.ai.error('fix_component_code_error', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private getSystemPrompt(pageType: string): string {
    const basePrompt = `You are an expert React developer. Generate clean, modern React TypeScript components using Ant Design components and React hooks. The component should be a default export named App. Import React and necessary Ant Design components. Create beautiful, responsive designs with modern UI components. Use either Tailwind CSS classes (preferred) or inline styles for styling. Do not use external CSS files or CSS modules.`
    
    switch (pageType) {
      case 'h5':
        return `${basePrompt} Focus on mobile-first responsive design with touch-friendly interfaces. Use Ant Design Mobile components where appropriate and ensure responsive layouts. Prioritize mobile UX patterns and touch targets.`
      case 'admin':
        return `${basePrompt} Create professional admin dashboard layouts with data tables, charts, and management interfaces. Use Ant Design's ProLayout, Table, Card, and other admin-appropriate components. Ensure proper spacing and information hierarchy for complex data.`
      case 'pc':
        return `${basePrompt} Design desktop-optimized layouts with comprehensive functionality and professional styling. Use Ant Design's Layout, Menu, and sophisticated desktop components. Leverage wider screen real estate appropriately.`
      default:
        return basePrompt
    }
  }

  private buildUserMessage(userPrompt: string, currentCode?: string): string {
    let message = `(/no_think)Generate a React TypeScript component for the following requirements: ${userPrompt}`
    
    if (currentCode) {
      message += `

Current code (modify this):
\`\`\`typescript
${currentCode}
\`\`\``
    }
    
    message += `

Requirements:
- Export as default function named App
- Use TypeScript
- Use Ant Design components (Layout, Typography, etc.)
- Import React and necessary Ant Design components
- Use either Tailwind CSS classes (preferred) or inline styles for styling
- Do not use external CSS files or CSS modules
- Return only the complete React component code, wrapped in markdown code blocks like \`\`\`typescript. No explanations needed.`
    
    return message
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
    
    // 匹配 ```typescript 或 ```tsx 开头的代码块
    const tsBlockPattern = /```(?:typescript|tsx)\s*\n([\s\S]*?)\n```$/i
    const match = cleanedContent.match(tsBlockPattern)
    
    if (match) {
      return match[1].trim()
    }
    
    // 如果没有找到typescript标记，尝试通用的 ``` 代码块
    const genericBlockPattern = /^```\s*\n([\s\S]*?)\n```$/
    const genericMatch = cleanedContent.match(genericBlockPattern)
    
    if (genericMatch) {
      return genericMatch[1].trim()
    }
    
    // 如果都没有找到，返回原始内容（假设已经是TypeScript/React代码）
    return cleanedContent
  }
}
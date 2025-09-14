import express, { Router } from 'express'
import { AIService } from '../services/aiService'
import { FileService } from '../services/fileService'
import { Server } from 'socket.io'
import { loggers } from '../utils/logger'
import { BusinessModule } from '../utils/logger'
import { 
  broadcastPageUpdate, 
  broadcastGenerationStart, 
  broadcastGenerationComplete, 
  broadcastError 
} from '../services/websocketService'

const router: Router = express.Router()
const aiService = new AIService()
const fileService = new FileService()

let io: Server | null = null

export const setSocketIO = (socketIO: Server): void => {
  io = socketIO
}

// Initialize page
router.post('/initialize', async (req, res) => {
  const startTime = Date.now()
  const { pageId, pageType, userPrompt, useLocalModel } = req.body
  
  loggers.http.httpRequest('POST', '/api/pages/initialize', 0, 0, {
    pageId,
    pageType,
    hasUserPrompt: !!userPrompt,
    useLocalModel: useLocalModel || false
  })
  
  try {
    if (!pageId || !pageType) {
      loggers.http.warn('missing_fields', 'Missing required fields in initialize request', {
        pageId,
        pageType,
        userPrompt: userPrompt || '',
        useLocalModel: useLocalModel || false
      })
      return res.status(400).json({ error: 'Missing required fields: pageId, pageType' })
    }

    let pageTitle: string
    
    // Generate AI title if user prompt is provided
    if (userPrompt) {
      try {
        loggers.pageMgmt.start('generate_ai_title', {
          pageId,
          pageType,
          userPrompt: userPrompt.substring(0, 100) + '...',
          useLocalModel: useLocalModel || false
        })
        
        pageTitle = await aiService.generatePageTitle(userPrompt, pageType, useLocalModel)
        
        loggers.pageMgmt.success('generated_ai_title', {
          pageId,
          pageType,
          generatedTitle: pageTitle,
          useLocalModel: useLocalModel || false
        })
      } catch (error) {
        loggers.pageMgmt.error('generate_title_error', error instanceof Error ? error : new Error('Unknown error'), {
          pageId,
          pageType,
          userPrompt: userPrompt || '',
          useLocalModel: useLocalModel || false
        })
        pageTitle = fileService.getDefaultTitle(pageType)
      }
    } else {
      pageTitle = fileService.getDefaultTitle(pageType)
    }

    loggers.pageMgmt.start('initialize_page', {
      pageId,
      pageType,
      title: pageTitle,
      userPrompt: userPrompt || ''
    })

    const templateContent = await fileService.initializePage(pageId, pageType, pageTitle)
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('POST', '/api/pages/initialize', 200, duration, {
      pageId,
      pageType,
      title: pageTitle,
      userPrompt: userPrompt || ''
    })
    
    res.json({ 
      success: true, 
      pageId, 
      content: templateContent,
      title: pageTitle,
      message: 'Page initialized successfully'
    })
  } catch (error) {
    loggers.pageMgmt.error('initialize_page_error', error instanceof Error ? error : new Error('Unknown error'), {
      pageId,
      pageType
    })
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('POST', '/api/pages/initialize', 500, duration, {
      pageId,
      pageType,
      userPrompt: userPrompt || '',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(500).json({ error: 'Failed to initialize page' })
  }
})

// Generate page - 异步处理
router.post('/generate', async (req, res) => {
  const startTime = Date.now()
  const { pageId, pageType, userPrompt, useLocalModel } = req.body
  
  loggers.http.httpRequest('POST', '/api/pages/generate', 0, 0, {
    pageId,
    pageType,
    userPrompt: userPrompt.substring(0, 100) + '...',
    useLocalModel: useLocalModel || false
  })
  
  try {
    loggers.pageGen.start('generate_request', {
      pageId,
      pageType,
      userPrompt: userPrompt.substring(0, 200) + '...',
      useLocalModel: useLocalModel || false
    })
    
    if (!pageId || !pageType || !userPrompt) {
      loggers.pageGen.warn('missing_fields', 'Missing required fields in generate request', {
        pageId,
        pageType,
        userPrompt: userPrompt || '',
        useLocalModel: useLocalModel || false
      })
      
      const duration = Date.now() - startTime
      loggers.http.httpRequest('POST', '/api/pages/generate', 400, duration, {
        pageId,
        pageType,
        userPrompt: userPrompt || '',
        errorMessage: 'Missing required fields',
        useLocalModel: useLocalModel || false
      })
      
      return res.status(400).json({ error: 'Missing required fields: pageId, pageType, userPrompt' })
    }

    // Validate page exists, if not initialize it
    let currentCode = ''
    try {
      loggers.pageGen.progress('checking_page_existence', 'Checking if page exists', {
        pageId
      })
      currentCode = await fileService.getPageContent(pageId)
      loggers.pageGen.progress('page_exists', 'Found existing page content', {
        pageId,
        contentLength: currentCode.length
      })
    } catch (error) {
      loggers.pageGen.progress('page_not_found', 'Page does not exist, will initialize before generation', {
        pageId
      })
    }

    // 立即返回响应，表示生成任务已接收
    const duration = Date.now() - startTime
    loggers.http.httpRequest('POST', '/api/pages/generate', 200, duration, {
      pageId,
      pageType,
      message: 'Generation started'
    })
    
    res.json({ 
      success: true, 
      pageId, 
      message: 'Page generation started',
      status: 'processing'
    })

    // 异步处理AI生成 - 使用Promise而不是setImmediate
    loggers.pageGen.start('async_generation', {
      pageId,
      pageType,
      hasCurrentCode: !!currentCode
    })
    
    // 立即启动异步处理，但不阻塞响应
    const generationPromise = (async () => {
      try {
        loggers.pageGen.progress('starting_generation', `Starting generation for page: ${pageId}`, {
          pageId,
          pageType
        })
        
        // Initialize page if it doesn't exist
        if (!currentCode) {
          loggers.pageGen.progress('initializing_page', 'Initializing new page before generation', {
            pageId,
            pageType
          })
          currentCode = await fileService.initializePage(pageId, pageType)
          loggers.pageGen.success('page_initialized', {
            pageId,
            pageType
          })
        }

        // Broadcast generation start
        if (io) {
          loggers.websocket.websocketEvent('generation_start', pageId, {
            pageType
          })
          broadcastGenerationStart(io, pageId)
        }

        // Generate new content with AI
        const generationRequest = {
          pageId,
          pageType,
          userPrompt,
          currentCode,
          useLocalModel
        }

        loggers.pageGen.progress('calling_ai', 'Calling AI service', {
          pageId,
          pageType,
          userPrompt: userPrompt.substring(0, 100) + '...',
          currentCodeLength: currentCode.length
        })
        
        const generatedContent = await aiService.generatePage(generationRequest)
        
        loggers.pageGen.progress('ai_completed', 'AI service completed', {
          pageId,
          pageType,
          contentLength: generatedContent.length
        })
        
        // Update page content
        await fileService.updatePageContent(pageId, generatedContent)
        
        loggers.pageGen.success('content_updated', {
          pageId,
          pageType
        })
        
        // Broadcast updates
        if (io) {
          loggers.websocket.websocketEvent('page_update', pageId, {
            pageType,
            contentLength: generatedContent.length
          })
          broadcastPageUpdate(io, pageId, generatedContent)
          
          loggers.websocket.websocketEvent('generation_complete', pageId, {
            pageType
          })
          broadcastGenerationComplete(io, pageId)
        }
        
        loggers.pageGen.success('generation_completed', {
          pageId,
          pageType
        })
        
      } catch (error) {
        loggers.pageGen.error('generation_error', error instanceof Error ? error : new Error('Unknown error'), {
          pageId,
          pageType
        })
        
        if (io) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate page'
          loggers.websocket.websocketEvent('generation_error', pageId, {
            pageType,
            errorMessage: errorMessage
          })
          broadcastError(io, pageId, errorMessage)
        }
      }
    })();
    
    generationPromise.catch((error: Error) => {
      loggers.system.error('uncaught_generation_error', error, {
        pageId,
        pageType
      })
    })

  } catch (error) {
    loggers.pageGen.error('request_error', error instanceof Error ? error : new Error('Unknown error'), {
      pageId,
      pageType
    })
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('POST', '/api/pages/generate', 500, duration, {
      pageId,
      pageType,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(500).json({ 
      error: 'Failed to start page generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get page content
router.get('/:pageId/content', async (req, res) => {
  const startTime = Date.now()
  const { pageId } = req.params
  
  loggers.http.httpRequest('GET', `/api/pages/${pageId}/content`, 0, 0, {
    pageId
  })
  
  try {
    loggers.pageMgmt.start('get_page_content', {
      pageId
    })
    
    const content = await fileService.getPageContent(pageId)
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('GET', `/api/pages/${pageId}/content`, 200, duration, {
      pageId,
      contentLength: content.length
    })
    
    loggers.pageMgmt.success('got_page_content', {
      pageId,
      contentLength: content.length
    })
    
    res.json({ 
      success: true, 
      pageId, 
      content 
    })
  } catch (error) {
    loggers.pageMgmt.error('get_page_content_error', error instanceof Error ? error : new Error('Unknown error'), {
      pageId
    })
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('GET', `/api/pages/${pageId}/content`, 404, duration, {
      pageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(404).json({ 
      error: 'Page not found',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Update page content
router.put('/:pageId/content', async (req, res) => {
  const startTime = Date.now()
  const { pageId } = req.params
  const { content } = req.body
  
  loggers.http.httpRequest('PUT', `/api/pages/${pageId}/content`, 0, 0, {
    pageId,
    contentLength: content?.length || 0
  })
  
  try {
    loggers.pageMgmt.start('update_page_content', {
      pageId,
      contentLength: content?.length || 0
    })
    
    if (!content) {
      loggers.pageMgmt.warn('missing_content', 'Missing content field in update request', {
        pageId,
        content: ''
      })
      
      const duration = Date.now() - startTime
      loggers.http.httpRequest('PUT', `/api/pages/${pageId}/content`, 400, duration, {
        pageId,
        contentLength: 0,
        errorMessage: 'Missing content field'
      })
      
      return res.status(400).json({ error: 'Missing content field' })
    }

    await fileService.updatePageContent(pageId, content)
    
    // Broadcast update to connected clients
    if (io) {
      loggers.websocket.websocketEvent('page_update_broadcast', pageId, {
        contentLength: content.length
      })
      broadcastPageUpdate(io, pageId, content)
    }
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('PUT', `/api/pages/${pageId}/content`, 200, duration, {
      pageId,
      contentLength: content?.length || 0
    })
    
    loggers.pageMgmt.success('page_content_updated', {
      pageId,
      contentLength: content?.length || 0
    })
    
    res.json({ 
      success: true, 
      pageId, 
      message: 'Page updated successfully'
    })
  } catch (error) {
    loggers.pageMgmt.error('update_page_content_error', error instanceof Error ? error : new Error('Unknown error'))
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('PUT', `/api/pages/${pageId}/content`, 500, duration, {
      pageId,
      contentLength: content?.length || 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(500).json({ error: 'Failed to update page' })
  }
})

// Get list of all generated pages
router.get('/list', async (req, res) => {
  const startTime = Date.now()
  const { pageType } = req.query
  const validatedPageType = typeof pageType === 'string' ? pageType as 'h5' | 'admin' | 'pc' : undefined
  const logPageType = validatedPageType || 'all'
  
  loggers.http.httpRequest('GET', '/api/pages/list', 0, 0, {
    pageType: logPageType
  })
  
  try {
    loggers.pageMgmt.start('get_pages_list', {
      pageType: logPageType
    })
    
    const pages = await fileService.getGeneratedPagesList(validatedPageType)
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('GET', '/api/pages/list', 200, duration, {
      pageType: logPageType,
      foundPages: pages.length
    })
    
    loggers.pageMgmt.success('got_pages_list', {
      pageType: logPageType,
      foundPages: pages.length
    })
    
    res.json({ 
      success: true, 
      pages 
    })
  } catch (error) {
    loggers.pageMgmt.error('get_pages_list_error', error instanceof Error ? error : new Error('Unknown error'))
    
    const duration = Date.now() - startTime
    loggers.http.httpRequest('GET', '/api/pages/list', 500, duration, {
      pageType: validatedPageType || 'all',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(500).json({ 
      error: 'Failed to get pages list',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
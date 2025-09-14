import { useState, useEffect } from 'react'
import { Row, Col, Card, Select, Button, Space, message, Spin, Switch } from 'antd'
import { MobileOutlined, DesktopOutlined, TabletOutlined, ShareAltOutlined, ApiOutlined } from '@ant-design/icons'
import PreviewArea from '../components/PreviewArea'
import ChatArea from '../components/ChatArea'
import PageSelector from '../components/PageSelector'
import socketService from '../services/socketService'
import { pageApi } from '../services/apiService'
import { useSearchParams } from 'react-router-dom'

const { Option } = Select

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

function HomePage() {
  const [searchParams] = useSearchParams()
  const [pageType, setPageType] = useState<'h5' | 'admin' | 'pc'>('h5')
  const [useLocalModel, setUseLocalModel] = useState<boolean>(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pageId, setPageId] = useState<string>('')
  const [pageContent, setPageContent] = useState<string>('')
  const [isLoadingPage, setIsLoadingPage] = useState(false)

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')
    setIsGenerating(true)

    try {
      // 确保页面已初始化
      let currentPageId = pageId
      if (!currentPageId) {
        currentPageId = `page_${Date.now()}`
        setPageId(currentPageId)
        
        // Use the current user input as prompt for title generation
        const initializationResponse = await pageApi.initializePage(currentPageId, pageType, inputMessage)
        
        // Show the generated title in chat if available
        if (initializationResponse.title) {
          const titleMessage: Message = {
            id: `title_${Date.now()}`,
            content: `📝 页面标题: ${initializationResponse.title}`,
            sender: 'ai',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, titleMessage])
        }
      }

      // 添加AI正在处理的消息
      const processingMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '正在调用AI服务生成页面，请稍候...',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, processingMessage])

      // 调用AI生成页面（异步）
      const response = await pageApi.generatePage({
        pageId: currentPageId,
        pageType,
        userPrompt: inputMessage,
        useLocalModel: useLocalModel
      })

      if (response.status === 'processing') {
        // 更新处理中消息
        const processingUpdateMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: '页面生成任务已提交，正在后台处理中...',
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev.filter(msg => msg.id !== processingMessage.id), processingUpdateMessage])
      }
      
    } catch (error) {
      console.error('提交生成任务失败:', error)
      message.error('提交生成任务失败，请重试')
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '抱歉，提交生成任务时出现错误，请重试。',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsGenerating(false)
    }
  }

  // WebSocket连接管理
  useEffect(() => {
    if (pageId) {
      socketService.connect(pageId)
      
      // 监听WebSocket消息
      const handleWebSocketMessage = (data: any) => {
        console.log('WebSocket message received:', data)
        
        switch (data.type) {
          case 'generation_start':
            setIsGenerating(true)
            const startMessage: Message = {
              id: `start_${Date.now()}`,
              content: 'AI开始生成页面...',
              sender: 'ai',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, startMessage])
            break
          case 'generation_complete':
            setIsGenerating(false)
            message.success('页面生成完成！')
            const completeMessage: Message = {
              id: `complete_${Date.now()}`,
              content: '✅ 页面生成完成！',
              sender: 'ai',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, completeMessage])
            break
          case 'page_update':
            if (data.data?.content) {
              setPageContent(data.data.content)
              const updateMessage: Message = {
                id: `update_${Date.now()}`,
                content: '🔄 页面内容已更新',
                sender: 'ai',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, updateMessage])
            }
            break
          case 'error':
            setIsGenerating(false)
            message.error(data.message || '生成页面时出错')
            const errorMessage: Message = {
              id: `error_${Date.now()}`,
              content: `❌ ${data.message || '抱歉，生成页面时出现错误。'}`,
              sender: 'ai',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            break
        }
      }
      
      socketService.onPageMessage(handleWebSocketMessage)
      
      return () => {
        socketService.offPageMessage(handleWebSocketMessage)
        socketService.disconnect()
      }
    }
  }, [pageId])

  // Fetch existing page content when pageId is provided in URL
  const fetchExistingPage = async (existingPageId: string) => {
    if (!existingPageId) return
    
    setIsLoadingPage(true)
    try {
      const response = await pageApi.getPageContent(existingPageId)
      if (response.success && response.content) {
        setPageContent(response.content)
        setPageId(existingPageId)
        
        // Add a message to indicate page was loaded
        const loadMessage: Message = {
          id: `load_${Date.now()}`,
          content: `✅ 已加载页面: ${existingPageId}`,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, loadMessage])
      }
    } catch (error) {
      console.error('Failed to fetch existing page:', error)
      message.error('获取页面内容失败')
      
      // Fallback: generate new page ID
      const newPageId = `page_${Date.now()}`
      setPageId(newPageId)
    } finally {
      setIsLoadingPage(false)
    }
  }

  // Handle URL parameter on component mount
  useEffect(() => {
    const urlPageId = searchParams.get('pageId')
    if (urlPageId) {
      fetchExistingPage(urlPageId)
    } else {
      // Generate new page ID if none provided
      const newPageId = `page_${Date.now()}`
      setPageId(newPageId)
    }
  }, [])

  const getPageTypeIcon = () => {
    switch (pageType) {
      case 'h5':
        return <MobileOutlined />
      case 'admin':
        return <DesktopOutlined />
      case 'pc':
        return <TabletOutlined />
      default:
        return <MobileOutlined />
    }
  }

  const handleSharePage = () => {
    if (!pageId) {
      message.warning('请先生成一个页面')
      return
    }
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?pageId=${pageId}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      message.success('分享链接已复制到剪贴板')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      message.success('分享链接已复制到剪贴板')
    })
  }

  const handlePageSelect = async (selectedPageId: string) => {
    setIsLoadingPage(true)
    try {
      const response = await pageApi.getPageContent(selectedPageId)
      if (response.success && response.content) {
        setPageContent(response.content)
        setPageId(selectedPageId)
        
        // Update URL without page reload
        const newUrl = `${window.location.pathname}?pageId=${selectedPageId}`
        window.history.pushState({}, '', newUrl)
        
        // Add a message to indicate page was loaded
        const loadMessage: Message = {
          id: `load_${Date.now()}`,
          content: `✅ 已加载页面: ${selectedPageId}`,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, loadMessage])
        message.success('页面加载成功')
      }
    } catch (error) {
      console.error('Failed to load selected page:', error)
      message.error('加载页面失败')
    } finally {
      setIsLoadingPage(false)
    }
  }

  return (
    <div className="h-full p-6">
      <Row gutter={[16, 16]} className="h-full">
        <Col span={16} className="h-full">
          <Card 
            title={
              <Space>
                {getPageTypeIcon()}
                <span>页面预览</span>
              </Space>
            }
            className="h-full shadow-sm"
            extra={
              <Space>
                <PageSelector 
                  onPageSelect={handlePageSelect}
                  currentPageId={pageId}
                  currentPageType={pageType}
                />
                <Button 
                  icon={<ShareAltOutlined />} 
                  onClick={handleSharePage}
                  disabled={!pageId || isLoadingPage}
                >
                  分享
                </Button>
                <Space>
                  <span>本地模型:</span>
                  <Switch
                    checked={useLocalModel}
                    onChange={setUseLocalModel}
                    checkedChildren={<ApiOutlined />}
                    unCheckedChildren="LM"
                  />
                </Space>
                <Select 
                  value={pageType} 
                  onChange={setPageType}
                  style={{ width: 120 }}
                >
                  <Option value="h5">H5移动端</Option>
                  <Option value="admin">管理端</Option>
                  <Option value="pc">PC端</Option>
                </Select>
              </Space>
            }
          >
            {isLoadingPage ? (
              <div className="h-full flex items-center justify-center">
                <Spin size="large" tip="正在加载页面内容..." />
              </div>
            ) : (
              <PreviewArea pageType={pageType} pageContent={pageContent} />
            )}
          </Card>
        </Col>
        <Col span={8} className="h-full">
          <Card 
            title="AI对话区" 
            className="h-full shadow-sm"
          >
            <ChatArea 
              messages={messages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
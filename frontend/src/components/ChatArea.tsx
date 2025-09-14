import { useRef, useEffect } from 'react'
import { Input, Button, Space, List, Avatar } from 'antd'
import { UserOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface ChatAreaProps {
  messages: Message[]
  inputMessage: string
  setInputMessage: (value: string) => void
  handleSendMessage: () => void
  isGenerating: boolean
}

function ChatArea({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  handleSendMessage,
  isGenerating 
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto mb-4">
        <List
          dataSource={messages}
          className="w-full"
          renderItem={(message) => (
            <List.Item className="w-full px-0 mb-2">
              <div className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar 
                    icon={message.sender === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    className={`mx-2 ${message.sender === 'user' ? 'bg-blue-500' : 'bg-green-500'}`}
                  />
                  <div className={`px-3 py-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {message.content}
                    <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
        {isGenerating && (
          <div className="flex justify-start">
            <div className="flex items-center px-3 py-2 rounded-lg bg-blue-100 text-blue-800">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} ></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} ></div>
                </div>
                <span className="text-sm">AI正在生成页面...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t pt-4">
        <Space.Compact className="w-full">
          <Input.TextArea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的需求..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            disabled={isGenerating}
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isGenerating}
            className="h-auto"
          >
            发送
          </Button>
        </Space.Compact>
      </div>
    </div>
  )
}

export default ChatArea
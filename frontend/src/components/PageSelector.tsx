import { useState } from 'react'
import { Button, Modal, List, Tag, Empty, Spin } from 'antd'
import { FolderOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons'
import { pageApi } from '../services/apiService'
import type { PageMetadata } from '../../../backend/src/services/fileService'

// Use PageMetadata from backend, but use title as name for display
interface PageItem extends PageMetadata {
  name: string // This is actually the title from PageMetadata
}

interface PageSelectorProps {
  onPageSelect: (pageId: string) => void
  currentPageId?: string
  currentPageType: 'h5' | 'admin' | 'pc'
}

function PageSelector({ onPageSelect, currentPageId, currentPageType }: PageSelectorProps) {
  const [pages, setPages] = useState<PageItem[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [pagesLoading, setPagesLoading] = useState(false)

  const loadPages = async () => {
    setPagesLoading(true)
    try {
      const response = await pageApi.getGeneratedPagesList(currentPageType)
      if (response.success && response.pages) {
        // Transform PageMetadata to PageItem (use title as name)
        const transformedPages = response.pages.map((page: PageMetadata) => ({
          ...page,
          name: page.title
        }))
        setPages(transformedPages)
      }
    } catch (error) {
      console.error('Failed to load pages:', error)
    } finally {
      setPagesLoading(false)
    }
  }

  const handleSelect = (pageId: string) => {
    onPageSelect(pageId)
    setModalVisible(false)
  }

  const showModal = () => {
    setModalVisible(true)
    loadPages()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.ceil(diffTime / (1000 * 60))
        return `${diffMinutes}分钟前`
      }
      return `${diffHours}小时前`
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const getPageTypeLabel = (type: 'h5' | 'admin' | 'pc') => {
    switch (type) {
      case 'h5': return 'H5移动端'
      case 'admin': return '管理端'
      case 'pc': return 'PC端'
      default: return '未知类型'
    }
  }

  return (
    <>
      <Button 
        icon={<FolderOutlined />} 
        onClick={showModal}
      >
        选择页面
      </Button>

      <Modal
        title={`选择${getPageTypeLabel(currentPageType)}页面`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        {pagesLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : pages.length === 0 ? (
          <Empty 
            description="还没有生成任何页面"
            className="py-8"
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={pages}
            renderItem={(page) => (
              <List.Item
                actions={[
                  <Button
                    key="select"
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleSelect(page.id)}
                  >
                    查看
                  </Button>
                ]}
                className={currentPageId === page.id ? 'bg-blue-50' : ''}
              >
                <List.Item.Meta
                  avatar={<FolderOutlined className="text-blue-500" />}
                  title={
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{page.title}</span>
                      {currentPageId === page.id && (
                        <Tag color="blue">当前页面</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      {page.description && (
                        <div className="text-sm text-gray-600">
                          {page.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <CalendarOutlined />
                        <span>创建于 {formatDate(page.createdAt.toString())}</span>
                        {page.updatedAt !== page.createdAt && (
                          <span className="ml-2">更新于 {formatDate(page.updatedAt.toString())}</span>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  )
}

export default PageSelector
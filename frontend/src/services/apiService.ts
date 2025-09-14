import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export interface GenerationRequest {
  pageId: string
  pageType: 'h5' | 'admin' | 'pc'
  userPrompt: string
  useLocalModel?: boolean
}

export const pageApi = {
  // 初始化页面
  async initializePage(pageId: string, pageType: 'h5' | 'admin' | 'pc', userPrompt?: string, useLocalModel?:boolean) {
    const response = await api.post('/pages/initialize', { pageId, pageType, userPrompt, useLocalModel })
    return response.data
  },

  // 生成页面
  async generatePage(request: GenerationRequest) {
    const response = await api.post('/pages/generate', request)
    return response.data
  },

  // 获取页面内容
  async getPageContent(pageId: string) {
    const response = await api.get(`/pages/${pageId}/content`)
    return response.data
  },

  // 更新页面内容
  async updatePageContent(pageId: string, content: string) {
    const response = await api.put(`/pages/${pageId}/content`, { content })
    return response.data
  },

  // 获取已生成页面列表
  async getGeneratedPagesList(pageType?: 'h5' | 'admin' | 'pc') {
    const params = pageType ? { pageType } : {}
    const response = await api.get('/pages/list', { params })
    return response.data
  }
}

export default api
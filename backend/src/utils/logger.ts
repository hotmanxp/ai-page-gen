import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import fs from 'fs-extra'

// 日志级别定义
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// 业务模块定义
export enum BusinessModule {
  AI_SERVICE = 'AI_SERVICE',
  FILE_SERVICE = 'FILE_SERVICE',
  WEBSOCKET = 'WEBSOCKET',
  HTTP_REQUEST = 'HTTP_REQUEST',
  PAGE_GENERATION = 'PAGE_GENERATION',
  PAGE_MANAGEMENT = 'PAGE_MANAGEMENT',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR'
}

// 日志数据结构
export interface LogData {
  module: BusinessModule
  action: string
  pageId?: string
  pageType?: 'h5' | 'admin' | 'pc' | 'all'
  userPrompt?: string
  duration?: number
  error?: Error|string
  metadata?: Record<string, any>
  // 扩展字段用于更详细的日志记录
  [key: string]: any  // 允许任意额外的字段
}

// 确保日志目录存在
const logsDir = path.join(process.cwd(), 'logs')
fs.ensureDirSync(logsDir)

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// 创建控制台格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${level}: ${message}${metaStr}`
  })
)

// 创建业务日志格式
const businessFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, module, action, ...meta }) => {
    const baseStr = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${action}`
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : ''
    return `${baseStr}${metaStr}`
  })
)

// 创建Winston日志实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ai-page-generator' },
  transports: [
    // 错误日志文件 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d', // 保留14天
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      zippedArchive: true
    }),
    
    // 业务日志文件 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logsDir, 'business-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d', // 保留30天
      format: businessFormat,
      zippedArchive: true
    }),
    
    // 综合日志文件 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // 保留30天
      zippedArchive: true
    }),
    
    // HTTP请求日志文件 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '10m',
      maxFiles: '30d', // 保留30天
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      zippedArchive: true
    }),
    
    // 性能日志文件 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d', // 保留14天
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      zippedArchive: true
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({ 
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({ 
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
})

// 如果是开发环境，添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }))
}

/**
 * 业务日志记录器
 */
export class BusinessLogger {
  constructor(private module: BusinessModule) {}

  /**
   * 记录成功的业务操作
   */
  success(action: string, data: Partial<LogData> = {}) {
    logger.info({
      module: this.module,
      action,
      level: 'SUCCESS',
      ...data
    })
  }

  /**
   * 记录业务操作开始
   */
  start(action: string, data: Partial<LogData> = {}) {
    logger.info({
      module: this.module,
      action,
      level: 'START',
      ...data
    })
  }

  /**
   * 记录业务操作结束
   */
  end(action: string, duration: number, data: Partial<LogData> = {}) {
    logger.info({
      module: this.module,
      action,
      level: 'END',
      duration,
      ...data
    })
  }

  /**
   * 记录业务操作进度
   */
  progress(action: string, message: string, data: Partial<LogData> = {}) {
    logger.info({
      module: this.module,
      action,
      level: 'PROGRESS',
      message,
      ...data
    })
  }

  /**
   * 记录警告信息
   */
  warn(action: string, message: string, data: Partial<LogData> = {}) {
    logger.warn({
      module: this.module,
      action,
      level: 'WARN',
      message,
      ...data
    })
  }

  /**
   * 记录错误信息
   */
  error(action: string, error: Error, data: Partial<LogData> = {}) {
    logger.error({
      module: this.module,
      action,
      level: 'ERROR',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...data
    })
  }

  /**
   * 记录调试信息
   */
  debug(action: string, message: string, data: Partial<LogData> = {}) {
    logger.debug({
      module: this.module,
      action,
      level: 'DEBUG',
      message,
      ...data
    })
  }

  /**
   * 记录HTTP请求
   */
  httpRequest(method: string, url: string, statusCode: number, duration: number, data: Partial<LogData> = {}) {
    logger.info({
      module: BusinessModule.HTTP_REQUEST,
      action: 'HTTP_REQUEST',
      level: 'INFO',
      method,
      url,
      statusCode,
      duration,
      ...data
    })
  }

  /**
   * 记录AI服务调用
   */
  aiCall(action: string, prompt: string, responseLength: number, duration: number, data: Partial<LogData> = {}) {
    logger.info({
      module: BusinessModule.AI_SERVICE,
      action,
      level: 'INFO',
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      responseLength,
      duration,
      ...data
    })
  }

  /**
   * 记录文件操作
   */
  fileOperation(action: string, filePath: string, duration: number, data: Partial<LogData> = {}) {
    logger.info({
      module: BusinessModule.FILE_SERVICE,
      action,
      level: 'INFO',
      filePath,
      duration,
      ...data
    })
  }

  /**
   * 记录WebSocket事件
   */
  websocketEvent(event: string, pageId: string, data: Partial<LogData> = {}) {
    logger.info({
      module: BusinessModule.WEBSOCKET,
      action: event,
      level: 'INFO',
      pageId,
      ...data
    })
  }

  /**
   * 记录性能指标
   */
  performance(action: string, metrics: Record<string, number>, data: Partial<LogData> = {}) {
    logger.info({
      module: this.module,
      action,
      level: 'PERFORMANCE',
      metrics,
      ...data
    })
  }
}

/**
 * 快捷日志记录器
 */
export const loggers = {
  ai: new BusinessLogger(BusinessModule.AI_SERVICE),
  file: new BusinessLogger(BusinessModule.FILE_SERVICE),
  websocket: new BusinessLogger(BusinessModule.WEBSOCKET),
  http: new BusinessLogger(BusinessModule.HTTP_REQUEST),
  pageGen: new BusinessLogger(BusinessModule.PAGE_GENERATION),
  pageMgmt: new BusinessLogger(BusinessModule.PAGE_MANAGEMENT),
  system: new BusinessLogger(BusinessModule.SYSTEM)
}

/**
 * 通用日志函数
 */
export function log(level: LogLevel, message: string, meta?: any) {
  logger.log(level, message, meta)
}

/**
 * 错误日志记录
 */
export function logError(error: Error, context?: string, meta?: any) {
  logger.error({
    message: context || error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...meta
  })
}

export default logger
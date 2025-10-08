import { loggers, BusinessModule } from '../utils/logger';

export interface ComponentBuildError {
  type: 'syntax' | 'dependency' | 'config' | 'unknown';
  message: string;
  details?: string;
  file?: string;
  line?: number;
  column?: number;
  rawError?: string; // 添加原始错误信息
}

export class ComponentErrorService {
  static parseBuildError(error: Error): ComponentBuildError {
    const errorMessage = error.message;
    
    // 解析语法错误
    if (errorMessage.includes('SyntaxError') || errorMessage.includes('Unexpected token')) {
      return {
        type: 'syntax',
        message: '组件代码存在语法错误',
        details: this.extractSyntaxErrorDetails(errorMessage),
        rawError: errorMessage
      };
    }
    
    // 解析依赖错误
    if (errorMessage.includes('Module not found') || errorMessage.includes("Can't resolve")) {
      return {
        type: 'dependency',
        message: '组件依赖缺失',
        details: this.extractDependencyErrorDetails(errorMessage),
        rawError: errorMessage
      };
    }
    
    // 解析配置错误
    if (errorMessage.includes('Configuration') || errorMessage.includes('config')) {
      return {
        type: 'config',
        message: '构建配置错误',
        details: errorMessage,
        rawError: errorMessage
      };
    }
    
    // 默认未知错误
    return {
      type: 'unknown',
      message: '组件构建失败',
      details: errorMessage,
      rawError: errorMessage
    };
  }
  
  private static extractSyntaxErrorDetails(errorMessage: string): string {
    // 提取语法错误的详细信息
    const syntaxErrorMatch = errorMessage.match(/SyntaxError: (.+?)(?:\n|$)/);
    if (syntaxErrorMatch && syntaxErrorMatch[1]) {
      return syntaxErrorMatch[1];
    }
    
    // 提取文件和行号信息
    const locationMatch = errorMessage.match(/(.+?):(\d+):(\d+)/);
    if (locationMatch) {
      return `在文件 ${locationMatch[1]} 第 ${locationMatch[2]} 行第 ${locationMatch[3]} 列发现语法错误`;
    }
    
    return errorMessage;
  }
  
  private static extractDependencyErrorDetails(errorMessage: string): string {
    // 提取模块未找到的详细信息
    const moduleMatch = errorMessage.match(/Can't resolve '(.+?)'/) || errorMessage.match(/Module not found: (.+?)'/);
    if (moduleMatch && moduleMatch[1]) {
      return `找不到模块: ${moduleMatch[1]}`;
    }
    
    return '组件依赖解析失败';
  }
  
  static formatUserFriendlyError(error: ComponentBuildError): string {
    switch (error.type) {
      case 'syntax':
        return `语法错误: ${error.message}\n${error.details || ''}`;
        
      case 'dependency':
        return `依赖错误: ${error.message}\n${error.details || ''}\n请检查代码中是否使用了未安装的第三方库`;
        
      case 'config':
        return `配置错误: ${error.message}\n${error.details || ''}\n请联系系统管理员`;
        
      case 'unknown':
        return `构建失败: ${error.message}\n${error.details || ''}\n请检查代码是否符合React和TypeScript规范`;
        
      default:
        return `组件构建失败: ${error.message}\n${error.details || ''}`;
    }
  }
  
  static logBuildError(pageId: string, error: ComponentBuildError): void {
    loggers.pageGen.error('component_build_error', new Error(error.message), {
      pageId,
      errorType: error.type,
      details: error.details,
      file: error.file,
      line: error.line,
      column: error.column
    });
  }
}
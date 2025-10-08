import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { loggers } from '../../src/utils/logger';
import { ComponentErrorService, ComponentBuildError } from '../../src/services/componentErrorService';
import { AIService } from '../../src/services/aiService';

const execAsync = promisify(exec);

export interface BuildOptions {
  componentCode: string;
  outputDir: string;
  pageId: string;
}

export interface BuildError extends Error {
  code?: string;
  stdout?: string;
  stderr?: string;
}

export class BuildService {
  private buildDir: string;
  private aiService: AIService;
  
  constructor() {
    this.buildDir = path.join(__dirname, '..');
    this.aiService = new AIService();
  }

  generateEntryContent(pageId: string): string {
    return `import App from './index'
//@ts-ignore
window.PageComponent_${pageId} = App
`;
  }

  async buildComponent(options: BuildOptions): Promise<string> {
    const { componentCode, outputDir, pageId } = options;
    
    try {
      return await this.buildComponentWithRetry(componentCode, outputDir, pageId, 0);
    } catch (error: unknown) {
      loggers.pageGen.error('build_failed_final', error instanceof Error ? error : new Error('Unknown build error'), {
        pageId,
        componentCodeLength: componentCode.length,
        outputDir,
        retryAttempts: 0
      });
      
      // 解析并格式化错误信息
      let componentError: ComponentBuildError;
      if (error instanceof Error) {
        componentError = ComponentErrorService.parseBuildError(error);
      } else {
        componentError = {
          type: 'unknown',
          message: '未知构建错误',
          details: String(error)
        };
      }
      
      // 记录错误
      ComponentErrorService.logBuildError(pageId, componentError);
      
      // 清理临时文件（即使构建失败也要清理）
      try {
        const srcDir = path.join(this.buildDir, 'src');
        const componentPath = path.join(srcDir, 'index.tsx');
        const entryPath = path.join(srcDir, 'entry.tsx');
        const configPath = path.join(this.buildDir, 'webpack.dynamic.config.js');
        await this.cleanup([componentPath, entryPath, configPath]);
      } catch (cleanupError) {
        loggers.pageGen.error('build_cleanup_failed', cleanupError instanceof Error ? cleanupError : new Error('Unknown cleanup error'), {
          pageId
        });
      }
      
      // 抛出用户友好的错误信息
      const userFriendlyMessage = ComponentErrorService.formatUserFriendlyError(componentError);
      throw new Error(userFriendlyMessage);
    }
  }

  private async buildComponentWithRetry(componentCode: string, outputDir: string, pageId: string, retryCount: number): Promise<string> {
    const maxRetries = 3; // 最多重试3次
    
    try {
      loggers.pageGen.progress('build_start', `Starting build process for page ${pageId} (attempt ${retryCount + 1})`, {
        pageId,
        outputDir,
        retryCount
      });
      
      // 确保输出目录存在
      await fs.ensureDir(outputDir);
      
      // 确保src目录存在
      const srcDir = path.join(this.buildDir, 'src');
      await fs.ensureDir(srcDir);
      
      // 创建临时的组件文件
      const componentPath = path.join(srcDir, 'index.tsx');
      const entryPath = path.join(srcDir, 'entry.tsx');
      
      loggers.pageGen.progress('writing_component_files', `Writing component files for page ${pageId}`, {
        pageId,
        componentPath,
        entryPath
      });
      
      await fs.writeFile(componentPath, componentCode);
      
      // 创建入口文件
      const entryContent = this.generateEntryContent(pageId);
      await fs.writeFile(entryPath, entryContent);
      
      // 修改webpack配置使用动态入口
      const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
      const webpackConfig = this.generateWebpackConfig(entryPath, absoluteOutputDir, pageId);
      const configPath = path.join(this.buildDir, 'webpack.dynamic.config.js');
      
      loggers.pageGen.progress('generating_webpack_config', `Generating webpack config for page ${pageId}`, {
        pageId,
        configPath
      });
      
      await fs.writeFile(configPath, webpackConfig);
      
      // 执行构建
      const buildCommand = `cd "${this.buildDir}" && npx webpack --config webpack.dynamic.config.js`;
      
      loggers.pageGen.progress('executing_build', `Executing build command for page ${pageId}`, {
        pageId,
        buildCommand
      });
      
      const { stdout, stderr } = await execAsync(buildCommand);
      
      if (stderr) {
        loggers.pageGen.warn('build_stderr', `Build process had stderr output for page ${pageId}`, {
          pageId,
          stderr
        });
      }
      
      loggers.pageGen.progress('build_success', `Build completed successfully for page ${pageId}`, {
        pageId,
        stdout: stdout ? stdout.substring(0, 500) : ''
      });
      
      // 清理临时文件
      await this.cleanup([componentPath, entryPath, configPath]);
      
      // 返回构建后的文件路径
      const builtFilePath = path.join(outputDir, 'main.js');
      return builtFilePath;
      
    } catch (error: unknown) {
      loggers.pageGen.error('build_attempt_failed', error instanceof Error ? error : new Error('Unknown build error'), {
        pageId,
        componentCodeLength: componentCode.length,
        outputDir,
        retryCount
      });
      
      // 如果还有重试机会，尝试使用AI修复代码
      if (retryCount < maxRetries) {
        try {
          loggers.pageGen.progress('attempting_ai_fix', `Attempting to fix code with AI for page ${pageId} (attempt ${retryCount + 1})`, {
            pageId,
            retryCount
          });
          
          // 解析错误信息
          let componentError: ComponentBuildError;
          if (error instanceof Error) {
            componentError = ComponentErrorService.parseBuildError(error);
          } else {
            componentError = {
              type: 'unknown',
              message: '未知构建错误',
              details: String(error)
            };
          }
          
          // 使用AI修复代码
          const fixedCode = await this.fixComponentCodeWithAI(componentCode, componentError, pageId);
          
          loggers.pageGen.progress('ai_fix_success', `AI code fix successful for page ${pageId}`, {
            pageId,
            originalCodeLength: componentCode.length,
            fixedCodeLength: fixedCode.length
          });
          
          // 递归调用重试构建
          return await this.buildComponentWithRetry(fixedCode, outputDir, pageId, retryCount + 1);
        } catch (aiError) {
          loggers.pageGen.error('ai_fix_failed', aiError instanceof Error ? aiError : new Error('Unknown AI fix error'), {
            pageId,
            retryCount
          });
          
          // AI修复失败，继续抛出原始错误
          throw error;
        }
      } else {
        // 达到最大重试次数，抛出错误
        throw error;
      }
    }
  }

  private generateWebpackConfig(entryPath: string, outputDir: string, pageId: string): string {
    const realOutputDir = path.join(__dirname, '..', '..', 'generated-pages', pageId);
    
    loggers.pageGen.debug('webpack_config_generation', `Generating webpack config for ${pageId}`, {
      pageId,
      entryPath,
      realOutputDir
    });
    
    return `
const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(process.cwd(), '${entryPath.replace(/\\/g, '\\\\')}'),
  output: {
    path: '${realOutputDir.replace(/\\/g, '\\\\')}',
    filename: 'main.js',
    library: 'PageComponent_${pageId}',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    // 移除antd相关外部依赖，因为我们现在使用TailwindCSS
    // 'antd': 'antd',
    // 'antd-mobile': 'antdMobile',
    // '@ant-design/icons': 'icons',
    'react-router': 'ReactRouter',
    'react-router-dom': 'ReactRouterDOM',
    'lodash': '_'
  },
  optimization: {
    minimize: true,
  },
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkGroups: false,
    chunkModules: false,
    chunkOrigins: false,
    builtAt: false,
    children: false,
  },
};
`;
  }

  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        if (await fs.pathExists(file)) {
          await fs.unlink(file);
          loggers.pageGen.debug('file_cleanup', `Cleaned up temporary file: ${file}`, {
            filePath: file
          });
        }
      } catch (error: unknown) {
        loggers.pageGen.warn('file_cleanup_failed', `Failed to cleanup file ${file}`, {
          filePath: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async fixComponentCodeWithAI(originalCode: string, error: ComponentBuildError, pageId: string): Promise<string> {
    try {
      loggers.pageGen.progress('ai_fix_start', `Starting AI code fix for page ${pageId}`, {
        pageId,
        errorType: error.type,
        errorMessage: error.message
      });

      // 构造AI修复请求
      const prompt = `
请修复以下React TypeScript组件代码中的错误：

错误类型: ${error.type}
错误信息: ${error.message}
详细信息: ${error.details || '无'}

原始代码:
${originalCode}

请提供修复后的完整代码，确保:
1. 修复所有语法错误
2. 确保所有导入的模块都正确
3. 保持原有的功能和UI结构
4. 使用React和TailwindCSS，不要使用antd或其他UI库
5. 代码符合TypeScript规范
6. 只返回修复后的完整代码，不要包含任何解释或其他内容

修复后的代码:
`;

      // 调用AI服务修复代码
      const fixedCode = await this.aiService.fixComponentCode(prompt);
      
      loggers.pageGen.progress('ai_fix_completed', `AI code fix completed for page ${pageId}`, {
        pageId,
        originalCodeLength: originalCode.length,
        fixedCodeLength: fixedCode.length
      });
      
      return fixedCode;
    } catch (error) {
      loggers.pageGen.error('ai_fix_error', error instanceof Error ? error : new Error('Unknown AI fix error'), {
        pageId
      });
      throw error;
    }
  }
}
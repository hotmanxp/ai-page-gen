# 组件打包错误处理系统

## 概述

本系统提供了一套完整的组件打包错误处理机制，能够识别、解析和格式化各种构建错误，并向用户提供友好的错误信息。当组件构建失败时，系统会自动将错误信息和组件代码发送给AI模型重新生成代码，然后重新尝试构建。

## 错误类型

### 1. 语法错误 (Syntax Error)
- **识别**: 包含 "SyntaxError" 或 "Unexpected token" 的错误
- **处理**: 提取具体的语法错误信息和位置
- **用户提示**: 显示具体的语法错误和建议修复方法

### 2. 依赖错误 (Dependency Error)
- **识别**: 包含 "Module not found" 或 "Can't resolve" 的错误
- **处理**: 提取缺失的模块名称
- **用户提示**: 明确指出缺失的依赖并提供解决建议

### 3. 配置错误 (Configuration Error)
- **识别**: 包含 "Configuration" 或 "config" 的错误
- **处理**: 提供配置相关的错误信息
- **用户提示**: 建议联系系统管理员

### 4. 未知错误 (Unknown Error)
- **识别**: 无法分类的其他错误
- **处理**: 提供原始错误信息
- **用户提示**: 建议检查代码规范

## 自动修复机制

当组件构建失败时，系统会自动执行以下步骤：

1. **错误识别**: 解析构建错误类型和详细信息
2. **AI修复**: 将错误信息和原始代码发送给AI模型请求修复
3. **代码重试**: 使用AI修复后的代码重新尝试构建
4. **重试限制**: 最多尝试3次修复和重试
5. **失败处理**: 如果所有重试都失败，则报告最终错误

### AI修复流程

```
组件构建失败
      ↓
解析错误信息
      ↓
构造AI修复请求
      ↓
调用AI模型修复代码
      ↓
使用修复后的代码重新构建
      ↓
成功或继续重试直到达到限制
```

## 使用方法

### 在构建服务中使用

```typescript
try {
  await buildService.buildComponent(options);
} catch (error) {
  // 错误已被自动解析和格式化
  console.error(error.message);
}
```

### 自定义错误处理

```typescript
import { ComponentErrorService } from '../services/componentErrorService';

// 解析错误
const componentError = ComponentErrorService.parseBuildError(error);

// 记录错误
ComponentErrorService.logBuildError(pageId, componentError);

// 获取用户友好的错误信息
const userMessage = ComponentErrorService.formatUserFriendlyError(componentError);
```

## 错误信息传递

当构建失败时，系统会自动通过WebSocket将错误信息发送到前端：

```javascript
// 前端可以监听generation_error事件来接收错误信息
socket.on('generation_error', (data) => {
  console.error('构建失败:', data.errorMessage);
  // 在UI中显示错误信息
});
```

## 日志记录

所有构建错误都会被记录到日志系统中，便于调试和监控：

- **日志级别**: ERROR
- **模块**: PAGE_GENERATION
- **动作**: component_build_error
- **包含信息**: 
  - 页面ID
  - 错误类型
  - 详细信息
  - 文件位置（如果可用）
  - 行号和列号（如果可用）
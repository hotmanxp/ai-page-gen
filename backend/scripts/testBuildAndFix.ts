import { BuildService } from '../build-system/src/buildService';
import * as fs from 'fs-extra';
import * as path from 'path';

async function testBuildAndFix() {
  const buildService = new BuildService();
  
  // 创建一个有语法错误的组件代码
  const brokenComponentCode = `
import React, { useState } from 'react';

const TestComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  
  // 这里有一个语法错误：缺少大括号闭合
  const handleClick = () => {
    setCount(count + 1);
    // 故意的语法错误
    if (count > 5 {
      console.log('Count is greater than 5');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Test Component</h1>
      <p>Count: {count}</p>
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleClick}
      >
        Increment
      </button>
    </div>
  );
};

export default TestComponent;
`;
  
  const outputDir = path.join(__dirname, '../test-output');
  const pageId = 'test-page-' + Date.now();
  
  try {
    // 确保输出目录存在
    await fs.ensureDir(outputDir);
    
    console.log('Testing component build with intentional syntax error...');
    
    // 尝试构建有错误的组件
    const result = await buildService.buildComponent({
      componentCode: brokenComponentCode,
      outputDir: outputDir,
      pageId: pageId
    });
    
    console.log('Build succeeded unexpectedly:', result);
  } catch (error: unknown) {
    console.log('Build failed as expected:', (error as Error).message);
    
    // 检查是否包含AI修复的相关信息
    if ((error as Error).message.includes('AI代码修复')) {
      console.log('AI修复功能正常工作');
    } else {
      console.log('AI修复功能可能未触发');
    }
  } finally {
    // 清理测试文件
    try {
      await fs.remove(outputDir);
    } catch (cleanupError: unknown) {
      console.log('Cleanup error:', (cleanupError as Error).message);
    }
  }
}

// 运行测试
testBuildAndFix().catch(console.error);
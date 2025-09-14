const { AIService } = require('./dist/services/aiService');

async function testAIDirect() {
  console.log('🧪 Testing AI service directly...');
  
  const aiService = new AIService();
  
  const testRequest = {
    pageId: 'direct_test',
    pageType: 'h5',
    userPrompt: '创建一个简单的登录页面',
    currentCode: '<!DOCTYPE html><html><head><title>测试</title></head><body><h1>原始内容</h1></body></html>'
  };
  
  try {
    console.log('📤 Testing AI generation...');
    const result = await aiService.generatePage(testRequest);
    console.log('✅ AI generation successful!');
    console.log('📝 Result length:', result.length);
    console.log('📝 First 300 characters:', result.substring(0, 300));
  } catch (error) {
    console.error('❌ AI generation failed:', error.message);
    console.error('📋 Error details:', error);
  }
}

testAIDirect();
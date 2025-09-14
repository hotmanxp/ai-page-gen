const axios = require('axios');

async function testPageGeneration() {
  console.log('🧪 Testing page generation...');
  
  const testData = {
    pageId: 'test_ai_generation_' + Date.now(),
    pageType: 'h5',
    userPrompt: '创建一个现代化的登录页面，包含手机号输入、验证码按钮，使用渐变背景和圆角设计'
  };

  try {
    console.log('📤 Sending generation request:', testData);
    
    // First, initialize the page
    const initResponse = await axios.post('http://localhost:3001/api/pages/initialize', {
      pageId: testData.pageId,
      pageType: testData.pageType,
      userPrompt: testData.userPrompt
    });
    
    console.log('✅ Initialization response:', initResponse.data);

    // Then, generate the page
    const generateResponse = await axios.post('http://localhost:3001/api/pages/generate', testData);
    console.log('✅ Generation request sent:', generateResponse.data);
    
    // Wait a bit and check the result
    console.log('⏳ Waiting for AI generation...');
    
    setTimeout(async () => {
      try {
        const contentResponse = await axios.get(`http://localhost:3001/api/pages/${testData.pageId}/content`);
        console.log('📄 Final content length:', contentResponse.data.content.length);
        console.log('📝 First 200 characters:', contentResponse.data.content.substring(0, 200));
        
        // Check if content is still just template
        const isTemplate = contentResponse.data.content.includes('这是一个移动端页面模板');
        console.log('🔍 Is still template?', isTemplate);
        
      } catch (error) {
        console.error('❌ Error checking final content:', error.message);
      }
    }, 10000); // Wait 10 seconds

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testPageGeneration();
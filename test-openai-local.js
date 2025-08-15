#!/usr/bin/env node

/**
 * Local OpenAI API Test Script
 * Tests OpenAI connectivity without full application setup
 */

const OpenAI = require('openai').default;
const fs = require('fs');
const path = require('path');

async function testOpenAI() {
  console.log('🧪 Local OpenAI API Test Starting...');
  
  // Check for API key in environment
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No OpenAI API key found in environment');
    console.log('💡 To test locally:');
    console.log('   1. Copy your OpenAI API key');
    console.log('   2. Run: OPENAI_API_KEY=sk-your-key node test-openai-local.js');
    console.log('   3. Or uncomment OPENAI_API_KEY in .env.local and run: npm run dev');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    console.log('❌ Invalid OpenAI API key format (should start with sk-)');
    return;
  }

  console.log(`🔑 OpenAI API key found (length: ${apiKey.length})`);

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    // Test 1: Models list (free API call)
    console.log('\n📋 Test 1: Checking available models...');
    const models = await openai.models.list();
    const hasGPT35 = models.data.some(m => m.id === 'gpt-3.5-turbo');
    const hasDalle3 = models.data.some(m => m.id === 'dall-e-3');
    const hasDalle2 = models.data.some(m => m.id === 'dall-e-2');
    
    console.log(`✅ Models accessible: ${models.data.length} total`);
    console.log(`   - GPT-3.5-turbo: ${hasGPT35 ? '✅' : '❌'}`);
    console.log(`   - DALL-E 3: ${hasDalle3 ? '✅' : '❌'}`);
    console.log(`   - DALL-E 2: ${hasDalle2 ? '✅' : '❌'}`);

    // Test 2: Simple chat completion
    console.log('\n🤖 Test 2: Testing GPT-3.5-turbo...');
    const start = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'API test successful'" }],
      max_tokens: 10
    });
    const chatTime = Date.now() - start;
    console.log(`✅ GPT-3.5-turbo response (${chatTime}ms): ${completion.choices[0]?.message?.content}`);

    // Test 3: DALL-E 2 (faster than DALL-E 3)
    console.log('\n🎨 Test 3: Testing DALL-E 2 image generation...');
    const imageStart = Date.now();
    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: "a simple red pixel",
      n: 1,
      size: "256x256"
    });
    const imageTime = Date.now() - imageStart;
    
    if (imageResponse.data[0]?.url) {
      console.log(`✅ DALL-E 2 generation successful (${imageTime}ms)`);
      console.log(`🔗 Image URL: ${imageResponse.data[0].url.substring(0, 50)}...`);
    } else {
      console.log('❌ DALL-E 2 generation failed - no image URL returned');
    }

    console.log('\n🎉 All OpenAI API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - API Key: Valid (${apiKey.length} chars)`);
    console.log(`   - Models: ${models.data.length} accessible`);
    console.log(`   - GPT-3.5: ${chatTime}ms response time`);
    console.log(`   - DALL-E 2: ${imageTime}ms generation time`);
    
  } catch (error) {
    console.error('\n❌ OpenAI API test failed:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('💳 Issue: API quota exceeded');
      console.log('💡 Solution: Check your OpenAI billing and usage');
    } else if (error.message.includes('rate')) {
      console.log('⏱️ Issue: Rate limit exceeded');
      console.log('💡 Solution: Wait and try again later');
    } else if (error.message.includes('auth')) {
      console.log('🔐 Issue: Authentication failed');
      console.log('💡 Solution: Check your API key');
    }
  }
}

testOpenAI().catch(console.error);
const { chromium } = require('playwright');

async function runSimpleTests() {
  console.log('🧪 Starting PixelBuddy Simple Functional Testing...');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  const testResults = {
    load_test: {},
    ui_elements: {},
    console_errors: [],
    screenshots: []
  };
  
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      testResults.console_errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console Warning: ${text}`);
    } else if (type === 'log') {
      console.log(`📝 Console Log: ${text}`);
    }
  });
  
  try {
    console.log('\n1. 📱 Loading application...');
    const startTime = Date.now();
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    testResults.load_test.load_time = loadTime;
    testResults.load_test.status = 'success';
    console.log(`✅ Application loaded in ${loadTime}ms`);
    
    await page.screenshot({ path: '/tmp/01_initial_load.png' });
    testResults.screenshots.push('01_initial_load.png');
    
    console.log('\n2. 🔍 Analyzing page structure...');
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    testResults.ui_elements.title = title;
    
    // Wait a moment for any dynamic content
    await page.waitForTimeout(3000);
    
    // Check for COPPA gate
    const coppaElements = await page.locator('text="I am a parent"').count();
    const coppaElements2 = await page.locator('text="Continue anonymously"').count();
    
    if (coppaElements > 0 || coppaElements2 > 0) {
      console.log('✅ COPPA gate detected');
      testResults.ui_elements.coppa_gate = true;
      
      await page.screenshot({ path: '/tmp/02_coppa_gate.png' });
      testResults.screenshots.push('02_coppa_gate.png');
      
      // Try to continue
      if (coppaElements > 0) {
        await page.locator('text="I am a parent"').click();
        console.log('✅ Clicked "I am a parent"');
      } else if (coppaElements2 > 0) {
        await page.locator('text="Continue anonymously"').click(); 
        console.log('✅ Clicked "Continue anonymously"');
      }
      
      await page.waitForTimeout(3000);
    } else {
      console.log('ℹ️  No COPPA gate detected');
      testResults.ui_elements.coppa_gate = false;
    }
    
    await page.screenshot({ path: '/tmp/03_after_coppa.png' });
    testResults.screenshots.push('03_after_coppa.png');
    
    console.log('\n3. 🔍 Looking for main UI elements...');
    
    // Look for canvas
    const canvasCount = await page.locator('canvas').count();
    console.log(`🎨 Canvas elements found: ${canvasCount}`);
    testResults.ui_elements.canvas_count = canvasCount;
    
    // Look for buttons
    const buttonCount = await page.locator('button').count();
    console.log(`🔘 Button elements found: ${buttonCount}`);
    testResults.ui_elements.button_count = buttonCount;
    
    // Look for inputs
    const inputCount = await page.locator('input').count();
    console.log(`📝 Input elements found: ${inputCount}`);
    testResults.ui_elements.input_count = inputCount;
    
    // Look for common text elements
    const commonTexts = [
      'PixelBuddy',
      'Tools',
      'Colors',
      'Pencil', 
      'Eraser',
      'Fill',
      'New',
      'Export',
      'Save'
    ];
    
    testResults.ui_elements.found_texts = [];
    for (const text of commonTexts) {
      const count = await page.locator(`text="${text}"`).count();
      if (count > 0) {
        testResults.ui_elements.found_texts.push(text);
        console.log(`✅ Found text: "${text}" (${count} times)`);
      } else {
        console.log(`❌ Missing text: "${text}"`);
      }
    }
    
    console.log('\n4. 🖱️  Testing basic interactions...');
    
    // Try clicking some buttons
    const allButtons = await page.locator('button').all();
    testResults.ui_elements.clickable_buttons = 0;
    
    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      try {
        const button = allButtons[i];
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (isVisible && isEnabled) {
          const buttonText = await button.textContent();
          console.log(`🔘 Testing button: "${buttonText?.trim() || 'unnamed'}"`);
          
          await button.click();
          testResults.ui_elements.clickable_buttons++;
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log(`⚠️  Button click failed: ${error.message}`);
      }
    }
    
    await page.screenshot({ path: '/tmp/04_after_interactions.png' });
    testResults.screenshots.push('04_after_interactions.png');
    
    console.log('\n5. 📊 Final analysis...');
    
    // Check for error elements
    const errorElements = await page.locator('[class*="error"], .error, [data-error]').count();
    testResults.ui_elements.error_elements = errorElements;
    
    if (errorElements > 0) {
      console.log(`⚠️  Found ${errorElements} error elements on page`);
    } else {
      console.log('✅ No error elements detected');
    }
    
    // Final screenshot
    await page.screenshot({ path: '/tmp/05_final_state.png' });
    testResults.screenshots.push('05_final_state.png');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 SIMPLE TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Load time: ${testResults.load_test.load_time}ms`);
    console.log(`Console errors: ${testResults.console_errors.length}`);
    console.log(`Canvas elements: ${testResults.ui_elements.canvas_count}`);
    console.log(`Buttons found: ${testResults.ui_elements.button_count}`);
    console.log(`Clickable buttons: ${testResults.ui_elements.clickable_buttons}`);
    console.log(`Found texts: ${testResults.ui_elements.found_texts.length}/10`);
    console.log(`Screenshots taken: ${testResults.screenshots.length}`);
    
    if (testResults.console_errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      testResults.console_errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }
    
    console.log('\n📸 SCREENSHOTS SAVED:');
    testResults.screenshots.forEach(screenshot => {
      console.log(`  • /tmp/${screenshot}`);
    });
    
    await browser.close();
    return testResults;
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: '/tmp/error_state.png' });
    await browser.close();
    throw error;
  }
}

runSimpleTests().catch(console.error);
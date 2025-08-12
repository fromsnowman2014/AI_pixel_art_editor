const { chromium } = require('playwright');

async function runDetailedTests() {
  console.log('🧪 Starting PixelBuddy Detailed Functional Testing...');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 800
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  const testResults = {
    coppa_flow: {},
    main_app: {},
    basic_drawing: {},
    project_settings: {},
    multi_tab: {},
    color_management: {},
    frame_gif: {},
    export_ai: {},
    console_errors: [],
    performance: {},
    issues_found: []
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
    }
  });
  
  try {
    // === LOADING AND COPPA FLOW ===
    console.log('\n1. 📱 Loading application...');
    const startTime = Date.now();
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    testResults.performance.initial_load_time = loadTime;
    console.log(`✅ Application loaded in ${loadTime}ms`);
    
    await page.screenshot({ path: '/tmp/step_01_initial.png' });
    
    // Check what's on the page
    console.log('\n2. 🚪 Analyzing COPPA gate...');
    
    const pageText = await page.textContent('body');
    console.log('📄 Page contains:', pageText?.substring(0, 200) + '...');
    
    // Look for specific COPPA elements
    const startButton = await page.locator('text="Start Creating"').first();
    const localModeButton = await page.locator('text="Local Mode"').first();
    const parentModeButton = await page.locator('text="Parent Mode"').first();
    
    testResults.coppa_flow.has_start_button = await startButton.count() > 0;
    testResults.coppa_flow.has_local_mode = await localModeButton.count() > 0;
    testResults.coppa_flow.has_parent_mode = await parentModeButton.count() > 0;
    
    console.log(`Start button found: ${testResults.coppa_flow.has_start_button}`);
    console.log(`Local mode found: ${testResults.coppa_flow.has_local_mode}`);
    console.log(`Parent mode found: ${testResults.coppa_flow.has_parent_mode}`);
    
    // Try to proceed past COPPA gate
    let proceedButton = null;
    if (await startButton.count() > 0) {
      proceedButton = startButton;
      console.log('✅ Using "Start Creating" button');
    } else if (await localModeButton.count() > 0) {
      proceedButton = localModeButton;
      console.log('✅ Using "Local Mode" button');
    }
    
    if (proceedButton) {
      await proceedButton.click();
      console.log('✅ Clicked proceed button');
      await page.waitForTimeout(3000);
      
      testResults.coppa_flow.successfully_proceeded = true;
      await page.screenshot({ path: '/tmp/step_02_after_coppa.png' });
    } else {
      testResults.coppa_flow.successfully_proceeded = false;
      testResults.issues_found.push('Could not find button to proceed past COPPA gate');
    }
    
    // === MAIN APPLICATION TESTING ===
    console.log('\n3. 🎨 Analyzing main application...');
    
    await page.waitForTimeout(2000);
    
    // Check for main app elements
    const canvasCount = await page.locator('canvas').count();
    const toolbarElements = await page.locator('.toolbar, [data-testid="toolbar"]').count();
    const colorPaletteElements = await page.locator('.color-palette, [data-testid="color-palette"]').count();
    
    testResults.main_app.canvas_count = canvasCount;
    testResults.main_app.has_toolbar = toolbarElements > 0;
    testResults.main_app.has_color_palette = colorPaletteElements > 0;
    
    console.log(`Canvas elements: ${canvasCount}`);
    console.log(`Toolbar present: ${testResults.main_app.has_toolbar}`);
    console.log(`Color palette present: ${testResults.main_app.has_color_palette}`);
    
    if (canvasCount === 0) {
      testResults.issues_found.push('No canvas element found in main app');
    }
    
    await page.screenshot({ path: '/tmp/step_03_main_app.png' });
    
    // === BASIC DRAWING WORKFLOW TESTING ===
    console.log('\n4. 🖌️  Testing Basic Drawing Workflow...');
    
    // Test tool selection
    const toolButtons = await page.locator('button').all();
    testResults.basic_drawing.available_tools = [];
    
    for (const button of toolButtons) {
      try {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (text && isVisible && isEnabled) {
          testResults.basic_drawing.available_tools.push(text.trim());
        }
      } catch (e) {
        // Skip problematic buttons
      }
    }
    
    console.log(`Available tool buttons: ${testResults.basic_drawing.available_tools.join(', ')}`);
    
    // Test drawing on canvas if available
    testResults.basic_drawing.canvas_interaction = false;
    if (canvasCount > 0) {
      try {
        const canvas = page.locator('canvas').first();
        const bbox = await canvas.boundingBox();
        
        if (bbox) {
          console.log('✅ Testing canvas drawing...');
          
          // Perform drawing gesture
          await page.mouse.move(bbox.x + bbox.width/2, bbox.y + bbox.height/2);
          await page.mouse.down();
          await page.mouse.move(bbox.x + bbox.width/2 + 50, bbox.y + bbox.height/2 + 50);
          await page.mouse.up();
          
          testResults.basic_drawing.canvas_interaction = true;
          console.log('✅ Successfully performed drawing gesture');
          
          await page.screenshot({ path: '/tmp/step_04_drawing_test.png' });
        }
      } catch (error) {
        testResults.issues_found.push(`Canvas interaction failed: ${error.message}`);
      }
    }
    
    // === PROJECT SETTINGS TESTING ===
    console.log('\n5. 📐 Testing Project Settings...');
    
    const numberInputs = await page.locator('input[type=\"number\"]').count();
    const textInputs = await page.locator('input[type=\"text\"]').count();
    const selects = await page.locator('select').count();
    const ranges = await page.locator('input[type=\"range\"]').count();
    
    testResults.project_settings.number_inputs = numberInputs;
    testResults.project_settings.text_inputs = textInputs;
    testResults.project_settings.selects = selects;
    testResults.project_settings.range_inputs = ranges;
    
    console.log(`Number inputs: ${numberInputs} (for dimensions)`);
    console.log(`Text inputs: ${textInputs} (for project name)`);
    console.log(`Select dropdowns: ${selects} (for options)`);
    console.log(`Range sliders: ${ranges} (for settings)`);
    
    await page.screenshot({ path: '/tmp/step_05_project_settings.png' });
    
    // === MULTI-TAB TESTING ===
    console.log('\n6. 📑 Testing Multi-tab Functionality...');
    
    // Look for tab-related elements
    const tabElements = await page.locator('[role=\"tab\"], .tab, [data-testid=\"tab\"]').count();
    const newTabButtons = await page.locator('button').filter({ hasText: '+' }).count() + 
                          await page.locator('button').filter({ hasText: 'New' }).count();
    
    testResults.multi_tab.existing_tabs = tabElements;
    testResults.multi_tab.new_tab_buttons = newTabButtons;
    
    console.log(`Existing tabs: ${tabElements}`);
    console.log(`New tab buttons: ${newTabButtons}`);
    
    // Try to create a new tab if button exists
    const newTabButton = page.locator('button').filter({ hasText: '+' }).first();
    if (await newTabButton.count() > 0) {
      try {
        await newTabButton.click();
        await page.waitForTimeout(1000);
        
        const tabsAfter = await page.locator('[role=\"tab\"], .tab, [data-testid=\"tab\"]').count();
        testResults.multi_tab.tab_creation_works = tabsAfter > tabElements;
        console.log(`✅ Tab creation test: ${testResults.multi_tab.tab_creation_works}`);
      } catch (error) {
        testResults.issues_found.push(`Tab creation failed: ${error.message}`);
      }
    }
    
    await page.screenshot({ path: '/tmp/step_06_tabs.png' });
    
    // === COLOR MANAGEMENT TESTING ===
    console.log('\n7. 🎨 Testing Color Management...');
    
    const colorInputs = await page.locator('input[type=\"color\"]').count();
    const colorSwatches = await page.locator('.color-swatch, [data-testid=\"color\"], .color-button').count();
    const colorPickers = await page.locator('[data-testid=\"color-picker\"], .color-picker').count();
    
    testResults.color_management.color_inputs = colorInputs;
    testResults.color_management.color_swatches = colorSwatches;
    testResults.color_management.color_pickers = colorPickers;
    
    console.log(`Color inputs: ${colorInputs}`);
    console.log(`Color swatches: ${colorSwatches}`);
    console.log(`Color pickers: ${colorPickers}`);
    
    await page.screenshot({ path: '/tmp/step_07_colors.png' });
    
    // === FRAME/GIF TESTING ===
    console.log('\n8. 🎬 Testing Frame/GIF Functionality...');
    
    const frameElements = await page.locator('.frame, [data-testid=\"frame\"], .frame-thumbnail').count();
    const addFrameButtons = await page.locator('button').filter({ hasText: /add.*frame/i }).count() +
                           await page.locator('[data-testid=\"add-frame\"]').count();
    
    testResults.frame_gif.frame_elements = frameElements;
    testResults.frame_gif.add_frame_buttons = addFrameButtons;
    
    console.log(`Frame elements: ${frameElements}`);
    console.log(`Add frame buttons: ${addFrameButtons}`);
    
    await page.screenshot({ path: '/tmp/step_08_frames.png' });
    
    // === EXPORT/AI TESTING ===
    console.log('\n9. 💾 Testing Export/AI Features...');
    
    const exportButtons = await page.locator('button').filter({ hasText: /export|download|save/i }).count();
    const aiButtons = await page.locator('button').filter({ hasText: /ai|generate/i }).count();
    const textareas = await page.locator('textarea').count();
    
    testResults.export_ai.export_buttons = exportButtons;
    testResults.export_ai.ai_buttons = aiButtons;
    testResults.export_ai.text_areas = textareas;
    
    console.log(`Export/download/save buttons: ${exportButtons}`);
    console.log(`AI/generate buttons: ${aiButtons}`);
    console.log(`Text areas (for prompts): ${textareas}`);
    
    await page.screenshot({ path: '/tmp/step_09_export_ai.png' });
    
    // === FINAL ASSESSMENT ===
    console.log('\n10. 📊 Final Performance Assessment...');
    
    // Test responsiveness
    const startResponsive = Date.now();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    const responsivenessTime = Date.now() - startResponsive;
    
    testResults.performance.responsiveness_time = responsivenessTime;
    testResults.performance.total_test_time = Date.now() - startTime;
    
    // Final screenshot
    await page.screenshot({ path: '/tmp/step_10_final.png' });
    
    // === TEST SUMMARY ===
    console.log(`\\n${'='.repeat(60)}`);
    console.log('📊 DETAILED TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    console.log('\\n🚪 COPPA Flow:');
    console.log(`  • Successfully proceeded: ${testResults.coppa_flow.successfully_proceeded}`);
    console.log(`  • Has start button: ${testResults.coppa_flow.has_start_button}`);
    
    console.log('\\n🎨 Main Application:');
    console.log(`  • Canvas elements: ${testResults.main_app.canvas_count}`);
    console.log(`  • Has toolbar: ${testResults.main_app.has_toolbar}`);
    console.log(`  • Has color palette: ${testResults.main_app.has_color_palette}`);
    
    console.log('\\n🖌️  Basic Drawing:');
    console.log(`  • Available tools: ${testResults.basic_drawing.available_tools.length}`);
    console.log(`  • Canvas interaction: ${testResults.basic_drawing.canvas_interaction}`);
    
    console.log('\\n📐 Project Settings:');
    console.log(`  • Number inputs: ${testResults.project_settings.number_inputs}`);
    console.log(`  • Text inputs: ${testResults.project_settings.text_inputs}`);
    console.log(`  • Select dropdowns: ${testResults.project_settings.selects}`);
    
    console.log('\\n📑 Multi-tab:');
    console.log(`  • Existing tabs: ${testResults.multi_tab.existing_tabs}`);
    console.log(`  • New tab buttons: ${testResults.multi_tab.new_tab_buttons}`);
    console.log(`  • Tab creation works: ${testResults.multi_tab.tab_creation_works || 'not tested'}`);
    
    console.log('\\n🎨 Color Management:');
    console.log(`  • Color inputs: ${testResults.color_management.color_inputs}`);
    console.log(`  • Color swatches: ${testResults.color_management.color_swatches}`);
    
    console.log('\\n🎬 Frame/GIF:');
    console.log(`  • Frame elements: ${testResults.frame_gif.frame_elements}`);
    console.log(`  • Add frame buttons: ${testResults.frame_gif.add_frame_buttons}`);
    
    console.log('\\n💾 Export/AI:');
    console.log(`  • Export buttons: ${testResults.export_ai.export_buttons}`);
    console.log(`  • AI buttons: ${testResults.export_ai.ai_buttons}`);
    console.log(`  • Text areas: ${testResults.export_ai.text_areas}`);
    
    console.log('\\n⚡ Performance:');
    console.log(`  • Initial load time: ${testResults.performance.initial_load_time}ms`);
    console.log(`  • Responsiveness time: ${testResults.performance.responsiveness_time}ms`);
    console.log(`  • Total test time: ${testResults.performance.total_test_time}ms`);
    
    if (testResults.issues_found.length > 0) {
      console.log('\\n❌ ISSUES FOUND:');
      testResults.issues_found.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    if (testResults.console_errors.length > 0) {
      console.log('\\n❌ CONSOLE ERRORS:');
      testResults.console_errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\\n📸 SCREENSHOTS SAVED: /tmp/step_01_initial.png through /tmp/step_10_final.png');
    
    await browser.close();
    return testResults;
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
    await page.screenshot({ path: '/tmp/error_state.png' });
    await browser.close();
    throw error;
  }
}

runDetailedTests().catch(console.error);
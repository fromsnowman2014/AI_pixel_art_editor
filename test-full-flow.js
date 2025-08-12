const { chromium } = require('playwright');

async function runFullFlowTest() {
  console.log('🧪 Starting PixelBuddy Complete Flow Testing...');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1200
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  const testResults = {
    workflows: {
      coppa_flow: { status: 'pending', details: [] },
      basic_drawing: { status: 'pending', details: [] },
      project_settings: { status: 'pending', details: [] },
      multi_tab: { status: 'pending', details: [] },
      color_management: { status: 'pending', details: [] },
      frame_gif: { status: 'pending', details: [] },
      export_ai: { status: 'pending', details: [] }
    },
    critical_issues: [],
    performance_metrics: {},
    console_errors: []
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
    // === STEP 1: Load and Navigate COPPA Gate ===
    console.log('\\n1️⃣  COPPA GATE NAVIGATION');
    console.log('─'.repeat(40));
    
    const startTime = Date.now();
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    testResults.performance_metrics.initial_load_time = Date.now() - startTime;
    
    console.log(`✅ Page loaded in ${testResults.performance_metrics.initial_load_time}ms`);
    await page.screenshot({ path: '/tmp/flow_01_coppa_gate.png' });
    
    // Try multiple approaches to get past COPPA gate
    let coppaSuccess = false;
    const coppaButtons = [
      'button:has-text("Start Creating (Local Mode)")',
      'button:has-text("Local Mode")',
      'button:has-text("Continue")',
      'button:has-text("Start")'
    ];
    
    for (const buttonSelector of coppaButtons) {
      try {
        const button = page.locator(buttonSelector);
        if (await button.count() > 0) {
          console.log(`✅ Found COPPA button: ${buttonSelector}`);
          await button.click();
          await page.waitForTimeout(3000);
          coppaSuccess = true;
          testResults.workflows.coppa_flow.status = 'pass';
          testResults.workflows.coppa_flow.details.push(`Successfully clicked: ${buttonSelector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to click ${buttonSelector}: ${error.message}`);
      }
    }
    
    if (!coppaSuccess) {
      testResults.workflows.coppa_flow.status = 'fail';
      testResults.critical_issues.push('Cannot proceed past COPPA gate');
      testResults.workflows.coppa_flow.details.push('No working COPPA buttons found');
    }
    
    await page.screenshot({ path: '/tmp/flow_02_after_coppa.png' });
    
    // === STEP 2: Wait for Main App to Load ===
    console.log('\\n2️⃣  MAIN APPLICATION LOADING');
    console.log('─'.repeat(40));
    
    await page.waitForTimeout(5000); // Give app time to initialize
    
    // Check if we made it to the main app
    const canvasCount = await page.locator('canvas').count();
    const editorVisible = await page.locator('.pixel-editor, [data-testid=\"pixel-editor\"]').count();
    const toolbarVisible = await page.locator('.toolbar, [data-testid=\"toolbar\"]').count();
    
    console.log(`Canvas elements found: ${canvasCount}`);
    console.log(`Editor component: ${editorVisible}`);  
    console.log(`Toolbar component: ${toolbarVisible}`);
    
    if (canvasCount > 0 || editorVisible > 0) {
      console.log('✅ Successfully reached main application');
      testResults.workflows.coppa_flow.details.push('Main app loaded successfully');
    } else {
      console.log('❌ Main application did not load properly');
      testResults.critical_issues.push('Main application failed to load after COPPA');
    }
    
    await page.screenshot({ path: '/tmp/flow_03_main_app.png' });
    
    // === STEP 3: Basic Drawing Workflow ===
    console.log('\\n3️⃣  BASIC DRAWING WORKFLOW');
    console.log('─'.repeat(40));
    
    testResults.workflows.basic_drawing.status = 'testing';
    
    // Look for drawing tools
    const allButtons = await page.locator('button').all();
    const toolNames = [];
    
    for (const button of allButtons) {
      try {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        if (text && isVisible && text.trim()) {
          toolNames.push(text.trim());
        }
      } catch (e) {
        // Skip problematic buttons
      }
    }
    
    console.log(`Available buttons: ${toolNames.join(', ')}`);
    testResults.workflows.basic_drawing.details.push(`Found ${toolNames.length} buttons`);
    
    // Test canvas interaction if canvas exists
    if (canvasCount > 0) {
      try {
        const canvas = page.locator('canvas').first();
        const bbox = await canvas.boundingBox();
        
        if (bbox) {
          console.log('✅ Testing canvas drawing...');
          
          // Draw a simple line
          await page.mouse.move(bbox.x + 50, bbox.y + 50);
          await page.mouse.down();
          await page.mouse.move(bbox.x + 150, bbox.y + 150);
          await page.mouse.up();
          
          // Draw another stroke
          await page.mouse.move(bbox.x + 100, bbox.y + 50);
          await page.mouse.down();
          await page.mouse.move(bbox.x + 100, bbox.y + 150);
          await page.mouse.up();
          
          testResults.workflows.basic_drawing.status = 'pass';
          testResults.workflows.basic_drawing.details.push('Successfully drew on canvas');
          console.log('✅ Drawing interaction successful');
          
          await page.screenshot({ path: '/tmp/flow_04_drawing_test.png' });
        } else {
          testResults.workflows.basic_drawing.status = 'fail';
          testResults.workflows.basic_drawing.details.push('Canvas found but no bounding box');
        }
      } catch (error) {
        testResults.workflows.basic_drawing.status = 'error';
        testResults.workflows.basic_drawing.details.push(`Drawing failed: ${error.message}`);
      }
    } else {
      testResults.workflows.basic_drawing.status = 'fail';
      testResults.workflows.basic_drawing.details.push('No canvas found for drawing');
    }
    
    // === STEP 4: Test Tool Selection ===
    console.log('\\n4️⃣  TOOL SELECTION TESTING');
    console.log('─'.repeat(40));
    
    const toolKeywords = ['pencil', 'brush', 'eraser', 'fill', 'bucket', 'select', 'move'];
    const foundTools = [];
    
    for (const tool of toolKeywords) {
      const toolElements = await page.locator(`button:has-text("${tool}")`, { ignoreCase: true }).count() +
                          await page.locator(`[data-testid*="${tool}"]`).count() +
                          await page.locator(`[aria-label*="${tool}"]`).count();
      
      if (toolElements > 0) {
        foundTools.push(tool);
        console.log(`✅ Found ${tool} tool`);
      }
    }
    
    testResults.workflows.basic_drawing.details.push(`Tools found: ${foundTools.join(', ')}`);
    
    // === STEP 5: Project Settings Testing ===
    console.log('\\n5️⃣  PROJECT SETTINGS WORKFLOW');
    console.log('─'.repeat(40));
    
    testResults.workflows.project_settings.status = 'testing';
    
    const settings = {
      number_inputs: await page.locator('input[type="number"]').count(),
      text_inputs: await page.locator('input[type="text"]').count(),
      selects: await page.locator('select').count(),
      ranges: await page.locator('input[type="range"]').count(),
      checkboxes: await page.locator('input[type="checkbox"]').count()
    };
    
    console.log('Settings controls found:');
    Object.entries(settings).forEach(([key, count]) => {
      console.log(`  • ${key.replace('_', ' ')}: ${count}`);
      testResults.workflows.project_settings.details.push(`${key}: ${count}`);
    });
    
    if (Object.values(settings).some(count => count > 0)) {
      testResults.workflows.project_settings.status = 'pass';
    } else {
      testResults.workflows.project_settings.status = 'fail';
      testResults.workflows.project_settings.details.push('No project settings controls found');
    }
    
    await page.screenshot({ path: '/tmp/flow_05_project_settings.png' });
    
    // === STEP 6: Multi-tab Testing ===
    console.log('\\n6️⃣  MULTI-TAB WORKFLOW');
    console.log('─'.repeat(40));
    
    testResults.workflows.multi_tab.status = 'testing';
    
    const initialTabs = await page.locator('[role="tab"], .tab, [data-testid="tab"]').count();
    const newTabButtons = await page.locator('button').filter({ hasText: '+' }).count() +
                         await page.locator('button').filter({ hasText: 'New' }).count() +
                         await page.locator('[data-testid="new-tab"]').count();
    
    console.log(`Existing tabs: ${initialTabs}`);
    console.log(`New tab buttons: ${newTabButtons}`);
    
    testResults.workflows.multi_tab.details.push(`Initial tabs: ${initialTabs}`);
    testResults.workflows.multi_tab.details.push(`New tab buttons: ${newTabButtons}`);
    
    if (initialTabs > 0) {
      testResults.workflows.multi_tab.status = 'pass';
      testResults.workflows.multi_tab.details.push('Multi-tab interface detected');
    } else {
      testResults.workflows.multi_tab.status = 'fail';
      testResults.workflows.multi_tab.details.push('No tab interface found');
    }
    
    // === STEP 7: Color Management Testing ===
    console.log('\\n7️⃣  COLOR MANAGEMENT WORKFLOW');
    console.log('─'.repeat(40));
    
    testResults.workflows.color_management.status = 'testing';
    
    const colorControls = {
      color_inputs: await page.locator('input[type="color"]').count(),
      color_swatches: await page.locator('.color-swatch, [data-testid="color"], .color-button').count(),
      color_palette: await page.locator('.color-palette, [data-testid="color-palette"]').count()
    };
    
    console.log('Color controls found:');
    Object.entries(colorControls).forEach(([key, count]) => {
      console.log(`  • ${key.replace('_', ' ')}: ${count}`);
      testResults.workflows.color_management.details.push(`${key}: ${count}`);
    });
    
    if (Object.values(colorControls).some(count => count > 0)) {
      testResults.workflows.color_management.status = 'pass';
    } else {
      testResults.workflows.color_management.status = 'fail';
      testResults.workflows.color_management.details.push('No color management UI found');
    }
    
    await page.screenshot({ path: '/tmp/flow_06_colors.png' });
    
    // === STEP 8: Frame/GIF Testing ===
    console.log('\\n8️⃣  FRAME/GIF WORKFLOW');
    console.log('─'.repeat(40));
    
    testResults.workflows.frame_gif.status = 'testing';
    
    const frameControls = {
      frame_elements: await page.locator('.frame, [data-testid="frame"], .frame-thumbnail').count(),
      add_frame_buttons: await page.locator('button').filter({ hasText: /frame/i }).count(),
      frame_manager: await page.locator('.frame-manager, [data-testid="frame-manager"]').count()
    };
    
    console.log('Frame controls found:');
    Object.entries(frameControls).forEach(([key, count]) => {
      console.log(`  • ${key.replace('_', ' ')}: ${count}`);
      testResults.workflows.frame_gif.details.push(`${key}: ${count}`);
    });
    
    if (Object.values(frameControls).some(count => count > 0)) {
      testResults.workflows.frame_gif.status = 'pass';
    } else {
      testResults.workflows.frame_gif.status = 'fail';
      testResults.workflows.frame_gif.details.push('No frame/GIF UI found');
    }
    
    // === STEP 9: Export/AI Testing ===
    console.log('\\n9️⃣  EXPORT/AI WORKFLOW');  
    console.log('─'.repeat(40));
    
    testResults.workflows.export_ai.status = 'testing';
    
    const exportControls = {
      export_buttons: await page.locator('button').filter({ hasText: /export|download|save/i }).count(),
      ai_buttons: await page.locator('button').filter({ hasText: /ai|generate/i }).count(),
      text_areas: await page.locator('textarea').count(),
      file_inputs: await page.locator('input[type="file"]').count()
    };
    
    console.log('Export/AI controls found:');
    Object.entries(exportControls).forEach(([key, count]) => {
      console.log(`  • ${key.replace('_', ' ')}: ${count}`);
      testResults.workflows.export_ai.details.push(`${key}: ${count}`);
    });
    
    if (Object.values(exportControls).some(count => count > 0)) {
      testResults.workflows.export_ai.status = 'pass';
    } else {
      testResults.workflows.export_ai.status = 'fail';
      testResults.workflows.export_ai.details.push('No export/AI UI found');
    }
    
    await page.screenshot({ path: '/tmp/flow_07_export_ai.png' });
    
    // === FINAL ASSESSMENT ===
    console.log('\\n🏁 FINAL PERFORMANCE ASSESSMENT');
    console.log('─'.repeat(40));
    
    // Test final responsiveness
    const responsiveStart = Date.now();
    await page.mouse.move(200, 200);
    await page.mouse.move(400, 400);
    testResults.performance_metrics.final_responsiveness = Date.now() - responsiveStart;
    testResults.performance_metrics.total_test_time = Date.now() - startTime;
    
    // Final screenshot
    await page.screenshot({ path: '/tmp/flow_08_final.png' });
    
    // === COMPREHENSIVE TEST SUMMARY ===
    console.log('\\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE FUNCTIONAL TEST RESULTS');
    console.log('='.repeat(80));
    
    // Performance Summary
    console.log('\\n⚡ PERFORMANCE METRICS:');
    console.log(`  • Initial Load Time: ${testResults.performance_metrics.initial_load_time}ms`);
    console.log(`  • Final Responsiveness: ${testResults.performance_metrics.final_responsiveness}ms`);
    console.log(`  • Total Test Time: ${testResults.performance_metrics.total_test_time}ms`);
    
    // Workflow Results
    console.log('\\n🔬 WORKFLOW TEST RESULTS:');
    Object.entries(testResults.workflows).forEach(([workflow, result]) => {
      const statusIcon = result.status === 'pass' ? '✅' : 
                        result.status === 'fail' ? '❌' : 
                        result.status === 'error' ? '🔥' : '⏳';
      console.log(`  ${statusIcon} ${workflow.replace('_', ' ').toUpperCase()}: ${result.status}`);
      if (result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`    • ${detail}`);
        });
      }
    });
    
    // Critical Issues
    if (testResults.critical_issues.length > 0) {
      console.log('\\n🚨 CRITICAL ISSUES:');
      testResults.critical_issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('\\n✅ NO CRITICAL ISSUES FOUND');
    }
    
    // Console Errors
    if (testResults.console_errors.length > 0) {
      console.log('\\n❌ CONSOLE ERRORS:');
      testResults.console_errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\\n✅ NO CONSOLE ERRORS');
    }
    
    console.log('\\n📸 SCREENSHOTS SAVED:');
    for (let i = 1; i <= 8; i++) {
      console.log(`  • /tmp/flow_${i.toString().padStart(2, '0')}_*.png`);
    }
    
    await browser.close();
    return testResults;
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    await page.screenshot({ path: '/tmp/flow_error_state.png' });
    await browser.close();
    throw error;
  }
}

runFullFlowTest().catch(console.error);
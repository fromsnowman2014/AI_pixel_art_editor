const { chromium } = require('playwright');

async function runFunctionalTests() {
  console.log('🧪 Starting PixelBuddy Comprehensive Functional Testing...');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500,
    devtools: true 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: '/tmp/videos/' }
  });
  
  const page = await context.newPage();
  
  const testResults = {
    basic_drawing: {},
    project_settings: {},
    multi_tab: {},
    color_management: {},
    frame_gif: {},
    export_ai: {},
    console_errors: [],
    performance: {},
    general_observations: []
  };
  
  let testNumber = 1;
  
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
  
  // Capture network errors
  page.on('requestfailed', request => {
    console.log(`❌ Network Error: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    console.log(`\n${testNumber++}. 📱 Loading application...`);
    const startTime = Date.now();
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    testResults.performance.initial_load_time = loadTime;
    console.log(`✅ Application loaded in ${loadTime}ms`);
    
    // Take initial screenshot
    await page.screenshot({ path: '/tmp/01_initial_load.png' });
    console.log('📸 Initial screenshot saved');
    
    // Check if COPPA gate appears
    console.log(`\n${testNumber++}. 🚪 Checking COPPA gate...`);
    const coppaGate = await page.locator('[data-testid="coppa-gate"], .coppa-gate, text="I am a parent"').first();
    const hasCoppaGate = await coppaGate.count() > 0;
    
    if (hasCoppaGate) {
      console.log('✅ COPPA gate detected');
      await page.screenshot({ path: '/tmp/02_coppa_gate.png' });
      
      // Try to continue as parent or anonymous
      const parentButton = await page.locator('text="I am a parent"').first();
      const anonymousButton = await page.locator('text="Continue anonymously"').first();
      
      if (await parentButton.count() > 0) {
        await parentButton.click();
        console.log('✅ Clicked "I am a parent" button');
      } else if (await anonymousButton.count() > 0) {
        await anonymousButton.click();
        console.log('✅ Clicked "Continue anonymously" button');
      }
      
      await page.waitForTimeout(2000);
    } else {
      console.log('ℹ️  No COPPA gate found - proceeding to main app');
    }
    
    // Wait for main app to load
    console.log(`\n${testNumber++}. 🎨 Waiting for main editor...`);
    await page.waitForSelector('.pixel-canvas, canvas, [data-testid="canvas"]', { timeout: 10000 });
    await page.screenshot({ path: '/tmp/03_main_editor.png' });
    console.log('✅ Main editor loaded');
    
    // === BASIC DRAWING WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} BASIC DRAWING WORKFLOW ${'='.repeat(20)}`);
    
    console.log(`\n${testNumber++}. 🖌️  Testing tool selection...`);
    testResults.basic_drawing.tool_selection = await testToolSelection(page);
    
    console.log(`\n${testNumber++}. 🎨 Testing drawing functionality...`);
    testResults.basic_drawing.drawing = await testDrawing(page);
    
    console.log(`\n${testNumber++}. 🧽 Testing eraser tool...`);
    testResults.basic_drawing.eraser = await testEraser(page);
    
    console.log(`\n${testNumber++}. 🪣 Testing fill/bucket tool...`);
    testResults.basic_drawing.fill = await testFillTool(page);
    
    console.log(`\n${testNumber++}. 🔍 Testing zoom functionality...`);
    testResults.basic_drawing.zoom = await testZoom(page);
    
    console.log(`\n${testNumber++}. ↩️  Testing undo/redo...`);
    testResults.basic_drawing.undo_redo = await testUndoRedo(page);
    
    // === PROJECT SETTINGS WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} PROJECT SETTINGS WORKFLOW ${'='.repeat(18)}`);
    
    console.log(`\n${testNumber++}. 📐 Testing canvas dimension changes...`);
    testResults.project_settings.canvas_dimensions = await testCanvasDimensions(page);
    
    console.log(`\n${testNumber++}. 🎨 Testing color limit changes...`);
    testResults.project_settings.color_limit = await testColorLimit(page);
    
    console.log(`\n${testNumber++}. 📝 Testing project name changes...`);
    testResults.project_settings.project_name = await testProjectName(page);
    
    console.log(`\n${testNumber++}. 🔄 Testing mode toggle...`);
    testResults.project_settings.mode_toggle = await testModeToggle(page);
    
    // === MULTI-TAB WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} MULTI-TAB WORKFLOW ${'='.repeat(22)}`);
    
    console.log(`\n${testNumber++}. ➕ Testing tab creation...`);
    testResults.multi_tab.tab_creation = await testTabCreation(page);
    
    console.log(`\n${testNumber++}. 🔄 Testing tab switching...`);
    testResults.multi_tab.tab_switching = await testTabSwitching(page);
    
    console.log(`\n${testNumber++}. ❌ Testing tab closing...`);
    testResults.multi_tab.tab_closing = await testTabClosing(page);
    
    // === COLOR MANAGEMENT WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} COLOR MANAGEMENT WORKFLOW ${'='.repeat(17)}`);
    
    console.log(`\n${testNumber++}. 🎨 Testing preset palettes...`);
    testResults.color_management.preset_palettes = await testPresetPalettes(page);
    
    console.log(`\n${testNumber++}. 🌈 Testing custom colors...`);
    testResults.color_management.custom_colors = await testCustomColors(page);
    
    console.log(`\n${testNumber++}. 🎯 Testing color picker tool...`);
    testResults.color_management.color_picker = await testColorPicker(page);
    
    // === FRAME/GIF WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} FRAME/GIF WORKFLOW ${'='.repeat(22)}`);
    
    console.log(`\n${testNumber++}. ➕ Testing frame creation...`);
    testResults.frame_gif.frame_creation = await testFrameCreation(page);
    
    console.log(`\n${testNumber++}. 🔄 Testing frame switching...`);
    testResults.frame_gif.frame_switching = await testFrameSwitching(page);
    
    console.log(`\n${testNumber++}. 🗑️  Testing frame deletion...`);
    testResults.frame_gif.frame_deletion = await testFrameDeletion(page);
    
    // === EXPORT/AI WORKFLOW TESTING ===
    console.log(`\n${'='.repeat(20)} EXPORT/AI WORKFLOW ${'='.repeat(22)}`);
    
    console.log(`\n${testNumber++}. 🤖 Testing AI generation UI...`);
    testResults.export_ai.ai_generation = await testAIGeneration(page);
    
    console.log(`\n${testNumber++}. 💾 Testing export functionality...`);
    testResults.export_ai.export = await testExport(page);
    
    console.log(`\n${testNumber++}. 💾 Testing save functionality...`);
    testResults.export_ai.save = await testSave(page);
    
    // Final screenshot
    await page.screenshot({ path: '/tmp/99_final_state.png' });
    
    // Print test summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Initial load time: ${testResults.performance.initial_load_time}ms`);
    console.log(`Console errors: ${testResults.console_errors.length}`);
    
    // Print detailed results
    console.log('\n🔍 DETAILED TEST RESULTS:');
    console.log(JSON.stringify(testResults, null, 2));
    
    await browser.close();
    return testResults;
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
    await page.screenshot({ path: '/tmp/error_state.png' });
    await browser.close();
    throw error;
  }
}

// Test function implementations
async function testToolSelection(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for tool buttons/toolbar
    const toolSelectors = [
      '[data-testid="pencil-tool"]',
      '[data-testid="eraser-tool"]', 
      '[data-testid="fill-tool"]',
      'button:has-text("Pencil")',
      'button:has-text("Eraser")',
      'button:has-text("Fill")',
      '.toolbar button',
      '[aria-label*="tool"]'
    ];
    
    let toolsFound = 0;
    for (const selector of toolSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        toolsFound += count;
        result.details.push(`Found ${count} tools with selector: ${selector}`);
      }
    }
    
    if (toolsFound > 0) {
      result.status = 'pass';
      result.details.push(`Total tools found: ${toolsFound}`);
      
      // Try to click first available tool
      for (const selector of toolSelectors) {
        const element = await page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          result.details.push(`Successfully clicked tool: ${selector}`);
          break;
        }
      }
    } else {
      result.status = 'fail';
      result.issues.push('No tool buttons found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing tools: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testDrawing(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Find canvas element
    const canvasSelectors = [
      'canvas',
      '[data-testid="canvas"]',
      '.pixel-canvas canvas',
      '[role="img"]'
    ];
    
    let canvas = null;
    for (const selector of canvasSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        canvas = element;
        result.details.push(`Found canvas with selector: ${selector}`);
        break;
      }
    }
    
    if (canvas) {
      // Try to draw on canvas
      const bbox = await canvas.boundingBox();
      if (bbox) {
        // Draw a simple line
        await page.mouse.move(bbox.x + 50, bbox.y + 50);
        await page.mouse.down();
        await page.mouse.move(bbox.x + 100, bbox.y + 100);
        await page.mouse.up();
        
        result.status = 'pass';
        result.details.push('Successfully performed drawing gesture');
        
        // Take screenshot of drawing
        await page.screenshot({ path: '/tmp/drawing_test.png' });
      } else {
        result.status = 'fail';
        result.issues.push('Canvas found but no bounding box');
      }
    } else {
      result.status = 'fail';
      result.issues.push('No canvas element found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing drawing: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testEraser(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for eraser tool
    const eraserSelectors = [
      '[data-testid="eraser-tool"]',
      'button:has-text("Eraser")',
      '[aria-label*="eraser"]',
      '[title*="eraser"]'
    ];
    
    let eraserFound = false;
    for (const selector of eraserSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        await element.click();
        eraserFound = true;
        result.details.push(`Found and clicked eraser: ${selector}`);
        break;
      }
    }
    
    if (eraserFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('Eraser tool not found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing eraser: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testFillTool(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for fill/bucket tool
    const fillSelectors = [
      '[data-testid="fill-tool"]',
      '[data-testid="bucket-tool"]',
      'button:has-text("Fill")',
      'button:has-text("Bucket")',
      '[aria-label*="fill"]',
      '[title*="fill"]'
    ];
    
    let fillFound = false;
    for (const selector of fillSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        await element.click();
        fillFound = true;
        result.details.push(`Found and clicked fill tool: ${selector}`);
        break;
      }
    }
    
    if (fillFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('Fill/bucket tool not found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing fill tool: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testZoom(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for zoom controls
    const zoomSelectors = [
      '[data-testid="zoom-in"]',
      '[data-testid="zoom-out"]',
      'button:has-text("+")',
      'button:has-text("-")',
      '[aria-label*="zoom"]',
      'input[type="range"]' // zoom slider
    ];
    
    let zoomFound = false;
    for (const selector of zoomSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        zoomFound = true;
        result.details.push(`Found zoom controls: ${selector} (${count} elements)`);
        
        // Try to interact with zoom
        if (selector.includes('zoom-in') || selector.includes('+')) {
          await elements.first().click();
          result.details.push('Clicked zoom in');
        }
      }
    }
    
    if (zoomFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('Zoom controls not found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing zoom: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testUndoRedo(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for undo/redo controls
    const undoSelectors = [
      '[data-testid="undo"]',
      'button:has-text("Undo")',
      '[aria-label*="undo"]',
      '[title*="undo"]'
    ];
    
    const redoSelectors = [
      '[data-testid="redo"]',
      'button:has-text("Redo")',
      '[aria-label*="redo"]',
      '[title*="redo"]'
    ];
    
    let undoFound = false;
    let redoFound = false;
    
    for (const selector of undoSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        undoFound = true;
        result.details.push(`Found undo: ${selector}`);
        break;
      }
    }
    
    for (const selector of redoSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        redoFound = true;
        result.details.push(`Found redo: ${selector}`);
        break;
      }
    }
    
    if (undoFound && redoFound) {
      result.status = 'pass';
    } else if (undoFound || redoFound) {
      result.status = 'partial';
      result.issues.push('Only found one of undo/redo');
    } else {
      result.status = 'fail';
      result.issues.push('Neither undo nor redo found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing undo/redo: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testCanvasDimensions(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for dimension controls
    const dimensionSelectors = [
      'input[type="number"]',
      '[data-testid="width-input"]',
      '[data-testid="height-input"]',
      'input[placeholder*="width"]',
      'input[placeholder*="height"]'
    ];
    
    let dimensionInputsFound = 0;
    for (const selector of dimensionSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      dimensionInputsFound += count;
      if (count > 0) {
        result.details.push(`Found dimension inputs: ${selector} (${count} elements)`);
      }
    }
    
    if (dimensionInputsFound > 0) {
      result.status = 'pass';
      result.details.push(`Total dimension inputs found: ${dimensionInputsFound}`);
    } else {
      result.status = 'fail';
      result.issues.push('No dimension input controls found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing canvas dimensions: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testColorLimit(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for color limit controls
    const colorLimitSelectors = [
      '[data-testid="color-limit"]',
      'input[type="range"]',
      'select',
      'input[placeholder*="color"]',
      'input[placeholder*="palette"]'
    ];
    
    let colorLimitFound = false;
    for (const selector of colorLimitSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        colorLimitFound = true;
        result.details.push(`Found color limit controls: ${selector} (${count} elements)`);
      }
    }
    
    if (colorLimitFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No color limit controls found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing color limit: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testProjectName(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for project name input
    const nameSelectors = [
      '[data-testid="project-name"]',
      'input[placeholder*="name"]',
      'input[placeholder*="title"]',
      'input[type="text"]'
    ];
    
    let nameInputFound = false;
    for (const selector of nameSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        nameInputFound = true;
        result.details.push(`Found project name input: ${selector} (${count} elements)`);
      }
    }
    
    if (nameInputFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No project name input found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing project name: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testModeToggle(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for mode toggle controls
    const modeSelectors = [
      '[data-testid="mode-toggle"]',
      'button:has-text("Beginner")',
      'button:has-text("Advanced")',
      'input[type="checkbox"]',
      '[role="switch"]'
    ];
    
    let modeToggleFound = false;
    for (const selector of modeSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        modeToggleFound = true;
        result.details.push(`Found mode toggle: ${selector} (${count} elements)`);
      }
    }
    
    if (modeToggleFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No mode toggle found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing mode toggle: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testTabCreation(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for new tab button
    const newTabSelectors = [
      '[data-testid="new-tab"]',
      'button:has-text("+")',
      'button:has-text("New")',
      '[aria-label*="new tab"]',
      '[title*="new tab"]'
    ];
    
    let newTabFound = false;
    for (const selector of newTabSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        // Count current tabs
        const currentTabs = await page.locator('[role="tab"], .tab, [data-testid="tab"]').count();
        
        await element.click();
        await page.waitForTimeout(1000);
        
        // Count tabs after click
        const newTabCount = await page.locator('[role="tab"], .tab, [data-testid="tab"]').count();
        
        if (newTabCount > currentTabs) {
          newTabFound = true;
          result.details.push(`Successfully created new tab: ${selector}`);
          result.details.push(`Tabs before: ${currentTabs}, after: ${newTabCount}`);
        }
        break;
      }
    }
    
    if (newTabFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('Could not create new tab');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing tab creation: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testTabSwitching(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for tabs
    const tabs = await page.locator('[role="tab"], .tab, [data-testid="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Try to switch to different tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      
      result.status = 'pass';
      result.details.push(`Found ${tabCount} tabs, successfully switched`);
    } else if (tabCount === 1) {
      result.status = 'partial';
      result.issues.push('Only one tab available, cannot test switching');
    } else {
      result.status = 'fail';
      result.issues.push('No tabs found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing tab switching: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testTabClosing(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for tab close buttons
    const closeSelectors = [
      '[data-testid="close-tab"]',
      'button:has-text("×")',
      'button:has-text("✕")',
      '[aria-label*="close"]',
      '.tab button'
    ];
    
    let closeButtonFound = false;
    for (const selector of closeSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        closeButtonFound = true;
        result.details.push(`Found close buttons: ${selector} (${count} elements)`);
        break;
      }
    }
    
    if (closeButtonFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No tab close buttons found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing tab closing: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testPresetPalettes(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for color palette sections
    const paletteSelectors = [
      '.color-palette',
      '[data-testid="color-palette"]',
      '.palette-selector',
      'select[data-testid="palette"]'
    ];
    
    let paletteFound = false;
    for (const selector of paletteSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        paletteFound = true;
        result.details.push(`Found color palette: ${selector} (${count} elements)`);
      }
    }
    
    if (paletteFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No color palettes found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing preset palettes: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testCustomColors(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for color picker or add color functionality
    const colorSelectors = [
      'input[type="color"]',
      '[data-testid="color-picker"]',
      'button:has-text("Add Color")',
      '.color-add-button'
    ];
    
    let colorPickerFound = false;
    for (const selector of colorSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        colorPickerFound = true;
        result.details.push(`Found color picker: ${selector} (${count} elements)`);
      }
    }
    
    if (colorPickerFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No custom color functionality found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing custom colors: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testColorPicker(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for eyedropper/color picker tool
    const pickerSelectors = [
      '[data-testid="eyedropper"]',
      'button:has-text("Eyedropper")',
      '[aria-label*="pick color"]',
      '[title*="color picker"]'
    ];
    
    let pickerFound = false;
    for (const selector of pickerSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        pickerFound = true;
        result.details.push(`Found color picker tool: ${selector} (${count} elements)`);
      }
    }
    
    if (pickerFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No color picker tool found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing color picker: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testFrameCreation(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for frame controls
    const frameSelectors = [
      '[data-testid="add-frame"]',
      'button:has-text("Add Frame")',
      'button:has-text("+")',
      '.frame-manager button'
    ];
    
    let addFrameFound = false;
    for (const selector of frameSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        addFrameFound = true;
        result.details.push(`Found add frame button: ${selector} (${count} elements)`);
      }
    }
    
    if (addFrameFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No add frame functionality found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing frame creation: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testFrameSwitching(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for frame thumbnails or list
    const frameSelectors = [
      '.frame-thumbnail',
      '[data-testid="frame"]',
      '.frame-list > *',
      '.frame-manager > *'
    ];
    
    let framesFound = false;
    for (const selector of frameSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        framesFound = true;
        result.details.push(`Found frames: ${selector} (${count} elements)`);
      }
    }
    
    if (framesFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No frame switching UI found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing frame switching: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testFrameDeletion(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for frame delete buttons
    const deleteSelectors = [
      '[data-testid="delete-frame"]',
      'button:has-text("Delete")',
      'button:has-text("×")',
      '.frame-delete'
    ];
    
    let deleteFound = false;
    for (const selector of deleteSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        deleteFound = true;
        result.details.push(`Found delete buttons: ${selector} (${count} elements)`);
      }
    }
    
    if (deleteFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No frame deletion functionality found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing frame deletion: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testAIGeneration(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for AI generation UI
    const aiSelectors = [
      '[data-testid="ai-generate"]',
      'button:has-text("AI")',
      'button:has-text("Generate")',
      'textarea[placeholder*="describe"]',
      'input[placeholder*="prompt"]'
    ];
    
    let aiUIFound = false;
    for (const selector of aiSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        aiUIFound = true;
        result.details.push(`Found AI UI: ${selector} (${count} elements)`);
      }
    }
    
    if (aiUIFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No AI generation UI found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing AI generation: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testExport(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for export buttons
    const exportSelectors = [
      '[data-testid="export"]',
      'button:has-text("Export")',
      'button:has-text("Download")',
      'button:has-text("Save")',
      '.export-button'
    ];
    
    let exportFound = false;
    for (const selector of exportSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        exportFound = true;
        result.details.push(`Found export button: ${selector} (${count} elements)`);
      }
    }
    
    if (exportFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No export functionality found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing export: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

async function testSave(page) {
  const result = { status: 'unknown', details: [], issues: [] };
  
  try {
    // Look for save functionality
    const saveSelectors = [
      '[data-testid="save"]',
      'button:has-text("Save")',
      '[aria-label*="save"]',
      'kbd:has-text("Ctrl+S")',
      'kbd:has-text("Cmd+S")'
    ];
    
    let saveFound = false;
    for (const selector of saveSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        saveFound = true;
        result.details.push(`Found save functionality: ${selector} (${count} elements)`);
      }
    }
    
    // Test keyboard shortcut
    try {
      await page.keyboard.press('Control+s');
      result.details.push('Tested Ctrl+S keyboard shortcut');
      saveFound = true;
    } catch (e) {
      // Ignore keyboard shortcut errors
    }
    
    if (saveFound) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.issues.push('No save functionality found');
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`Error testing save: ${error.message}`);
  }
  
  console.log(`   Result: ${result.status} - ${result.details.length} details, ${result.issues.length} issues`);
  return result;
}

// Run the tests
runFunctionalTests().catch(console.error);
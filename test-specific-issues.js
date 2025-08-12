const { chromium } = require('playwright');

async function runSpecificIssueTests() {
  console.log('🔍 Testing Specific Issues Found in PixelBuddy...');
  console.log('=' + '='.repeat(59));
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 800
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    // Load app and get past COPPA
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Start Creating (Local Mode)")').click();
    await page.waitForTimeout(4000);
    
    console.log('✅ App loaded, investigating specific issues...');
    await page.screenshot({ path: '/tmp/specific_01_loaded.png' });
    
    // === ISSUE 1: Color Management Investigation ===
    console.log('\\n🎨 INVESTIGATING COLOR MANAGEMENT...');
    console.log('─'.repeat(50));
    
    // Look for any color-related elements more thoroughly
    const colorSelectors = [
      '.color', '.swatch', '.palette', '[data-testid*="color"]',
      '[class*="color"]', 'button[style*="background"]', 
      'div[style*="background-color"]', '[aria-label*="color"]'
    ];
    
    console.log('Searching for color elements:');
    for (const selector of colorSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ✅ Found ${count} elements with: ${selector}`);
        
        // Get some details about these elements
        const elements = await page.locator(selector).all();
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          try {
            const text = await elements[i].textContent();
            const classes = await elements[i].getAttribute('class');
            console.log(`    • Element ${i}: "${text?.trim() || 'no text'}" class="${classes}"`);
          } catch (e) {
            console.log(`    • Element ${i}: Could not get details`);
          }
        }
      }
    }
    
    // Check if colors are in a specific section
    console.log('\\nChecking for color sections:');
    const sections = await page.locator('div, section').all();
    for (const section of sections.slice(0, 10)) {
      try {
        const text = await section.textContent();
        if (text && text.toLowerCase().includes('color')) {
          const innerHTML = await section.innerHTML();
          console.log(`  🎨 Found color section: ${text.substring(0, 100)}...`);
          console.log(`    HTML: ${innerHTML.substring(0, 200)}...`);
        }
      } catch (e) {
        // Skip problematic sections
      }
    }
    
    await page.screenshot({ path: '/tmp/specific_02_color_investigation.png' });
    
    // === ISSUE 2: Multi-tab Investigation ===
    console.log('\\n📑 INVESTIGATING MULTI-TAB FUNCTIONALITY...');
    console.log('─'.repeat(50));
    
    // Look for tab-related elements
    const tabSelectors = [
      '[role="tab"]', '.tab', '[data-testid*="tab"]',
      '[class*="tab"]', 'button[aria-selected]', '.project-tab'
    ];
    
    console.log('Searching for tab elements:');
    for (const selector of tabSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ✅ Found ${count} elements with: ${selector}`);
      }
    }
    
    // Test the "New" button we found
    const newButtons = await page.locator('button').filter({ hasText: 'New' });
    const addButtons = await page.locator('button').filter({ hasText: '+' });
    
    console.log(`\\n"New" buttons found: ${await newButtons.count()}`);
    console.log(`"+" buttons found: ${await addButtons.count()}`);
    
    if (await newButtons.count() > 0) {
      console.log('Testing "New" button click...');
      try {
        await newButtons.first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked "New" button successfully');
        
        // Check if anything changed
        const tabsAfter = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
        console.log(`Tabs after click: ${tabsAfter}`);
        
        await page.screenshot({ path: '/tmp/specific_03_after_new_click.png' });
      } catch (error) {
        console.log(`❌ Failed to click "New" button: ${error.message}`);
      }
    }
    
    // === ISSUE 3: Frame Management Investigation ===
    console.log('\\n🎬 INVESTIGATING FRAME/GIF FUNCTIONALITY...');
    console.log('─'.repeat(50));
    
    // Test the "Add Frame" button we found
    const addFrameButtons = await page.locator('button').filter({ hasText: 'Frame' });
    console.log(`"Add Frame" buttons found: ${await addFrameButtons.count()}`);
    
    if (await addFrameButtons.count() > 0) {
      console.log('Testing "Add Frame" button...');
      try {
        await addFrameButtons.first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked "Add Frame" button successfully');
        
        // Look for frame thumbnails or frame list
        const frameElements = await page.locator('.frame, .thumbnail, [data-testid*="frame"]').count();
        console.log(`Frame elements after click: ${frameElements}`);
        
        await page.screenshot({ path: '/tmp/specific_04_after_frame_click.png' });
      } catch (error) {
        console.log(`❌ Failed to click "Add Frame" button: ${error.message}`);
      }
    }
    
    // === ISSUE 4: AI Generation Testing ===
    console.log('\\n🤖 INVESTIGATING AI FUNCTIONALITY...');
    console.log('─'.repeat(50));
    
    const aiButtons = await page.locator('button').filter({ hasText: /AI|generate/i });
    console.log(`AI buttons found: ${await aiButtons.count()}`);
    
    const textareas = await page.locator('textarea');
    console.log(`Textareas found: ${await textareas.count()}`);
    
    if (await textareas.count() > 0) {
      console.log('Testing AI prompt input...');
      try {
        await textareas.first().fill('a red pixel cat');
        console.log('✅ Successfully entered AI prompt');
        
        if (await aiButtons.count() > 0) {
          console.log('Attempting to trigger AI generation...');
          await aiButtons.first().click();
          console.log('✅ Clicked AI generate button');
          await page.waitForTimeout(3000);
          
          await page.screenshot({ path: '/tmp/specific_05_ai_test.png' });
        }
      } catch (error) {
        console.log(`❌ AI testing failed: ${error.message}`);
      }
    }
    
    // === ISSUE 5: Deep UI Structure Analysis ===
    console.log('\\n🔍 DEEP UI STRUCTURE ANALYSIS...');
    console.log('─'.repeat(50));
    
    // Get the full page structure
    const bodyHTML = await page.locator('body').innerHTML();
    
    // Analyze for missing components
    const missingComponents = [];
    const expectedComponents = [
      { name: 'Color Palette', patterns: ['color-palette', 'palette', 'colors'] },
      { name: 'Tab Interface', patterns: ['tab', 'project-tab', 'tabs'] },
      { name: 'Frame Manager', patterns: ['frame-manager', 'frames', 'timeline'] },
      { name: 'Toolbar', patterns: ['toolbar', 'tools', 'tool-panel'] }
    ];
    
    for (const component of expectedComponents) {
      const found = component.patterns.some(pattern => 
        bodyHTML.toLowerCase().includes(pattern)
      );
      
      if (!found) {
        missingComponents.push(component.name);
        console.log(`❌ Missing: ${component.name}`);
      } else {
        console.log(`✅ Found: ${component.name}`);
      }
    }
    
    // Final comprehensive screenshot
    await page.screenshot({ path: '/tmp/specific_06_final_analysis.png', fullPage: true });
    
    console.log('\\n' + '='.repeat(60));
    console.log('🔍 SPECIFIC ISSUE INVESTIGATION COMPLETE');
    console.log('='.repeat(60));
    
    if (missingComponents.length > 0) {
      console.log('\\n❌ MISSING COMPONENTS:');
      missingComponents.forEach(component => {
        console.log(`  • ${component}`);
      });
    }
    
    console.log('\\n📸 Investigation screenshots saved to /tmp/specific_*.png');
    
    await browser.close();
    
  } catch (error) {
    console.log(`❌ Investigation failed: ${error.message}`);
    await page.screenshot({ path: '/tmp/specific_error.png' });
    await browser.close();
    throw error;
  }
}

runSpecificIssueTests().catch(console.error);
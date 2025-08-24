import { test, expect } from '@playwright/test';

test.describe('Color Mapping Import - Real Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create a new project first by selecting canvas size
    await page.locator('text=32×32').click();
    
    // Wait for the editor to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for editor to fully initialize
  });

  test('should explore editor interface for import functionality', async ({ page }) => {
    // Take a screenshot of the editor
    await page.screenshot({ path: 'editor-screenshot.png', fullPage: true });
    
    // Look for all buttons in the editor
    const buttons = await page.locator('button').all();
    console.log('Number of buttons in editor:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      const isVisible = await buttons[i].isVisible();
      if (text && (text.toLowerCase().includes('import') || text.toLowerCase().includes('upload') || text.toLowerCase().includes('add'))) {
        console.log(`Import-related button ${i}: "${text}" (visible: ${isVisible})`);
      }
    }
    
    // Look for file input elements
    const fileInputs = await page.locator('input[type="file"]').all();
    console.log('File inputs in editor:', fileInputs.length);
    
    // Look for any elements with import, upload, or add text
    const importTexts = await page.getByText(/import|upload|add frame|add image/i).all();
    console.log('Import-related text elements:', importTexts.length);
    
    for (let i = 0; i < Math.min(importTexts.length, 10); i++) {
      const text = await importTexts[i].textContent();
      const isVisible = await importTexts[i].isVisible();
      console.log(`Import text ${i}: "${text}" (visible: ${isVisible})`);
    }
    
    // Look for toolbar or menu items
    const toolbarItems = await page.locator('[role="toolbar"], .toolbar, [data-testid*="toolbar"]').all();
    console.log('Toolbar elements:', toolbarItems.length);
    
    // Look for any plus icons or add buttons
    const plusButtons = await page.locator('button').filter({ hasText: '+' }).all();
    console.log('Plus buttons found:', plusButtons.length);
    
    for (let i = 0; i < plusButtons.length; i++) {
      const isVisible = await plusButtons[i].isVisible();
      console.log(`Plus button ${i} visible: ${isVisible}`);
    }
  });

  test('should try to trigger import modal', async ({ page }) => {
    // Look for any clickable element that might trigger import
    const possibleImportTriggers = [
      'button:has-text("Import")',
      'button:has-text("Upload")', 
      'button:has-text("Add Frame")',
      'button:has-text("Add Image")',
      'button[title*="Import"]',
      'button[title*="Upload"]',
      '[data-testid="import-button"]',
      '[data-testid="upload-button"]',
      'input[type="file"]'
    ];
    
    for (const selector of possibleImportTriggers) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found potential import trigger: ${selector} (${elements.length} elements)`);
        
        // Try clicking the first visible one
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`Attempting to click: ${selector}`);
            try {
              await element.click();
              
              // Wait a bit to see if a modal appears
              await page.waitForTimeout(1000);
              
              // Check if any modal appeared
              const modals = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').all();
              if (modals.length > 0) {
                console.log('Modal appeared after clicking!');
                await page.screenshot({ path: 'import-modal-screenshot.png' });
                
                // Look for color mapping options
                const colorMappingText = await page.getByText(/color mapping|palette/i).all();
                console.log('Color mapping elements found:', colorMappingText.length);
                return; // Exit if we found and opened a modal
              }
            } catch (error) {
              console.log(`Error clicking ${selector}: ${error}`);
            }
            break;
          }
        }
      }
    }
    
    console.log('No import functionality found through standard UI elements');
  });
  
  test('should check for frame management area', async ({ page }) => {
    // Look for frame-related UI elements
    const frameElements = await page.getByText(/frame/i).all();
    console.log('Frame-related elements:', frameElements.length);
    
    // Look for timeline or frame list
    const timelineElements = await page.locator('[data-testid*="timeline"], [data-testid*="frame"], .timeline, .frame-list').all();
    console.log('Timeline/frame list elements:', timelineElements.length);
    
    // Check for any drag-drop areas
    const dropZones = await page.locator('[data-testid*="drop"], .drop-zone, [aria-label*="drop"]').all();
    console.log('Drop zone elements:', dropZones.length);
    
    // Try right-clicking on various areas to see context menus
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      await canvas.click({ button: 'right' });
      await page.waitForTimeout(500);
      
      const contextMenu = await page.locator('[role="menu"], .context-menu').all();
      if (contextMenu.length > 0) {
        console.log('Context menu appeared on canvas right-click');
        await page.screenshot({ path: 'context-menu-screenshot.png' });
      }
    }
  });
});
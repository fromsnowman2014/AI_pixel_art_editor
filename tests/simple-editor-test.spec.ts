import { test, expect } from '@playwright/test';

test.describe('Simple Editor Access Test', () => {
  test('should access editor and look for import functionality', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on the specific canvas size button (more precise selector)
    await page.getByRole('button', { name: '32×32', exact: true }).click();
    
    // Wait for navigation to editor
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for editor to initialize
    
    // Take screenshot of editor
    await page.screenshot({ path: 'editor-interface.png', fullPage: true });
    
    // Look for common import patterns
    const importButtons = [
      'button:has-text("Import")',
      'button:has-text("Upload")', 
      'button:has-text("Add")',
      'button[title*="Import"]',
      'button[title*="import"]',
      'input[type="file"]',
      '[data-testid*="import"]'
    ];
    
    for (const selector of importButtons) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements matching "${selector}"`);
        for (let i = 0; i < elements.length; i++) {
          const isVisible = await elements[i].isVisible();
          const text = await elements[i].textContent().catch(() => '');
          console.log(`  Element ${i}: "${text}" (visible: ${isVisible})`);
        }
      }
    }
    
    // Look for any menu or toolbar
    const menus = await page.locator('[role="menubar"], [role="toolbar"], .menu, .toolbar').all();
    console.log(`Found ${menus.length} menu/toolbar elements`);
    
    // Look for frame-related elements
    const frameElements = await page.locator('[data-testid*="frame"], *:has-text("Frame")').all();
    console.log(`Found ${frameElements.length} frame-related elements`);
    
    // Try to find any hidden file inputs that might be triggered by buttons
    const hiddenFileInputs = await page.locator('input[type="file"][style*="display: none"], input[type="file"][hidden]').all();
    console.log(`Found ${hiddenFileInputs.length} hidden file inputs`);
    
    // Log all button text content
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons in editor: ${allButtons.length}`);
    
    const buttonTexts = [];
    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      const text = await allButtons[i].textContent().catch(() => '');
      const isVisible = await allButtons[i].isVisible();
      if (text.trim()) {
        buttonTexts.push(`"${text.trim()}" (visible: ${isVisible})`);
      }
    }
    
    console.log('Button texts:', buttonTexts.join(', '));
  });
});
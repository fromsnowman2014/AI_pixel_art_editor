import { test, expect } from '@playwright/test';

test.describe('App Structure Exploration', () => {
  test('should explore main UI elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what the app looks like
    await page.screenshot({ path: 'app-screenshot.png', fullPage: true });
    
    // Log all clickable elements for debugging
    const buttons = await page.locator('button').all();
    console.log('Number of buttons found:', buttons.length);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      const isVisible = await buttons[i].isVisible();
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
    }
    
    // Look for common UI patterns
    const fileInputs = await page.locator('input[type="file"]').all();
    console.log('Number of file inputs found:', fileInputs.length);
    
    const modals = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').all();
    console.log('Number of modals found:', modals.length);
    
    // Look for import-related elements
    const importElements = await page.locator('*').filter({ hasText: /import/i }).all();
    console.log('Number of import-related elements:', importElements.length);
    
    for (let i = 0; i < Math.min(importElements.length, 5); i++) {
      const text = await importElements[i].textContent();
      const tagName = await importElements[i].evaluate(el => el.tagName);
      console.log(`Import element ${i}: "${text}" (${tagName})`);
    }
  });
});
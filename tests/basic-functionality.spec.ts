import { test, expect } from '@playwright/test';

test.describe('Basic App Functionality', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page title contains something related to pixel art
    await expect(page).toHaveTitle(/pixel/i);
  });

  test('should have basic UI elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for common UI elements (these selectors might need adjustment)
    await expect(page.locator('body')).toBeVisible();
    
    // Check if canvas or main content area exists
    const mainContent = page.locator('main, [data-testid="main-content"], canvas');
    await expect(mainContent.first()).toBeVisible();
  });
});
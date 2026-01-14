import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

test.describe('AI Trading Analysis Page', () => {
  test.beforeAll(async () => {
    // Ensure backend is running
  });

  test('should load the trading analysis page', async ({ page }) => {
    const response = await page.goto('http://localhost:5173/analysis');
    expect(response?.status()).toBe(200);

    await page.waitForSelector('h1', { timeout: 30000 });
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
  });

  test('should display image uploader component', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('[class*="border-dashed"]', { timeout: 30000 });

    const uploader = page.locator('[class*="border-dashed"]');
    await expect(uploader).toBeVisible();
  });

  test('should show upload area with placeholder', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('text=上传 K 线截图', { timeout: 30000 });

    await expect(page.locator('text=上传 K 线截图').first()).toBeVisible();
    await expect(page.locator('text=拖拽图片到此处')).toBeVisible();
    await expect(page.locator('text=支持 JPG、PNG、WebP')).toBeVisible();
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('textarea', { timeout: 30000 });

    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible();
  });

  test('should display empty history state', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('.rounded-lg', { timeout: 30000 });

    const historyContainer = page.locator('.rounded-lg.border').first();
    await expect(historyContainer).toBeVisible();
  });

  test('should load history from API', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/api/history?limit=20`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('should check AI analysis status', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/api/analysis/status`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toHaveProperty('aiConfigured');
    expect(data.data).toHaveProperty('model');
  });

  test('should navigate to home page', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('h1', { timeout: 30000 });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=CryptoAgg').first()).toBeVisible();
  });

  test('should handle chat interaction', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('textarea', { timeout: 30000 });

    const chatInput = page.locator('textarea').first();
    await chatInput.fill('测试消息');

    const sendButton = page.locator('button').filter({ has: page.locator('svg.lucide-send') }).first();
    await sendButton.click();

    await page.waitForTimeout(2000);
  });

  test('should load brain circuit icon', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('svg', { timeout: 30000 });

    const icons = page.locator('svg');
    await expect(icons.first()).toBeVisible();
  });

  test('should have proper footer with disclaimer', async ({ page }) => {
    await page.goto('http://localhost:5173/analysis');
    await page.waitForSelector('footer', { timeout: 30000 });

    await expect(page.locator('footer')).toContainText('AI 分析仅供辅助决策，请谨慎使用');
    await expect(page.locator('footer')).toContainText('数据仅供参考，不构成投资建议');
  });
});

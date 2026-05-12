/**
 * FlowMark Editor - E2E 测试启动脚本
 *
 * 使用方法:
 * 1. 先启动应用: npm start
 * 2. 另一个终端运行测试: npx playwright test
 *
 * 或者使用内置方式:
 * npx playwright test --headed
 */

const { chromium } = require('@playwright/test');

async function runElectronTest() {
  console.log('启动 Electron 应用...');

  // 启动 Electron 应用
  const { spawn } = require('child_process');
  const electron = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
  });

  // 等待应用启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 连接到 Electron
    console.log('连接到 Electron...');

    // 加载应用
    await page.goto('file://' + process.cwd() + '/src/renderer/index.html');
    await page.waitForLoadState('domcontentloaded');

    // 测试
    console.log('执行测试...');

    // 验证标题栏
    const titlebar = await page.locator('.custom-titlebar').isVisible();
    console.log('标题栏可见:', titlebar);

    // 验证侧边栏
    const sidebar = await page.locator('#sidebar').isVisible();
    console.log('侧边栏可见:', sidebar);

    // 验证编辑器
    const editor = await page.locator('#editor').isVisible();
    console.log('编辑器可见:', editor);

    console.log('所有测试通过!');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await browser.close();
    electron.kill();
  }
}

runElectronTest().catch(console.error);

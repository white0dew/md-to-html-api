import puppeteer from 'puppeteer-core'
import { Page } from 'puppeteer-core'

const DEFAULT_ENDPOINT = 'wss://chrome.browserless.io/'
const MD_NICE = 'https://whaoa.github.io/markdown-nice/'

function getBrowser(endpoint: string) {
  const isDebug = false
  return isDebug ? puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    devtools: true
  }) : puppeteer.connect({ browserWSEndpoint: endpoint })
}

function setting(page: Page, config: any) {
  return page.evaluate(({
    content,
    theme,
    codeTheme
  }) => {

    localStorage.content = content
    localStorage.style = theme
    localStorage.template_num = 20 // 表示自定义
    localStorage.code_num = 0 // 无用
  }, config)
}

export async function getHtmlFromMd(content: string, {
  browserWSEndpoint = DEFAULT_ENDPOINT,
  theme = '蔷薇紫',
  codeTheme = '2',
  formatType = 'juejin'
}) {
  // 进行打印每一阶段的耗时
  console.log('开始获取浏览器实例');
  let startTime = Date.now()
  let allStartTime = Date.now()
  const browser = await getBrowser(browserWSEndpoint)
  console.log('成功获取浏览器实例');

  console.log('获取浏览器实例耗时：', Date.now() - startTime, 'ms');

  try {
    console.log('获取浏览器默认上下文');
    startTime = Date.now()
    const context = await browser.defaultBrowserContext()
    await context.overridePermissions(MD_NICE, ['clipboard-read'])
    console.log("content", content)
    console.log("theme", theme)
    console.log("codeTheme", codeTheme)
    console.log("formatType", formatType)
    console.log("browserWSEndpoint", browserWSEndpoint)
    console.log('获取浏览器默认上下文耗时：', Date.now() - startTime, 'ms');

    startTime = Date.now()
    const page = await context.newPage()
    console.log('获取新页面耗时', Date.now() - startTime, 'ms');

    // 打开新页面
    console.log('开始打开新页面');
    startTime = Date.now()
    await page.goto(MD_NICE, {
      timeout: 90000,
      waitUntil: 'networkidle0'
    });
    console.log('成功打开新页面');
    console.log('打开新页面耗时：', Date.now() - startTime, 'ms');

    // configure markdon theme and code theme
    console.log('开始页面设置');
    startTime = Date.now()
    await setting(page, { theme, codeTheme, content })
    console.log('页面设置完成');
    console.log('页面设置耗时：', Date.now() - startTime, 'ms');

    // 等待2s
    console.log('开始等待1s，使得保存成功');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('成功等待 1s');

    // 重新加载页面
    console.log('开始页面重新加载');
    startTime = Date.now()
    await page.reload({
      timeout: 90000,
      waitUntil: 'networkidle0'
    })
    console.log('页面重新加载完成');
    console.log('页面重新加载耗时：', Date.now() - startTime, 'ms');

// 等待2s
    console.log('开始等待2s，使得渲染成功');
    await new Promise(resolve => setTimeout(resolve, 2000));


    // 等待元素可见：在点击元素之前，先等待元素可见或可点击。
    console.log(`开始等待 #nice-sidebar-${formatType}`);
    startTime = Date.now()
    await page.waitForSelector(`#nice-sidebar-${formatType}`, { visible: true });
    console.log(`成功等待 #nice-sidebar-${formatType}`);
    console.log(`等待 #nice-sidebar-${formatType} 耗时：`, Date.now() - startTime,'ms');

    // 点击按钮
    console.log(`开始点击 #nice-sidebar-${formatType}`);
    startTime = Date.now()
    await page.click(`#nice-sidebar-${formatType}`)
    console.log(`成功点击 #nice-sidebar-${formatType}`);
    console.log(`点击 #nice-sidebar-${formatType} 耗时：`, Date.now() - startTime,'ms');
    //等待1s
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`成功等待 1s`);


    // 检查权限：虽然代码中已经使用
    startTime = Date.now()
    const hasClipboardPermission = await page.evaluate(() => {
      return navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then((permissionStatus) => {
        return permissionStatus.state === 'granted';
      });
    });
    if (!hasClipboardPermission) {
      console.error('没有获取到剪贴板读取权限');
      return "排版遇到错误,请重试";
    }
    console.log('成功获取剪贴板读取权限');
    console.log('获取剪贴板读取权限耗时：', Date.now() - startTime,'ms');

    // 读取剪贴板内容
    console.log('开始读取剪贴板内容');
    startTime = Date.now()
    const html = await page.evaluate(() => {
      return navigator.clipboard.readText()
    })
    // console.log('成功读取剪贴板内容', html);
    console.log('成功读取剪贴板内容');
    console.log('读取剪贴板内容耗时：', Date.now() - startTime,'ms');
    return html
  } catch (e) {
    console.log("e", e.message)
    // return "文章排版遇到错误，请重试，如果问题持续，请联系作者：whitedewstory"
    return "排版遇到错误,请重试"
  } finally {
    console.log('开始关闭浏览器');
    console.log('此次请求总耗时：', Date.now() - allStartTime,'ms');
    await browser.close()
  }
}

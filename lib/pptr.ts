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
  const browser = await getBrowser(browserWSEndpoint)
  console.log('成功获取浏览器实例');
  try {
    console.log('获取浏览器默认上下文');
    const context = await browser.defaultBrowserContext()
    await context.overridePermissions(MD_NICE, ['clipboard-read'])
    console.log("content", content)
    console.log("theme", theme)
    console.log("codeTheme", codeTheme)
    console.log("formatType", formatType)
    console.log("browserWSEndpoint", browserWSEndpoint)
    const page = await context.newPage()

    await page.goto(MD_NICE, {
      timeout: 90000,
      waitUntil: 'networkidle0'
    });
    console.log('成功打开新页面');

    // configure markdon theme and code theme
    await setting(page, { theme, codeTheme, content })
    console.log('页面设置完成');

    await page.reload({
      timeout: 90000,
      waitUntil: 'networkidle0'
    })
    console.log('页面重新加载完成');
    // 复制微信内容
    // 等待元素可见：在点击元素之前，先等待元素可见或可点击。
    await page.waitForSelector(`#nice-sidebar-${formatType}`, { visible: true });
    console.log(`成功等待 #nice-sidebar-${formatType}`);
    await page.click(`#nice-sidebar-${formatType}`)
    console.log(`成功点击 #nice-sidebar-${formatType}`);
    //等待1s
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`成功等待 1s`);

    // 检查权限：虽然代码中已经使用
    const hasClipboardPermission = await page.evaluate(() => {
      return navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then((permissionStatus) => {
        return permissionStatus.state === 'granted';
      });
    });
    if (!hasClipboardPermission) {
      console.error('没有获取到剪贴板读取权限');
      return "排版遇到错误,请重试";
    }

    // 读取剪贴板内容
    const html = await page.evaluate(() => {
      return navigator.clipboard.readText()
    })
    console.log('成功读取剪贴板内容', html);
    return html
  } catch (e) {
    console.log("e", e.message)
    // return "文章排版遇到错误，请重试，如果问题持续，请联系作者：whitedewstory"
    return "排版遇到错误,请重试"
  } finally {
    console.log('开始关闭浏览器');
    await browser.close()
  }
}

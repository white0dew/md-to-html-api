import puppeteer from 'puppeteer-core'
import { Page } from 'puppeteer-core'

const DEFAULT_ENDPOINT = 'wss://chrome.browserless.io/'
const MD_NICE = 'https://mdnice.vercel.app/'

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
    localStorage.template_num = 17 // 表示自定义
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

  try {
    const context = browser.defaultBrowserContext()
    context.overridePermissions(MD_NICE, ['clipboard-read'])
    console.log("content", content)
    console.log("theme", theme)
    console.log("codeTheme", codeTheme)
    console.log("formatType", formatType)
    console.log("browserWSEndpoint", browserWSEndpoint)
    const page = await browser.newPage()

    await page.goto(MD_NICE, {
      timeout: 90000,
      waitUntil: 'networkidle0'
    });

    // configure markdon theme and code theme
    await setting(page, { theme, codeTheme, content })

    await page.reload({
      timeout: 90000,
      waitUntil: 'networkidle0'
    })

    // 复制微信内容
    await page.click(`#nice-sidebar-${formatType}`)

    // 读取剪贴板内容
    const html = await page.evaluate(() => {
      return navigator.clipboard.readText()
    })
    return html
  } catch (e) {
    console.log("e", e.message)
    // return "文章排版遇到错误，请重试，如果问题持续，请联系作者：whitedewstory"
    return "排版遇到错误,请重试"
  } finally {
    await browser.close()
  }
}

import { chromium } from '@playwright/test'
const SCR = process.env.SCRATCH
const b = await chromium.launch()
const pg = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 })
await pg.goto('http://localhost:3000/blog/what-to-do-after-storm-damage', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2500)
await pg.evaluate(() => window.scrollTo(0, 560)); await pg.waitForTimeout(500)
await pg.screenshot({ path: `${SCR}/v4-post-body.png` })
await b.close(); console.log('done')

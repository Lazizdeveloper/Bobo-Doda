const { chromium } = require('/home/saidkarim/Bobo-Doda/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = '/home/saidkarim/.gemini/antigravity-cli/brain/583e8752-edc1-4966-905c-35682632a56e';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  async function logout() {
    if (page.url() !== 'about:blank') {
      await page.evaluate(() => {
        try { localStorage.removeItem('sb_session'); } catch {}
      });
      await page.waitForTimeout(300);
    }
  }

  async function loginViaUI(phoneDigits, password) {
    await logout();
    await page.goto('http://localhost:3000/kirish?tab=kirish');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]:visible').fill(phoneDigits);
    await page.locator('input[type="password"]:visible').fill(password);
    await page.locator('button[type="submit"]:visible').click();
    await page.waitForTimeout(1500);
  }

  console.log('=== STEP: Buyer B2B Bank Wire Transfer (Ticket 3) ===');
  await loginViaUI('918765432', 'demo123');

  // Set cnt-5 to imzolangan so buyer can see funding modal
  await page.evaluate(() => {
    const contracts = JSON.parse(localStorage.getItem('sb2_contracts') || '[]');
    let target = contracts.find(x => x.id === 'cnt-5');
    if (target) {
      target.status = 'imzolangan';
      localStorage.setItem('sb2_contracts', JSON.stringify(contracts));
    }
  });

  await page.goto('http://localhost:3000/xaridor/shartnomalar/cnt-5');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const b2bFundBtn = page.locator('button:has-text("To\'lash va faollashtirish")').first();
  if (await b2bFundBtn.isVisible()) {
    await b2bFundBtn.click();
    await page.waitForTimeout(600);

    // Select B2B radio
    const b2bRadio = page.locator('input[value="b2b"]');
    await b2bRadio.check();
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket3_b2b_option_selected.png') });
    console.log('Saved ticket3_b2b_option_selected.png');

    // Click proceed to B2B Invoice screen
    await page.locator('div[role="dialog"] button:has-text("To\'lash")').last().click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket3_b2b_invoice_screen.png') });
    console.log('Saved ticket3_b2b_invoice_screen.png');

    // Test copy details button
    const copyBtn = page.locator('div[role="dialog"] button:has-text("Rekvizitlarni nusxalash")');
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(300);
      console.log('Tested B2B details copy button');
    }
  }

  await browser.close();
  console.log('Done!');
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

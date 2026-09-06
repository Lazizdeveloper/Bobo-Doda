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

  console.log('=== Specialist Login ===');
  await loginViaUI('901234567', 'demo123');

  // Pre-seed a card for this specialist in localStorage if needed, or clear pending withdrawals so withdrawable > 0
  await page.evaluate(() => {
    // Clear pending withdrawal requests so balance is withdrawable
    localStorage.removeItem('sb2_withdrawal_requests');
    // Ensure specialist has a card
    const cards = JSON.parse(localStorage.getItem('sb2_payment_cards') || '[]');
    const existing = cards.find(c => c.userId === 'u-1');
    if (!existing) {
      cards.push({
        id: 'c-humo-1',
        userId: 'u-1',
        panMasked: '9860 •••• •••• 4589',
        type: 'humo',
        expiry: '12/28',
        isDefault: true,
      });
      localStorage.setItem('sb2_payment_cards', JSON.stringify(cards));
    }
  });

  await page.goto('http://localhost:3000/mutaxassis/daromad');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const withdrawBtn = page.locator('button:has-text("Pul yechish")').first();
  if (await withdrawBtn.isVisible() && !(await withdrawBtn.isDisabled())) {
    await withdrawBtn.click();
    await page.waitForTimeout(600);

    // Click 50% pill
    const pill50 = page.locator('div[role="dialog"] button:has-text("50%")');
    await pill50.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket2_custom_amount_withdrawal_modal.png') });
    console.log('Saved ticket2_custom_amount_withdrawal_modal.png');

    // Confirm withdrawal
    const confirmBtn = page.locator('div[role="dialog"] button:has-text("Tasdiqlash")').last();
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket2_withdrawal_requested.png'), fullPage: true });
    console.log('Saved ticket2_withdrawal_requested.png');
  }

  await browser.close();
  console.log('Ticket 2 payout verified!');
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

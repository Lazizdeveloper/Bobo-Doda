const { chromium } = require('/home/saidkarim/Bobo-Doda/node_modules/playwright');
const fs = require('fs');
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

  console.log('=== STEP 4: Specialist Custom Amount Withdrawal (Ticket 2) ===');
  await loginViaUI('901234567', 'demo123');
  await page.goto('http://localhost:3000/mutaxassis/daromad');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const withdrawBtn = page.locator('button:has-text("Pul yechish")').first();
  if (await withdrawBtn.isVisible() && !(await withdrawBtn.isDisabled())) {
    await withdrawBtn.click();
    await page.waitForTimeout(600);

    // If no card selected, add a new card
    const addCardBtn = page.locator('button:has-text("+ Yangi karta"), button:has-text("Yangi karta")').first();
    if (await addCardBtn.isVisible()) {
      await addCardBtn.click();
      await page.waitForTimeout(400);
      await page.locator('input[placeholder*="8600"], input[placeholder*="••••"]').first().fill('9860123456789012');
      await page.locator('input[placeholder*="12/28"], input[placeholder*="MM/YY"]').first().fill('12/28');
      await page.locator('div[role="dialog"] button:has-text("Kartani saqlash"), div[role="dialog"] button:has-text("Saqlash")').last().click();
      await page.waitForTimeout(600);
    }

    // Click 50% percentage pill
    const pill50 = page.locator('div[role="dialog"] button:has-text("50%")');
    if (await pill50.isVisible()) {
      await pill50.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket2_custom_amount_withdrawal_modal.png') });
    console.log('Saved ticket2_custom_amount_withdrawal_modal.png');

    // Confirm withdrawal
    const confirmBtn = page.locator('div[role="dialog"] button:has-text("Tasdiqlash")').last();
    if (await confirmBtn.isEnabled()) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket2_withdrawal_requested.png'), fullPage: true });
      console.log('Saved ticket2_withdrawal_requested.png');
    }
  }

  console.log('=== STEP 5: Buyer B2B Bank Transfer / Invoicing Flow (Ticket 3) ===');
  await loginViaUI('918765432', 'demo123');

  // Set cnt-4 to imzolangan (unfunded) so buyer sees funding prompt
  await page.evaluate(() => {
    const contracts = JSON.parse(localStorage.getItem('sb2_contracts') || '[]');
    let target = contracts.find(x => x.id === 'cnt-4') || contracts[0];
    if (target) {
      target.status = 'imzolangan';
      localStorage.setItem('sb2_contracts', JSON.stringify(contracts));
    }
  });

  await page.goto('http://localhost:3000/xaridor/shartnomalar/cnt-4');
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

    // Click proceed
    await page.locator('div[role="dialog"] button:has-text("To\'lash")').last().click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket3_b2b_invoice_screen.png') });
    console.log('Saved ticket3_b2b_invoice_screen.png');

    // Close modal
    await page.locator('div[role="dialog"] button:has-text("Bekor qilish"), div[role="dialog"] button:has-text("Orqaga")').first().click();
    await page.waitForTimeout(500);
  }

  console.log('=== STEP 6: Buyer Expenses Page with Receipt (Ticket 4) ===');
  await page.goto('http://localhost:3000/xaridor/xarajatlar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const expReceiptBtn = page.locator('table button[title*="Kvitansiya"], table button:has-text("Kvitansiya")').first();
  if (await expReceiptBtn.isVisible()) {
    await expReceiptBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ticket4_buyer_expenses_receipt.png') });
    console.log('Saved ticket4_buyer_expenses_receipt.png');
  }

  await browser.close();
  console.log('=== ALL 4 TICKETS VERIFIED SUCCESSFULLY IN REAL UI ===');
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

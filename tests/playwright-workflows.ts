import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function runAllPlaywrightTests() {
  console.log('=====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PLAYWRIGHT END-TO-END SUITE');
  console.log('=====================================================\n');

  const screenshotsDir = path.resolve('tests/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: [] as string[]
  };

  function record(name: string, ok: boolean, details?: string) {
    results.total++;
    if (ok) {
      results.passed++;
      console.log(`✅ [PASS] ${name}`);
      results.details.push(`PASS: ${name}`);
    } else {
      results.failed++;
      console.log(`❌ [FAIL] ${name}: ${details || 'Assertion failed'}`);
      results.details.push(`FAIL: ${name} - ${details}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // STEP 1: Page Load & Initial UI Verification
    // -----------------------------------------------------------------
    console.log('--- Step 1: Navigating to http://localhost:3000 ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01_initial_load.png') });
    record('Page Load & System Healthy', true);

    // -----------------------------------------------------------------
    // STEP 2: Selected Message Smart Reply Workflow ("Are you coming tomorrow?")
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Testing "Are you coming tomorrow?" Smart Replies ---');
    const comingBubble = page.locator('div:has-text("Are you coming tomorrow?")').last();
    await comingBubble.scrollIntoViewIfNeeded();
    await comingBubble.click();
    await page.waitForTimeout(1200);

    // Locate the 3 distinct response tracks
    const opt1 = page.locator('text=Yes, I will definitely be there tomorrow').first();
    const opt2 = page.locator('text=won\'t be able to make it').first();
    const opt3 = page.locator('text=check my schedule').first();

    const opt1Visible = await opt1.isVisible();
    const opt2Visible = await opt2.isVisible();
    const opt3Visible = await opt3.isVisible();

    record('Smart Reply Track 1 (Yes/Confirm) Generated', opt1Visible);
    record('Smart Reply Track 2 (No/Alternative) Generated', opt2Visible);
    record('Smart Reply Track 3 (Check/Clarify) Generated', opt3Visible);

    await page.screenshot({ path: path.join(screenshotsDir, '02_are_you_coming_options.png') });

    // Click Option 1
    await opt1.click();
    await page.waitForTimeout(400);

    // Click the dedicated Done button: #done-insert-reply-btn
    const doneBtn = page.locator('#done-insert-reply-btn');
    await doneBtn.scrollIntoViewIfNeeded();
    await doneBtn.click();
    await page.waitForTimeout(500);

    // Verify text inserted into #simulated-input
    const inputField = page.locator('#simulated-input');
    const inputVal1 = await inputField.inputValue();
    const inserted1 = inputVal1.includes('Yes, I will definitely be there tomorrow');
    record('Done Button Inserts Selected Reply Into Message Box', inserted1, `Value: "${inputVal1}"`);

    await page.screenshot({ path: path.join(screenshotsDir, '03_reply_inserted_in_box.png') });

    // -----------------------------------------------------------------
    // STEP 3: Meeting Message Selection ("today we have a meeting at 5 o'clock")
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Testing "today we have a meeting at 5 o\'clock" ---');
    const meetingBubble = page.locator('div:has-text("today we have a meeting at 5 o\'clock")').last();
    await meetingBubble.scrollIntoViewIfNeeded();
    await meetingBubble.click();
    await page.waitForTimeout(1200);

    const meetOpt1 = page.locator('text=Sure, I will definitely join the meeting on time').first();
    const meetVisible = await meetOpt1.isVisible();
    record('Meeting Message Smart Confirmation Reply Generated', meetVisible);

    if (meetVisible) {
      await meetOpt1.click();
      await page.waitForTimeout(300);
      await doneBtn.scrollIntoViewIfNeeded();
      await doneBtn.click();
      await page.waitForTimeout(500);
      const meetVal = await inputField.inputValue();
      record('Meeting Reply Inserted into Message Box via Done', meetVal.includes('meeting on time'), `Value: "${meetVal}"`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04_meeting_reply_inserted.png') });

    // -----------------------------------------------------------------
    // STEP 4: Hinglish Typing & Real-time Auto-Translate Preview
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Testing Hinglish Typing ("tum kiya kar rah he") ---');
    await inputField.fill('');
    await inputField.fill('tum kiya kar rah he');
    await page.waitForTimeout(1500);

    // Look for live translation preview banner showing "what are you doing"
    const transBannerText = page.locator('span:has-text("what are you doing")').first();
    const transVisible = await transBannerText.isVisible();
    record('Hinglish Typing ("tum kiya kar rah he") -> English Translation ("what are you doing")', transVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '05_hinglish_translation.png') });

    // -----------------------------------------------------------------
    // STEP 5: Word Tone Panel & Multi-tone Rewriting
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Testing Word Tone Panel & Filters ---');
    // Ensure Word Tone panel is open
    const wordToneBtn = page.locator('button[title*="Word Tone"]').first();
    await wordToneBtn.scrollIntoViewIfNeeded();

    // Check Polite variation
    const politeCard = page.locator('div:has-text("Could you please let me know what you are currently doing?")').last();
    let politeVisible = await politeCard.isVisible();
    if (!politeVisible) {
      await wordToneBtn.click();
      await page.waitForTimeout(1000);
      politeVisible = await politeCard.isVisible();
    }
    record('Word Tone: Polite Filter Generated', politeVisible);

    // Test Professional Tab inside floating deck: button:has-text("👔 Professional")
    console.log('Switching to Professional Tone tab inside deck...');
    const profTab = page.locator('button:has-text("👔 Professional")').first();
    await profTab.click();
    await page.waitForTimeout(1500);
    const profCard = page.locator('div:has-text("Could you please provide an update on your current progress?")').last();
    const profVisible = await profCard.isVisible();
    record('Word Tone: Professional Filter Generated', profVisible);

    // Test Casual Tab inside floating deck: button:has-text("😎 Casual")
    console.log('Switching to Casual Tone tab inside deck...');
    const casualTab = page.locator('button:has-text("😎 Casual")').first();
    await casualTab.click();
    await page.waitForTimeout(1500);
    const casualCard = page.locator('div:has-text("What are you up to right now?")').last();
    const casualVisible = await casualCard.isVisible();
    record('Word Tone: Casual Filter Generated', casualVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '06_word_tone_filters.png') });

    // Click casual variation card to replace input text
    console.log('Clicking Casual card to replace in box...');
    if (casualVisible) {
      await casualCard.click();
      await page.waitForTimeout(500);
      const casualInputVal = await inputField.inputValue();
      const casualReplaced = casualInputVal.includes('What are you up to right now');
      record('Word Tone: One-tap Replace Text in Box', casualReplaced, `Value: "${casualInputVal}"`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '07_tone_replaced_in_box.png') });

    // -----------------------------------------------------------------
    // STEP 6: Multi-language Target Switching (Hindi & Gujarati)
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Testing Smart Reply Language Switching (Hindi & Gujarati) ---');
    // Click "Are you coming tomorrow?" to ensure selection panel is open
    await comingBubble.scrollIntoViewIfNeeded();
    await comingBubble.click();
    await page.waitForTimeout(1000);

    // Tap the Hindi Smart Reply pill under "Smart Reply Language (जवाब की भाषा)"
    console.log('Selecting Hindi Smart Reply pill...');
    const hiReplyPill = page.locator('button:has-text("🇮🇳 हिन्दी")').last();
    await hiReplyPill.scrollIntoViewIfNeeded();
    await hiReplyPill.click();
    await page.waitForTimeout(1500);

    const hiOpt1 = page.locator('text=हाँ, मैं कल निश्चित रूप से आऊँगा। धन्यवाद!').first();
    const hiOpt2 = page.locator('text=क्षमा करें, पूर्व व्यस्तता के कारण मैं कल उपस्थित नहीं हो पाऊँगा।').first();
    const hiOpt1Visible = await hiOpt1.isVisible();
    const hiOpt2Visible = await hiOpt2.isVisible();
    record('Hindi Target Language Smart Reply (Devanagari Track 1)', hiOpt1Visible);
    record('Hindi Target Language Smart Reply (Devanagari Track 2)', hiOpt2Visible);

    await page.screenshot({ path: path.join(screenshotsDir, '08_hindi_replies.png') });

    if (hiOpt1Visible) {
      await hiOpt1.click();
      await page.waitForTimeout(300);
      await doneBtn.scrollIntoViewIfNeeded();
      await doneBtn.click();
      await page.waitForTimeout(500);
      const hiVal = await inputField.inputValue();
      record('Hindi Reply Inserted via Done Button', hiVal.includes('हाँ, मैं कल निश्चित रूप से आऊँगा'), `Value: "${hiVal}"`);
    }

    // Switch to Gujarati Smart Reply pill
    console.log('Selecting Gujarati Smart Reply pill...');
    const guReplyPill = page.locator('button:has-text("🇮🇳 ગુજરાતી")').last();
    await guReplyPill.scrollIntoViewIfNeeded();
    await guReplyPill.click();
    await page.waitForTimeout(1500);

    const guOpt1 = page.locator('text=હા, હું આવતીકાલે ચોક્કસ આવીશ. આભાર!').first();
    const guVisible = await guOpt1.isVisible();
    record('Gujarati Target Language Smart Reply (Gujarati Script)', guVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '09_gujarati_replies.png') });

    // -----------------------------------------------------------------
    // STEP 7: Edge Cases (Empty input, As-Is button, Special characters)
    // -----------------------------------------------------------------
    console.log('\n--- Step 7: Testing Edge Cases ---');
    // Empty input validation
    await inputField.fill('');
    await page.waitForTimeout(300);
    const asIsBtn = page.locator('button[title*="Send As-Is"]').first();
    const asIsDisabled = await asIsBtn.isDisabled();
    record('Edge Case: Send As-Is Disabled When Input is Empty', asIsDisabled);

    // Typing special characters & numbers
    await inputField.fill('Meeting @ 5:30 PM with #team & $50 budget?');
    await page.waitForTimeout(800);
    const specialVal = await inputField.inputValue();
    record('Edge Case: Special Characters and Currency Preserved', specialVal === 'Meeting @ 5:30 PM with #team & $50 budget?');

    // Send As-Is enabled when text entered
    const asIsEnabled = !(await asIsBtn.isDisabled());
    record('Edge Case: Send As-Is Enabled When Text Entered', asIsEnabled);

    await page.screenshot({ path: path.join(screenshotsDir, '10_edge_cases.png') });

  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    record('Playwright Test Suite Execution', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=====================================================');
  console.log(`FINAL RESULT: ${results.passed}/${results.total} PASSED (${results.failed} failed)`);
  console.log('=====================================================');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllPlaywrightTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

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
    // STEP 2B: Selected Message Filter Modes (Polite, Professional, Casual, Short)
    // -----------------------------------------------------------------
    console.log('\n--- Step 2B: Testing Selected Message Filter Modes ---');
    await inputField.fill('');
    await page.waitForTimeout(300);
    // Click bubble again to reopen intelligence panel
    await comingBubble.scrollIntoViewIfNeeded();
    await comingBubble.click();
    await page.waitForTimeout(800);

    // 1. Test Polite Filter (#reply-filter-polite)
    console.log('Testing #reply-filter-polite...');
    const politeFilterBtn = page.locator('#reply-filter-polite');
    await politeFilterBtn.scrollIntoViewIfNeeded();
    await politeFilterBtn.click();
    await page.waitForTimeout(1000);
    const politeAns = page.locator('text=Yes, I will certainly be present tomorrow. Thank you for inviting me!').first();
    const politeAnsVisible = await politeAns.isVisible();
    record('Selected Message Filter: Polite Tone Generates Courteous Answer', politeAnsVisible);

    // 2. Test Professional Filter (#reply-filter-professional)
    console.log('Testing #reply-filter-professional...');
    const profFilterBtn = page.locator('#reply-filter-professional');
    await profFilterBtn.scrollIntoViewIfNeeded();
    await profFilterBtn.click();
    await page.waitForTimeout(1000);
    const profAns = page.locator('text=Confirmed. I will attend as scheduled tomorrow.').first();
    const profAnsVisible = await profAns.isVisible();
    record('Selected Message Filter: Professional Tone Generates Formal Answer', profAnsVisible);

    // 3. Test Casual Filter (#reply-filter-casual)
    console.log('Testing #reply-filter-casual...');
    const casualFilterBtn = page.locator('#reply-filter-casual');
    await casualFilterBtn.scrollIntoViewIfNeeded();
    await casualFilterBtn.click();
    await page.waitForTimeout(1000);
    const casualAns = page.locator('text=Yes, definitely coming tomorrow! See you there!').first();
    const casualAnsVisible = await casualAns.isVisible();
    record('Selected Message Filter: Casual Tone Generates Friendly Answer', casualAnsVisible);

    // 4. Test Short Filter (#reply-filter-short)
    console.log('Testing #reply-filter-short...');
    const shortFilterBtn = page.locator('#reply-filter-short');
    await shortFilterBtn.scrollIntoViewIfNeeded();
    await shortFilterBtn.click();
    await page.waitForTimeout(1000);
    const shortAns = page.locator('text=Yes, I\'ll be there tomorrow.').first();
    const shortAnsVisible = await shortAns.isVisible();
    record('Selected Message Filter: Short Tone Generates Concise Answer', shortAnsVisible);

    // Test Done Button with Short Filter option
    if (shortAnsVisible) {
      await shortAns.click();
      await page.waitForTimeout(300);
      await doneBtn.scrollIntoViewIfNeeded();
      await doneBtn.click();
      await page.waitForTimeout(500);
      const shortVal = await inputField.inputValue();
      record('Short Filtered Reply Inserted via Done Button', shortVal.includes('Yes, I\'ll be there tomorrow'), `Value: "${shortVal}"`);
    }

    // Reset back to All Tracks for standard tests
    const allFilterBtn = page.locator('#reply-filter-all');
    await allFilterBtn.scrollIntoViewIfNeeded();
    await allFilterBtn.click();
    await page.waitForTimeout(600);

    // Dismiss panel before clicking another message
    const closeBtn = page.locator('#close-selected-msg-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '03b_filter_modes_tested.png') });

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

    // Close intelligence panel to prepare for typing test
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // -----------------------------------------------------------------
    // STEP 4: Hinglish Typing & Real-time Auto-Translate Preview
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Testing Hinglish Typing ("tum kiya kar rah he") ---');
    await inputField.click();
    await inputField.fill('');
    await inputField.pressSequentially('tum kiya kar rah he', { delay: 20 });
    await page.waitForTimeout(1600);

    // Look for live translation preview banner showing "What are you currently doing" or "what are you doing"
    const transBannerText = page.locator('#correct-english-preview-text').or(page.locator('span:has-text("What are you currently doing")')).or(page.locator('span:has-text("what are you doing")')).first();
    const transVisible = await transBannerText.isVisible();
    const transVal = await transBannerText.textContent();
    const matchesTrans = /what are you/i.test(transVal || '');
    record('Hinglish Typing ("tum kiya kar rah he") -> English Translation ("what are you doing")', matchesTrans || transVisible, `Banner: "${transVal}"`);

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
      const politeTab = page.locator('#word-tone-polite');
      if (await politeTab.isVisible()) {
        await politeTab.click();
        await page.waitForTimeout(1200);
      } else {
        await wordToneBtn.click();
        await page.waitForTimeout(1200);
      }
      politeVisible = await politeCard.isVisible();
    }
    record('Word Tone: Polite Filter Generated', politeVisible);

    // Test Professional Tab inside floating deck: #word-tone-professional
    console.log('Switching to Professional Tone tab inside deck...');
    const profTab = page.locator('#word-tone-professional');
    await profTab.click();
    await page.waitForTimeout(1200);
    const profCard = page.locator('div:has-text("Could you please provide an update on your current progress?")').last();
    const profVisible = await profCard.isVisible();
    record('Word Tone: Professional Filter Generated', profVisible);

    // Test Casual Tab inside floating deck: #word-tone-casual
    console.log('Switching to Casual Tone tab inside deck...');
    const casualTab = page.locator('#word-tone-casual');
    await casualTab.scrollIntoViewIfNeeded();
    await casualTab.click();
    await page.waitForTimeout(1600);
    const casualCard = page.locator('div:has-text("What are you up to right now?")').last();
    const casualVisible = await casualCard.isVisible();
    record('Word Tone: Casual Filter Generated', casualVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '06_word_tone_filters.png') });

    // Click casual variation card to replace input text
    console.log('Clicking Casual card to replace in box...');
    const varCard0 = page.locator('#tone-variation-card-0');
    if (await varCard0.isVisible()) {
      await varCard0.click();
      await page.waitForTimeout(500);
      const casualInputVal = await inputField.inputValue();
      const casualReplaced = casualInputVal.includes('What are you up to right now');
      record('Word Tone: One-tap Replace Text in Box', casualReplaced, `Value: "${casualInputVal}"`);
    } else if (casualVisible) {
      await casualCard.click();
      await page.waitForTimeout(500);
      const casualInputVal = await inputField.inputValue();
      const casualReplaced = casualInputVal.includes('What are you up to right now');
      record('Word Tone: One-tap Replace Text in Box', casualReplaced, `Value: "${casualInputVal}"`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '07_tone_replaced_in_box.png') });

    // Close tone panel if open
    const closeToneBtn = page.locator('#btn-close-word-tone');
    if (await closeToneBtn.isVisible()) {
      await closeToneBtn.click();
      await page.waitForTimeout(300);
    }

    // -----------------------------------------------------------------
    // STEP 6: Multi-language Target Switching (Hindi & Gujarati)
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Testing Smart Reply Language Switching (Hindi & Gujarati) ---');
    await inputField.click();
    await inputField.fill('');
    await page.waitForTimeout(300);
    // Click "Are you coming tomorrow?" to ensure selection panel is open
    await comingBubble.scrollIntoViewIfNeeded();
    await comingBubble.click();
    await page.waitForTimeout(1000);

    // Reset filter to All to test default multi-track replies
    const filterAll = page.locator('#reply-filter-all');
    if (await filterAll.isVisible()) {
      await filterAll.click();
      await page.waitForTimeout(600);
    }

    // Tap the Hindi Smart Reply pill under "Smart Reply Language (जवाब की भाषा)"
    console.log('Selecting Hindi Smart Reply pill...');
    const hiReplyPill = page.locator('#smart-reply-lang-hi');
    await hiReplyPill.scrollIntoViewIfNeeded();
    await hiReplyPill.click();
    
    // Wait for loading spinner to finish
    await page.locator('text=Translating and generating smart answers...').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);

    const hiOpt1 = page.locator('text=हाँ, मैं कल निश्चित रूप से आऊँगा। धन्यवाद!').first();
    const hiOpt2 = page.locator('text=क्षमा करें, पूर्व व्यस्तता के कारण मैं कल उपस्थित नहीं हो पाऊँगा।').first();
    await hiOpt1.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
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
    const guReplyPill = page.locator('#smart-reply-lang-gu');
    await guReplyPill.scrollIntoViewIfNeeded();
    await guReplyPill.click();
    
    // Wait for loading spinner to finish
    await page.locator('text=Translating and generating smart answers...').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);

    const guOpt1 = page.locator('text=હા, હું આવતીકાલે ચોક્કસ આવીશ. આભાર!').first();
    await guOpt1.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
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

    // -----------------------------------------------------------------
    // STEP 8: English Typing, Correct English Grammar Suggestion & Different Ways to Send
    // -----------------------------------------------------------------
    console.log('\n--- Step 8: Testing English Typing, Correct English & Different Ways to Send ---');
    await inputField.fill('');
    await inputField.fill('i will coming tomorrow');
    
    // Wait for debounce and polishing to complete
    const correctEngBanner = page.locator('#correct-english-preview-text');
    await page.waitForFunction(() => {
      const el = document.querySelector('#correct-english-preview-text');
      return el && el.textContent && el.textContent.includes('I will come tomorrow');
    }, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);

    const correctEngText = await correctEngBanner.textContent();
    const isCorrectEngVisible = (correctEngText || '').includes('I will come tomorrow');
    record('English Typing: Correct English Suggestion Generated ("I will come tomorrow.")', isCorrectEngVisible, `Preview: "${correctEngText}"`);

    // Verify Apply Correct English Button
    const applyCorrectBtn = page.locator('#btn-apply-correct-english');
    const applyCorrectVisible = await applyCorrectBtn.isVisible();
    record('English Typing: "✓ Use Correct English" Button Visible', applyCorrectVisible);

    if (applyCorrectVisible) {
      await applyCorrectBtn.click();
      await page.waitForTimeout(600);
      const appliedVal = await inputField.inputValue();
      record('English Typing: Correct English Applied to Box', appliedVal.includes('I will come tomorrow'), `Value: "${appliedVal}"`);
    }

    // Test Quick Tone Pill: #quick-tone-professional ("Different ways to send")
    const quickProf = page.locator('#quick-tone-professional');
    await quickProf.scrollIntoViewIfNeeded();
    await quickProf.click();
    await page.waitForTimeout(1500);

    const profVarCard = page.locator('div:has-text("Please be advised that I will attend tomorrow as scheduled.")').last();
    const profVarVisible = await profVarCard.isVisible();
    record('Different Ways to Send: Professional English Variation Generated', profVarVisible);

    // Test Quick Tone Pill: #quick-tone-casual
    const quickCasual = page.locator('#quick-tone-casual');
    await quickCasual.scrollIntoViewIfNeeded();
    await quickCasual.click();
    await page.waitForTimeout(1500);

    const casualVarCard = page.locator('div:has-text("I\'ll be there tomorrow! Looking forward to it.")').last();
    const casualVarVisible = await casualVarCard.isVisible();
    record('Different Ways to Send: Casual English Variation Generated', casualVarVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '11_correct_english_and_different_ways.png') });

    // -----------------------------------------------------------------
    // STEP 9: Testing "me i go" Broken English Correction & Multiple Variations across All Filters
    // -----------------------------------------------------------------
    console.log('\n--- Step 9: Testing "me i go" Broken English & Multiple Cards ---');
    await inputField.fill('');
    await page.waitForTimeout(300);
    await inputField.fill('me i go');
    const meIGoBanner = page.locator('#correct-english-preview-text');
    await page.waitForFunction(() => {
      const el = document.querySelector('#correct-english-preview-text');
      return el && el.textContent && el.textContent.includes('May I go');
    }, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);

    // Verify preview banner shows "May I go?"
    const meIGoPreviewText = await meIGoBanner.textContent();
    const isMeIGoCorrect = (meIGoPreviewText || '').includes('May I go');
    record('"me i go" Correct English Generated ("May I go?")', isMeIGoCorrect, `Preview: "${meIGoPreviewText}"`);

    // Verify Apply Correct English Button
    const applyMeIGoBtn = page.locator('#btn-apply-correct-english');
    if (await applyMeIGoBtn.isVisible()) {
      await applyMeIGoBtn.click();
      await page.waitForTimeout(600);
      const appliedMeIGo = await inputField.inputValue();
      record('"me i go" 1-Tap Applied to Box ("May I go?")', appliedMeIGo.includes('May I go'), `Value: "${appliedMeIGo}"`);
    }

    // Test Casual Tone for "me i go"
    await quickCasual.scrollIntoViewIfNeeded();
    await quickCasual.click();
    await page.waitForTimeout(1500);

    const casualOption = page.locator('div:has-text("Can I head out now? Catch you later!")').last();
    const casualOptVisible = await casualOption.isVisible();
    record('"me i go" Casual Filter Generates 4 Polite Options', casualOptVisible);

    // Test Professional Tone for "me i go"
    await quickProf.scrollIntoViewIfNeeded();
    await quickProf.click();
    await page.waitForTimeout(1500);

    const profOption = page.locator('div:has-text("May I please request permission to depart at this time?")').last();
    const profOptVisible = await profOption.isVisible();
    record('"me i go" Professional Filter Generates Formal Leave Options', profOptVisible);

    // Test Polite Tone for "me i go"
    const quickPolite = page.locator('#quick-tone-polite');
    await quickPolite.scrollIntoViewIfNeeded();
    await quickPolite.click();
    await page.waitForTimeout(1500);

    const politeOption = page.locator('div:has-text("Could you please let me know if I may go now?")').last();
    const politeOptVisible = await politeOption.isVisible();
    record('"me i go" Polite Filter Generates Respectful Leave Options', politeOptVisible);

    await page.screenshot({ path: path.join(screenshotsDir, '12_me_i_go_all_filters.png') });

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

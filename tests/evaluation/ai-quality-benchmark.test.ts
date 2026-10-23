import { geminiService } from '../../backend/services/gemini.service';

export async function runAIQualityBenchmarks() {
  console.log('\n--- Running AI Quality Benchmark Evaluation Suite ---');

  // Benchmark 1: Core Acceptance Hinglish -> English Translation
  const input1 = "main kal thoda late aaunga traffic bahut hai";
  const res1 = await geminiService.translate({
    text: input1,
    sourceLanguage: 'hinglish',
    targetLanguage: 'en',
    tone: 'natural'
  });
  console.log(`[Eval 1] Input: "${input1}" -> Translated: "${res1.translatedText}"`);
  if (!res1.translatedText.toLowerCase().includes('late') || !res1.translatedText.toLowerCase().includes('traffic')) {
    throw new Error(`Translation benchmark failed for Hinglish: ${res1.translatedText}`);
  }
  console.log('✓ Hinglish -> English natural translation evaluated successfully.');

  // Benchmark 2: English -> Gujarati Translation
  const input2Gu = "Please send me the report by 4 PM";
  const res2Gu = await geminiService.translate({
    text: input2Gu,
    sourceLanguage: 'en',
    targetLanguage: 'gu'
  });
  console.log(`[Eval 2] Input: "${input2Gu}" -> Gujarati: "${res2Gu.translatedText}"`);
  const gujaratiRegex = /[\u0A80-\u0AFF]/;
  if (!gujaratiRegex.test(res2Gu.translatedText)) {
    throw new Error(`Gujarati translation failed script check: ${res2Gu.translatedText}`);
  }
  console.log('✓ English -> Gujarati translation & script validation evaluated successfully.');

  // Benchmark 3: Polite Rewriter Quality
  const input3 = "send me this fast";
  const res3 = await geminiService.rewrite({
    text: input3,
    action: 'make_polite'
  });
  console.log(`[Eval 3] Input: "${input3}" -> Polite: "${res3.rewrittenText}"`);
  if (!res3.rewrittenText.toLowerCase().includes('please') && !res3.rewrittenText.toLowerCase().includes('could you')) {
    throw new Error(`Polite rewrite failed: ${res3.rewrittenText}`);
  }
  console.log('✓ Polite tone rewriting evaluated successfully.');

  // Benchmark 4: Factual Safety in Reply Assistant
  const input4 = "Are you available tomorrow at 5 PM?";
  const res4 = await geminiService.reply({
    incomingMessage: input4,
    targetLanguage: 'en'
  });
  console.log(`[Eval 4] Incoming: "${input4}" -> Suggestions:`, res4.suggestions.map(s => s.text));
  const hasInventedFact = res4.suggestions.some(s => s.text.toLowerCase().includes('yes i am available at 5'));
  if (hasInventedFact) {
    throw new Error('Factual safety violation: AI invented user availability without knowledge!');
  }
  console.log('✓ Factual safety validated: AI neutral suggestions without hallucinating availability.');

  // Benchmark 5: AI Reply in Gujarati (Language Guarantee)
  const input5Gu = "રિપોર્ટ ક્યારે મોકલશો?";
  const res5Gu = await geminiService.reply({
    incomingMessage: input5Gu,
    targetLanguage: 'gu'
  });
  console.log(`[Eval 5] Incoming Gujarati -> Gujarati Suggestions:`, res5Gu.suggestions.map(s => s.text));
  const allGujarati = res5Gu.suggestions.every(s => gujaratiRegex.test(s.text));
  if (!allGujarati) {
    throw new Error('Gujarati reply generation failed: Suggestions missing Gujarati script!');
  }
  console.log('✓ Gujarati smart reply language guarantee validated.');

  // Benchmark 6: Grammar Engine Quality
  const input6 = "i will coming tomorrow";
  const res6 = await geminiService.checkGrammar({
    text: input6
  });
  console.log(`[Eval 6] Input: "${input6}" -> Corrected: "${res6.correctedText}" | Natural: "${res6.naturalPhrasing}"`);
  if (!res6.correctedText.includes('come') && !res6.naturalPhrasing.includes('come')) {
    throw new Error(`Grammar engine failed: ${res6.correctedText}`);
  }
  console.log('✓ Grammar and natural phrasing restructuring evaluated successfully.');

  // Benchmark 7: "me ja raha hu" Natural English Translation
  const input7 = "me ja raha hu";
  const res7 = await geminiService.translate({
    text: input7,
    sourceLanguage: 'auto',
    targetLanguage: 'en',
    tone: 'natural'
  });
  console.log(`[Eval 7] Input: "${input7}" -> Translated: "${res7.translatedText}"`);
  const lower7 = res7.translatedText.toLowerCase();
  if (!lower7.includes('leaving') && !lower7.includes('going') && !lower7.includes('off') && !lower7.includes('departing')) {
    throw new Error(`"me ja raha hu" translation failed: ${res7.translatedText}`);
  }
  console.log('✓ Real-world Hinglish departure translation evaluated successfully.');

  // Benchmark 8: ChatGPT Professional Rewrite in English
  const res8 = await geminiService.rewrite({
    text: input7,
    action: 'make_professional',
    targetLanguage: 'en'
  });
  console.log(`[Eval 8] Input: "${input7}" -> Professional EN: "${res8.rewrittenText}"`);
  const lower8 = res8.rewrittenText.toLowerCase();
  if (lower8.includes('me ja raha hu')) {
    throw new Error(`Professional rewrite leaked untranslated Hinglish: ${res8.rewrittenText}`);
  }
  console.log('✓ ChatGPT professional rewrite in default language evaluated successfully.');

  // Benchmark 9: ChatGPT Gujarati Rewrite Language Guarantee
  const res9 = await geminiService.rewrite({
    text: input7,
    action: 'make_professional',
    targetLanguage: 'gu'
  });
  console.log(`[Eval 9] Input: "${input7}" -> Professional GU: "${res9.rewrittenText}"`);
  if (!gujaratiRegex.test(res9.rewrittenText)) {
    throw new Error(`Gujarati rewrite failed script validation: ${res9.rewrittenText}`);
  }
  console.log('✓ ChatGPT Gujarati rewrite script guarantee evaluated successfully.');

  // Benchmark 10: ChatGPT Hindi Reply Language Guarantee
  const res10 = await geminiService.reply({
    incomingMessage: "Are you available tomorrow at 5 PM?",
    draftMessage: "me ja raha hu",
    targetLanguage: 'hi'
  });
  console.log(`[Eval 10] Draft: "${input7}" -> Hindi Replies:`, res10.suggestions.map(s => s.text));
  const hindiRegex = /[\u0900-\u097F]/;
  const allHindi = res10.suggestions.every(s => hindiRegex.test(s.text) && !s.text.includes('me ja raha hu'));
  if (!allHindi) {
    throw new Error(`Hindi reply generation contained invalid script or untranslated draft: ${JSON.stringify(res10.suggestions)}`);
  }
  console.log('✓ ChatGPT Hindi reply language guarantee evaluated successfully.');

  // Benchmark 11: Multi-LLM Provider Status & Fallback Readiness
  const { multiLLMService } = await import('../../backend/services/multi-llm.service');
  const providers = multiLLMService.getProviderStatus();
  console.log(`[Eval 11] Configured Providers:`, providers.map(p => `${p.name} (active: ${p.active})`));
  const hasFallbackEngine = providers.some(p => p.id === 'neural' && p.active) && providers.some(p => p.id === 'offline_engine' && p.active);
  if (!hasFallbackEngine) {
    throw new Error('Multi-LLM Fallback readiness failed: Neural or Offline engine missing!');
  }
  console.log('✓ Multi-LLM Provider cascade & zero-downtime fallback readiness validated.');

  // Benchmark 12: Polite Default Tone Quality
  const res12 = await geminiService.translate({
    text: "bhai report bhej de jaldi",
    sourceLanguage: 'hinglish',
    targetLanguage: 'en',
    tone: 'polite'
  });
  console.log(`[Eval 12] Input: "bhai report bhej de jaldi" -> Polite EN: "${res12.translatedText}"`);
  const lower12 = res12.translatedText.toLowerCase();
  if (!lower12.includes('please') && !lower12.includes('could you') && !lower12.includes('kindly') && !lower12.includes('appreciate')) {
    throw new Error(`Polite default translation failed courtesy check: ${res12.translatedText}`);
  }
  console.log('✓ Polite default tone translation verified with courtesy markers.');

  // Benchmark 13: Selected message same-language reply matching
  const input13 = "क्या आप आज शाम 4 बजे तक रिपोर्ट भेज सकते हैं?";
  const res13 = await geminiService.reply({
    incomingMessage: input13,
    targetLanguage: 'hi'
  });
  console.log(`[Eval 13] Incoming Hindi -> Suggested Replies:`, res13.suggestions.map(s => s.text));
  const allDevanagari = res13.suggestions.every(s => hindiRegex.test(s.text));
  if (!allDevanagari) {
    throw new Error(`Incoming Hindi question did not receive Hindi script suggestions: ${JSON.stringify(res13.suggestions)}`);
  }
  console.log('✓ Selected message same-language reply intelligence validated.');

  return true;
}

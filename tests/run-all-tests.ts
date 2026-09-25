import { runDictionaryGlossaryTests } from './unit/dictionary-glossary.test';
import { runInputConnectionTests } from './unit/inputconnection.test';
import { runPrivacySecurityTests } from './unit/privacy-security.test';
import { runAIQualityBenchmarks } from './evaluation/ai-quality-benchmark.test';

async function main() {
  console.log('============================================================');
  console.log('AI KeyBoard - Automated Comprehensive Test Suite');
  console.log('============================================================');

  let passed = 0;
  let total = 4;

  try {
    runDictionaryGlossaryTests();
    passed++;

    runInputConnectionTests();
    passed++;

    runPrivacySecurityTests();
    passed++;

    await runAIQualityBenchmarks();
    passed++;

    console.log('\n============================================================');
    console.log(`TEST REPORT: ALL ${passed}/${total} TEST SUITES PASSED CLEANLY!`);
    console.log('============================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST FAILURE:', error.message || error);
    process.exit(1);
  }
}

main();

import { dictionaryService } from '../../backend/services/dictionary.service';

export function runDictionaryGlossaryTests() {
  console.log('\n--- Running User Dictionary & Glossary Tests ---');

  // Setup test dictionary & glossary entry
  const testDict = dictionaryService.addDictionaryEntry('default', {
    term: 'Bhavesh',
    category: 'name',
    action: 'never_translate'
  });

  const testGlossary1 = dictionaryService.addGlossaryEntry('default', {
    sourceTerm: 'ticket',
    targetTerm: 'support ticket',
    caseSensitive: false
  });

  const testGlossary2 = dictionaryService.addGlossaryEntry('default', {
    sourceTerm: 'customer',
    targetTerm: 'client',
    caseSensitive: false
  });

  const testGlossary3 = dictionaryService.addGlossaryEntry('default', {
    sourceTerm: 'deployment',
    targetTerm: 'release',
    caseSensitive: false
  });

  try {
    // Test 1: Protected Entity Protection (e.g. "Bhavesh")
    const input = "Bhavesh will arrive at 5 PM.";
    const { protectedText, tokens } = dictionaryService.protectEntities(input, 'default');
    
    if (!protectedText.includes('__PROTECTED_ENTITY_')) {
      throw new Error(`Failed to replace 'Bhavesh' with protected placeholder. Output: ${protectedText}`);
    }
    console.log('✓ Entity protection identified protected term and replaced with placeholder.');

    // Test 2: Restore Protected Entity
    const dummyTranslated = `Translated: ${protectedText}`;
    const restored = dictionaryService.restoreEntities(dummyTranslated, tokens);
    if (!restored.includes('Bhavesh')) {
      throw new Error(`Failed to restore 'Bhavesh'. Restored: ${restored}`);
    }
    console.log('✓ Entity restoration successfully restored "Bhavesh".');

    // Test 3: Glossary Replacement (e.g. "ticket" -> "support ticket")
    const textWithGlossary = "Please check the ticket regarding the customer deployment.";
    const { text: transformed, applied } = dictionaryService.applyGlossary(textWithGlossary, 'default');
    
    if (!transformed.includes('support ticket')) {
      throw new Error(`Glossary failed to replace 'ticket' with 'support ticket'. Result: ${transformed}`);
    }
    if (!transformed.includes('client')) {
      throw new Error(`Glossary failed to replace 'customer' with 'client'. Result: ${transformed}`);
    }
    if (!transformed.includes('release')) {
      throw new Error(`Glossary failed to replace 'deployment' with 'release'. Result: ${transformed}`);
    }
    console.log(`✓ Glossary mappings applied successfully: ${applied.join(', ')}`);
  } finally {
    // Clean up test entries
    dictionaryService.deleteDictionaryEntry('default', testDict.id);
    dictionaryService.deleteGlossaryEntry('default', testGlossary1.id);
    dictionaryService.deleteGlossaryEntry('default', testGlossary2.id);
    dictionaryService.deleteGlossaryEntry('default', testGlossary3.id);
  }

  return true;
}

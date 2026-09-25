/**
 * InputConnection & EditorInfo Simulation Test
 * Validates the core mechanics of Android InputConnection & iOS UITextDocumentProxy
 */

export class MockInputConnection {
  private buffer: string = "";
  private cursor: number = 0;
  private selectionStart: number = 0;
  private selectionEnd: number = 0;
  private undoStack: Array<{ before: string; cursor: number }> = [];

  constructor(initialText: string = "", cursor: number = 0) {
    this.buffer = initialText;
    this.cursor = cursor;
    this.selectionStart = cursor;
    this.selectionEnd = cursor;
  }

  getText(): string {
    return this.buffer;
  }

  getCursor(): number {
    return this.cursor;
  }

  setSelection(start: number, end: number) {
    this.selectionStart = Math.max(0, Math.min(start, this.buffer.length));
    this.selectionEnd = Math.max(0, Math.min(end, this.buffer.length));
    this.cursor = this.selectionEnd;
  }

  getSelectedText(): string {
    if (this.selectionStart !== this.selectionEnd) {
      const min = Math.min(this.selectionStart, this.selectionEnd);
      const max = Math.max(this.selectionStart, this.selectionEnd);
      return this.buffer.slice(min, max);
    }
    return "";
  }

  commitText(text: string, newCursorPosition: number = 1) {
    this.undoStack.push({ before: this.buffer, cursor: this.cursor });
    if (this.selectionStart !== this.selectionEnd) {
      const min = Math.min(this.selectionStart, this.selectionEnd);
      const max = Math.max(this.selectionStart, this.selectionEnd);
      this.buffer = this.buffer.slice(0, min) + text + this.buffer.slice(max);
      this.cursor = min + text.length;
    } else {
      this.buffer = this.buffer.slice(0, this.cursor) + text + this.buffer.slice(this.cursor);
      this.cursor += text.length;
    }
    this.selectionStart = this.cursor;
    this.selectionEnd = this.cursor;
  }

  deleteSurroundingText(beforeLength: number, afterLength: number) {
    this.undoStack.push({ before: this.buffer, cursor: this.cursor });
    const start = Math.max(0, this.cursor - beforeLength);
    const end = Math.min(this.buffer.length, this.cursor + afterLength);
    this.buffer = this.buffer.slice(0, start) + this.buffer.slice(end);
    this.cursor = start;
    this.selectionStart = this.cursor;
    this.selectionEnd = this.cursor;
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.buffer = prev.before;
    this.cursor = prev.cursor;
    this.selectionStart = this.cursor;
    this.selectionEnd = this.cursor;
    return true;
  }
}

/**
 * Simulates Android EditorInfo & Session tracking for app-switching safety
 */
export class MockImeSessionManager {
  private currentSessionId: number = 1;
  private currentPackage: string = "com.whatsapp";
  private isSecure: boolean = false;

  startSession(packageName: string, isPassword: boolean = false) {
    this.currentSessionId++;
    this.currentPackage = packageName;
    this.isSecure = isPassword;
  }

  getCurrentSessionId(): number {
    return this.currentSessionId;
  }

  getCurrentPackage(): string {
    return this.currentPackage;
  }

  isAIOperationsAllowed(): boolean {
    return !this.isSecure;
  }

  canCommitAsyncResult(sessionId: number, targetPackage: string): boolean {
    return sessionId === this.currentSessionId && targetPackage === this.currentPackage;
  }
}

export function runInputConnectionTests() {
  console.log('\n--- Running InputConnection & EditorInfo Simulation Tests ---');

  // Test 1: Normal typing and backspace
  const ic = new MockInputConnection();
  ic.commitText("Hello");
  if (ic.getText() !== "Hello") throw new Error("Commit text failed");
  ic.deleteSurroundingText(1, 0);
  if (ic.getText() !== "Hell") throw new Error("Delete surrounding text failed");
  console.log('✓ Normal typing and backspace commit correctly.');

  // Test 2: Selected text replacement with exact preservation of surrounding words
  const ic2 = new MockInputConnection("See you tomorrow");
  ic2.setSelection(8, 16); // "tomorrow"
  if (ic2.getSelectedText() !== "tomorrow") throw new Error(`Expected 'tomorrow', got '${ic2.getSelectedText()}'`);
  
  ic2.commitText("next Monday");
  if (ic2.getText() !== "See you next Monday") {
    throw new Error(`Expected 'See you next Monday', got '${ic2.getText()}'`);
  }
  console.log('✓ Selection-aware replacement operates cleanly.');

  // Test 3: Undo replacement
  ic2.undo();
  if (ic2.getText() !== "See you tomorrow") {
    throw new Error(`Undo failed to restore previous text. Got: '${ic2.getText()}'`);
  }
  console.log('✓ Undo stack safely restores original text state.');

  // Test 4: Emoji & Unicode preservation during exact selection translation
  const ic3 = new MockInputConnection("Hello 👋 Please review this report 📊 today.");
  const startIdx = "Hello 👋 Please review ".length; // start of "this report"
  const endIdx = startIdx + "this report".length;
  ic3.setSelection(startIdx, endIdx);
  if (ic3.getSelectedText() !== "this report") {
    throw new Error(`Expected 'this report', got '${ic3.getSelectedText()}'`);
  }
  // Replace with Gujarati translation
  ic3.commitText("આ અહેવાલ");
  const expectedText = "Hello 👋 Please review આ અહેવાલ 📊 today.";
  if (ic3.getText() !== expectedText) {
    throw new Error(`Unicode replacement failed. Expected: '${expectedText}', Got: '${ic3.getText()}'`);
  }
  console.log('✓ Unicode, emoji, and exact selected boundary preservation confirmed.');

  // Test 5: App-Switching Safety (Preventing text leakage into other apps)
  const sessionMgr = new MockImeSessionManager();
  sessionMgr.startSession("com.whatsapp");
  const whatsappSessionId = sessionMgr.getCurrentSessionId();
  const whatsappPackage = sessionMgr.getCurrentPackage();

  // Async request started for WhatsApp. While in flight, user switches to Gmail!
  sessionMgr.startSession("com.google.android.gm");

  // When async translation response returns, check if it can commit:
  const canCommitOldResult = sessionMgr.canCommitAsyncResult(whatsappSessionId, whatsappPackage);
  if (canCommitOldResult) {
    throw new Error("CRITICAL SAFETY VIOLATION: Stale request permitted to commit across app boundary!");
  }
  console.log('✓ App-switching safety validated: In-flight requests for switched apps are safely discarded.');

  // Test 6: Password / PIN Field Isolation
  sessionMgr.startSession("com.android.settings", true);
  if (sessionMgr.isAIOperationsAllowed()) {
    throw new Error("Password field isolation failure: AI operations allowed in secure field!");
  }
  console.log('✓ Password & PIN field isolation validated: AI operations blocked.');

  return true;
}

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { geminiService } from './backend/services/gemini.service';
import { storeService } from './backend/services/store.service';
import { dictionaryService } from './backend/services/dictionary.service';
import { rateLimiterService } from './backend/services/rate-limiter.service';
import { auditService } from './backend/services/audit.service';
import { ApiResponse } from './shared/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Security & Privacy Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Privacy assurance: No telemetry tracking header
  res.setHeader('X-Privacy-Mode', 'Strict-Local-Typing');
  next();
});

// Rate limiting middleware for /api/
app.use('/api/', (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client';
  const { allowed, remaining, resetMs } = rateLimiterService.checkLimit(String(clientIp));

  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetMs);

  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Your AI usage limit has been reached. Please try again shortly.'
      }
    } as ApiResponse<null>);
  }
  next();
});

// --- HEALTH & READINESS (Section 79) ---
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    services: {
      api: 'online',
      providerRouter: 'online',
      dictionary: 'online'
    }
  });
});

// --- VERSIONED API (Section 73, 74) ---

// POST /api/v1/translate
app.post('/api/v1/translate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { text, sourceLanguage = 'auto', targetLanguage = 'en', tone = 'natural', userId = 'default' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Text is required for translation.' }
    } as ApiResponse<null>);
  }

  try {
    const result = await geminiService.translate({
      text,
      sourceLanguage,
      targetLanguage,
      tone,
      userId
    });

    const latency = Date.now() - start;
    auditService.record({
      feature: 'translate',
      userId,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      latencyMs: latency,
      inputCharCount: text.length,
      outputCharCount: result.translatedText.length,
      estimatedTokens: Math.ceil((text.length + result.translatedText.length) / 4),
      statusCode: 200,
      success: true
    });

    return res.json({ success: true, data: result } as ApiResponse<typeof result>);
  } catch (err: any) {
    const latency = Date.now() - start;
    auditService.record({
      feature: 'translate',
      userId,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      latencyMs: latency,
      inputCharCount: text.length,
      outputCharCount: 0,
      estimatedTokens: 0,
      statusCode: 500,
      success: false,
      errorCode: err.message
    });

    return res.status(500).json({
      success: false,
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI service is temporarily unavailable. Please try again.' }
    } as ApiResponse<null>);
  }
});

// POST /api/v1/reply
app.post('/api/v1/reply', async (req: Request, res: Response) => {
  const start = Date.now();
  const { incomingMessage, draftMessage = '', intent, tone, length, targetLanguage, userId = 'default' } = req.body;

  if (!incomingMessage || typeof incomingMessage !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Incoming message context is required for reply generation.' }
    } as ApiResponse<null>);
  }

  try {
    const result = await geminiService.reply({
      incomingMessage,
      draftMessage,
      intent,
      tone,
      length,
      targetLanguage,
      userId
    });

    const latency = Date.now() - start;
    auditService.record({
      feature: 'reply',
      userId,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      latencyMs: latency,
      inputCharCount: (incomingMessage + draftMessage).length,
      outputCharCount: result.suggestions.reduce((a, s) => a + s.text.length, 0),
      estimatedTokens: Math.ceil(((incomingMessage + draftMessage).length + 150) / 4),
      statusCode: 200,
      success: true
    });

    return res.json({ success: true, data: result } as ApiResponse<typeof result>);
  } catch (err: any) {
    const latency = Date.now() - start;
    auditService.record({
      feature: 'reply',
      userId,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      latencyMs: latency,
      inputCharCount: incomingMessage.length,
      outputCharCount: 0,
      estimatedTokens: 0,
      statusCode: 500,
      success: false,
      errorCode: err.message
    });

    return res.status(500).json({
      success: false,
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI service is temporarily unavailable. Please try again.' }
    } as ApiResponse<null>);
  }
});

// POST /api/v1/rewrite
app.post('/api/v1/rewrite', async (req: Request, res: Response) => {
  const start = Date.now();
  const { text, action = 'make_polite', customInstruction, targetLanguage, userId = 'default' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Text is required for rewriting.' }
    } as ApiResponse<null>);
  }

  try {
    const result = await geminiService.rewrite({
      text,
      action,
      customInstruction,
      targetLanguage,
      userId
    });

    const latency = Date.now() - start;
    auditService.record({
      feature: 'rewrite',
      userId,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      latencyMs: latency,
      inputCharCount: text.length,
      outputCharCount: result.rewrittenText.length,
      estimatedTokens: Math.ceil((text.length + result.rewrittenText.length) / 4),
      statusCode: 200,
      success: true
    });

    return res.json({ success: true, data: result } as ApiResponse<typeof result>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI service is temporarily unavailable. Please try again.' }
    } as ApiResponse<null>);
  }
});

// POST /api/v1/grammar
app.post('/api/v1/grammar', async (req: Request, res: Response) => {
  const { text, language, userId = 'default' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Text is required for grammar check.' }
    } as ApiResponse<null>);
  }

  try {
    const result = await geminiService.checkGrammar({ text, language, userId });
    return res.json({ success: true, data: result } as ApiResponse<typeof result>);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI service is temporarily unavailable.' }
    } as ApiResponse<null>);
  }
});

// POST /api/v1/transliterate
app.post('/api/v1/transliterate', async (req: Request, res: Response) => {
  const { text, fromScript = 'latin', toLanguage = 'hi' } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Text is required.' } });
  }
  const result = await geminiService.transliterate({ text, fromScript, toLanguage });
  return res.json({ success: true, data: result });
});

// POST /api/v1/detect-language
app.post('/api/v1/detect-language', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Text is required.' } });
  }
  const result = await geminiService.detectLanguage(text);
  return res.json({ success: true, data: result });
});

// POST /api/v1/summarize
app.post('/api/v1/summarize', async (req: Request, res: Response) => {
  const { text, mode = 'short' } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Text is required.' } });
  }
  const result = await geminiService.summarize({ text, mode });
  return res.json({ success: true, data: result });
});

// POST /api/v1/explain
app.post('/api/v1/explain', async (req: Request, res: Response) => {
  const { text, style = 'simple' } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Text is required.' } });
  }
  const result = await geminiService.explain({ text, style });
  return res.json({ success: true, data: result });
});

// GET /api/v1/languages
app.get('/api/v1/languages', (req: Request, res: Response) => {
  res.json({ success: true, data: storeService.getLanguages() });
});

// GET /api/v1/preferences
app.get('/api/v1/preferences', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  res.json({ success: true, data: storeService.getPreferences(userId) });
});

// PATCH /api/v1/preferences
app.patch('/api/v1/preferences', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'default';
  const updated = storeService.updatePreferences(userId, req.body);
  res.json({ success: true, data: updated });
});

// User Dictionary endpoints (Section 12)
app.get('/api/v1/dictionary', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  res.json({ success: true, data: dictionaryService.getDictionary(userId) });
});

app.post('/api/v1/dictionary', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'default';
  const entry = dictionaryService.addDictionaryEntry(userId, req.body);
  res.json({ success: true, data: entry });
});

app.delete('/api/v1/dictionary/:id', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  const deleted = dictionaryService.deleteDictionaryEntry(userId, req.params.id);
  res.json({ success: true, data: { deleted } });
});

// Glossary endpoints (Section 13)
app.get('/api/v1/glossary', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  res.json({ success: true, data: dictionaryService.getGlossary(userId) });
});

app.post('/api/v1/glossary', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'default';
  const entry = dictionaryService.addGlossaryEntry(userId, req.body);
  res.json({ success: true, data: entry });
});

app.delete('/api/v1/glossary/:id', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  const deleted = dictionaryService.deleteGlossaryEntry(userId, req.params.id);
  res.json({ success: true, data: { deleted } });
});

// Feedback endpoint (Section 140)
app.post('/api/v1/feedback', (req: Request, res: Response) => {
  const { feature, rating, reason } = req.body;
  storeService.recordFeedback({ feature, rating, reason });
  res.json({ success: true, data: { status: 'recorded' } });
});

// Telemetry & Observability (Section 80) - NO raw user messages
app.get('/api/v1/telemetry', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      metrics: auditService.getMetricsSummary(),
      recentLogs: auditService.getRecentLogs(30),
      featureFlags: storeService.getFeatureFlags()
    }
  });
});

// --- VITE MIDDLEWARE INTEGRATION (React Guidelines) ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serve
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[LangFlow Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

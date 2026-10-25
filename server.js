import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

// Problem A Fix: Explicitly resolve root .env regardless of working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
// Enforce Port 3000 per AI Studio runtime requirements
const PORT = 3000;

// Resolve verified model: priority valid GEMINI_MODEL -> valid GEMMA_MODEL -> default gemma-4-26b-a4b-it
function resolveModel() {
  const envModel = process.env.GEMINI_MODEL || process.env.GEMMA_MODEL;
  if (envModel && !envModel.startsWith('AQ.') && envModel.length < 50) {
    return envModel;
  }
  return 'gemma-4-26b-a4b-it';
}
const DEFAULT_MODEL = resolveModel();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend from /public
app.use(express.static(path.resolve(__dirname, 'public')));

// Helper to safely instantiate GoogleGenAI
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_api_key_here') {
    const error = new Error('GEMINI_API_KEY is not configured in the root .env file.');
    error.code = 'CONFIG_MISSING_API_KEY';
    throw error;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-studymate',
      },
    },
  });
}

// Unified, safe error handler (Problem B Fix)
function handleApiError(err, modelName, res) {
  console.error(`[StudyMate Error with ${modelName}]:`, err?.message || err);
  const errMsg = err?.message || String(err);

  if (err.code === 'CONFIG_MISSING_API_KEY' || errMsg.includes('API_KEY')) {
    return res.status(500).json({
      success: false,
      error: 'Google AI Studio API Key is not configured.',
      details: 'Please create a .env file in the project root containing GEMINI_API_KEY=your_key.',
      code: 'API_KEY_MISSING',
      guidance: 'Get a free key from https://aistudio.google.com/ and paste it into your .env file.',
    });
  }

  if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('NOT_FOUND')) {
    return res.status(404).json({
      success: false,
      error: `Model '${modelName}' is unavailable or not recognized.`,
      details: errMsg,
      code: 'MODEL_NOT_FOUND',
      guidance: `Verify the model name '${modelName}' in your .env (GEMINI_MODEL) or ensure your API key has access to Gemma 4.`,
    });
  }

  if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('invalid') || errMsg.includes('PERMISSION_DENIED')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed for Google AI API.',
      details: 'Invalid or restricted API key.',
      code: 'AUTH_FAILED',
      guidance: 'Verify that your GEMINI_API_KEY in the root .env is active and has appropriate permissions.',
    });
  }

  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
    return res.status(429).json({
      success: false,
      error: 'Google AI quota exceeded or rate limit reached.',
      details: 'Please wait a moment before trying again.',
      code: 'QUOTA_EXCEEDED',
      guidance: 'Wait a few seconds or check your quota at Google AI Studio.',
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Failed to process study request.',
    details: errMsg,
    code: 'API_ERROR',
    guidance: 'Please retry with a shorter prompt or verify your network connection.',
  });
}

// -----------------------------------------------------------------
// Problem C Fix: Resilient, Self-Healing Quiz Parser & Sanitizer
// -----------------------------------------------------------------
function sanitizeQuestions(rawQuestions) {
  return rawQuestions.map((q, idx) => {
    const rawOptions = Array.isArray(q.options)
      ? q.options.map((opt) => String(opt).trim())
      : [];
    
    // Ensure 4 options
    const options = rawOptions.slice(0, 4);
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    let correctAnswer = String(q.correctAnswer || '').trim();
    // Validate that correctAnswer exists in options
    const exactMatch = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
    if (exactMatch) {
      correctAnswer = exactMatch;
    } else {
      // Check prefix match or fallback to first option
      const prefixMatch = options.find(
        (o) =>
          o.startsWith(correctAnswer.charAt(0)) ||
          o.toLowerCase().includes(correctAnswer.toLowerCase())
      );
      correctAnswer = prefixMatch || options[0];
    }

    return {
      id: `q_${idx + 1}`,
      question: String(q.question || `Question ${idx + 1}`).trim(),
      options,
      correctAnswer,
      explanation: String(q.explanation || 'No explanation provided.').trim(),
    };
  });
}

function parseQuizResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Received an empty response from the AI model.');
  }

  // 1. Strip markdown fences and whitespace
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 2. Direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);
    if (Array.isArray(questions) && questions.length > 0) {
      return sanitizeQuestions(questions.slice(0, 5));
    }
  } catch (e1) {
    console.warn('[Quiz Parser] Direct JSON parse failed, attempting comma cleanup...');
  }

  // 3. Remove trailing commas before } or ]
  try {
    const withoutTrailingCommas = cleaned.replace(/,\s*([\]}])/g, '$1');
    const parsed = JSON.parse(withoutTrailingCommas);
    const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);
    if (Array.isArray(questions) && questions.length > 0) {
      return sanitizeQuestions(questions.slice(0, 5));
    }
  } catch (e2) {
    console.warn('[Quiz Parser] Comma cleanup failed, extracting JSON block...');
  }

  // 4. Extract { "questions": [...] } block
  const blockMatch = cleaned.match(/\{[\s\S]*"questions"[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
  if (blockMatch) {
    try {
      const fixedBlock = blockMatch[0].replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(fixedBlock);
      const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);
      if (Array.isArray(questions) && questions.length > 0) {
        return sanitizeQuestions(questions.slice(0, 5));
      }
    } catch (e3) {
      console.warn('[Quiz Parser] Block parse failed, using regex extractor...');
    }
  }

  // 5. Regex-based extraction of question blocks (Guarantees no crash on malformed JSON)
  const regex = /"question"\s*:\s*"([^"]+)"[\s\S]*?"options"\s*:\s*\[([\s\S]*?)\][\s\S]*?"correctAnswer"\s*:\s*"([^"]+)"[\s\S]*?"explanation"\s*:\s*"([^"]+)"/g;
  const extracted = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const qText = match[1];
    const rawOpts = match[2];
    const cAnswer = match[3];
    const explanation = match[4];

    const options = rawOpts
      .split(',')
      .map((opt) => opt.replace(/["\n\r\t]/g, '').trim())
      .filter((opt) => opt.length > 0);

    if (options.length >= 2) {
      extracted.push({
        question: qText,
        options,
        correctAnswer: cAnswer,
        explanation,
      });
    }
  }

  if (extracted.length >= 3) {
    return sanitizeQuestions(extracted.slice(0, 5));
  }

  throw new Error('Unable to parse valid quiz questions from the model output. Please retry.');
}

// -----------------------------------------------------------------
// 1. Health Endpoint
// -----------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const hasKey = Boolean(apiKey && apiKey.trim().length > 6 && apiKey !== 'your_api_key_here');

  res.json({
    success: true,
    status: 'ok',
    app: 'StudyMate AI',
    tagline: 'Make every study session count.',
    model: DEFAULT_MODEL,
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------
// 2. Feature A: Explain a Topic
// -----------------------------------------------------------------
app.post('/api/explain', async (req, res) => {
  const model = DEFAULT_MODEL;
  try {
    const { topic, subject, level = 'Intermediate' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topic name is required.',
      });
    }

    const ai = getGenAI();

    const systemInstruction = `You are StudyMate AI, an expert, encouraging university tutor powered by ${model}.
Your goal is to explain difficult academic topics clearly and systematically to college students.

Student Level: ${level}
- Beginner: Use everyday intuitive analogies, avoid heavy jargon, and explain all foundational terms.
- Intermediate: Standard collegiate depth with clear mechanics and accurate terminology.
- Advanced: High-rigor collegiate depth including formal principles, edge cases, and mathematical/scientific mechanisms.
${subject ? `Academic Discipline: ${subject}` : ''}

You MUST structure the response with these exact markdown headings:
### 1. Clear Definition
A crisp, memorable definition that immediately establishes what the concept is.

### 2. Important Concepts
The core principles, components, or foundational ideas behind this topic.

### 3. Step-by-Step Explanation
A structured, logical walk-through (3 to 5 steps) explaining how or why this works.

### 4. Practical Examples & Analogies
A relatable, concrete example or everyday analogy that makes the idea stick.

### 5. Real-World Applications
How this topic is applied today in technology, industry, healthcare, or scientific research.

### 6. Key Takeaways
High-yield bullet points summarizing the most critical points students must remember for exams.`;

    const userPrompt = `Please explain this topic thoroughly for a student:
Topic: "${topic.trim()}"
${subject ? `Subject: "${subject.trim()}"` : ''}
Explanation Level: ${level}`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    const explanationText = response.text?.trim() || '';
    if (!explanationText) {
      throw new Error('Received an empty explanation from the model.');
    }

    return res.json({
      success: true,
      topic: topic.trim(),
      subject: subject || null,
      level,
      modelUsed: model,
      content: explanationText,
    });
  } catch (err) {
    return handleApiError(err, model, res);
  }
});

// -----------------------------------------------------------------
// 3. Feature B: Summarize Notes
// -----------------------------------------------------------------
app.post('/api/summarize', async (req, res) => {
  const model = DEFAULT_MODEL;
  try {
    const { notes, style = 'Detailed' } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please paste your study notes (at least 10 characters).',
      });
    }

    const ai = getGenAI();

    const styleInstructions = {
      Concise: 'Generate a brief, high-density summary focusing only on the absolute core points (around 150-250 words).',
      Detailed: 'Provide a thorough, comprehensive summary covering all concepts and sub-topics from the notes (around 350-500 words).',
      'Exam Preparation': 'Focus heavily on high-yield exam material: definitions, formulas, contrast points, and potential test questions.',
    }[style] || 'Provide a balanced study summary.';

    const systemInstruction = `You are StudyMate AI's notes summarization specialist powered by ${model}.
CRITICAL INTEGRITY RULES:
1. Base your summary exclusively on the user's submitted notes.
2. DO NOT invent, assume, or hallucinate facts that are not supported by the notes.
3. If the notes are incomplete or omit key context, explicitly state: "[Note: The provided text does not mention...]"

Summary Style: ${style} (${styleInstructions})

You MUST structure the response with these exact markdown headings:
### 1. Main Ideas
A clear overview of the central themes in the notes.

### 2. Important Definitions
Key vocabulary, terminology, or formulas explicitly defined in the notes.

### 3. Key Points & Details
Organized headings and bullet points covering the primary insights.

### 4. Important Facts to Remember
High-priority facts, numbers, dates, or rules from the text.

### 5. Short Revision Summary
A 3-sentence lightning revision section for quick pre-exam review.`;

    const userPrompt = `Here are my study notes to summarize:
"""
${notes.trim()}
"""

Please summarize these notes adhering strictly to the required sections and factual grounding.`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const summaryText = response.text?.trim() || '';
    if (!summaryText) {
      throw new Error('Received an empty summary from the model.');
    }

    return res.json({
      success: true,
      style,
      modelUsed: model,
      content: summaryText,
    });
  } catch (err) {
    return handleApiError(err, model, res);
  }
});

// -----------------------------------------------------------------
// 4. Feature C: Generate Quiz
// -----------------------------------------------------------------
app.post('/api/quiz', async (req, res) => {
  const model = DEFAULT_MODEL;
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topic name is required to generate a quiz.',
      });
    }

    const ai = getGenAI();

    const systemInstruction = `You are StudyMate AI's quiz generator powered by ${model}.
Generate exactly FIVE (5) educational multiple-choice questions for college students.

REQUIREMENTS:
- Exactly 5 multiple-choice questions.
- Each question must test conceptual understanding, not trivial trivia.
- Each question must have exactly 4 answer options: "A) ...", "B) ...", "C) ...", "D) ...".
- Exactly one correct answer.
- "correctAnswer" MUST be an exact match to one of the 4 items in "options".
- A concise explanation of why the correct answer is right and why other choices are incorrect.
- No duplicate or repetitive questions.
- Return ONLY valid JSON adhering to this schema:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A) ...",
      "explanation": "Why this answer is correct."
    }
  ]
}`;

    const userPrompt = `Generate a 5-question multiple-choice quiz on the topic: "${topic.trim()}". Return ONLY JSON.`;

    // Attempt structured JSON schema
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctAnswer', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
        temperature: 0.4,
      },
    });

    const rawText = response.text || '';
    const questions = parseQuizResponse(rawText);

    return res.json({
      success: true,
      topic: topic.trim(),
      totalQuestions: questions.length,
      modelUsed: model,
      questions,
    });
  } catch (err) {
    return handleApiError(err, model, res);
  }
});

// Fallback: serve index.html for client-side navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🎓 STUDYMATE AI - Make every study session count.`);
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🤖 Configured AI Model: ${DEFAULT_MODEL}`);
  console.log(`📁 Static files served from: ${path.resolve(__dirname, 'public')}`);
  console.log(`====================================================`);
});

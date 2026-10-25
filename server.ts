import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DEFAULT_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Format error message safely without leaking secrets
function handleApiError(err: any, modelName: string, res: Response) {
  console.error(`[API Error with ${modelName}]:`, err?.message || err);
  const errMsg = err?.message || String(err);
  
  const isNotFound = errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('NOT_FOUND');
  const isAuthError = errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('403');
  const isMultimodalUnsupported = errMsg.includes('multimodal') || errMsg.includes('image') || errMsg.includes('inlineData') || errMsg.includes('unsupported input');

  if (isNotFound) {
    return res.status(404).json({
      error: `Model '${modelName}' is unavailable or not recognized by the API endpoint.`,
      details: errMsg,
      model: modelName,
      code: 'MODEL_NOT_FOUND',
      guidance: `The specified model '${modelName}' was not found for this API endpoint. Ensure Gemma 4 is enabled on your API key, or switch model configuration to a supported model.`,
    });
  }

  if (isAuthError) {
    return res.status(401).json({
      error: 'Authentication failed. Please verify your GEMINI_API_KEY.',
      details: 'Invalid or missing API key.',
      model: modelName,
      code: 'AUTH_ERROR',
    });
  }

  if (isMultimodalUnsupported) {
    return res.status(400).json({
      error: `Model '${modelName}' does not support direct image inputs.`,
      details: errMsg,
      model: modelName,
      code: 'MULTIMODAL_UNSUPPORTED',
      guidance: `Gemma 4 text-optimized models may not accept inline image data directly on this endpoint. For diagram understanding, you can describe the diagram or use a multimodal model.`,
    });
  }

  return res.status(500).json({
    error: `Failed to process request with model '${modelName}'.`,
    details: errMsg,
    model: modelName,
    code: 'API_ERROR',
    guidance: 'Check server logs or try again with a simplified prompt.',
  });
}

// ----------------------------------------------------
// 1. Health Check
// ----------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ok',
    app: 'StudyMate AI',
    defaultModel: DEFAULT_MODEL,
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
    supportedEndpoints: ['/api/explain', '/api/summarize', '/api/quiz', '/api/analyze-image'],
  });
});

// ----------------------------------------------------
// 2. Explain a Topic
// ----------------------------------------------------
app.post('/api/explain', async (req: Request, res: Response) => {
  try {
    const { topic, subject, difficulty = 'Intermediate', model = DEFAULT_MODEL } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const ai = getGenAI();

    const systemPrompt = `You are StudyMate AI, an expert, enthusiastic college tutor powered by ${model}.
Your goal is to explain academic concepts clearly to college students without unnecessary jargon, adapting to their selected level.

Student Level: ${difficulty} (Adjust depth, vocabulary, and analogies accordingly: Beginner = simple intuitive analogies, Intermediate = standard collegiate depth, Advanced = rigorous mechanisms and nuanced technical details).
${subject ? `Academic Subject: ${subject}` : ''}

You MUST structure your response with these exact sections and headings:
### 1. Simple Definition
(A crisp, memorable 2-3 sentence definition)

### 2. Step-by-Step Breakdown
(3 to 5 clear, logical steps or phases explaining how it works or why it happens)

### 3. Practical Example & Analogy
(A relatable everyday example or analogy to cement understanding)

### 4. Important Points to Remember
(Bullet points with key takeaways, formulas, or common pitfalls to avoid)

### 5. Real-World Application
(How this concept is used in industry, research, or modern technology today)`;

    const userPrompt = `Please explain this topic thoroughly for a college student:
Topic: "${topic.trim()}"
${subject ? `Subject: "${subject.trim()}"` : ''}
Difficulty Level: ${difficulty}

Keep explanations engaging, student-friendly, and well-structured using markdown.`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
      },
    });

    const explanationText = response.text || '';
    if (!explanationText) {
      throw new Error('Received empty response from the AI model.');
    }

    return res.json({
      success: true,
      topic: topic.trim(),
      subject: subject || null,
      difficulty,
      modelUsed: model,
      content: explanationText,
    });
  } catch (err: any) {
    const requestedModel = req.body.model || DEFAULT_MODEL;
    return handleApiError(err, requestedModel, res);
  }
});

// ----------------------------------------------------
// 3. Summarize Study Notes
// ----------------------------------------------------
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const { notes, length = 'Medium', model = DEFAULT_MODEL } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length < 15) {
      return res.status(400).json({
        error: 'Please provide valid study notes (at least 15 characters).',
      });
    }

    const ai = getGenAI();

    const lengthGuide = {
      Short: 'Concise, high-impact overview (under 250 words total).',
      Medium: 'Balanced, thorough summary covering all major facets (350-500 words).',
      Detailed: 'In-depth comprehensive study guide (600+ words with deep bullet points).',
    }[length as 'Short' | 'Medium' | 'Detailed'] || 'Balanced summary.';

    const systemPrompt = `You are StudyMate AI's expert summarization engine powered by ${model}.
CRITICAL INTEGRITY INSTRUCTION:
- Ground your summary strictly in the student's supplied notes.
- DO NOT invent, extrapolate, or hallucinate facts that are absent from the provided notes.
- If information on a topic is ambiguous, incomplete, or insufficient in the text, explicitly state: "[Note: The provided text lacks details regarding...]"
- Format your response clearly with these exact markdown sections:

### 1. Overview
(A concise synopsis of the source material)

### 2. Key Concepts & Hierarchy
(The primary principles or themes covered)

### 3. Important Definitions
(Terms defined in the notes, with concise definitions)

### 4. Main Points & Takeaways
(Core insights organized in neat bullet points)

### 5. Important Terms & Formulas to Remember
(A quick lookup list of vocabulary, keywords, or equations mentioned)

### 6. Quick Revision / Self-Check
(3-4 high-yield self-check questions with quick answer hints based solely on the notes)`;

    const userPrompt = `Target Summary Length: ${length} (${lengthGuide})

Here are the student's study notes:
"""
${notes.trim()}
"""

Please generate the structured summary based exclusively on the notes provided above.`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, // Lower temperature to minimize hallucination
      },
    });

    const summaryText = response.text || '';
    if (!summaryText) {
      throw new Error('Received empty response from the AI model.');
    }

    return res.json({
      success: true,
      length,
      modelUsed: model,
      content: summaryText,
    });
  } catch (err: any) {
    const requestedModel = req.body.model || DEFAULT_MODEL;
    return handleApiError(err, requestedModel, res);
  }
});

// ----------------------------------------------------
// 4. Generate Interactive Quiz
// ----------------------------------------------------
app.post('/api/quiz', async (req: Request, res: Response) => {
  try {
    const { topicOrNotes, count = 5, difficulty = 'Intermediate', model = DEFAULT_MODEL } = req.body;

    if (!topicOrNotes || typeof topicOrNotes !== 'string' || topicOrNotes.trim().length === 0) {
      return res.status(400).json({ error: 'Topic or study notes are required to generate a quiz.' });
    }

    const ai = getGenAI();
    const qCount = Math.min(Math.max(parseInt(String(count), 10) || 5, 3), 10);

    const systemPrompt = `You are StudyMate AI's quiz generator powered by ${model}.
You generate high-yield, multiple-choice questions for college exam preparation.
Every question must test deep conceptual understanding rather than trivial trivia.

REQUIREMENTS:
1. Generate exactly ${qCount} multiple-choice questions.
2. Each question MUST have exactly 4 options labeled "Option A", "Option B", "Option C", and "Option D", or plain option strings.
3. One option must be undeniably correct.
4. "correctAnswer" MUST be an exact match to one of the 4 items in the "options" array.
5. Provide a clear, educational explanation for why that answer is correct and why other choices are distractors.
6. Return ONLY valid JSON adhering to the specified schema. No markdown formatting around the JSON, no extra text.`;

    const userPrompt = `Generate a ${qCount}-question college level (${difficulty}) multiple-choice quiz based on the following material/topic:

"""
${topicOrNotes.trim()}
"""

Return valid JSON in this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4"
      ],
      "correctAnswer": "B) Option 2",
      "explanation": "Clear explanation of why this answer is correct."
    }
  ]
}`;

    // We can use responseSchema for structured JSON
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
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

    const rawText = response.text?.trim() || '';
    if (!rawText) {
      throw new Error('Empty response from model when generating quiz.');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      // Clean potential backticks or prefix
      const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    if (!parsedData || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      throw new Error('Model returned an invalid quiz structure.');
    }

    // Validate that correctAnswer is in options for each question
    const sanitizedQuestions = parsedData.questions.map((q: any, idx: number) => {
      const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [];
      let correctAnswer = String(q.correctAnswer || '').trim();
      
      // If correctAnswer does not exactly match one option, try to find closest match
      const exactMatch = options.find((opt: string) => opt.toLowerCase() === correctAnswer.toLowerCase());
      if (exactMatch) {
        correctAnswer = exactMatch;
      } else if (options.length > 0 && !options.includes(correctAnswer)) {
        // Match by letter prefix (e.g. "B" or "Option B")
        const prefixMatch = options.find((opt: string) => 
          opt.startsWith(correctAnswer.charAt(0)) || 
          opt.toLowerCase().includes(correctAnswer.toLowerCase())
        );
        if (prefixMatch) {
          correctAnswer = prefixMatch;
        } else {
          correctAnswer = options[0]; // fallback safely
        }
      }

      return {
        id: `q_${idx + 1}`,
        question: q.question || `Question ${idx + 1}`,
        options: options.slice(0, 4),
        correctAnswer,
        explanation: q.explanation || 'No explanation provided.',
      };
    });

    return res.json({
      success: true,
      modelUsed: model,
      difficulty,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (err: any) {
    const requestedModel = req.body.model || DEFAULT_MODEL;
    return handleApiError(err, requestedModel, res);
  }
});

// ----------------------------------------------------
// 5. Multimodal Feature — Explain an Image / Diagram
// ----------------------------------------------------
app.post('/api/analyze-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', question, model = DEFAULT_MODEL } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    // Clean base64 string if data URL prefix was sent
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const ai = getGenAI();

    const systemPrompt = `You are StudyMate AI's visual reasoning tutor powered by ${model}.
You analyze academic diagrams, scientific illustrations, flowcharts, handwritten study notes, and textbook figures for college students.

You MUST structure your response with these exact sections:
### 1. Visual Content Breakdown
(What is depicted in the image: labels, axes, components, steps, or handwritten notations)

### 2. Core Concepts Explained
(The underlying scientific, mathematical, computational, or theoretical principles shown)

### 3. Step-by-Step Mechanism / Process Flow
(Walk through the diagram in order—e.g., input to output, cycle progression, or logical derivation)

### 4. Key Takeaways & Exam Insights
(Important formula, rule, or definition illustrated by this diagram that often appears on exams)

${question ? `### 5. Answer to Your Specific Question: "${question}"\n(Direct, precise answer based on the visual evidence)` : ''}`;

    const textPrompt = question
      ? `Please analyze this study diagram/image and answer this student's question: "${question}"`
      : 'Please analyze this study diagram/image thoroughly for a student.';

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: base64Data,
      },
    };

    const textPart = {
      text: textPrompt,
    };

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const analysisText = response.text || '';
    if (!analysisText) {
      throw new Error('Received empty response from the AI model.');
    }

    return res.json({
      success: true,
      modelUsed: model,
      content: analysisText,
    });
  } catch (err: any) {
    const requestedModel = req.body.model || DEFAULT_MODEL;
    return handleApiError(err, requestedModel, res);
  }
});

// ----------------------------------------------------
// Serve Frontend (Vite in Dev / Static in Production)
// ----------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StudyMate AI server running at http://0.0.0.0:${PORT}`);
    console.log(`🤖 Configured default model: ${DEFAULT_MODEL}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

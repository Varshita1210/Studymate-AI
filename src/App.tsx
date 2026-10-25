import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  FileText,
  Award,
  Image as ImageIcon,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Upload,
  Cpu,
  Layers,
  CheckCircle2,
  Settings2,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { TOPIC_PRESETS, NOTES_PRESETS, TopicPreset, NotesPreset } from './data/presets';
import { MarkdownView } from './components/MarkdownView';
import { QuizRunner, QuizQuestion } from './components/QuizRunner';

type ActiveTab = 'explain' | 'summarize' | 'quiz' | 'diagram';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('explain');
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Model & Server Health State
  const [selectedModel, setSelectedModel] = useState<string>('gemma-4-26b-a4b-it');
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [serverModel, setServerModel] = useState<string>('gemma-4-26b-a4b-it');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Global Toast / Copy Feedback
  const [copied, setCopied] = useState<boolean>(false);

  // --- Feature A: Explain a Topic State ---
  const [explainTopic, setExplainTopic] = useState<string>('');
  const [explainSubject, setExplainSubject] = useState<string>('');
  const [explainDifficulty, setExplainDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [explainLoading, setExplainLoading] = useState<boolean>(false);
  const [explainResult, setExplainResult] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<{ message: string; details?: string; guidance?: string } | null>(null);

  // --- Feature B: Summarize Notes State ---
  const [summaryNotes, setSummaryNotes] = useState<string>('');
  const [summaryLength, setSummaryLength] = useState<'Short' | 'Medium' | 'Detailed'>('Medium');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<{ message: string; details?: string; guidance?: string } | null>(null);

  // --- Feature C: Generate Quiz State ---
  const [quizInput, setQuizInput] = useState<string>('');
  const [quizDifficulty, setQuizDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizError, setQuizError] = useState<{ message: string; details?: string; guidance?: string } | null>(null);

  // --- Feature D: Understand Diagram State ---
  const [diagramImage, setDiagramImage] = useState<string | null>(null);
  const [diagramMimeType, setDiagramMimeType] = useState<string>('image/png');
  const [diagramQuestion, setDiagramQuestion] = useState<string>('');
  const [diagramLoading, setDiagramLoading] = useState<boolean>(false);
  const [diagramResult, setDiagramResult] = useState<string | null>(null);
  const [diagramError, setDiagramError] = useState<{ message: string; details?: string; guidance?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setIsServerHealthy(true);
        setHasApiKey(data.hasApiKey);
        if (data.defaultModel) {
          setServerModel(data.defaultModel);
        }
      } else {
        setIsServerHealthy(false);
      }
    } catch (e) {
      setIsServerHealthy(false);
    }
  };

  const scrollToWorkspace = (tab?: ActiveTab) => {
    if (tab) setActiveTab(tab);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------
  // Feature A Action: Explain Topic
  // ---------------------------------------------
  const handleExplain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!explainTopic.trim()) return;

    setExplainLoading(true);
    setExplainError(null);
    setExplainResult(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: explainTopic.trim(),
          subject: explainSubject.trim() || undefined,
          difficulty: explainDifficulty,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setExplainError({
          message: data.error || 'Failed to explain topic.',
          details: data.details,
          guidance: data.guidance,
        });
      } else {
        setExplainResult(data.content);
      }
    } catch (err: any) {
      setExplainError({
        message: 'Could not connect to StudyMate AI server.',
        details: err.message,
      });
    } finally {
      setExplainLoading(false);
    }
  };

  // ---------------------------------------------
  // Feature B Action: Summarize Notes
  // ---------------------------------------------
  const handleSummarize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!summaryNotes.trim()) return;

    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryResult(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: summaryNotes.trim(),
          length: summaryLength,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSummaryError({
          message: data.error || 'Failed to summarize notes.',
          details: data.details,
          guidance: data.guidance,
        });
      } else {
        setSummaryResult(data.content);
      }
    } catch (err: any) {
      setSummaryError({
        message: 'Could not connect to StudyMate AI server.',
        details: err.message,
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  // ---------------------------------------------
  // Feature C Action: Generate Quiz
  // ---------------------------------------------
  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quizInput.trim()) return;

    setQuizLoading(true);
    setQuizError(null);
    setQuizQuestions(null);

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicOrNotes: quizInput.trim(),
          difficulty: quizDifficulty,
          count: 5,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setQuizError({
          message: data.error || 'Failed to generate quiz.',
          details: data.details,
          guidance: data.guidance,
        });
      } else {
        setQuizQuestions(data.questions);
      }
    } catch (err: any) {
      setQuizError({
        message: 'Could not connect to StudyMate AI server.',
        details: err.message,
      });
    } finally {
      setQuizLoading(false);
    }
  };

  // ---------------------------------------------
  // Feature D Action: Understand Diagram
  // ---------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image size exceeds 8MB. Please select a smaller image.');
      return;
    }

    setDiagramMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setDiagramImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeDiagram = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!diagramImage) return;

    setDiagramLoading(true);
    setDiagramError(null);
    setDiagramResult(null);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: diagramImage,
          mimeType: diagramMimeType,
          question: diagramQuestion.trim() || undefined,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setDiagramError({
          message: data.error || 'Failed to analyze diagram.',
          details: data.details,
          guidance: data.guidance,
        });
      } else {
        setDiagramResult(data.content);
      }
    } catch (err: any) {
      setDiagramError({
        message: 'Could not connect to StudyMate AI server.',
        details: err.message,
      });
    } finally {
      setDiagramLoading(false);
    }
  };

  // Helper to load sample SVG for diagram demo
  const loadSampleDiagram = () => {
    // Generate a simple SVG data URL representing a biochemical pathway / neural network
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340" fill="none">
      <rect width="600" height="340" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
      <text x="300" y="38" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1E293B">Cellular Energy Cycle: Glycolysis to Krebs</text>
      
      <!-- Box 1: Glucose -->
      <rect x="40" y="80" width="130" height="70" rx="8" fill="#EEF2FF" stroke="#6366F1" stroke-width="2"/>
      <text x="105" y="112" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#312E81">Glucose (C6)</text>
      <text x="105" y="132" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4338CA">Yield: +2 ATP, +2 NADH</text>

      <!-- Arrow 1 -->
      <line x1="170" y1="115" x2="230" y2="115" stroke="#6366F1" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="200" y="105" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748B">Glycolysis</text>

      <!-- Box 2: Pyruvate -->
      <rect x="235" y="80" width="130" height="70" rx="8" fill="#F0FDF4" stroke="#22C55E" stroke-width="2"/>
      <text x="300" y="112" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#14532D">2x Pyruvate (C3)</text>
      <text x="300" y="132" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#15803D">Matrix Entry</text>

      <!-- Arrow 2 -->
      <line x1="365" y1="115" x2="425" y2="115" stroke="#22C55E" stroke-width="2"/>
      <text x="395" y="105" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748B">Oxidation</text>

      <!-- Box 3: Acetyl-CoA -->
      <rect x="430" y="80" width="130" height="70" rx="8" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
      <text x="495" y="112" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#78350F">Acetyl-CoA (C2)</text>
      <text x="495" y="132" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#B45309">+1 NADH / pyruvate</text>

      <!-- Big Krebs Cycle Circle -->
      <circle cx="300" cy="240" r="55" fill="#FAF5FF" stroke="#A855F7" stroke-width="3" stroke-dasharray="6 4"/>
      <text x="300" y="235" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#581C87">Citric Acid Cycle</text>
      <text x="300" y="255" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#7E22CE">6 NADH, 2 FADH2, 2 ATP</text>
      
      <!-- Connectors -->
      <path d="M 495 150 L 495 240 L 365 240" fill="none" stroke="#F59E0B" stroke-width="2"/>
    </svg>`;
    const encoded = `data:image/svg+xml;base64,${btoa(svgString)}`;
    setDiagramImage(encoded);
    setDiagramMimeType('image/svg+xml');
    setDiagramQuestion('Explain the net ATP and electron carrier yield from this pathway.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ---------------------------------------------------- */}
      {/* Top Banner / Announcement */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-4 py-2 text-white text-xs md:text-sm font-medium flex items-center justify-between">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Powered by <strong className="font-semibold text-indigo-200">Gemma 4 26B A4B IT</strong> — Built for Academic Mastery
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-indigo-200/80">Hackathon Prototype</span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1 text-xs text-indigo-200 hover:text-white underline cursor-pointer"
            >
              <Settings2 className="h-3 w-3" />
              Model Config
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Navbar */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">StudyMate</span>
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-black text-indigo-700 tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Learn Smarter. Understand Faster.</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#workspace" onClick={() => scrollToWorkspace()} className="hover:text-indigo-600 transition">Workspace</a>
            <a href="#about" className="hover:text-indigo-600 transition">About Gemma 4</a>
          </nav>

          {/* Action button */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200">
              <span className={`h-2 w-2 rounded-full ${isServerHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-mono text-[11px] text-slate-700">{selectedModel}</span>
            </div>
            <button
              onClick={() => scrollToWorkspace('explain')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs md:text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-purple-700 active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Start Learning
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* Hero Section */}
      {/* ---------------------------------------------------- */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/60 bg-gradient-to-b from-white via-indigo-50/20 to-slate-50">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200/60 shadow-xs">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                <span>Engineered with Gemma 4 Open Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Your Personal <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Study Companion</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Master complex academic concepts, condense lecture notes without hallucinated facts, drill with interactive exam-grade quizzes, and decipher intricate scientific diagrams.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => scrollToWorkspace('explain')}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-indigo-300" />
                  Explore the Workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setExplainTopic("Dijkstra's Shortest Path Algorithm");
                    setExplainSubject("Computer Science");
                    setExplainDifficulty("Intermediate");
                    scrollToWorkspace('explain');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  Load CS Algorithm Demo
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Strictly Grounded Summaries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span>Interactive 5-Q Quizzes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                  <span>Diagram Vision Support</span>
                </div>
              </div>
            </div>

            {/* Right Visual Representation of AI-Powered Learning */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative background glow */}
                <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl" />

                <div className="relative rounded-2xl border border-indigo-100 bg-white p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400">StudyMate.ai/session</span>
                  </div>

                  {/* Active Simulated Tutor Card */}
                  <div className="rounded-xl bg-indigo-50/70 p-4 border border-indigo-100/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Concept Breakdown</span>
                      <span className="rounded-full bg-indigo-200/60 px-2 py-0.5 text-[10px] font-black text-indigo-800">
                        Gemma 4 IT
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Quantum Superposition (Intermediate)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      "A fundamental principle of quantum mechanics where a physical system exists simultaneously in multiple states until measured..."
                    </p>
                  </div>

                  {/* Interactive Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-base font-black text-indigo-600">3 Levels</div>
                      <div className="text-[10px] text-slate-500 font-medium">Adaptive Depth</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-base font-black text-purple-600">0% Hallucination</div>
                      <div className="text-[10px] text-slate-500 font-medium">Notes Grounding</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="text-base font-black text-emerald-600">Instant</div>
                      <div className="text-[10px] text-slate-500 font-medium">Quiz Scoring</div>
                    </div>
                  </div>

                  {/* Sample Quiz Snapshot */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Practice Question 1 of 5</span>
                      <span className="text-emerald-600 font-bold">100% Verified</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 text-xs text-slate-700 border border-slate-200 font-medium flex items-center justify-between">
                      <span>B) Linear combination of basis states</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* Feature Cards Section */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">Core Learning Suite</h2>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Four Tailored Tools for Exam Excellence
            </h3>
            <p className="text-sm md:text-base text-slate-600">
              Select any learning module to open directly inside the interactive workspace below.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">Explain a Topic</h4>
                <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                  Enter any academic concept. Receive clear definitions, step-by-step logic, practical analogies, and real-world applications tuned to Beginner, Intermediate, or Advanced depth.
                </p>
              </div>
              <button
                onClick={() => scrollToWorkspace('explain')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-indigo-600 group-hover:text-indigo-700 cursor-pointer"
              >
                Explain Topic
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">Summarize Notes</h4>
                <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                  Paste lecture slides or textbook excerpts. Generates strictly grounded summaries, key definitions, bullet points, and revision hints—never fabricating absent facts.
                </p>
              </div>
              <button
                onClick={() => scrollToWorkspace('summarize')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-purple-600 group-hover:text-purple-700 cursor-pointer"
              >
                Summarize Notes
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Award className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">Generate a Quiz</h4>
                <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                  Generate five collegiate multiple-choice questions with 4 options each. Take the quiz interactively, submit for instant scoring, and review step-by-step explanations.
                </p>
              </div>
              <button
                onClick={() => scrollToWorkspace('quiz')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-emerald-600 group-hover:text-emerald-700 cursor-pointer"
              >
                Take Practice Quiz
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            </div>

            {/* Feature 4 */}
            <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">Understand a Diagram</h4>
                <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                  Upload flowcharts, histology figures, circuit schematics, or handwritten derivations. Gemma 4 dissects the components and answers your specific questions.
                </p>
              </div>
              <button
                onClick={() => scrollToWorkspace('diagram')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-blue-600 group-hover:text-blue-700 cursor-pointer"
              >
                Analyze Diagram
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* Workspace Section */}
      {/* ---------------------------------------------------- */}
      <section id="workspace" ref={workspaceRef} className="py-14 md:py-20 bg-slate-50 flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Workspace Title & Tab Navigation */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Study Workspace</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">Select a tool and enter your study topic or material.</p>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/70 border border-slate-300/60 overflow-x-auto">
              <button
                onClick={() => setActiveTab('explain')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'explain'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Explain Topic
              </button>
              <button
                onClick={() => setActiveTab('summarize')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'summarize'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Summarize Notes
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'quiz'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                Generate Quiz
              </button>
              <button
                onClick={() => setActiveTab('diagram')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'diagram'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Diagram
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* TAB 1: EXPLAIN A TOPIC */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'explain' && (
            <div className="space-y-6">
              {/* Input Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Explain an Academic Topic</h3>
                      <p className="text-xs text-slate-500">Get structured definitions, step-by-step logic, and analogies</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setExplainTopic('');
                      setExplainSubject('');
                      setExplainResult(null);
                      setExplainError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Sample Topics:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPIC_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setExplainTopic(preset.topic);
                          setExplainSubject(preset.subject);
                          setExplainDifficulty(preset.difficulty);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer"
                      >
                        {preset.topic} <span className="text-[10px] text-slate-400">({preset.subject})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleExplain} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Topic Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={explainTopic}
                        onChange={(e) => setExplainTopic(e.target.value)}
                        placeholder="e.g. CRISPR Cas-9, Backpropagation, Keynesian Multiplier..."
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Subject (Optional)</label>
                      <input
                        type="text"
                        value={explainSubject}
                        onChange={(e) => setExplainSubject(e.target.value)}
                        placeholder="e.g. Biology, Computer Science, Economics"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* Difficulty selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-slate-700">Explanation Level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setExplainDifficulty(lvl)}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                            explainDifficulty === lvl
                              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={explainLoading || !explainTopic.trim()}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {explainLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Gemma 4 is Explaining...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Explain with AI
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Message */}
              {explainError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                    <span>{explainError.message}</span>
                  </div>
                  {explainError.details && (
                    <p className="font-mono text-xs text-rose-700 bg-rose-100/60 p-2 rounded-md">
                      {explainError.details}
                    </p>
                  )}
                  {explainError.guidance && (
                    <p className="text-xs text-rose-800 font-medium">{explainError.guidance}</p>
                  )}
                </div>
              )}

              {/* Output Result Card */}
              {explainResult && (
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 md:p-8 shadow-sm space-y-6">
                  {/* Action toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        {explainDifficulty} Guide
                      </span>
                      {explainSubject && (
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {explainSubject}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(explainResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownload(`${explainTopic.replace(/\s+/g, '_')}_explanation.md`, explainResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Rendered content */}
                  <MarkdownView content={explainResult} />
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 2: SUMMARIZE STUDY NOTES */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'summarize' && (
            <div className="space-y-6">
              {/* Input Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Summarize Study Notes</h3>
                      <p className="text-xs text-slate-500">Strictly grounded in your notes—no hallucinated facts or made-up formulas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSummaryNotes('');
                      setSummaryResult(null);
                      setSummaryError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>

                {/* Preset Notes */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Load Sample Lecture Notes:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NOTES_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSummaryNotes(preset.notes);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 transition cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSummarize} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Paste Notes, Lecture Slides, or Textbook Content <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {summaryNotes.length} chars • {summaryNotes.trim() ? summaryNotes.trim().split(/\s+/).length : 0} words
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      value={summaryNotes}
                      onChange={(e) => setSummaryNotes(e.target.value)}
                      placeholder="Paste your lecture notes, transcript, or textbook passages here..."
                      required
                      className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-hidden focus:ring-2 focus:ring-purple-100 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Length Options */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Summary Length</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Short', 'Medium', 'Detailed'] as const).map((len) => (
                        <button
                          key={len}
                          type="button"
                          onClick={() => setSummaryLength(len)}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                            summaryLength === len
                              ? 'border-purple-600 bg-purple-50/70 text-purple-700 shadow-xs ring-1 ring-purple-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {len}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={summaryLoading || summaryNotes.trim().length < 15}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {summaryLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Gemma 4 is Summarizing...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4" />
                          Summarize Notes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Message */}
              {summaryError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                    <span>{summaryError.message}</span>
                  </div>
                  {summaryError.details && (
                    <p className="font-mono text-xs text-rose-700 bg-rose-100/60 p-2 rounded-md">
                      {summaryError.details}
                    </p>
                  )}
                  {summaryError.guidance && (
                    <p className="text-xs text-rose-800 font-medium">{summaryError.guidance}</p>
                  )}
                </div>
              )}

              {/* Output Result Card */}
              {summaryResult && (
                <div className="rounded-2xl border border-purple-100 bg-white p-6 md:p-8 shadow-sm space-y-6">
                  {/* Action toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                        {summaryLength} Summary
                      </span>
                      <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Grounded in Provided Notes
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(summaryResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownload('study_notes_summary.md', summaryResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>

                  <MarkdownView content={summaryResult} />
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 3: GENERATE A QUIZ */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              {/* Input Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Generate an Exam-Ready Quiz</h3>
                      <p className="text-xs text-slate-500">5 multiple-choice questions with interactive grading and explanations</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setQuizInput('');
                      setQuizQuestions(null);
                      setQuizError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>

                {/* Preset Quiz Starters */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Try a Quick Topic for Quiz:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPIC_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuizInput(preset.topic);
                          setQuizDifficulty(preset.difficulty);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition cursor-pointer"
                      >
                        {preset.topic}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleGenerateQuiz} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter Topic or Paste Study Material <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={quizInput}
                      onChange={(e) => setQuizInput(e.target.value)}
                      placeholder="Enter a topic (e.g. Mitosis vs Meiosis, QuickSort analysis) or paste notes to generate 5 questions from..."
                      required
                      className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-100 font-sans"
                    />
                  </div>

                  {/* Difficulty selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Difficulty Level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setQuizDifficulty(lvl)}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                            quizDifficulty === lvl
                              ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 shadow-xs ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={quizLoading || !quizInput.trim()}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {quizLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Gemma 4 is Formulating 5 Questions...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4" />
                          Generate 5-Question Quiz
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Message */}
              {quizError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                    <span>{quizError.message}</span>
                  </div>
                  {quizError.details && (
                    <p className="font-mono text-xs text-rose-700 bg-rose-100/60 p-2 rounded-md">
                      {quizError.details}
                    </p>
                  )}
                  {quizError.guidance && (
                    <p className="text-xs text-rose-800 font-medium">{quizError.guidance}</p>
                  )}
                </div>
              )}

              {/* Interactive Quiz Runner */}
              {quizQuestions && (
                <QuizRunner
                  questions={quizQuestions}
                  modelUsed={selectedModel}
                  difficulty={quizDifficulty}
                  onReset={() => {
                    setQuizQuestions(null);
                    setQuizInput('');
                  }}
                />
              )}
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 4: UNDERSTAND A DIAGRAM */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'diagram' && (
            <div className="space-y-6">
              {/* Input Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Understand a Diagram / Image</h3>
                      <p className="text-xs text-slate-500">Flowcharts, scientific diagrams, handwritten formulas, or slides</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDiagramImage(null);
                      setDiagramQuestion('');
                      setDiagramResult(null);
                      setDiagramError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>

                {/* Preset sample diagram button */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Sample Diagram:
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleDiagram}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    Load "Cellular Respiration & Krebs Cycle" Diagram Sample
                  </button>
                </div>

                <form onSubmit={handleAnalyzeDiagram} className="space-y-5">
                  {/* Image Upload Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Upload Diagram or Notes Image <span className="text-rose-500">*</span>
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!diagramImage ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          Click to upload diagram image
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          PNG, JPG, WEBP up to 8MB (Textbook photos, whiteboard drawings, flowcharts)
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-700">Image Preview:</span>
                          <button
                            type="button"
                            onClick={() => setDiagramImage(null)}
                            className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            Remove / Change Image
                          </button>
                        </div>
                        <div className="max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center p-2">
                          <img
                            src={diagramImage}
                            alt="Uploaded diagram preview"
                            className="max-h-64 max-w-full object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Student Question Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Your Question About This Diagram (Optional)
                    </label>
                    <input
                      type="text"
                      value={diagramQuestion}
                      onChange={(e) => setDiagramQuestion(e.target.value)}
                      placeholder="e.g. What does the cycle in the center produce? Or explain step 3."
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={diagramLoading || !diagramImage}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {diagramLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Gemma 4 is Analyzing Visuals...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze Diagram with AI
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Error Message */}
              {diagramError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span>{diagramError.message}</span>
                  </div>
                  {diagramError.details && (
                    <p className="font-mono text-xs text-amber-700 bg-amber-100/60 p-2 rounded-md">
                      {diagramError.details}
                    </p>
                  )}
                  {diagramError.guidance && (
                    <p className="text-xs text-amber-800 font-medium">{diagramError.guidance}</p>
                  )}
                </div>
              )}

              {/* Output Result Card */}
              {diagramResult && (
                <div className="rounded-2xl border border-blue-100 bg-white p-6 md:p-8 shadow-sm space-y-6">
                  {/* Action toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        Diagram Breakdown
                      </span>
                      {diagramQuestion && (
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Q: {diagramQuestion}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(diagramResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownload('diagram_analysis.md', diagramResult)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>

                  <MarkdownView content={diagramResult} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* About Section (Section 4 & 11) */}
      {/* ---------------------------------------------------- */}
      <section id="about" className="py-16 md:py-20 bg-white border-t border-slate-200/80">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
              Under the Hood
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How Gemma 4 Powers StudyMate AI
            </h3>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Built on Google's lightweight open model family, StudyMate AI delivers grounded, pedagogical assistance rather than superficial chatbot responses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Hallucination Resistance</h4>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Study notes summarization is strictly constrained to the text supplied by the student, proactively marking missing information rather than inventing fake theories.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">3-Tier Adaptive Pedagogy</h4>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Concepts are not simply summarized; they are deconstructed into beginner analogies, intermediate collegiate explanations, or advanced graduate-level mechanisms.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Verified Active Recall</h4>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Quizzes enforce strict JSON generation schemas to provide four balanced distractors, verified answer keys, and step-by-step diagnostic feedback after submission.
              </p>
            </div>
          </div>

          {/* Hackathon Architecture Box */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 p-6 md:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4 mb-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Hackathon-Ready Architecture</h4>
                <p className="text-xs text-slate-600">Clean full-stack separation with zero exposed client secrets</p>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                gemma-4-26b-a4b-it
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
              <div>
                <strong className="text-slate-900 block mb-1">Server-Side Proxy Security:</strong>
                All calls to the Google GenAI SDK are executed on an Express.js server using server-side environment variables. Browser bundles never touch API secrets.
              </div>
              <div>
                <strong className="text-slate-900 block mb-1">Transparent Model Handling:</strong>
                Never silently falls back without notifying the user. If an endpoint or model quota is limited, clear diagnostics and configuration options are displayed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* Model Configuration Modal */}
      {/* ---------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Model Configuration</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Per hackathon specifications, StudyMate AI defaults to <strong>Gemma 4 26B A4B IT</strong> (<code className="font-mono text-indigo-600">gemma-4-26b-a4b-it</code>).
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Configured Model Identifier</label>
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs text-slate-800 focus:border-indigo-600 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">
                Default: <code className="font-semibold text-slate-600">gemma-4-26b-a4b-it</code>. You can also specify an alternative supported identifier.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Server Status:</span>
                <span className={isServerHealthy ? 'text-emerald-600' : 'text-amber-600'}>
                  {isServerHealthy ? '● Connected' : '○ Checking...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>API Key:</span>
                <span>{hasApiKey ? 'Configured on Server' : 'Not detected'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedModel('gemma-4-26b-a4b-it');
                  setShowSettingsModal(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Footer */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold text-white">StudyMate AI</span>
                <p className="text-xs text-slate-500">Learn Smarter. Understand Faster.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition">Features</a>
              <span>•</span>
              <a href="#workspace" className="hover:text-white transition">Workspace</a>
              <span>•</span>
              <a href="#about" className="hover:text-white transition">Gemma 4 Architecture</a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs leading-relaxed text-slate-500">
            <p className="max-w-xl">
              <strong className="text-slate-400 font-semibold">Academic Integrity Notice:</strong> StudyMate AI is an AI-powered learning assistant designed to support study workflows. Students should always verify important academic information, proofs, and definitions against authoritative course materials and textbooks.
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 font-mono text-[11px] text-indigo-400 border border-slate-700">
                Powered by Gemma 4
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

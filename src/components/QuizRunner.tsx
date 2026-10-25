import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, Sparkles, ChevronRight, HelpCircle, Check, AlertTriangle } from 'lucide-react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizRunnerProps {
  questions: QuizQuestion[];
  modelUsed: string;
  difficulty: string;
  onReset: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  questions,
  modelUsed,
  difficulty,
  onReset,
}) => {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const handleSelectOption = (questionIndex: number, option: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const selected = userAnswers[idx];
      if (selected && selected.trim() === q.correctAnswer.trim()) {
        correctCount += 1;
      }
    });
    return correctCount;
  };

  const score = calculateScore();
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);

  const getMotivationalMessage = (pct: number) => {
    if (pct === 100) return '🏆 Outstanding Mastery! You aced this quiz with a flawless score!';
    if (pct >= 80) return '🌟 Excellent Performance! You have a deep understanding of these concepts.';
    if (pct >= 60) return '👍 Great Effort! Review the explanations below to reinforce your weaker areas.';
    return '📚 Good Practice Run! Study the detailed explanations below and try again to cement your knowledge.';
  };

  const answeredCount = Object.keys(userAnswers).length;
  const allAnswered = answeredCount === total;

  const currentQ = questions[activeQuestionIndex];

  return (
    <div className="space-y-6">
      {/* Quiz Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-white p-4 border border-indigo-100/60 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm md:text-base">Interactive Assessment</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{total} Questions</span>
              <span>•</span>
              <span className="capitalize">{difficulty} Level</span>
              <span>•</span>
              <span className="font-mono text-indigo-600">{modelUsed}</span>
            </div>
          </div>
        </div>

        {!isSubmitted && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Answered: {answeredCount}/{total}
            </span>
            <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(answeredCount / total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submitted Results Card */}
      {isSubmitted && (
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <div className={`p-6 text-center ${
            percentage >= 80 ? 'bg-gradient-to-b from-emerald-50/60 to-white' :
            percentage >= 60 ? 'bg-gradient-to-b from-indigo-50/60 to-white' :
            'bg-gradient-to-b from-amber-50/60 to-white'
          }`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md border-2 border-indigo-100">
              <span className="text-2xl font-black text-indigo-700">{percentage}%</span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Score: {score} out of {total} Correct
            </h3>
            <p className="mt-2 text-sm md:text-base text-slate-600 font-medium max-w-md mx-auto">
              {getMotivationalMessage(percentage)}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-100/70 px-4 py-2 text-xs md:text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{score} Correct</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-rose-100/70 px-4 py-2 text-xs md:text-sm font-semibold text-rose-800">
                <XCircle className="h-4 w-4 text-rose-600" />
                <span>{total - score} Incorrect</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setUserAnswers({});
                  setActiveQuestionIndex(0);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Retake This Quiz
              </button>
              <button
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs md:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Generate New Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Display */}
      {!isSubmitted ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          {/* Question Index Dots */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Question {activeQuestionIndex + 1} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                    activeQuestionIndex === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : userAnswers[idx]
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current Question Text */}
          <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="mt-5 space-y-3">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = userAnswers[activeQuestionIndex] === option;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(activeQuestionIndex, option)}
                  className={`w-full text-left flex items-start gap-3.5 rounded-xl p-4 text-sm md:text-base font-medium transition cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <span className="leading-relaxed pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeQuestionIndex === 0}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs md:text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {activeQuestionIndex < total - 1 ? (
              <button
                onClick={() => setActiveQuestionIndex((prev) => Math.min(total - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitted(true)}
                disabled={!allAnswered}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs md:text-sm font-bold shadow-md transition ${
                  allAnswered
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="h-4 w-4" />
                Submit Quiz ({answeredCount}/{total})
              </button>
            )}
          </div>

          {!allAnswered && activeQuestionIndex === total - 1 && (
            <p className="mt-2 text-center text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Please answer all questions before submitting your quiz.
            </p>
          )}
        </div>
      ) : (
        /* Detailed Review Mode After Submission */
        <div className="space-y-4">
          <h4 className="text-base font-bold text-slate-900">Detailed Question Breakdown & Explanations:</h4>
          {questions.map((q, idx) => {
            const selected = userAnswers[idx];
            const isCorrect = selected && selected.trim() === q.correctAnswer.trim();

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 transition ${
                  isCorrect
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {idx + 1}
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm md:text-base">{q.question}</h5>
                  </div>
                  {isCorrect ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Incorrect
                    </span>
                  )}
                </div>

                {/* Options display */}
                <div className="mt-4 space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isUserChoice = selected === opt;
                    const isRightAnswer = opt.trim() === q.correctAnswer.trim();

                    let optionStyle = 'border-slate-200 bg-white text-slate-600';
                    if (isRightAnswer) {
                      optionStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                    } else if (isUserChoice && !isCorrect) {
                      optionStyle = 'border-rose-400 bg-rose-50/80 text-rose-950 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs md:text-sm ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs opacity-70">
                            {String.fromCharCode(65 + optIdx)})
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isRightAnswer && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            Correct Answer
                          </span>
                        )}
                        {isUserChoice && !isRightAnswer && (
                          <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <div className="mt-3.5 rounded-xl bg-slate-100/80 p-3.5 text-xs md:text-sm text-slate-700 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                    <HelpCircle className="h-4 w-4 text-indigo-600" />
                    <span>Explanation</span>
                  </div>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

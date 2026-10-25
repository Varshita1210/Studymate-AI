/**
 * STUDYMATE AI - Core Client Application
 * Vanilla JavaScript implementation for maximum reliability, speed, and simplicity.
 */

// Global State
let currentTab = 'explain';
let activeQuizData = null;
let userQuizAnswers = {};
let isQuizGraded = false;

// --------------------------------------------------------------------------
// Initialization & Health Check
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  checkServerHealth();
  setupNavListeners();
});

async function checkServerHealth() {
  const dot = document.getElementById('server-status-dot');
  const badge = document.getElementById('status-model-badge');

  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      if (dot) dot.classList.remove('offline');
      if (badge && data.model) {
        badge.innerHTML = `Model: <span class="mono-badge">${data.model}</span>`;
      }
      if (!data.hasApiKey) {
        showAlert('API Key Notice', 'Google AI API key is not configured in .env. Please configure GEMINI_API_KEY.', 'warning');
      }
    } else {
      if (dot) dot.classList.add('offline');
    }
  } catch (err) {
    if (dot) dot.classList.add('offline');
  }
}

// --------------------------------------------------------------------------
// Tab Navigation
// --------------------------------------------------------------------------
function setupNavListeners() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  // Update hero tab pills
  document.querySelectorAll('.tab-pill').forEach((pill) => {
    pill.classList.remove('active');
  });
  const activeHeroPill = document.getElementById(`tab-btn-${tabName}`);
  if (activeHeroPill) activeHeroPill.classList.add('active');

  // Update header nav buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Switch panels
  document.querySelectorAll('.feature-panel').forEach((panel) => {
    panel.classList.remove('active');
  });
  const targetPanel = document.getElementById(`panel-${tabName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  hideAlert();
}

// --------------------------------------------------------------------------
// Alert Utilities
// --------------------------------------------------------------------------
function showAlert(title, message, type = 'error') {
  const box = document.getElementById('global-alert');
  const titleEl = document.getElementById('alert-title');
  const msgEl = document.getElementById('alert-message');

  if (!box || !titleEl || !msgEl) return;

  box.className = `alert-box alert-${type}`;
  titleEl.textContent = title;
  msgEl.textContent = message;
  box.classList.remove('hidden');

  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const box = document.getElementById('global-alert');
  if (box) box.classList.add('hidden');
}

// --------------------------------------------------------------------------
// Markdown Formatter (Converts AI Markdown output to HTML safely)
// --------------------------------------------------------------------------
function renderMarkdown(mdText) {
  if (!mdText) return '';

  const lines = mdText.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    // Escape basic HTML tags to prevent XSS
    line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${formatInline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1>${formatInline(line.slice(2))}</h1>`;
      continue;
    }

    // Bullet points
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${formatInline(line.slice(2))}</li>`;
      continue;
    }

    // Ordered steps (e.g. 1. )
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p><strong>${numMatch[1]}.</strong> ${formatInline(numMatch[2])}</p>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('&gt; ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<blockquote>${formatInline(line.slice(5))}</blockquote>`;
      continue;
    }

    // Standard paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p>${formatInline(line)}</p>`;
  }

  if (inList) html += '</ul>';
  return html;
}

function formatInline(text) {
  // Bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

// --------------------------------------------------------------------------
// Copy & Download Utilities
// --------------------------------------------------------------------------
function copyContent(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const textToCopy = el.innerText || el.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    showAlert('Copied to Clipboard!', 'Study material successfully copied.', 'success');
    setTimeout(hideAlert, 2500);
  }).catch(() => {
    showAlert('Copy Failed', 'Please select and copy text manually.', 'error');
  });
}

function downloadContent(filename, elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const content = el.innerText || el.textContent;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------------
// FEATURE A: EXPLAIN A TOPIC
// --------------------------------------------------------------------------
function fillExplain(topic, subject, level) {
  document.getElementById('explain-topic').value = topic;
  document.getElementById('explain-subject').value = subject;
  const radio = document.querySelector(`input[name="explain-level"][value="${level}"]`);
  if (radio) radio.checked = true;
  hideAlert();
}

function resetExplain() {
  document.getElementById('explain-topic').value = '';
  document.getElementById('explain-subject').value = '';
  document.querySelector('input[name="explain-level"][value="Intermediate"]').checked = true;
  document.getElementById('results-explain').classList.add('hidden');
  document.getElementById('output-explain-content').innerHTML = '';
  hideAlert();
}

async function handleExplainSubmit(e) {
  e.preventDefault();
  hideAlert();

  const topicInput = document.getElementById('explain-topic');
  const subjectInput = document.getElementById('explain-subject');
  const levelInput = document.querySelector('input[name="explain-level"]:checked');

  const topic = topicInput.value.trim();
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const level = levelInput ? levelInput.value : 'Intermediate';

  if (!topic) {
    topicInput.classList.add('input-error');
    showAlert('Input Required', 'Please enter a topic name to explain.', 'error');
    topicInput.focus();
    return;
  }
  topicInput.classList.remove('input-error');

  // Problem D Fix: Strict UI State Management & Guaranteed Finally Reset
  const btn = document.getElementById('btn-explain-submit');
  const spinner = document.getElementById('spinner-explain');
  const btnText = document.getElementById('btn-text-explain');

  btn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Gemma 4 is Explaining...';

  // 30-second client timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, subject, level }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Problem B Fix: Clear backend error reporting
      const errorMsg = data.error || 'Failed to explain topic.';
      const guidance = data.guidance ? `\n${data.guidance}` : '';
      showAlert('Explanation Failed', `${errorMsg}${guidance}`, 'error');
      return;
    }

    // Display Result
    document.getElementById('result-explain-level').textContent = `${data.level} Level`;
    document.getElementById('result-explain-subject').textContent = data.subject || 'General Academic';
    document.getElementById('output-explain-content').innerHTML = renderMarkdown(data.content);

    const resultCard = document.getElementById('results-explain');
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (err.name === 'AbortError') {
      showAlert('Request Timeout', 'The explanation took longer than 30 seconds. Please check server connection.', 'error');
    } else {
      showAlert('Connection Error', err.message || 'Could not connect to the StudyMate server.', 'error');
    }
  } finally {
    // Guaranteed reset
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Explain with AI`;
  }
}

// --------------------------------------------------------------------------
// FEATURE B: SUMMARIZE NOTES
// --------------------------------------------------------------------------
const SAMPLE_NOTES = {
  os: `Operating Systems: Process Synchronization & Deadlocks
Professor Davis - Lecture 7

1. Critical Section Problem:
A critical section is a segment of code where processes access shared resources (memory, printers, files).
Requirements for solution:
- Mutual Exclusion: Only one process can execute in its critical section at a time.
- Progress: If no process is in critical section, only processes wishing to enter can participate in selection.
- Bounded Waiting: A limit must exist on times other processes can enter after request is made.

2. Mutex & Semaphores:
- Mutex: Binary lock with acquire() and release().
- Counting Semaphore: Integer value controlling access to N resource instances.
- wait() / P: Decrements count. Blocks process if negative.
- signal() / V: Increments count. Unblocks waiting process.

3. The Four Coffman Deadlock Conditions:
All four must hold simultaneously for a deadlock:
1. Mutual Exclusion: At least one resource held in non-shareable mode.
2. Hold and Wait: Process holds resource while requesting others.
3. No Preemption: Resources cannot be confiscated; released only voluntarily.
4. Circular Wait: P0 waits for P1, P1 waits for P2 ... Pn waits for P0.`,

  bio: `Cellular Respiration & Energy Metabolism
Overall Equation: C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ~30-32 ATP

Stage 1: Glycolysis
- Occurs in cytoplasm (cytosol).
- Anaerobic (requires no O2).
- Glucose (6-C) cleaved into 2 Pyruvate (3-C).
- Net yield: 2 ATP (substrate-level phosphorylation) and 2 NADH.

Stage 2: Pyruvate Oxidation (Mitochondrial Matrix)
- Pyruvate converted to Acetyl-CoA (2-C) + CO2.
- Produces 1 NADH per pyruvate (2 per glucose).

Stage 3: Citric Acid Cycle (Krebs Cycle)
- Acetyl-CoA combines with Oxaloacetate to form Citrate.
- 2 turns per glucose yield: 2 ATP/GTP, 6 NADH, 2 FADH2, 4 CO2.

Stage 4: Oxidative Phosphorylation
- Electron Transport Chain on inner mitochondrial cristae.
- Final electron acceptor: Oxygen, producing H2O.
- Proton gradient drives ATP Synthase rotor.
- Net ATP: ~26-28 ATP from oxidative phosphorylation alone.`
};

function fillSampleNotes(key) {
  const notesText = SAMPLE_NOTES[key] || '';
  const textarea = document.getElementById('summarize-notes');
  if (textarea) {
    textarea.value = notesText;
    updateNotesCounter();
  }
  hideAlert();
}

function updateNotesCounter() {
  const textarea = document.getElementById('summarize-notes');
  const counter = document.getElementById('notes-char-counter');
  if (textarea && counter) {
    const len = textarea.value.length;
    counter.textContent = `${len} chars`;
  }
}

function resetSummarize() {
  document.getElementById('summarize-notes').value = '';
  document.querySelector('input[name="summary-style"][value="Detailed"]').checked = true;
  document.getElementById('results-summarize').classList.add('hidden');
  document.getElementById('output-summarize-content').innerHTML = '';
  updateNotesCounter();
  hideAlert();
}

async function handleSummarizeSubmit(e) {
  e.preventDefault();
  hideAlert();

  const notesInput = document.getElementById('summarize-notes');
  const styleInput = document.querySelector('input[name="summary-style"]:checked');

  const notes = notesInput.value.trim();
  const style = styleInput ? styleInput.value : 'Detailed';

  if (!notes || notes.length < 10) {
    notesInput.classList.add('input-error');
    showAlert('Notes Required', 'Please paste at least 10 characters of study notes.', 'error');
    notesInput.focus();
    return;
  }
  notesInput.classList.remove('input-error');

  const btn = document.getElementById('btn-summarize-submit');
  const spinner = document.getElementById('spinner-summarize');
  const btnText = document.getElementById('btn-text-summarize');

  btn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Gemma 4 is Summarizing...';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, style }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data.error || 'Failed to summarize notes.';
      const guidance = data.guidance ? `\n${data.guidance}` : '';
      showAlert('Summarization Failed', `${errorMsg}${guidance}`, 'error');
      return;
    }

    document.getElementById('result-summary-style').textContent = `${data.style} Summary`;
    document.getElementById('output-summarize-content').innerHTML = renderMarkdown(data.content);

    const resultCard = document.getElementById('results-summarize');
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (err.name === 'AbortError') {
      showAlert('Request Timeout', 'Summarization took longer than 30 seconds. Please try again.', 'error');
    } else {
      showAlert('Connection Error', err.message || 'Could not connect to the StudyMate server.', 'error');
    }
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Summarize Notes`;
  }
}

// --------------------------------------------------------------------------
// FEATURE C: GENERATE QUIZ
// --------------------------------------------------------------------------
function fillQuiz(topic) {
  document.getElementById('quiz-topic').value = topic;
  hideAlert();
}

function resetQuiz() {
  document.getElementById('quiz-topic').value = '';
  document.getElementById('results-quiz').classList.add('hidden');
  document.getElementById('quiz-questions-list').innerHTML = '';
  document.getElementById('quiz-score-card').classList.add('hidden');
  activeQuizData = null;
  userQuizAnswers = {};
  isQuizGraded = false;
  hideAlert();
}

async function handleQuizSubmit(e) {
  e.preventDefault();
  hideAlert();

  const topicInput = document.getElementById('quiz-topic');
  const topic = topicInput.value.trim();

  if (!topic) {
    topicInput.classList.add('input-error');
    showAlert('Topic Required', 'Please enter a topic to generate a quiz.', 'error');
    topicInput.focus();
    return;
  }
  topicInput.classList.remove('input-error');

  const btn = document.getElementById('btn-quiz-submit');
  const spinner = document.getElementById('spinner-quiz');
  const btnText = document.getElementById('btn-text-quiz');

  btn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Gemma 4 is Formulating 5 Questions...';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data.error || 'Failed to generate quiz.';
      const guidance = data.guidance ? `\n${data.guidance}` : '';
      showAlert('Quiz Generation Failed', `${errorMsg}${guidance}`, 'error');
      return;
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      showAlert('Invalid Quiz Data', 'The model returned an empty quiz. Please try again.', 'error');
      return;
    }

    // Initialize Quiz State
    activeQuizData = data.questions;
    userQuizAnswers = {};
    isQuizGraded = false;

    renderQuizCards(data.topic, data.questions);

    const runner = document.getElementById('results-quiz');
    runner.classList.remove('hidden');
    runner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (err.name === 'AbortError') {
      showAlert('Request Timeout', 'Quiz generation took longer than expected. Please try again.', 'error');
    } else {
      showAlert('Connection Error', err.message || 'Could not connect to the StudyMate server.', 'error');
    }
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Generate 5-Question Quiz`;
  }
}

function renderQuizCards(topicName, questions) {
  document.getElementById('quiz-display-topic').textContent = topicName;
  document.getElementById('quiz-answered-count').textContent = '0';
  document.getElementById('btn-submit-quiz-answers').disabled = true;
  document.getElementById('quiz-submit-hint').textContent = `Please answer all ${questions.length} questions to view your final score.`;
  document.getElementById('quiz-score-card').classList.add('hidden');

  const container = document.getElementById('quiz-questions-list');
  container.innerHTML = '';

  questions.forEach((q, qIdx) => {
    const card = document.createElement('div');
    card.className = 'quiz-q-card';
    card.id = `q-card-${qIdx}`;

    let optionsHtml = '';
    q.options.forEach((opt, optIdx) => {
      const optLetter = String.fromCharCode(65 + optIdx);
      optionsHtml += `
        <button type="button" class="quiz-option-btn" id="opt-btn-${qIdx}-${optIdx}" onclick="selectQuizOption(${qIdx}, ${optIdx})">
          <span class="opt-prefix">${optLetter}</span>
          <span>${opt}</span>
        </button>
      `;
    });

    card.innerHTML = `
      <div class="quiz-q-header">
        <span class="quiz-q-num">${qIdx + 1}</span>
        <div class="quiz-q-text">${q.question}</div>
      </div>
      <div class="quiz-options-grid">
        ${optionsHtml}
      </div>
      <div class="quiz-explanation-box hidden" id="q-explanation-${qIdx}">
        <strong>Explanation:</strong> ${q.explanation}
      </div>
    `;

    container.appendChild(card);
  });
}

function selectQuizOption(questionIndex, optionIndex) {
  if (isQuizGraded || !activeQuizData) return;

  const question = activeQuizData[questionIndex];
  const selectedOption = question.options[optionIndex];

  // Save answer
  userQuizAnswers[questionIndex] = {
    optionIndex,
    value: selectedOption,
  };

  // Update button active state
  question.options.forEach((_, idx) => {
    const btn = document.getElementById(`opt-btn-${questionIndex}-${idx}`);
    if (btn) {
      btn.classList.toggle('selected', idx === optionIndex);
    }
  });

  // Mark question card answered
  const card = document.getElementById(`q-card-${questionIndex}`);
  if (card) card.classList.add('answered');

  // Update answered counter
  const answeredCount = Object.keys(userQuizAnswers).length;
  const total = activeQuizData.length;
  document.getElementById('quiz-answered-count').textContent = answeredCount;

  // Enable submit button if all questions answered
  const submitBtn = document.getElementById('btn-submit-quiz-answers');
  const submitHint = document.getElementById('quiz-submit-hint');

  if (answeredCount === total) {
    submitBtn.disabled = false;
    submitHint.textContent = 'All questions answered! Click above to calculate your score.';
  } else {
    submitBtn.disabled = true;
    submitHint.textContent = `Please answer question ${findFirstUnansweredIndex() + 1} of ${total} to submit.`;
  }
}

function findFirstUnansweredIndex() {
  if (!activeQuizData) return 0;
  for (let i = 0; i < activeQuizData.length; i++) {
    if (!userQuizAnswers[i]) return i;
  }
  return 0;
}

function gradeQuiz() {
  if (!activeQuizData || isQuizGraded) return;

  isQuizGraded = true;
  let correctCount = 0;
  const total = activeQuizData.length;

  activeQuizData.forEach((q, qIdx) => {
    const userChoice = userQuizAnswers[qIdx];
    const isCorrect = userChoice && userChoice.value.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

    if (isCorrect) correctCount++;

    // Highlight all option buttons
    q.options.forEach((opt, optIdx) => {
      const btn = document.getElementById(`opt-btn-${qIdx}-${optIdx}`);
      if (!btn) return;

      btn.disabled = true; // Prevent further clicking

      const isThisCorrect = opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      const isThisUserSelected = userChoice && userChoice.optionIndex === optIdx;

      if (isThisCorrect) {
        btn.classList.add('is-correct');
      } else if (isThisUserSelected && !isCorrect) {
        btn.classList.add('is-incorrect');
      }
    });

    // Reveal explanation
    const expBox = document.getElementById(`q-explanation-${qIdx}`);
    if (expBox) expBox.classList.remove('hidden');
  });

  // Hide submit bar
  document.getElementById('quiz-submit-bar').classList.add('hidden');

  // Render score card
  const percentage = Math.round((correctCount / total) * 100);
  const scoreCard = document.getElementById('quiz-score-card');
  const percentEl = document.getElementById('score-percentage');
  const titleEl = document.getElementById('score-title');
  const msgEl = document.getElementById('score-message');

  percentEl.textContent = `${percentage}%`;
  titleEl.textContent = `Score: ${correctCount} / ${total} Correct`;

  if (percentage === 100) {
    msgEl.textContent = 'Outstanding Mastery! You scored a perfect 100% on this topic!';
  } else if (percentage >= 80) {
    msgEl.textContent = 'Great Job! You have a solid grasp of this material.';
  } else if (percentage >= 60) {
    msgEl.textContent = 'Good Effort! Review the explanations below to master the nuances.';
  } else {
    msgEl.textContent = 'Keep Studying! Read the step-by-step explanations below and retry the quiz.';
  }

  scoreCard.classList.remove('hidden');
  scoreCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function retryCurrentQuiz() {
  if (!activeQuizData) return;

  isQuizGraded = false;
  userQuizAnswers = {};

  activeQuizData.forEach((q, qIdx) => {
    q.options.forEach((_, optIdx) => {
      const btn = document.getElementById(`opt-btn-${qIdx}-${optIdx}`);
      if (btn) {
        btn.disabled = false;
        btn.className = 'quiz-option-btn';
      }
    });

    const expBox = document.getElementById(`q-explanation-${qIdx}`);
    if (expBox) expBox.classList.add('hidden');

    const card = document.getElementById(`q-card-${qIdx}`);
    if (card) card.classList.remove('answered');
  });

  document.getElementById('quiz-answered-count').textContent = '0';
  document.getElementById('btn-submit-quiz-answers').disabled = true;
  document.getElementById('quiz-submit-hint').textContent = `Please answer all ${activeQuizData.length} questions to view your final score.`;
  document.getElementById('quiz-submit-bar').classList.remove('hidden');
  document.getElementById('quiz-score-card').classList.add('hidden');

  const runner = document.getElementById('results-quiz');
  runner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

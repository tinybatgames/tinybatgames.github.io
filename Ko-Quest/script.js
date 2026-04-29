(() => {
  const STORAGE_KEY = 'ko-quiz-best-score';

  const state = {
    allQuestions: [],
    gameQuestions: [],
    currentIndex: 0,
    score: 0,
    questionCount: 10,
    selectedCategory: 'Tümü',
    answered: false,
  };

  const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
  };

  const els = {
    categorySelect: document.getElementById('category'),
    countButtons: document.getElementById('count-buttons'),
    startBtn: document.getElementById('start-btn'),
    bestScoreRow: document.getElementById('best-score-row'),
    bestScoreValue: document.getElementById('best-score-value'),

    currentQ: document.getElementById('current-q'),
    totalQ: document.getElementById('total-q'),
    scoreValue: document.getElementById('score-value'),
    progressFill: document.getElementById('progress-fill'),
    categoryPill: document.getElementById('category-pill'),
    questionText: document.getElementById('question-text'),
    options: document.getElementById('options'),
    nextBtn: document.getElementById('next-btn'),

    trophy: document.getElementById('trophy'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    finalScore: document.getElementById('final-score'),
    finalAccuracy: document.getElementById('final-accuracy'),
    finalBest: document.getElementById('final-best'),
    playAgainBtn: document.getElementById('play-again-btn'),
    homeBtn: document.getElementById('home-btn'),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  async function loadQuestions() {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Sorular yüklenemedi');
    const data = await res.json();
    state.allQuestions = data.questions;
  }

  function populateCategories() {
    const categories = ['Tümü', ...new Set(state.allQuestions.map((q) => q.category))];
    els.categorySelect.innerHTML = categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join('');
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getBestScore() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }

  function saveBestScore(score) {
    const best = getBestScore();
    if (score > best) {
      localStorage.setItem(STORAGE_KEY, String(score));
      return true;
    }
    return false;
  }

  function refreshBestScoreDisplay() {
    const best = getBestScore();
    if (best > 0) {
      els.bestScoreRow.hidden = false;
      els.bestScoreValue.textContent = best;
    } else {
      els.bestScoreRow.hidden = true;
    }
  }

  function startGame() {
    let pool = state.allQuestions;
    if (state.selectedCategory !== 'Tümü') {
      pool = pool.filter((q) => q.category === state.selectedCategory);
    }
    state.gameQuestions = shuffle(pool).slice(0, state.questionCount);
    state.currentIndex = 0;
    state.score = 0;

    if (state.gameQuestions.length === 0) {
      alert('Bu kategoride soru bulunamadı.');
      return;
    }

    els.totalQ.textContent = state.gameQuestions.length;
    els.scoreValue.textContent = '0';
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.gameQuestions[state.currentIndex];
    state.answered = false;

    els.currentQ.textContent = state.currentIndex + 1;
    els.categoryPill.textContent = q.category;
    els.questionText.textContent = q.question;
    els.nextBtn.hidden = true;

    const progress = (state.currentIndex / state.gameQuestions.length) * 100;
    els.progressFill.style.width = `${progress}%`;

    els.options.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.type = 'button';
      btn.innerHTML = `<span class="option-letter">${letters[idx]}</span><span>${opt}</span>`;
      btn.addEventListener('click', () => handleAnswer(idx, btn));
      els.options.appendChild(btn);
    });
  }

  function handleAnswer(selectedIdx, btn) {
    if (state.answered) return;
    state.answered = true;

    const q = state.gameQuestions[state.currentIndex];
    const correctIdx = q.correctAnswer;
    const buttons = els.options.querySelectorAll('.option');

    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === correctIdx) b.classList.add('correct');
    });

    if (selectedIdx === correctIdx) {
      state.score++;
      els.scoreValue.textContent = state.score;
    } else {
      btn.classList.add('wrong');
    }

    const progress = ((state.currentIndex + 1) / state.gameQuestions.length) * 100;
    els.progressFill.style.width = `${progress}%`;

    const isLast = state.currentIndex === state.gameQuestions.length - 1;
    els.nextBtn.textContent = isLast ? 'Sonuçları Gör →' : 'Sonraki Soru →';
    els.nextBtn.hidden = false;
  }

  function nextQuestion() {
    if (state.currentIndex >= state.gameQuestions.length - 1) {
      finishGame();
      return;
    }
    state.currentIndex++;
    renderQuestion();
  }

  function finishGame() {
    const total = state.gameQuestions.length;
    const accuracy = Math.round((state.score / total) * 100);
    const isNewBest = saveBestScore(state.score);
    const best = getBestScore();

    els.finalScore.textContent = `${state.score}/${total}`;
    els.finalAccuracy.textContent = `${accuracy}%`;
    els.finalBest.textContent = best;

    let trophy = '🎯';
    let title = 'İyi Denedin!';
    let message = 'Daha fazla pratik yaparak gelişebilirsin.';

    if (accuracy === 100) {
      trophy = '👑';
      title = 'Mükemmel!';
      message = 'Bütün soruları doğru cevapladın, gerçek bir efsanesin!';
    } else if (accuracy >= 80) {
      trophy = '🏆';
      title = 'Harika!';
      message = 'Knight Online bilgin gerçekten etkileyici.';
    } else if (accuracy >= 60) {
      trophy = '🥈';
      title = 'Çok İyi!';
      message = 'Güzel bir performans, biraz daha çalışmayla zirveye çıkabilirsin.';
    } else if (accuracy >= 40) {
      trophy = '🥉';
      title = 'Fena Değil!';
      message = 'Temel bilgilerin var, gelişmek için tekrar dene.';
    }

    if (isNewBest && state.score > 0) {
      message = '🎉 Yeni en iyi skor! ' + message;
    }

    els.trophy.textContent = trophy;
    els.resultTitle.textContent = title;
    els.resultMessage.textContent = message;

    showScreen('result');
  }

  function bindEvents() {
    els.countButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      els.countButtons.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.questionCount = parseInt(btn.dataset.count, 10);
    });

    els.categorySelect.addEventListener('change', (e) => {
      state.selectedCategory = e.target.value;
    });

    els.startBtn.addEventListener('click', startGame);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.playAgainBtn.addEventListener('click', startGame);
    els.homeBtn.addEventListener('click', () => {
      refreshBestScoreDisplay();
      showScreen('start');
    });
  }

  async function init() {
    try {
      await loadQuestions();
      populateCategories();
      refreshBestScoreDisplay();
      bindEvents();
    } catch (err) {
      document.querySelector('.app').innerHTML = `
        <div class="card" style="text-align:center;">
          <h1 style="margin-bottom:12px;">Hata</h1>
          <p class="subtitle">Sorular yüklenemedi: ${err.message}</p>
          <p class="subtitle" style="margin-top:12px;font-size:13px;">
            Yerel olarak test ediyorsanız, dosyaları bir web sunucusu üzerinden açmanız gerekir
            (örn. <code>python -m http.server</code>) veya doğrudan GitHub Pages üzerinden açın.
          </p>
        </div>
      `;
    }
  }

  init();
})();

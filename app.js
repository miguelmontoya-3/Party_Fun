/* PartyFun Web - Game Logic (Time's Up Rules & Extreme Randomness) */

document.addEventListener("DOMContentLoaded", () => {
  // --- GAME STATE ---
  const state = {
    teams: [
      { name: "Equipo Alfa", scores: [0, 0, 0], totalScore: 0 },
      { name: "Equipo Beta", scores: [0, 0, 0], totalScore: 0 }
    ],
    currentTeamIndex: 0,
    currentRound: 1,
    selectedTime: 60,
    selectedCategories: [],
    
    gamePool: [],  // Fixed 40 words for the entire game
    roundPool: [], // Words remaining to guess in the current round
    passedWordsThisTurn: [], // Temporary storage for words passed in the active turn
    
    // Turn State
    turnWords: [], // List of { word, categoryKey, categoryName, icon, color, correct } played this turn
    timeLeft: 60,
    timerInterval: null,
    turnScore: 0,
    
    // Audio Context
    audioCtx: null
  };

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  function initAudio() {
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTone(freq, type, duration, volume = 0.1) {
    try {
      initAudio();
      if (!state.audioCtx) return;
      
      if (state.audioCtx.state === "suspended") {
        state.audioCtx.resume();
      }

      const osc = state.audioCtx.createOscillator();
      const gainNode = state.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);

      gainNode.gain.setValueAtTime(volume, state.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  const sounds = {
    correct: () => {
      playTone(523.25, "sine", 0.1, 0.15); // C5
      setTimeout(() => playTone(659.25, "sine", 0.1, 0.15), 60); // E5
      setTimeout(() => playTone(783.99, "sine", 0.2, 0.2), 120); // G5
    },
    pass: () => {
      playTone(330, "triangle", 0.12, 0.2); // E4
      setTimeout(() => playTone(220, "triangle", 0.25, 0.2), 100); // A3
    },
    tick: (isLow) => {
      playTone(isLow ? 1500 : 1000, "sine", 0.03, isLow ? 0.08 : 0.05);
    },
    timeUp: () => {
      playTone(293.66, "sawtooth", 0.15, 0.2); // D4
      setTimeout(() => playTone(220.00, "sawtooth", 0.4, 0.25), 150); // A3
    },
    click: () => {
      playTone(600, "sine", 0.04, 0.05);
    }
  };

  // --- CONFETTI EFFECT (Canvas-based) ---
  const confettiCanvas = document.getElementById("confetti-canvas");
  const ctx = confettiCanvas.getContext("2d");
  let confettiParticles = [];
  let confettiAnimFrame = null;

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeConfettiCanvas);
  resizeConfettiCanvas();

  class ConfettiParticle {
    constructor() {
      this.x = Math.random() * confettiCanvas.width;
      this.y = Math.random() * confettiCanvas.height - confettiCanvas.height;
      this.size = Math.random() * 8 + 6;
      this.color = ["#ff3366", "#33ccff", "#ffcc00", "#cc33ff", "#33ff66", "#ff6633"][Math.floor(Math.random() * 6)];
      this.speedX = Math.random() * 4 - 2;
      this.speedY = Math.random() * 5 + 3;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 4 - 2;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      if (this.y > confettiCanvas.height) {
        this.y = -20;
        this.x = Math.random() * confettiCanvas.width;
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.restore();
    }
  }

  function startConfetti() {
    stopConfetti();
    confettiCanvas.style.display = "block";
    confettiParticles = Array.from({ length: 120 }, () => new ConfettiParticle());
    
    function animate() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiParticles.forEach(p => {
        p.update();
        p.draw();
      });
      confettiAnimFrame = requestAnimationFrame(animate);
    }
    animate();
  }

  function stopConfetti() {
    if (confettiAnimFrame) {
      cancelAnimationFrame(confettiAnimFrame);
      confettiAnimFrame = null;
    }
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiCanvas.style.display = "none";
  }

  // --- UI NAVIGATION ---
  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(scr => {
      scr.classList.remove("active");
    });
    const target = document.getElementById(screenId);
    target.classList.add("active");
  }

  // --- CATEGORIES SELECTOR ---
  const selector = document.getElementById("categories-selector");
  
  function buildCategoriesList() {
    selector.innerHTML = "";
    Object.keys(GAME_CATEGORIES).forEach(key => {
      const cat = GAME_CATEGORIES[key];
      const pill = document.createElement("div");
      pill.className = "category-pill active"; // Active by default
      pill.style.setProperty("--category-color", cat.color);
      
      const rgb = hexToRgb(cat.color);
      if (rgb) {
        pill.style.setProperty("--category-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }

      pill.innerHTML = `
        <span class="icon">${cat.icon}</span>
        <span class="name">${cat.name}</span>
      `;
      
      pill.addEventListener("click", () => {
        sounds.click();
        const index = state.selectedCategories.indexOf(key);
        if (index > -1) {
          if (state.selectedCategories.length > 1) {
            state.selectedCategories.splice(index, 1);
            pill.classList.remove("active");
          }
        } else {
          state.selectedCategories.push(key);
          pill.classList.add("active");
        }
      });

      state.selectedCategories.push(key);
      selector.appendChild(pill);
    });
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  buildCategoriesList();

  // Setup turn timer options
  document.querySelectorAll(".time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      sounds.click();
      document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedTime = parseInt(btn.getAttribute("data-time"), 10);
    });
  });

  // --- INITIALIZE GAME & GAMEPOOL ---
  const teamAInput = document.getElementById("team-a-input");
  const teamBInput = document.getElementById("team-b-input");
  const btnStartGame = document.getElementById("btn-start-game");

  btnStartGame.addEventListener("click", () => {
    sounds.click();
    initAudio();
    
    // Names
    state.teams[0].name = teamAInput.value.trim() || "Equipo Alfa";
    state.teams[1].name = teamBInput.value.trim() || "Equipo Beta";
    
    // Scores
    state.teams.forEach(t => {
      t.scores = [0, 0, 0];
      t.totalScore = 0;
    });

    state.currentRound = 1;
    state.currentTeamIndex = 0;

    // Pick 40 random words from selected categories
    initGameWordPool();

    // Prepare Round 1
    state.roundPool = [...state.gamePool];
    prepareTransitionScreen();
  });

  function initGameWordPool() {
    let combinedWords = [];
    state.selectedCategories.forEach(catKey => {
      const cat = GAME_CATEGORIES[catKey];
      cat.words.forEach(w => {
        combinedWords.push({
          word: w,
          categoryKey: catKey,
          categoryName: cat.name,
          icon: cat.icon,
          color: cat.color
        });
      });
    });

    // Shuffle and pick 40 unique words
    const shuffled = shuffleArray(combinedWords);
    state.gamePool = shuffled.slice(0, Math.min(40, shuffled.length));
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- ROUND TRANSITION SCREEN ---
  const transitionRoundBadge = document.getElementById("transition-round-badge");
  const transitionRoundTitle = document.getElementById("transition-round-title");
  const transitionRoundDesc = document.getElementById("transition-round-desc");
  const transitionTeamName = document.getElementById("transition-team-name");
  const btnStartTurn = document.getElementById("btn-start-turn");

  const ROUND_DETAILS = {
    1: {
      title: "Descripción Libre",
      desc: "Describe la palabra usando tantas palabras como quieras. ¡No puedes usar palabras prohibidas, derivadas ni hacer mímica!"
    },
    2: {
      title: "Una Sola Palabra",
      desc: "Describe la palabra dando únicamente UNA palabra pista. Tu equipo solo tiene un intento para responder. ¡Piensa bien!"
    },
    3: {
      title: "Mímica y Sonidos",
      desc: "¡Prohibido hablar! Describe la palabra haciendo gestos, mímica o tarareando. No puedes señalar objetos reales."
    }
  };

  function prepareTransitionScreen() {
    stopConfetti();
    const rd = ROUND_DETAILS[state.currentRound];
    transitionRoundBadge.innerText = `Ronda ${state.currentRound}`;
    transitionRoundTitle.innerText = rd.title;
    transitionRoundDesc.innerText = `${rd.desc} (${state.roundPool.length} palabras restantes en el mazo).`;
    transitionTeamName.innerText = state.teams[state.currentTeamIndex].name;
    
    showScreen("screen-transition");
  }

  // --- ACTIVE GAMEPLAY ---
  const gameTeamTitle = document.getElementById("game-team-title");
  const gameRoundTitle = document.getElementById("game-round-title");
  const timerText = document.getElementById("timer-text");
  const timerProgress = document.getElementById("timer-progress");
  const gameTurnScore = document.getElementById("game-turn-score");
  
  btnStartTurn.addEventListener("click", () => {
    sounds.click();
    startTurn();
  });

  function startTurn() {
    state.timeLeft = state.selectedTime;
    state.turnScore = 0;
    state.turnWords = [];
    state.passedWordsThisTurn = []; // Reset passed words for this turn
    
    // Shuffling extreme randomness: Shuffle the remaining round pool at the start of every turn
    state.roundPool = shuffleArray(state.roundPool);

    gameTeamTitle.innerText = state.teams[state.currentTeamIndex].name;
    gameRoundTitle.innerText = `Ronda ${state.currentRound}: ${ROUND_DETAILS[state.currentRound].title}`;
    
    updateTimerUI();
    updateCardUI();
    gameTurnScore.innerText = "0";

    showScreen("screen-game");
    setupCardDrag();

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      updateTimerUI();

      if (state.timeLeft <= 0) {
        endTurn();
      } else if (state.timeLeft <= 5) {
        sounds.tick(true);
      } else {
        sounds.tick(false);
      }
    }, 1000);
  }

  function updateTimerUI() {
    timerText.innerText = state.timeLeft;
    const circumference = 283;
    const progress = state.timeLeft / state.selectedTime;
    const offset = circumference - (progress * circumference);
    timerProgress.style.strokeDashoffset = offset;
    
    if (state.timeLeft <= 5) {
      timerProgress.classList.add("warning");
    } else {
      timerProgress.classList.remove("warning");
    }
  }

  function updateCardUI() {
    if (state.roundPool.length === 0) {
      // If mazo is empty, end turn immediately (end of round)
      endTurn();
      return;
    }

    const card = document.getElementById("word-card");
    const cardWord = document.getElementById("card-word");
    const cardCategory = document.getElementById("card-category");
    const feedbackCorrect = document.querySelector(".card-feedback.correct");
    const feedbackPass = document.querySelector(".card-feedback.pass");

    if (!card || !cardWord || !cardCategory || !feedbackCorrect || !feedbackPass) return;

    // Active card is always the first card in the deck
    const wordObj = state.roundPool[0];

    cardWord.innerText = wordObj.word;
    cardCategory.innerHTML = `<span>${wordObj.icon}</span> ${wordObj.categoryName}`;
    cardCategory.style.background = `rgba(${hexToRgbString(wordObj.color)}, 0.15)`;
    cardCategory.style.borderColor = wordObj.color;
    cardCategory.style.color = wordObj.color;

    card.classList.remove("swipe-left-anim", "swipe-right-anim");
    card.style.transform = "translate(0px, 0px) rotate(0deg)";
    
    feedbackCorrect.style.opacity = 0;
    feedbackPass.style.opacity = 0;
  }

  function hexToRgbString(hex) {
    const rgb = hexToRgb(hex);
    return rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "255,255,255";
  }

  // --- DRAG / SWIPE GESTURES ---
  function setupCardDrag() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    const threshold = 130;

    let card = document.getElementById("word-card");
    if (!card) return;

    // Remove old listeners to prevent stacking
    const newCard = card.cloneNode(true);
    if (card.parentNode) {
      card.parentNode.replaceChild(newCard, card);
      card = newCard; // Update reference
    } else {
      return;
    }

    card.addEventListener("touchstart", dragStart, { passive: true });
    card.addEventListener("mousedown", dragStart);

    function dragStart(e) {
      if (state.timeLeft <= 0 || state.roundPool.length === 0) return;
      isDragging = true;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      startX = clientX;
      startY = clientY;
      card.style.transition = "none";

      // Listen on document during active drag
      document.addEventListener("touchmove", dragMove, { passive: false });
      document.addEventListener("touchend", dragEnd);
      document.addEventListener("mousemove", dragMove);
      document.addEventListener("mouseup", dragEnd);
    }

    function dragMove(e) {
      if (!isDragging) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      currentX = clientX - startX;
      currentY = clientY - startY;

      if (e.cancelable) e.preventDefault();

      const rotate = currentX * 0.08;
      card.style.transform = `translate(${currentX}px, ${currentY * 0.3}px) rotate(${rotate}deg)`;

      const feedbackCorrect = document.querySelector(".card-feedback.correct");
      const feedbackPass = document.querySelector(".card-feedback.pass");
      if (feedbackCorrect && feedbackPass) {
        if (currentX > 20) {
          feedbackCorrect.style.opacity = Math.min(currentX / threshold, 1);
          feedbackPass.style.opacity = 0;
        } else if (currentX < -20) {
          feedbackPass.style.opacity = Math.min(Math.abs(currentX) / threshold, 1);
          feedbackCorrect.style.opacity = 0;
        } else {
          feedbackCorrect.style.opacity = 0;
          feedbackPass.style.opacity = 0;
        }
      }
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;

      // Clean up document listeners
      document.removeEventListener("touchmove", dragMove);
      document.removeEventListener("touchend", dragEnd);
      document.removeEventListener("mousemove", dragMove);
      document.removeEventListener("mouseup", dragEnd);

      card.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

      if (currentX > threshold) {
        handleGuessResult(true);
      } else if (currentX < -threshold) {
        handleGuessResult(false);
      } else {
        card.style.transform = "translate(0px, 0px) rotate(0deg)";
        const feedbackCorrect = document.querySelector(".card-feedback.correct");
        const feedbackPass = document.querySelector(".card-feedback.pass");
        if (feedbackCorrect && feedbackPass) {
          feedbackCorrect.style.opacity = 0;
          feedbackPass.style.opacity = 0;
        }
      }
      
      startX = startY = currentX = currentY = 0;
    }
  }

  function handleGuessResult(isCorrect) {
    if (state.roundPool.length === 0) return;
    
    const playedCard = state.roundPool.shift();
    const card = document.getElementById("word-card");

    if (isCorrect) {
      sounds.correct();
      state.turnScore++;
      gameTurnScore.innerText = state.turnScore;
      state.turnWords.push({ ...playedCard, correct: true });

      if (card) {
        card.style.transition = "transform 0.3s ease-in, opacity 0.3s ease-in";
        card.classList.add("swipe-right-anim");
      }
    } else {
      sounds.pass();
      state.turnWords.push({ ...playedCard, correct: false });
      state.passedWordsThisTurn.push(playedCard);

      if (card) {
        card.style.transition = "transform 0.3s ease-in, opacity 0.3s ease-in";
        card.classList.add("swipe-left-anim");
      }
    }

    // Refresh layout after animations
    setTimeout(() => {
      updateCardUI();
    }, 250);
  }

  // Touch controls callback (fallback buttons)
  document.getElementById("btn-game-correct").addEventListener("click", () => {
    if (state.timeLeft > 0 && state.roundPool.length > 0) handleGuessResult(true);
  });
  document.getElementById("btn-game-pass").addEventListener("click", () => {
    if (state.timeLeft > 0 && state.roundPool.length > 0) handleGuessResult(false);
  });

  // --- END TURN & SUMMARY ---
  const summaryWordList = document.getElementById("summary-word-list");
  const summaryTurnScore = document.getElementById("summary-turn-score");
  const btnSaveSummary = document.getElementById("btn-save-summary");

  function endTurn() {
    clearInterval(state.timerInterval);
    sounds.timeUp();
    
    // Recycle passed words back into the roundPool randomly at the end of the turn
    state.passedWordsThisTurn.forEach(wordObj => {
      const randIdx = Math.floor(Math.random() * (state.roundPool.length + 1));
      state.roundPool.splice(randIdx, 0, wordObj);
    });
    state.passedWordsThisTurn = []; // Clear temporary pool
    
    // If turn ended by time, the active card at index 0 was NOT answered.
    // It stays in state.roundPool, and will be naturally shuffled at the start of the next turn!
    
    prepareSummaryScreen();
  }

  function prepareSummaryScreen() {
    summaryWordList.innerHTML = "";
    
    if (state.turnWords.length === 0) {
      summaryWordList.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-secondary); padding: 2rem;">No se jugó ninguna palabra en este turno.</div>`;
    }

    state.turnWords.forEach((wordObj, index) => {
      const cardItem = document.createElement("div");
      cardItem.className = `word-summary-item ${wordObj.correct ? 'correct' : 'pass'}`;
      cardItem.innerHTML = `
        <div class="word-text">${wordObj.icon} ${wordObj.word}</div>
        <button class="word-toggle-btn">${wordObj.correct ? 'Acierto' : 'Pasa'}</button>
      `;

      cardItem.querySelector(".word-toggle-btn").addEventListener("click", (e) => {
        sounds.click();
        wordObj.correct = !wordObj.correct;
        
        // Correcting summary elements dynamically adjusts roundPool
        if (wordObj.correct) {
          // Changed from Pass ➔ Correct: Remove it from roundPool
          const idx = state.roundPool.findIndex(w => w.word === wordObj.word);
          if (idx > -1) {
            state.roundPool.splice(idx, 1);
          }
        } else {
          // Changed from Correct ➔ Pass: Insert it back into roundPool at a random index
          const randIdx = Math.floor(Math.random() * (state.roundPool.length + 1));
          state.roundPool.splice(randIdx, 0, {
            word: wordObj.word,
            categoryKey: wordObj.categoryKey,
            categoryName: wordObj.categoryName,
            icon: wordObj.icon,
            color: wordObj.color
          });
        }

        cardItem.className = `word-summary-item ${wordObj.correct ? 'correct' : 'pass'}`;
        e.target.innerText = wordObj.correct ? 'Acierto' : 'Pasa';
        
        recalculateTurnScore();
      });

      summaryWordList.appendChild(cardItem);
    });

    recalculateTurnScore();
    showScreen("screen-summary");
  }

  function recalculateTurnScore() {
    const finalScore = state.turnWords.filter(w => w.correct).length;
    state.turnScore = finalScore;
    summaryTurnScore.innerText = finalScore;
  }

  // Save turn score and alternate teams or rounds
  btnSaveSummary.addEventListener("click", () => {
    sounds.click();
    
    // Add points to active team
    const activeTeam = state.teams[state.currentTeamIndex];
    activeTeam.scores[state.currentRound - 1] += state.turnScore;
    
    if (state.roundPool.length === 0) {
      // Round completed! (all 40 words guessed)
      if (state.currentRound < 3) {
        // Advance round
        state.currentRound++;
        // Reset round mazo: copy original 40 words and prepare
        state.roundPool = [...state.gamePool];
        
        // Alternate starting team for the new round
        state.currentTeamIndex = state.currentTeamIndex === 0 ? 1 : 0;
        prepareTransitionScreen();
      } else {
        // End of Game!
        endGame();
      }
    } else {
      // Round continues: alternate turn to the other team
      state.currentTeamIndex = state.currentTeamIndex === 0 ? 1 : 0;
      prepareTransitionScreen();
    }
  });

  // --- GAME OVER SCREEN ---
  const winnerName = document.getElementById("winner-name");
  const finalScoreboard = document.getElementById("final-scoreboard");
  const btnRestartGame = document.getElementById("btn-restart-game");
  const btnNewGame = document.getElementById("btn-new-game");

  function endGame() {
    state.teams.forEach(t => {
      t.totalScore = t.scores[0] + t.scores[1] + t.scores[2];
    });

    let winnerText = "";
    let isTie = false;
    
    if (state.teams[0].totalScore > state.teams[1].totalScore) {
      winnerText = `¡${state.teams[0].name.toUpperCase()} GANA!`;
    } else if (state.teams[1].totalScore > state.teams[0].totalScore) {
      winnerText = `¡${state.teams[1].name.toUpperCase()} GANA!`;
    } else {
      winnerText = "¡EMPATE!";
      isTie = true;
    }

    winnerName.innerText = winnerText;
    
    finalScoreboard.innerHTML = "";
    state.teams.forEach((t, idx) => {
      const isWinner = !isTie && (
        (idx === 0 && state.teams[0].totalScore > state.teams[1].totalScore) ||
        (idx === 1 && state.teams[1].totalScore > state.teams[0].totalScore)
      );

      const teamBox = document.createElement("div");
      teamBox.className = `scoreboard-team-box ${isWinner ? 'winner' : ''}`;
      teamBox.innerHTML = `
        <h3>${t.name}</h3>
        <div class="final-points">${t.totalScore} pts</div>
        <div class="round-breakdown">
          <div>R1 (Descripción): ${t.scores[0]} pts</div>
          <div>R2 (1 palabra): ${t.scores[1]} pts</div>
          <div>R3 (Mímica): ${t.scores[2]} pts</div>
        </div>
      `;
      finalScoreboard.appendChild(teamBox);
    });

    showScreen("screen-gameover");
    startConfetti();
  }

  btnRestartGame.addEventListener("click", () => {
    sounds.click();
    stopConfetti();
    
    state.teams.forEach(t => {
      t.scores = [0, 0, 0];
      t.totalScore = 0;
    });

    state.currentRound = 1;
    state.currentTeamIndex = 0;

    // Resets roundPool with the original 40 words from gamePool
    state.roundPool = [...state.gamePool];
    prepareTransitionScreen();
  });

  btnNewGame.addEventListener("click", () => {
    sounds.click();
    stopConfetti();
    showScreen("screen-home");
  });

});

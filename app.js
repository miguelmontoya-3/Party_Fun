/* PartyFun Web - Game Logic (Time's Up Rules & Extreme Randomness) */

document.addEventListener("DOMContentLoaded", () => {
  // --- FIREBASE CONFIGURATION ---
  const firebaseConfig = {
    apiKey: "AIzaSyAwh0i0b_LaKsDGfQ7nke0cKAttpD8fxRM",
    authDomain: "party-fun-2080e.firebaseapp.com",
    projectId: "party-fun-2080e",
    storageBucket: "party-fun-2080e.firebasestorage.app",
    messagingSenderId: "189073853948",
    appId: "1:189073853948:web:a5de21dbe56f4b092e3679",
    measurementId: "G-0W91MPG8WV",
    databaseURL: "https://party-fun-2080e-default-rtdb.firebaseio.com"
  };

  let database = null;
  try {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
      console.log("Firebase Realtime Database inicializada correctamente.");
    } else {
      console.warn("SDK de Firebase no detectado.");
    }
  } catch (e) {
    console.error("Error al inicializar Firebase:", e);
  }
  // --- GAME STATE ---
  const state = {
    teams: [
      { name: "Equipo Rojo", players: ["Elenica", "Marichula"], currentPlayerIndex: 0, scores: [0, 0, 0], totalScore: 0 },
      { name: "Equipo Azul", players: ["DarkAngela", "Alinooby"], currentPlayerIndex: 0, scores: [0, 0, 0], totalScore: 0 }
    ],
    currentTeamIndex: 0,
    currentRound: 1,
    selectedTime: 40,
    selectedCategories: [],
    isUsingBackend: false,

    gamePool: [],  // Fixed 40 words for the entire game
    roundPool: [], // Words remaining to guess in the current round
    passedWordsThisTurn: [], // Temporary storage for words passed in the active turn

    // Turn State
    turnWords: [], // List of { word, categoryKey, categoryName, icon, color, correct } played this turn
    timeLeft: 40,
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
      // Ascending retro arpeggio with high note harmony
      playTone(523.25, "triangle", 0.08, 0.15); // C5
      setTimeout(() => playTone(659.25, "triangle", 0.08, 0.15), 50); // E5
      setTimeout(() => playTone(783.99, "triangle", 0.08, 0.15), 100); // G5
      setTimeout(() => {
        playTone(1046.50, "sine", 0.18, 0.2); // C6
        playTone(1318.51, "sine", 0.15, 0.08); // E6 (Harmony)
      }, 150);
    },
    pass: () => {
      // Funny descending dissonant fail slide
      playTone(392.00, "sawtooth", 0.08, 0.12); // G4
      setTimeout(() => playTone(349.23, "sawtooth", 0.08, 0.10), 60); // F4
      setTimeout(() => playTone(311.13, "sawtooth", 0.08, 0.08), 120); // Eb4
      setTimeout(() => playTone(246.94, "triangle", 0.22, 0.15), 180); // B3
    },
    tick: (isLow) => {
      playTone(isLow ? 1500 : 1000, "sine", 0.03, isLow ? 0.08 : 0.05);
    },
    timeUp: () => {
      // Alerting double retro beep and buzz
      playTone(880, "sawtooth", 0.1, 0.15); // A5
      setTimeout(() => playTone(880, "sawtooth", 0.1, 0.15), 100); // A5
      setTimeout(() => playTone(440, "sawtooth", 0.35, 0.2), 200); // A4
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

  // --- CATEGORIES SELECTION & CREATION MODAL ---
  const btnEditCategories = document.getElementById("btn-edit-categories");
  const categoriesSelectedCountEl = document.getElementById("categories-selected-count");

  const categoriesModal = document.getElementById("categories-modal");
  const categoriesModalMain = document.getElementById("categories-modal-main");
  const categoriesModalClose = document.getElementById("categories-modal-close");
  const btnSaveCategories = document.getElementById("btn-save-categories");
  const modalCategoriesGrid = document.getElementById("modal-categories-grid");

  const newCategoryInput = document.getElementById("new-category-input");
  const btnCreateCategory = document.getElementById("btn-create-category");

  // Custom Category Words Panel elements
  const customCategoryWordsPanel = document.getElementById("custom-category-words-panel");
  const wordsPanelTitle = document.getElementById("words-panel-title");
  const btnBackToCategories = document.getElementById("btn-back-to-categories");
  const newWordInput = document.getElementById("new-word-input");
  const btnAddWord = document.getElementById("btn-add-word");
  const wordsCountLabel = document.getElementById("words-count-label");
  const btnClearWords = document.getElementById("btn-clear-words");
  const customWordsList = document.getElementById("custom-words-list");
  const btnSaveWords = document.getElementById("btn-save-words");

  let activeEditCategoryKey = null;

  function updateHomeCategoriesCount() {
    if (categoriesSelectedCountEl) {
      const count = state.selectedCategories.length;
      categoriesSelectedCountEl.innerText = `${count} ${count === 1 ? 'seleccionada' : 'seleccionadas'}`;
    }
  }

  function renderCategoriesModalGrid() {
    if (!modalCategoriesGrid) return;
    modalCategoriesGrid.innerHTML = "";

    Object.keys(GAME_CATEGORIES).forEach(key => {
      const cat = GAME_CATEGORIES[key];
      const pill = document.createElement("div");

      const isSelected = state.selectedCategories.includes(key);
      pill.className = `category-pill ${isSelected ? 'active' : ''}`;
      pill.style.setProperty("--category-color", cat.color);

      const rgb = hexToRgb(cat.color);
      if (rgb) {
        pill.style.setProperty("--category-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }

      const countSuffix = ` (${cat.words.length})`;
      const editIcon = '<span class="edit-words-icon" style="margin-left: auto; font-size: 0.95rem; cursor: pointer; padding: 0.15rem; transition: transform 0.15s ease;" title="Editar palabras">⚙️</span>';

      pill.innerHTML = `
        <span class="icon">${cat.icon}</span>
        <span class="name">${cat.name}${countSuffix}</span>
        ${editIcon}
      `;

      pill.addEventListener("click", () => {
        sounds.click();
        const idx = state.selectedCategories.indexOf(key);
        if (idx > -1) {
          if (state.selectedCategories.length > 1) {
            state.selectedCategories.splice(idx, 1);
            pill.classList.remove("active");
          } else {
            alert("Debes seleccionar al menos una categoría.");
          }
        } else {
          // Make sure the category has at least 1 word!
          if (cat.words.length === 0) {
            alert("No puedes seleccionar un mazo vacío. Añade palabras primero.");
            openWordsEditor(key);
            return;
          }
          state.selectedCategories.push(key);
          pill.classList.add("active");
        }
        updateHomeCategoriesCount();
      });

      // Bind gear icon
      const gear = pill.querySelector(".edit-words-icon");
      if (gear) {
        gear.addEventListener("click", (e) => {
          e.stopPropagation(); // Avoid toggling category selection
          sounds.click();
          openWordsEditor(key);
        });
        // Bouncing scale effect on hover
        gear.addEventListener("mouseover", () => { gear.style.transform = "scale(1.2) rotate(30deg)"; });
        gear.addEventListener("mouseout", () => { gear.style.transform = "scale(1) rotate(0deg)"; });
      }

      modalCategoriesGrid.appendChild(pill);
    });
  }

  function openWordsEditor(categoryKey) {
    activeEditCategoryKey = categoryKey;
    const cat = GAME_CATEGORIES[categoryKey];
    if (!cat) return;

    if (wordsPanelTitle) {
      wordsPanelTitle.innerText = `✍️ Editar Mazo: ${cat.name}`;
    }

    if (newWordInput) newWordInput.value = "";

    renderCustomWordsList();

    // Toggle panels
    if (categoriesModalMain) categoriesModalMain.style.display = "none";
    if (customCategoryWordsPanel) customCategoryWordsPanel.style.display = "block";
  }

  function renderCustomWordsList() {
    if (!customWordsList) return;
    customWordsList.innerHTML = "";

    const cat = GAME_CATEGORIES[activeEditCategoryKey];
    if (!cat) return;

    if (wordsCountLabel) {
      wordsCountLabel.innerText = `Palabras añadidas (${cat.words.length})`;
    }

    cat.words.forEach((word, index) => {
      const tag = document.createElement("div");
      tag.className = "player-tag";
      tag.innerHTML = `
        <span>${word}</span>
        <span class="remove-btn" data-index="${index}">&times;</span>
      `;

      tag.querySelector(".remove-btn").addEventListener("click", () => {
        sounds.click();
        cat.words.splice(index, 1);
        if (cat.words.length === 0) {
          const idx = state.selectedCategories.indexOf(activeEditCategoryKey);
          if (idx > -1) {
            state.selectedCategories.splice(idx, 1);
          }
          if (cat.isCustom) {
            delete GAME_CATEGORIES[activeEditCategoryKey];
          }
          saveCustomCategories();
          closeWordsEditor();
        } else {
          renderCustomWordsList();
          saveCustomCategories();
        }
      });

      customWordsList.appendChild(tag);
    });
  }

  function addWord() {
    if (!newWordInput || !activeEditCategoryKey) return;
    const word = newWordInput.value.trim();
    if (word) {
      sounds.click();
      const cat = GAME_CATEGORIES[activeEditCategoryKey];
      if (cat) {
        if (!cat.words.includes(word)) {
          cat.words.push(word);
        } else {
          alert("Esta palabra ya está en la lista.");
        }
      }
      newWordInput.value = "";
      renderCustomWordsList();
      saveCustomCategories();
    }
  }

  function createCategory() {
    if (!newCategoryInput) return;
    const name = newCategoryInput.value.trim();
    if (name) {
      sounds.click();
      const key = `custom_${Date.now()}`;

      // Add custom category structure to GAME_CATEGORIES
      GAME_CATEGORIES[key] = {
        name: name,
        icon: "🎨",
        color: "#8e2de2",
        words: [],
        isCustom: true
      };

      // Auto select it
      state.selectedCategories.push(key);

      newCategoryInput.value = "";
      renderCategoriesModalGrid();
      updateHomeCategoriesCount();
      saveCustomCategories();

      // Open word adder immediately
      openWordsEditor(key);
    }
  }

  function closeWordsEditor() {
    sounds.click();

    // Check if the custom category is selected but has 0 words
    const cat = GAME_CATEGORIES[activeEditCategoryKey];
    if (cat && cat.words.length === 0) {
      // Remove from selection to prevent bugs
      const idx = state.selectedCategories.indexOf(activeEditCategoryKey);
      if (idx > -1) {
        state.selectedCategories.splice(idx, 1);
      }
      if (cat.isCustom) {
        delete GAME_CATEGORIES[activeEditCategoryKey];
      }
      saveCustomCategories();
    }

    renderCategoriesModalGrid();
    updateHomeCategoriesCount();

    if (customCategoryWordsPanel) customCategoryWordsPanel.style.display = "none";
    if (categoriesModalMain) categoriesModalMain.style.display = "block";
  }

  function openCategoriesModal() {
    sounds.click();
    renderCategoriesModalGrid();
    if (categoriesModal) {
      categoriesModal.classList.add("active");
    }
  }

  function closeCategoriesModal() {
    sounds.click();
    if (categoriesModal) {
      categoriesModal.classList.remove("active");
    }
  }

  // --- CLOUD SYNC & ROOM PERSISTENCE ---
  const syncRoomInput = document.getElementById("sync-room-input");
  const btnConnectRoom = document.getElementById("btn-connect-room");
  const syncStatusIndicator = document.getElementById("sync-status-indicator");

  let activeRoomCode = "";
  let firebaseRoomRef = null;

  // Helper to save all custom categories (to server backend, Firebase cloud database, or LocalStorage fallback)
  function saveCustomCategories() {
    const customCats = {};
    Object.keys(GAME_CATEGORIES).forEach(key => {
      if (GAME_CATEGORIES[key].isCustom) {
        customCats[key] = {
          name: GAME_CATEGORIES[key].name,
          icon: GAME_CATEGORIES[key].icon,
          color: GAME_CATEGORIES[key].color,
          words: GAME_CATEGORIES[key].words,
          isCustom: true
        };
      }
    });

    // Keep LocalStorage updated as a local backup
    localStorage.setItem("partyfun_custom_categories", JSON.stringify(customCats));

    if (activeRoomCode && firebaseRoomRef) {
      // Save directly to Firebase Realtime Database
      firebaseRoomRef.set(customCats)
        .catch(err => console.error("Error al guardar en Firebase:", err));
    } else if (state.isUsingBackend) {
      // Local node server write
      fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: customCats })
      }).catch(err => console.error("Error saving categories to server:", err));
    }
  }

  function connectToRoom() {
    if (!syncRoomInput) return;
    const roomCode = syncRoomInput.value.trim().toUpperCase();
    if (!roomCode) {
      alert("Por favor, introduce un código de sala válido.");
      return;
    }

    sounds.click();
    activeRoomCode = roomCode;

    if (syncStatusIndicator) {
      syncStatusIndicator.innerText = `Conectando a ${activeRoomCode}...`;
      syncStatusIndicator.style.color = "#8e2de2";
    }

    if (!database) {
      alert("La base de datos de Firebase no está inicializada.");
      if (syncStatusIndicator) {
        syncStatusIndicator.innerText = "Error (Firebase no cargado)";
        syncStatusIndicator.style.color = "#ef4444";
      }
      return;
    }

    // Set ref to rooms/ROOMCODE
    if (firebaseRoomRef) {
      firebaseRoomRef.off(); // Detach previous listeners
    }
    firebaseRoomRef = database.ref(`rooms/${activeRoomCode}`);

    // Set up real-time listener
    firebaseRoomRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      console.log("Firebase sync data received:", data);
      
      loadCategoriesFromPayload(data);
      renderCategoriesModalGrid();
      updateHomeCategoriesCount();

      if (activeEditCategoryKey) {
        if (!GAME_CATEGORIES[activeEditCategoryKey]) {
          closeWordsEditor();
        } else {
          renderCustomWordsList();
        }
      }

      if (syncStatusIndicator) {
        syncStatusIndicator.innerText = `Conectado a ${activeRoomCode} 🌐`;
        syncStatusIndicator.style.color = "#10b981";
      }
    }, (error) => {
      console.error("Firebase subscription error:", error);
      alert("No se pudo conectar a la sala en Firebase. Verifica tu conexión a internet o las reglas de la base de datos.");
      if (syncStatusIndicator) {
        syncStatusIndicator.innerText = "Error de conexión";
        syncStatusIndicator.style.color = "#ef4444";
      }
    });

    // Close local Node server SSE if it was listening
    if (state.isUsingBackend) {
      state.isUsingBackend = false; // Bypass local server writes
    }
  }

  // Helper to load custom categories from LocalStorage fallback
  function loadCustomCategoriesFromLocalStorage() {
    const data = localStorage.getItem("partyfun_custom_categories");
    if (data) {
      try {
        const customCats = JSON.parse(data);
        Object.keys(customCats).forEach(key => {
          GAME_CATEGORIES[key] = customCats[key];
          if (!state.selectedCategories.includes(key)) {
            state.selectedCategories.push(key);
          }
        });
        updateHomeCategoriesCount();
      } catch (e) {
        console.error("Error loading custom categories from localStorage:", e);
      }
    }
  }

  // Helper to load custom categories payload into active categories
  function loadCategoriesFromPayload(customCats) {
    // Delete existing custom categories to prevent duplicates or deleted remnants
    Object.keys(GAME_CATEGORIES).forEach(key => {
      if (GAME_CATEGORIES[key].isCustom) {
        delete GAME_CATEGORIES[key];
      }
    });

    Object.keys(customCats).forEach(key => {
      GAME_CATEGORIES[key] = {
        name: customCats[key].name,
        icon: customCats[key].icon || "🎨",
        color: customCats[key].color || "#8e2de2",
        words: customCats[key].words || [],
        isCustom: true
      };

      // Auto select by default if not already in list
      if (!state.selectedCategories.includes(key)) {
        state.selectedCategories.push(key);
      }
    });
  }

  // Initialize backend synchronization
  function initializeBackendSync() {
    state.isUsingBackend = false;

    fetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error("Backend not available");
        return res.json();
      })
      .then(data => {
        state.isUsingBackend = true;
        console.log("Backend custom categories loaded:", data);
        loadCategoriesFromPayload(data);
        updateHomeCategoriesCount();

        // Start Server-Sent Events listener for live multiplayer updates
        const sse = new EventSource('/api/events');
        sse.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'UPDATE') {
              console.log("Received categories update from server via SSE:", msg.categories);
              loadCategoriesFromPayload(msg.categories);

              // Refresh panels if currently viewing
              renderCategoriesModalGrid();
              updateHomeCategoriesCount();
              if (activeEditCategoryKey) {
                if (!GAME_CATEGORIES[activeEditCategoryKey]) {
                  closeWordsEditor();
                } else {
                  renderCustomWordsList();
                }
              }
            }
          } catch (e) {
            // Keep-alive or non-JSON messages
          }
        };

        sse.onerror = (err) => {
          console.warn("SSE connection error, closing stream.");
          sse.close();
        };
      })
      .catch(err => {
        console.warn("Backend server not detected. Falling back to browser LocalStorage:", err);
        loadCustomCategoriesFromLocalStorage();
      });
  }

  // Prepopulate selectedCategories with all initial game categories on startup
  Object.keys(GAME_CATEGORIES).forEach(key => {
    state.selectedCategories.push(key);
  });
  updateHomeCategoriesCount();

  // Load backend sync or fallback
  initializeBackendSync();

  const confirmModal = document.getElementById("confirm-modal");
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmAccept = document.getElementById("btn-confirm-accept");

  function confirmExitGame() {
    sounds.click();
    if (confirmModal) {
      confirmModal.classList.add("active");
    }
  }

  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener("click", () => {
      sounds.click();
      if (confirmModal) confirmModal.classList.remove("active");
    });
  }

  if (btnConfirmAccept) {
    btnConfirmAccept.addEventListener("click", () => {
      sounds.click();
      if (confirmModal) confirmModal.classList.remove("active");
      // Clear active turn timer interval if running
      clearInterval(state.timerInterval);
      showScreen("screen-home");
    });
  }

  // Binds
  document.querySelectorAll(".btn-exit-game").forEach(btn => {
    btn.addEventListener("click", confirmExitGame);
  });

  if (btnConnectRoom) btnConnectRoom.addEventListener("click", connectToRoom);
  if (syncRoomInput) {
    syncRoomInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        connectToRoom();
      }
    });
  }

  if (btnEditCategories) btnEditCategories.addEventListener("click", openCategoriesModal);
  if (categoriesModalClose) categoriesModalClose.addEventListener("click", closeCategoriesModal);
  if (btnSaveCategories) btnSaveCategories.addEventListener("click", closeCategoriesModal);

  if (btnCreateCategory) btnCreateCategory.addEventListener("click", createCategory);
  if (newCategoryInput) {
    newCategoryInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createCategory();
      }
    });
  }

  if (btnBackToCategories) btnBackToCategories.addEventListener("click", closeWordsEditor);
  if (btnSaveWords) btnSaveWords.addEventListener("click", closeWordsEditor);

  if (btnAddWord) btnAddWord.addEventListener("click", addWord);
  if (newWordInput) {
    newWordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addWord();
      }
    });
  }

  if (btnClearWords) {
    btnClearWords.addEventListener("click", () => {
      if (confirm("¿Estás seguro de que quieres vaciar la lista de palabras? Esto eliminará la categoría por completo al no tener palabras.")) {
        sounds.click();
        const cat = GAME_CATEGORIES[activeEditCategoryKey];
        if (cat) {
          cat.words = [];
          const idx = state.selectedCategories.indexOf(activeEditCategoryKey);
          if (idx > -1) {
            state.selectedCategories.splice(idx, 1);
          }
          if (cat.isCustom) {
            delete GAME_CATEGORIES[activeEditCategoryKey];
          }
          saveCustomCategories();
          closeWordsEditor();
        }
      }
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



  // --- PLAYER POOL & MODAL MANAGEMENT ---
  const predefinedFriends = ["Elenica", "Marichula", "DarkAngela", "Alinooby", "Tontoelquelolea", "Miwi", "Raulinho", "Juanillo", "josema2418", "Ukranian", "Theplayer2000", "calvocabron", "Fernando"];
  let customFriends = []; // Extra players added dynamically by the user
  let activeModalTeamIndex = 0; // 0 for Red, 1 for Blue
  let activeModalSelectedPlayers = []; // Temporary selection inside the open modal

  // DOM elements
  const btnEditRed = document.getElementById("btn-edit-red");
  const btnEditBlue = document.getElementById("btn-edit-blue");
  const redPlayersCountEl = document.getElementById("red-players-count");
  const bluePlayersCountEl = document.getElementById("blue-players-count");

  const playerModal = document.getElementById("player-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalClose = document.getElementById("modal-close");
  const btnSaveModal = document.getElementById("btn-save-modal");
  const customPlayerInput = document.getElementById("custom-player-input");
  const btnAddCustomPlayer = document.getElementById("btn-add-custom-player");
  const predefinedPlayersGrid = document.getElementById("predefined-players-grid");

  function updateHomeTeamCounts() {
    if (redPlayersCountEl) {
      const redCount = state.teams[0].players.length;
      redPlayersCountEl.innerText = `${redCount} ${redCount === 1 ? 'integrante' : 'integrantes'} (${state.teams[0].players.join(", ") || 'ninguno'})`;
    }
    if (bluePlayersCountEl) {
      const blueCount = state.teams[1].players.length;
      bluePlayersCountEl.innerText = `${blueCount} ${blueCount === 1 ? 'integrante' : 'integrantes'} (${state.teams[1].players.join(", ") || 'ninguno'})`;
    }
  }

  function openPlayerModal(teamIndex) {
    sounds.click();
    activeModalTeamIndex = teamIndex;
    const team = state.teams[teamIndex];
    activeModalSelectedPlayers = [...team.players];

    if (modalTitle) {
      modalTitle.innerText = `Integrantes - ${team.name}`;
      modalTitle.style.color = teamIndex === 0 ? "#ef4444" : "#0284c7";
    }

    renderPredefinedPlayersGrid();
    if (customPlayerInput) customPlayerInput.value = "";

    if (playerModal) {
      playerModal.classList.add("active");
    }
  }

  function closePlayerModal() {
    if (playerModal) {
      playerModal.classList.remove("active");
    }
  }

  function renderPredefinedPlayersGrid() {
    if (!predefinedPlayersGrid) return;
    predefinedPlayersGrid.innerHTML = "";

    // Combine predefined friends + any custom friends added by the user
    const fullPool = [...predefinedFriends, ...customFriends];

    // De-duplicate in case they wrote a custom player with the same name
    const uniquePool = Array.from(new Set(fullPool));

    uniquePool.forEach(name => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "player-pill-toggle";
      pill.innerText = name;

      const isSelected = activeModalSelectedPlayers.includes(name);
      if (isSelected) {
        pill.classList.add("active");
        pill.classList.add(activeModalTeamIndex === 0 ? "red" : "blue");
      }

      pill.addEventListener("click", () => {
        sounds.click();
        const index = activeModalSelectedPlayers.indexOf(name);
        if (index > -1) {
          activeModalSelectedPlayers.splice(index, 1);
          pill.classList.remove("active", "red", "blue");
        } else {
          // A player cannot be in both teams at the same time! Enforce this.
          const otherTeamIndex = 1 - activeModalTeamIndex;
          const otherTeam = state.teams[otherTeamIndex];
          if (otherTeam.players.includes(name)) {
            // Remove from other team
            const otIdx = otherTeam.players.indexOf(name);
            otherTeam.players.splice(otIdx, 1);
            updateHomeTeamCounts();
          }

          activeModalSelectedPlayers.push(name);
          pill.classList.add("active");
          pill.classList.add(activeModalTeamIndex === 0 ? "red" : "blue");
        }
      });

      predefinedPlayersGrid.appendChild(pill);
    });
  }

  function addCustomPlayer() {
    if (!customPlayerInput) return;
    const name = customPlayerInput.value.trim();
    if (name) {
      sounds.click();

      // Add to custom list if not already there
      if (!predefinedFriends.includes(name) && !customFriends.includes(name)) {
        customFriends.push(name);
      }

      // Auto-select for the current team
      if (!activeModalSelectedPlayers.includes(name)) {
        // Remove from other team if needed
        const otherTeamIndex = 1 - activeModalTeamIndex;
        const otherTeam = state.teams[otherTeamIndex];
        if (otherTeam.players.includes(name)) {
          const otIdx = otherTeam.players.indexOf(name);
          otherTeam.players.splice(otIdx, 1);
          updateHomeTeamCounts();
        }

        activeModalSelectedPlayers.push(name);
      }

      customPlayerInput.value = "";
      renderPredefinedPlayersGrid();
    }
  }

  // Bind edit buttons
  if (btnEditRed) btnEditRed.addEventListener("click", () => openPlayerModal(0));
  if (btnEditBlue) btnEditBlue.addEventListener("click", () => openPlayerModal(1));

  // Bind close buttons
  if (modalClose) modalClose.addEventListener("click", () => {
    sounds.click();
    closePlayerModal();
  });

  if (btnSaveModal) {
    btnSaveModal.addEventListener("click", () => {
      sounds.click();
      // Apply the selection
      state.teams[activeModalTeamIndex].players = [...activeModalSelectedPlayers];
      // Reset current player index to avoid out of bounds
      state.teams[activeModalTeamIndex].currentPlayerIndex = 0;
      updateHomeTeamCounts();
      closePlayerModal();
    });
  }

  // Bind custom player registration
  if (btnAddCustomPlayer) btnAddCustomPlayer.addEventListener("click", addCustomPlayer);
  if (customPlayerInput) {
    customPlayerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomPlayer();
      }
    });
  }

  // Initial UI updates
  updateHomeTeamCounts();

  // --- INITIALIZE GAME & GAMEPOOL ---
  const btnStartGame = document.getElementById("btn-start-game");

  btnStartGame.addEventListener("click", () => {
    sounds.click();
    initAudio();

    // Check players
    if (state.teams[0].players.length === 0 || state.teams[1].players.length === 0) {
      alert("Por favor, añade al menos un integrante a cada equipo.");
      return;
    }

    // Check total words pool in selected categories
    let totalWordsCount = 0;
    state.selectedCategories.forEach(catKey => {
      const cat = GAME_CATEGORIES[catKey];
      if (cat) totalWordsCount += cat.words.length;
    });

    if (totalWordsCount < 40) {
      alert(`Se necesitan al menos 40 palabras en total entre las categorías seleccionadas para jugar. Actualmente tienes ${totalWordsCount} palabras. Por favor, selecciona más categorías o añade más palabras.`);
      return;
    }

    // Names and indices reset
    state.teams[0].name = "Equipo Rojo";
    state.teams[1].name = "Equipo Azul";
    state.teams.forEach(t => {
      t.currentPlayerIndex = 0;
      t.scores = [0, 0, 0];
      t.totalScore = 0;
    });

    state.currentRound = 1;
    state.currentTeamIndex = Math.random() < 0.5 ? 0 : 1;

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
      title: "Descripción Libre"
    },
    2: {
      title: "Una Sola Palabra"
    },
    3: {
      title: "Mímica"
    }
  };

  function prepareTransitionScreen() {
    stopConfetti();
    const rd = ROUND_DETAILS[state.currentRound];
    transitionRoundBadge.innerText = `Ronda ${state.currentRound}`;
    transitionRoundTitle.innerText = rd.title;
    transitionRoundDesc.innerText = `${state.roundPool.length} palabras restantes en el mazo`;

    const team = state.teams[state.currentTeamIndex];
    const currentPlayer = team.players[team.currentPlayerIndex] || "Jugador";
    const teamColor = state.currentTeamIndex === 0 ? "#ef4444" : "#0284c7";
    transitionTeamName.innerHTML = `<span style="color: ${teamColor}; font-weight: 800;">${team.name}</span> <br><span style="font-size: 1.1rem; color: #64748b; font-weight: 600; display: block; margin-top: 0.3rem;">Pistas dadas por: <span style="color: ${teamColor}; font-weight: 800;">${currentPlayer.toUpperCase()}</span></span>`;

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

    const team = state.teams[state.currentTeamIndex];
    const currentPlayer = team.players[team.currentPlayerIndex] || "Jugador";
    const teamColor = state.currentTeamIndex === 0 ? "#ef4444" : "#0284c7";

    const gameTeamLabel = document.getElementById("game-team-label");
    if (gameTeamLabel) {
      gameTeamLabel.innerText = team.name;
      gameTeamLabel.style.color = teamColor;
    }
    gameTeamTitle.innerText = currentPlayer.toUpperCase();
    gameTeamTitle.style.color = teamColor;
    gameRoundTitle.innerText = `¡${ROUND_DETAILS[state.currentRound].title.toUpperCase()}!`;

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
      timerProgress.style.stroke = "";
    } else {
      timerProgress.classList.remove("warning");
      const teamColor = state.currentTeamIndex === 0 ? "#ef4444" : "#0284c7";
      timerProgress.style.stroke = teamColor;
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
    const remainingCountEl = document.getElementById("game-remaining-count");

    if (!card || !cardWord || !cardCategory || !feedbackCorrect || !feedbackPass) return;

    if (remainingCountEl) {
      remainingCountEl.innerText = `x${state.roundPool.length}`;
    }

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

      // Penalty logic for Round 1: Subtract 5 seconds
      if (state.currentRound === 1) {
        state.timeLeft = Math.max(0, state.timeLeft - 5);
        updateTimerUI();

        // Trigger the floating penalty toast
        const toast = document.getElementById("timer-penalty-toast");
        if (toast) {
          toast.classList.remove("animate");
          void toast.offsetWidth; // trigger reflow
          toast.classList.add("animate");
        }

        // Check if time is up after penalty
        if (state.timeLeft <= 0) {
          endTurn();
        }
      }

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

    // Rotate player index for next turn of this team
    if (activeTeam.players.length > 0) {
      activeTeam.currentPlayerIndex = (activeTeam.currentPlayerIndex + 1) % activeTeam.players.length;
    }

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
    let winnerColor = "#1e293b";

    if (state.teams[0].totalScore > state.teams[1].totalScore) {
      winnerText = `¡${state.teams[0].name.toUpperCase()} GANA!`;
      winnerColor = "#ef4444";
    } else if (state.teams[1].totalScore > state.teams[0].totalScore) {
      winnerText = `¡${state.teams[1].name.toUpperCase()} GANA!`;
      winnerColor = "#0284c7";
    } else {
      winnerText = "¡EMPATE!";
      isTie = true;
    }

    winnerName.innerText = winnerText;
    winnerName.style.color = winnerColor;

    finalScoreboard.innerHTML = "";
    state.teams.forEach((t, idx) => {
      const isWinner = !isTie && (
        (idx === 0 && state.teams[0].totalScore > state.teams[1].totalScore) ||
        (idx === 1 && state.teams[1].totalScore > state.teams[0].totalScore)
      );

      const teamClass = idx === 0 ? "red-team" : "blue-team";
      const teamBox = document.createElement("div");
      teamBox.className = `scoreboard-team-box ${teamClass} ${isWinner ? 'winner' : ''}`;

      const crown = isWinner ? '<div class="winner-crown-inline" style="font-size: 2.2rem; margin-bottom: 0.3rem;">👑</div>' : '';

      teamBox.innerHTML = `
        ${crown}
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
    state.currentTeamIndex = Math.random() < 0.5 ? 0 : 1;

    // Resets roundPool with the original 40 words from gamePool
    state.roundPool = [...state.gamePool];
    prepareTransitionScreen();
  });

  btnNewGame.addEventListener("click", () => {
    sounds.click();
    stopConfetti();
    showScreen("screen-home");
  });

  // --- SCOREBOARD MODAL ---
  const scoreboardModal = document.getElementById("scoreboard-modal");
  const btnShowScoreboard = document.getElementById("btn-show-scoreboard");
  const scoreboardModalClose = document.getElementById("scoreboard-modal-close");
  const btnCloseScoreboard = document.getElementById("btn-close-scoreboard");
  const scoreboardTableBody = document.getElementById("scoreboard-table-body");

  function renderScoreboardModal() {
    if (!scoreboardTableBody) return;
    scoreboardTableBody.innerHTML = "";

    const team1 = state.teams[0];
    const team2 = state.teams[1];

    let r1_1 = team1.scores[0];
    let r1_2 = team1.scores[1];
    let r1_3 = team1.scores[2];

    let r2_1 = team2.scores[0];
    let r2_2 = team2.scores[1];
    let r2_3 = team2.scores[2];

    // If we are currently reviewing the summary of the turn, incorporate the uncommitted score in real time
    const isSummaryActive = document.getElementById("screen-summary").classList.contains("active");
    if (isSummaryActive) {
      if (state.currentTeamIndex === 0) {
        if (state.currentRound === 1) r1_1 += state.turnScore;
        else if (state.currentRound === 2) r1_2 += state.turnScore;
        else if (state.currentRound === 3) r1_3 += state.turnScore;
      } else {
        if (state.currentRound === 1) r2_1 += state.turnScore;
        else if (state.currentRound === 2) r2_2 += state.turnScore;
        else if (state.currentRound === 3) r2_3 += state.turnScore;
      }
    }

    const total1 = r1_1 + r1_2 + r1_3;
    const total2 = r2_1 + r2_2 + r2_3;

    const leadTeamIndex = total1 > total2 ? 0 : (total2 > total1 ? 1 : -1);

    const teamsData = [
      { index: 1, team: team2, r1: r2_1, r2: r2_2, r3: r2_3, total: total2 }, // Equipo Azul (Always top!)
      { index: 0, team: team1, r1: r1_1, r2: r1_2, r3: r1_3, total: total1 }  // Equipo Rojo (Always bottom!)
    ];

    teamsData.forEach(data => {
      const isWinner = leadTeamIndex > -1 && data.index === leadTeamIndex;
      const tr = document.createElement("tr");
      tr.className = `scoreboard-row ${isWinner ? 'winner-row' : ''}`;

      const crown = isWinner ? '<span class="winner-crown-inline">👑</span>' : '';

      tr.innerHTML = `
        <td>${crown}${data.team.name}</td>
        <td>${data.r1}</td>
        <td>${data.r2}</td>
        <td>${data.r3}</td>
        <td>${data.total}</td>
      `;
      scoreboardTableBody.appendChild(tr);
    });
  }

  function openScoreboardModal() {
    sounds.click();
    renderScoreboardModal();
    if (scoreboardModal) {
      scoreboardModal.classList.add("active");
    }
  }

  function closeScoreboardModal() {
    sounds.click();
    if (scoreboardModal) {
      scoreboardModal.classList.remove("active");
    }
  }

  if (btnShowScoreboard) btnShowScoreboard.addEventListener("click", openScoreboardModal);
  if (scoreboardModalClose) scoreboardModalClose.addEventListener("click", closeScoreboardModal);
  if (btnCloseScoreboard) btnCloseScoreboard.addEventListener("click", closeScoreboardModal);

});

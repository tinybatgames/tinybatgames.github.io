// Giriş noktası: Firebase init + auth akışı + Phaser başlatma.

(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const setupEl = document.getElementById("setup-warning");
  const authEl = document.getElementById("auth-screen");
  const gameEl = document.getElementById("game-root");

  if (!cfg.apiKey || !cfg.projectId) {
    setupEl.classList.remove("hidden");
    return;
  }

  firebase.initializeApp(cfg);

  const errEl = document.getElementById("auth-error");
  const uEl = document.getElementById("auth-username");
  const pEl = document.getElementById("auth-password");

  document.getElementById("btn-login").addEventListener("click", async () => {
    errEl.textContent = "";
    try { await window.FarmAuth.login(uEl.value, pEl.value); }
    catch (err) { errEl.textContent = window.FarmAuth.translateError(err); }
  });
  document.getElementById("btn-register").addEventListener("click", async () => {
    errEl.textContent = "";
    try { await window.FarmAuth.register(uEl.value, pEl.value); }
    catch (err) { errEl.textContent = window.FarmAuth.translateError(err); }
  });
  pEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-login").click();
  });

  let gameStarted = false;

  window.FarmAuth.onAuthChange((user) => {
    if (user) {
      authEl.classList.add("hidden");
      gameEl.classList.remove("hidden");
      if (!gameStarted) {
        gameStarted = true;
        startGame();
      }
    } else {
      authEl.classList.remove("hidden");
      gameEl.classList.add("hidden");
    }
  });

  function startGame() {
    const config = {
      type: Phaser.AUTO,
      parent: "game-root",
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#1a0e06",
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
      },
      scene: [window.BootScene, window.FarmScene, window.MarketScene, window.InventoryScene, window.LeaderboardScene, window.UIScene]
    };
    const game = new Phaser.Game(config);
    window.ActionLock.setEmitter(game.events);

    window.addEventListener("resize", () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    });
  }
})();

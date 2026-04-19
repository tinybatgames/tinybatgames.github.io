// Global eylem kilidi + progress bar senkronu.
// Her etkileşimli işlem (ekim, hasat, al/sat) tryStart() çağırır; başarılıysa
// kilit alınır ve UIScene actionStart/actionEnd eventlerini alır.

(function () {
  const state = {
    busy: false,
    emitter: null,
    releaseTimer: null
  };

  window.ActionLock = {
    setEmitter(emitter) {
      state.emitter = emitter;
    },
    isBusy() {
      return state.busy;
    },
    tryStart(ms) {
      if (state.busy) return false;
      const duration = ms || 250;
      state.busy = true;
      if (state.emitter) state.emitter.emit("actionStart", { duration });
      if (state.releaseTimer) clearTimeout(state.releaseTimer);
      state.releaseTimer = setTimeout(() => {
        state.busy = false;
        state.releaseTimer = null;
        if (state.emitter) state.emitter.emit("actionEnd");
      }, duration);
      return true;
    }
  };
})();

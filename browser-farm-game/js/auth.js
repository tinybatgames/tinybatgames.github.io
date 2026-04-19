// Takma ad + şifre → Firebase Auth (email/password altyapısı üstünde)
// Takma adı `<username>@farmgame.local` sahte e-postaya çeviriyoruz.

(function () {
  const FAKE_DOMAIN = "@farmgame.local";

  function usernameToEmail(username) {
    return username.trim().toLowerCase() + FAKE_DOMAIN;
  }

  function validate(username, password) {
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
      throw new Error("Takma ad 3-20 karakter, sadece harf/rakam/_ olabilir.");
    }
    if (password.length < 6) {
      throw new Error("Şifre en az 6 karakter olmalı.");
    }
  }

  async function register(username, password) {
    validate(username, password);
    const email = usernameToEmail(username);
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    await FarmDB.initializeNewPlayer(uid, username.trim());
    return cred.user;
  }

  async function login(username, password) {
    validate(username, password);
    const email = usernameToEmail(username);
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  function logout() {
    return firebase.auth().signOut();
  }

  function onAuthChange(cb) {
    return firebase.auth().onAuthStateChanged(cb);
  }

  function translateError(err) {
    const code = err && err.code ? err.code : "";
    if (code === "auth/email-already-in-use") return "Bu takma ad zaten kayıtlı.";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Takma ad veya şifre hatalı.";
    }
    if (code === "auth/too-many-requests") return "Çok fazla deneme. Biraz sonra tekrar dene.";
    if (code === "auth/network-request-failed") return "Ağ hatası. Bağlantını kontrol et.";
    return err.message || "Bir hata oluştu.";
  }

  window.FarmAuth = { register, login, logout, onAuthChange, translateError };
})();

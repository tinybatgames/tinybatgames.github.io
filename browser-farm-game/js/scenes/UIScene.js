// Üst bar: avatar + ad + level + exp barı (sol pill); sağda sekme butonları.

class UIScene extends Phaser.Scene {
  constructor() { super({ key: "UIScene", active: false }); }

  create() {
    this.currentTab = "farm";
    this.lastUser = null;
    this.layoutLayer = this.add.container(0, 0).setDepth(0);

    this.buildLayout();

    this.game.events.on("userUpdated", this.onUserUpdated, this);
    this.game.events.on("actionStart", this.showProgress, this);
    this.game.events.on("actionEnd", this.hideProgress, this);
    this.scale.on("resize", this.onResize, this);

    this.events.on("shutdown", () => {
      this.game.events.off("userUpdated", this.onUserUpdated, this);
      this.game.events.off("actionStart", this.showProgress, this);
      this.game.events.off("actionEnd", this.hideProgress, this);
      this.scale.off("resize", this.onResize, this);
    });
  }

  onResize() {
    this.hideProgress();
    this.layoutLayer.removeAll(true);
    this.buildLayout();
    this.refreshTabs();
    if (this.lastUser) this.updateUser(this.lastUser);
  }

  buildLayout() {
    const barH = 64;
    const W = this.scale.width;
    this.barH = barH;

    // Gradient üst bar arka planı
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3d2a1a, 0x3d2a1a, 0x1a0e06, 0x1a0e06, 1);
    bg.fillRect(0, 0, W, barH);
    bg.lineStyle(2, 0x8b5a2b, 1);
    bg.lineBetween(0, barH, W, barH);
    this.layoutLayer.add(bg);

    // Sol bilgi pill'i (avatar + ad/level + exp barı + altın)
    const pX = 12, pY = 8, pW = 360, pH = 48, pR = 24;
    const pBg = this.add.graphics();
    pBg.fillStyle(0x1a1109, 1);
    pBg.fillRoundedRect(pX, pY, pW, pH, pR);
    pBg.lineStyle(2, 0xc8923a, 1);
    pBg.strokeRoundedRect(pX, pY, pW, pH, pR);
    this.layoutLayer.add(pBg);

    // Avatar dairesi
    const aCX = pX + 26, aCY = pY + pH / 2;
    const av = this.add.graphics();
    av.fillStyle(0x6b4220, 1);
    av.fillCircle(aCX, aCY, 17);
    av.lineStyle(2, 0xc8923a, 1);
    av.strokeCircle(aCX, aCY, 17);
    this.layoutLayer.add(av);

    // Satır 1: kullanıcı adı + level rozeti
    this.nameText = this.add.text(aCX + 24, pY + 14, "...", {
      fontFamily: "Courier New, monospace", fontSize: "13px", fontStyle: "bold", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    this.layoutLayer.add(this.nameText);

    this.levelText = this.add.text(pX + 224, pY + 14, "Lv.1", {
      fontFamily: "Courier New, monospace", fontSize: "11px", fontStyle: "bold", color: "#ffd56b"
    }).setOrigin(1, 0.5);
    this.layoutLayer.add(this.levelText);

    // Satır 2: exp barı + sayı
    this.expBarX = aCX + 24;
    this.expBarY = pY + 34;
    this.expBarW = 158;
    this.expBarH = 7;

    const expBg = this.add.graphics();
    expBg.fillStyle(0x3a2419, 1);
    expBg.fillRoundedRect(this.expBarX, this.expBarY - this.expBarH / 2, this.expBarW, this.expBarH, 3);
    expBg.lineStyle(1, 0x6b4220, 1);
    expBg.strokeRoundedRect(this.expBarX, this.expBarY - this.expBarH / 2, this.expBarW, this.expBarH, 3);
    this.layoutLayer.add(expBg);

    this.expBarFill = this.add.graphics();
    this.layoutLayer.add(this.expBarFill);

    this.expText = this.add.text(this.expBarX + this.expBarW + 6, this.expBarY, "0/100", {
      fontFamily: "Courier New, monospace", fontSize: "9px", color: "#c9b28a"
    }).setOrigin(0, 0.5);
    this.layoutLayer.add(this.expText);

    // Pill içinde dikey ayırıcı
    const dividerX = pX + pW - 80;
    const dv = this.add.graphics();
    dv.lineStyle(1, 0xc8923a, 0.3);
    dv.lineBetween(dividerX, pY + 10, dividerX, pY + pH - 10);
    this.layoutLayer.add(dv);

    this.coinIcon = this.add.image(dividerX + 18, pY + pH / 2, "icon_coin");
    this.coinText = this.add.text(dividerX + 34, pY + pH / 2, "0", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    this.layoutLayer.add([this.coinIcon, this.coinText]);

    // Sağ sekme butonları (sağdan sola yerleştir)
    const btnY = barH / 2;
    this.logoutBtn = this.makeTab(W - 50, btnY, 80, 32, "Çıkış", async () => {
      await window.FarmAuth.logout();
      location.reload();
    }, { subtle: true });
    this.leaderBtn = this.makeTab(W - 152, btnY, 116, 32, "Sıralama", () => this.switchTab("leaderboard"));
    this.marketBtn = this.makeTab(W - 258, btnY, 88, 32, "Pazar", () => this.switchTab("market"));
    this.invBtn = this.makeTab(W - 360, btnY, 108, 32, "Envanter", () => this.switchTab("inventory"));
    this.farmBtn = this.makeTab(W - 462, btnY, 84, 32, "Tarla", () => this.switchTab("farm"));
  }

  showProgress({ duration } = { duration: 250 }) {
    this.hideProgress();
    const cx = this.scale.width / 2;
    const y = this.barH + 10;
    const w = 240;
    const h = 8;
    const bg = this.add.graphics().setDepth(2000);
    bg.fillStyle(0x1a1109, 1);
    bg.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 4);
    bg.lineStyle(1, 0x8b5a2b);
    bg.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 4);
    this.progressBg = bg;
    this.progressFill = this.add.rectangle(cx - w / 2 + 1, y, 0, h - 2, 0xffd56b).setOrigin(0, 0.5).setDepth(2001);
    this.progressTween = this.tweens.add({
      targets: this.progressFill,
      width: w - 2,
      duration,
      ease: "Linear"
    });
  }

  hideProgress() {
    if (this.progressTween) { this.progressTween.stop(); this.progressTween = null; }
    if (this.progressBg) { this.progressBg.destroy(); this.progressBg = null; }
    if (this.progressFill) { this.progressFill.destroy(); this.progressFill = null; }
  }

  makeTab(cx, cy, w, h, text, onClick, opts = {}) {
    const x = cx - w / 2, y = cy - h / 2;
    const g = this.add.graphics();
    const zone = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    const t = this.add.text(cx, cy, text, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
    }).setOrigin(0.5);

    const draw = (state) => {
      g.clear();
      let fill, border, tc;
      if (state === "active") { fill = 0xc8923a; border = 0xffd56b; tc = "#2a1810"; }
      else if (state === "hover") { fill = 0x5a3f24; border = 0xc8923a; tc = "#ffffff"; }
      else if (opts.subtle) { fill = 0x1a1109; border = 0x6b4220; tc = "#a89070"; }
      else { fill = 0x2a1810; border = 0x8b5a2b; tc = "#f0e2c0"; }
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x, y, w, h, h / 2);
      g.lineStyle(2, border, 1);
      g.strokeRoundedRect(x, y, w, h, h / 2);
      t.setColor(tc);
    };

    const btn = { g, t, zone, draw, subtle: !!opts.subtle, active: false };
    zone.on("pointerdown", onClick);
    zone.on("pointerover", () => { if (!btn.active) draw("hover"); });
    zone.on("pointerout", () => { if (!btn.active) draw("normal"); });
    draw("normal");
    this.layoutLayer.add([g, zone, t]);
    return btn;
  }

  refreshTabs() {
    if (!this.farmBtn) return;
    const set = (b, isActive) => { b.active = isActive; b.draw(isActive ? "active" : "normal"); };
    set(this.farmBtn, this.currentTab === "farm");
    set(this.invBtn, this.currentTab === "inventory");
    set(this.marketBtn, this.currentTab === "market");
    set(this.leaderBtn, this.currentTab === "leaderboard");
    set(this.logoutBtn, false);
  }

  switchTab(tab) {
    if (tab === this.currentTab) return;
    const map = {
      farm: "FarmScene",
      inventory: "InventoryScene",
      market: "MarketScene",
      leaderboard: "LeaderboardScene"
    };
    const target = map[tab];
    if (!target) return;

    this.currentTab = tab;
    this.refreshTabs();

    for (const key of Object.values(map)) {
      if (key !== target && this.scene.isActive(key)) {
        this.scene.sleep(key);
      }
    }
    if (this.scene.isSleeping(target)) {
      this.scene.wake(target);
    } else if (!this.scene.isActive(target)) {
      this.scene.run(target);
    }
    this.scene.bringToTop();
  }

  onUserUpdated(user) {
    this.lastUser = user;
    this.updateUser(user);
  }

  updateUser(user) {
    if (!user) return;
    this.nameText.setText(`@${user.username}`);
    this.coinText.setText(String(user.coins ?? 0));

    const exp = user.exp || 0;
    const level = window.levelFromExp(exp);
    const curBase = window.expForLevel(level);
    const nextBase = window.expForLevel(level + 1);
    const span = Math.max(1, nextBase - curBase);
    const into = Math.max(0, exp - curBase);
    const ratio = Math.min(1, into / span);

    this.levelText.setText(`Lv.${level}`);
    this.expText.setText(`${into}/${span}`);

    this.expBarFill.clear();
    if (ratio > 0) {
      const fw = Math.max(2, ratio * this.expBarW);
      this.expBarFill.fillStyle(0xe8b050, 1);
      this.expBarFill.fillRoundedRect(this.expBarX, this.expBarY - this.expBarH / 2, fw, this.expBarH, 3);
    }
  }
}

window.UIScene = UIScene;

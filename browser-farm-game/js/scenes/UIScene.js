// Üst bar: takma ad + altın + sekme butonları. Tüm sahne geçişleri burada yönetilir.

class UIScene extends Phaser.Scene {
  constructor() { super({ key: "UIScene", active: false }); }

  create() {
    this.currentTab = "farm";
    const barH = 56;

    this.add.rectangle(this.scale.width / 2, barH / 2, this.scale.width, barH, 0x1a1109)
      .setStrokeStyle(2, 0x8b5a2b);

    this.nameText = this.add.text(16, barH / 2, "...", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
    }).setOrigin(0, 0.5);

    this.coinIcon = this.add.image(180, barH / 2, "icon_coin");
    this.coinText = this.add.text(198, barH / 2, "0", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffffff"
    }).setOrigin(0, 0.5);

    // Sekme butonları (sağa yaslı)
    this.farmBtn = this.makeTab(this.scale.width - 500, barH / 2, "Tarla", () => this.switchTab("farm"));
    this.invBtn = this.makeTab(this.scale.width - 380, barH / 2, "Envanter", () => this.switchTab("inventory"));
    this.marketBtn = this.makeTab(this.scale.width - 260, barH / 2, "Pazar", () => this.switchTab("market"));
    this.logoutBtn = this.makeTab(this.scale.width - 80, barH / 2, "Çıkış", async () => {
      await window.FarmAuth.logout();
      location.reload();
    });

    this.game.events.on("userUpdated", this.updateUser, this);
    this.game.events.on("actionStart", this.showProgress, this);
    this.game.events.on("actionEnd", this.hideProgress, this);
    this.events.on("shutdown", () => {
      this.game.events.off("userUpdated", this.updateUser, this);
      this.game.events.off("actionStart", this.showProgress, this);
      this.game.events.off("actionEnd", this.hideProgress, this);
    });

    this.refreshTabs();
  }

  showProgress({ duration } = { duration: 250 }) {
    this.hideProgress();
    const cx = this.scale.width / 2;
    const y = 70;
    const w = 240;
    const h = 8;
    this.progressBg = this.add.rectangle(cx, y, w, h, 0x1a1109).setStrokeStyle(1, 0x8b5a2b).setDepth(2000);
    this.progressFill = this.add.rectangle(cx - w / 2, y, 0, h - 2, 0xffd56b).setOrigin(0, 0.5).setDepth(2001);
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

  makeTab(x, y, text, onClick) {
    const bg = this.add.rectangle(x, y, 110, 32, 0x5a3f24)
      .setStrokeStyle(2, 0x8b5a2b).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#f5e9d7"
    }).setOrigin(0.5);
    bg.on("pointerdown", onClick);
    bg.on("pointerover", () => bg.setFillStyle(0xa06a35));
    bg.on("pointerout", () => this.refreshTabs());
    return { bg, t };
  }

  refreshTabs() {
    if (!this.farmBtn) return;
    this.farmBtn.bg.setFillStyle(this.currentTab === "farm" ? 0x8b5a2b : 0x5a3f24);
    this.invBtn.bg.setFillStyle(this.currentTab === "inventory" ? 0x8b5a2b : 0x5a3f24);
    this.marketBtn.bg.setFillStyle(this.currentTab === "market" ? 0x8b5a2b : 0x5a3f24);
    this.logoutBtn.bg.setFillStyle(0x5a3f24);
  }

  switchTab(tab) {
    if (tab === this.currentTab) return;
    const map = { farm: "FarmScene", inventory: "InventoryScene", market: "MarketScene" };
    const target = map[tab];
    if (!target) return;

    this.currentTab = tab;
    this.refreshTabs();

    // Hedef dışındaki tüm sahneleri uyut
    for (const key of Object.values(map)) {
      if (key !== target && this.scene.isActive(key)) {
        this.scene.sleep(key);
      }
    }
    // Hedefi uyandır veya başlat
    if (this.scene.isSleeping(target)) {
      this.scene.wake(target);
    } else if (!this.scene.isActive(target)) {
      this.scene.run(target);
    }
    // UIScene üstte kalsın
    this.scene.bringToTop();
  }

  updateUser(user) {
    if (!user) return;
    this.nameText.setText(`@${user.username}`);
    this.coinText.setText(String(user.coins ?? 0));
  }
}

window.UIScene = UIScene;

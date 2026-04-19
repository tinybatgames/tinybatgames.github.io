// 6x6 tarla, sticky tohum seçimi, click-to-plant, timer, hasat.
// FarmDB.listenToFarm & listenToUser ile realtime senkron.

class FarmScene extends Phaser.Scene {
  constructor() { super("FarmScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.tiles = {};
    this.tileSprites = {};
    this.userData = null;
    this.selectedSeed = null;
    this.seedPanel = null;

    this.cameras.main.setBackgroundColor("#2a1e14");

    const grid = window.GRID_SIZE;
    const size = window.TILE_PX;
    const w = grid * size;
    const h = grid * size;
    const ox = (this.scale.width - w) / 2;
    const oy = (this.scale.height - h) / 2 + 40;

    this.gridOrigin = { x: ox, y: oy };

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const x = ox + c * size + size / 2;
        const y = oy + r * size + size / 2;
        const tId = `${r}_${c}`;

        const bg = this.add.image(x, y, "tile_soil").setInteractive({ useHandCursor: true });
        const crop = this.add.image(x, y, "tile_soil").setVisible(false);
        const label = this.add.text(x, y + size / 2 - 10, "", {
          fontFamily: "Courier New, monospace",
          fontSize: "12px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3
        }).setOrigin(0.5, 1);

        bg.on("pointerover", () => bg.setTint(0xffe7a8));
        bg.on("pointerout", () => bg.clearTint());
        bg.on("pointerdown", () => this.onTileClick(tId));

        this.tileSprites[tId] = { bg, crop, label, row: r, col: c };
      }
    }

    this.unsubFarm = window.FarmDB.listenToFarm(this.uid, (tiles) => {
      this.tiles = tiles;
      this.renderTiles();
    });
    this.unsubUser = window.FarmDB.listenToUser(this.uid, (user) => {
      this.userData = user || null;
      this.game.events.emit("userUpdated", user);
      this.autoPickSeedIfNeeded();
      this.renderSeedPanel();
    });

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateTimers() });

    this.events.on("shutdown", () => {
      if (this.unsubFarm) this.unsubFarm();
      if (this.unsubUser) this.unsubUser();
    });

    this.events.on("wake", () => {
      this.autoPickSeedIfNeeded();
      this.renderSeedPanel();
    });
  }

  autoPickSeedIfNeeded() {
    const seeds = this.userData?.inventory?.seeds || {};
    const have = (k) => (seeds[k] || 0) > 0;
    if (this.selectedSeed && have(this.selectedSeed)) return;
    const first = window.CROP_KEYS.find(have);
    this.selectedSeed = first || null;
  }

  renderSeedPanel() {
    if (this.seedPanel) { this.seedPanel.destroy(); this.seedPanel = null; }

    const cx = this.scale.width / 2;
    const y = 85;
    const container = this.add.container(cx, y).setDepth(400);

    const bg = this.add.rectangle(0, 0, 460, 44, 0x3d2a1a).setStrokeStyle(2, 0x8b5a2b);
    container.add(bg);

    const seeds = this.userData?.inventory?.seeds || {};
    if (this.selectedSeed && (seeds[this.selectedSeed] || 0) > 0) {
      const c = window.CROPS[this.selectedSeed];
      const icon = this.add.image(-200, 0, `crop_${this.selectedSeed}_ready`).setScale(0.5);
      const label = this.add.text(-168, 0, `Seçili: ${c.name} × ${seeds[this.selectedSeed]}`, {
        fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
      }).setOrigin(0, 0.5);
      container.add([icon, label]);

      const btnBg = this.add.rectangle(170, 0, 100, 28, 0x8b5a2b)
        .setStrokeStyle(2, 0xffd56b).setInteractive({ useHandCursor: true });
      const btnT = this.add.text(170, 0, "Değiştir", {
        fontFamily: "Courier New, monospace", fontSize: "12px", color: "#ffffff"
      }).setOrigin(0.5);
      btnBg.on("pointerover", () => btnBg.setFillStyle(0xa06a35));
      btnBg.on("pointerout", () => btnBg.setFillStyle(0x8b5a2b));
      btnBg.on("pointerdown", () => this.openSeedPicker());
      container.add([btnBg, btnT]);
    } else {
      const label = this.add.text(-200, 0, "Tohum yok — Pazardan al.", {
        fontFamily: "Courier New, monospace", fontSize: "14px", color: "#c9b28a"
      }).setOrigin(0, 0.5);
      container.add(label);
    }

    this.seedPanel = container;
  }

  renderTiles() {
    for (const tId in this.tileSprites) {
      const sprite = this.tileSprites[tId];
      const data = this.tiles[tId];
      if (!data || !data.crop) {
        sprite.crop.setVisible(false);
        sprite.label.setText("");
        continue;
      }
      const cropKey = data.crop;
      const readyMs = data.readyAt ? data.readyAt.toMillis() : 0;
      const plantedMs = data.plantedAt ? data.plantedAt.toMillis() : 0;
      const totalMs = Math.max(1, readyMs - plantedMs);
      const elapsed = Date.now() - plantedMs;
      const progress = Phaser.Math.Clamp(elapsed / totalMs, 0, 1);

      let stage = "seedling";
      if (progress >= 1) stage = "ready";
      else if (progress >= 0.5) stage = "growing";

      sprite.crop.setTexture(`crop_${cropKey}_${stage}`).setVisible(true);

      if (stage === "ready") {
        sprite.label.setText("HAZIR!");
        sprite.label.setColor("#ffd56b");
        this.tweens.add({
          targets: sprite.crop,
          scale: { from: 1, to: 1.08 },
          yoyo: true,
          duration: 600,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      } else {
        if (sprite.crop.scale !== 1) {
          this.tweens.killTweensOf(sprite.crop);
          sprite.crop.setScale(1);
        }
        sprite.label.setColor("#ffffff");
        const remaining = Math.max(0, Math.ceil((readyMs - Date.now()) / 1000));
        sprite.label.setText(this.formatSec(remaining));
      }
    }
  }

  updateTimers() {
    let needsRender = false;
    for (const tId in this.tileSprites) {
      const data = this.tiles[tId];
      if (!data || !data.crop) continue;
      const readyMs = data.readyAt ? data.readyAt.toMillis() : 0;
      const plantedMs = data.plantedAt ? data.plantedAt.toMillis() : 0;
      const totalMs = Math.max(1, readyMs - plantedMs);
      const elapsed = Date.now() - plantedMs;
      const progress = elapsed / totalMs;
      const sprite = this.tileSprites[tId];
      const currentTexture = sprite.crop.texture.key;
      const expectedStage = progress >= 1 ? "ready" : progress >= 0.5 ? "growing" : "seedling";
      if (!currentTexture.endsWith(expectedStage)) {
        needsRender = true;
        continue;
      }
      if (expectedStage !== "ready") {
        const remaining = Math.max(0, Math.ceil((readyMs - Date.now()) / 1000));
        sprite.label.setText(this.formatSec(remaining));
      }
    }
    if (needsRender) this.renderTiles();
  }

  formatSec(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  async onTileClick(tId) {
    const data = this.tiles[tId];
    if (!data) {
      this.flashMessage("Tarla yükleniyor...");
      return;
    }

    if (data.crop) {
      const readyMs = data.readyAt ? data.readyAt.toMillis() : 0;
      if (Date.now() >= readyMs) {
        if (!window.ActionLock.tryStart()) return;
        try { await window.FarmDB.harvestTile(this.uid, tId); }
        catch (err) { this.flashMessage(err.message); }
      } else {
        const remaining = Math.ceil((readyMs - Date.now()) / 1000);
        this.flashMessage(`Hazır değil: ${this.formatSec(remaining)}`);
      }
      return;
    }

    // Boş tile → seçili tohum varsa direkt ek
    const seeds = this.userData?.inventory?.seeds || {};
    if (this.selectedSeed && (seeds[this.selectedSeed] || 0) > 0) {
      if (!window.ActionLock.tryStart()) return;
      try { await window.FarmDB.plantSeed(this.uid, tId, this.selectedSeed); }
      catch (err) { this.flashMessage(err.message); }
      return;
    }

    this.flashMessage("Tohum yok — Pazardan al.");
  }

  openSeedPicker() {
    if (this.plantMenu) { this.plantMenu.destroy(); this.plantMenu = null; }

    const seeds = this.userData?.inventory?.seeds || {};
    const keys = window.CROP_KEYS.filter(k => (seeds[k] || 0) > 0);

    const container = this.add.container(this.scale.width / 2, this.scale.height - 90);
    container.setDepth(500);

    const bg = this.add.rectangle(0, 0, 500, 120, 0x5a3f24)
      .setStrokeStyle(3, 0x8b5a2b)
      .setInteractive();
    container.add(bg);

    const closeBtn = this.add.text(238, -52, "✕", {
      fontFamily: "Courier New, monospace", fontSize: "18px", color: "#ff7a7a"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => {
      container.destroy();
      this.plantMenu = null;
    });
    container.add(closeBtn);

    if (keys.length === 0) {
      const t = this.add.text(0, -6, "Tohum yok. Pazardan al.", {
        fontFamily: "Courier New, monospace", fontSize: "14px", color: "#f5e9d7"
      }).setOrigin(0.5);
      container.add(t);
    } else {
      const title = this.add.text(0, -42, "Ekilecek tohumu seç:", {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#ffd56b"
      }).setOrigin(0.5);
      container.add(title);

      const spacing = 110;
      const startX = -((keys.length - 1) * spacing) / 2;
      keys.forEach((k, i) => {
        const x = startX + i * spacing;
        const selected = k === this.selectedSeed;
        const cellBg = this.add.rectangle(x, 6, 96, 78, selected ? 0x8b5a2b : 0x3d2a1a)
          .setStrokeStyle(2, selected ? 0xffd56b : 0x8b5a2b)
          .setInteractive({ useHandCursor: true });
        const icon = this.add.image(x, -2, `crop_${k}_ready`).setScale(0.55);
        const label = this.add.text(x, 28, `${window.CROPS[k].name} (${seeds[k]})`, {
          fontFamily: "Courier New, monospace", fontSize: "11px", color: "#f5e9d7"
        }).setOrigin(0.5);
        cellBg.on("pointerover", () => cellBg.setFillStyle(0xa06a35));
        cellBg.on("pointerout", () => cellBg.setFillStyle(selected ? 0x8b5a2b : 0x3d2a1a));
        cellBg.on("pointerdown", () => {
          this.selectedSeed = k;
          container.destroy();
          this.plantMenu = null;
          this.renderSeedPanel();
        });
        container.add([cellBg, icon, label]);
      });
    }

    this.plantMenu = container;
  }

  flashMessage(msg) {
    if (this.flashText) this.flashText.destroy();
    this.flashText = this.add.text(this.scale.width / 2, 130, msg, {
      fontFamily: "Courier New, monospace",
      fontSize: "16px",
      color: "#ffd56b",
      backgroundColor: "#00000099",
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({
      targets: this.flashText,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      onComplete: () => this.flashText && this.flashText.destroy()
    });
  }
}

window.FarmScene = FarmScene;

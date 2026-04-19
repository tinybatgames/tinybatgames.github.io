// 50x50 tarla. Label yok — tek hover tooltip. Boş tile = Firestore'da doc yok.

class FarmScene extends Phaser.Scene {
  constructor() { super("FarmScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.tiles = {};
    this.tileSprites = {};
    this.userData = null;
    this.selectedSeed = null;
    this.seedPanel = null;
    this.hoverTile = null;
    this.readyTweens = {};

    this.cameras.main.setBackgroundColor("#2a1e14");

    const grid = window.GRID_SIZE;
    const size = window.TILE_PX;
    const w = grid * size;
    const h = grid * size;
    const ox = (this.scale.width - w) / 2;
    const oy = 120;
    this.gridOrigin = { x: ox, y: oy, size };

    this.add.rectangle(ox + w / 2, oy + h / 2, w + 4, h + 4, 0x1a1109).setStrokeStyle(2, 0x8b5a2b);

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const x = ox + c * size + size / 2;
        const y = oy + r * size + size / 2;
        const tId = `${r}_${c}`;

        const bg = this.add.image(x, y, "tile_soil")
          .setDisplaySize(size, size)
          .setInteractive({ useHandCursor: true });
        const crop = this.add.image(x, y, "tile_soil")
          .setDisplaySize(size, size)
          .setVisible(false);

        bg.on("pointerover", () => this.onHover(tId, true));
        bg.on("pointerout", () => this.onHover(tId, false));
        bg.on("pointerdown", () => this.onTileClick(tId));

        this.tileSprites[tId] = { bg, crop, row: r, col: c, x, y };
      }
    }

    this.tooltip = this.add.text(0, 0, "", {
      fontFamily: "Courier New, monospace",
      fontSize: "12px",
      color: "#ffd56b",
      backgroundColor: "#000000cc",
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5, 1).setDepth(1000).setVisible(false);

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

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });

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
    this.selectedSeed = window.CROP_KEYS.find(have) || null;
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

  stageOf(data) {
    const readyMs = data.readyAt ? data.readyAt.toMillis() : 0;
    const plantedMs = data.plantedAt ? data.plantedAt.toMillis() : 0;
    const totalMs = Math.max(1, readyMs - plantedMs);
    const progress = (Date.now() - plantedMs) / totalMs;
    if (progress >= 1) return "ready";
    if (progress >= 0.5) return "growing";
    return "seedling";
  }

  renderTiles() {
    for (const tId in this.tileSprites) {
      const sprite = this.tileSprites[tId];
      const data = this.tiles[tId];
      if (!data || !data.crop) {
        if (sprite.crop.visible) sprite.crop.setVisible(false);
        if (this.readyTweens[tId]) {
          this.readyTweens[tId].stop();
          delete this.readyTweens[tId];
          sprite.crop.setScale(1);
          sprite.crop.setDisplaySize(window.TILE_PX, window.TILE_PX);
        }
      }
    }
    for (const tId in this.tiles) {
      this.updateTileSprite(tId);
    }
  }

  updateTileSprite(tId) {
    const sprite = this.tileSprites[tId];
    const data = this.tiles[tId];
    if (!sprite || !data || !data.crop) return;
    const stage = this.stageOf(data);
    const key = `crop_${data.crop}_${stage}`;
    if (sprite.crop.texture.key !== key) {
      sprite.crop.setTexture(key).setDisplaySize(window.TILE_PX, window.TILE_PX);
    }
    if (!sprite.crop.visible) sprite.crop.setVisible(true);

    if (stage === "ready" && !this.readyTweens[tId]) {
      this.readyTweens[tId] = this.tweens.add({
        targets: sprite.crop,
        scale: { from: sprite.crop.scale, to: sprite.crop.scale * 1.2 },
        yoyo: true, duration: 600, repeat: -1, ease: "Sine.easeInOut"
      });
    } else if (stage !== "ready" && this.readyTweens[tId]) {
      this.readyTweens[tId].stop();
      delete this.readyTweens[tId];
      sprite.crop.setScale(1);
      sprite.crop.setDisplaySize(window.TILE_PX, window.TILE_PX);
    }
  }

  tick() {
    for (const tId in this.tiles) {
      const data = this.tiles[tId];
      if (!data || !data.crop) continue;
      const sprite = this.tileSprites[tId];
      if (!sprite) continue;
      const expected = this.stageOf(data);
      const currentKey = sprite.crop.texture.key;
      if (!currentKey.endsWith(expected)) {
        this.updateTileSprite(tId);
      }
    }
    if (this.hoverTile) this.updateTooltip(this.hoverTile);
  }

  onHover(tId, over) {
    const sprite = this.tileSprites[tId];
    if (!sprite) return;
    if (over) {
      sprite.bg.setTint(0xffe7a8);
      this.hoverTile = tId;
      this.updateTooltip(tId);
    } else {
      sprite.bg.clearTint();
      if (this.hoverTile === tId) {
        this.hoverTile = null;
        this.tooltip.setVisible(false);
      }
    }
  }

  updateTooltip(tId) {
    const sprite = this.tileSprites[tId];
    const data = this.tiles[tId];
    let text;
    if (!data || !data.crop) {
      const seeds = this.userData?.inventory?.seeds || {};
      if (this.selectedSeed && (seeds[this.selectedSeed] || 0) > 0) {
        text = `Boş — ${window.CROPS[this.selectedSeed].name} ek`;
      } else {
        text = "Boş";
      }
    } else {
      const c = window.CROPS[data.crop];
      const readyMs = data.readyAt ? data.readyAt.toMillis() : 0;
      const remaining = Math.max(0, Math.ceil((readyMs - Date.now()) / 1000));
      text = remaining === 0 ? `${c.name} — HAZIR` : `${c.name} — ${this.formatSec(remaining)}`;
    }
    this.tooltip.setText(text);
    this.tooltip.setPosition(sprite.x, sprite.y - window.TILE_PX / 2 - 4);
    this.tooltip.setVisible(true);
  }

  formatSec(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  async onTileClick(tId) {
    const data = this.tiles[tId];

    if (data && data.crop) {
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

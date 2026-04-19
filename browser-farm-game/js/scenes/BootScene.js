// Placeholder sprite'ları runtime'da üretir. Gerçek pixel-art asset koymak için
// bu dosyayı loader ile değiştirip `preload()` içinde `this.load.image(...)` kullan.

class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  create() {
    this.makeTile();
    for (const key of window.CROP_KEYS) {
      const c = window.CROPS[key];
      this.makeCrop(`crop_${key}_seedling`, c, 0);
      this.makeCrop(`crop_${key}_growing`, c, 1);
      this.makeCrop(`crop_${key}_ready`, c, 2);
    }
    this.makeIcon("icon_coin", 0xffd56b);
    this.scene.start("FarmScene");
    this.scene.launch("UIScene");
  }

  makeTile() {
    const g = this.add.graphics();
    const size = window.TILE_SOURCE_PX;
    g.fillStyle(0x6b4423); g.fillRect(0, 0, size, size);
    g.fillStyle(0x8b5a2b); g.fillRect(2, 2, size - 4, size - 4);
    g.fillStyle(0x5a3818);
    for (let i = 0; i < 8; i++) {
      g.fillRect(Phaser.Math.Between(6, size - 10), Phaser.Math.Between(6, size - 10), 3, 3);
    }
    g.lineStyle(2, 0x3a2510);
    g.strokeRect(0, 0, size, size);
    g.generateTexture("tile_soil", size, size);
    g.clear();

    // Seçili tile çerçevesi
    g.lineStyle(3, 0xffd56b);
    g.strokeRect(1, 1, size - 2, size - 2);
    g.generateTexture("tile_hover", size, size);
    g.destroy();
  }

  makeCrop(key, crop, stage) {
    const g = this.add.graphics();
    const size = window.TILE_SOURCE_PX;
    const cx = size / 2;
    const cy = size / 2;

    if (stage === 0) {
      // fide: küçük yeşil nokta
      g.fillStyle(crop.stemColor);
      g.fillRect(cx - 2, cy + 4, 4, 12);
      g.fillStyle(0x2ecc71);
      g.fillCircle(cx, cy + 2, 6);
    } else if (stage === 1) {
      // büyüyor: daha uzun sap + orta boy
      g.fillStyle(crop.stemColor);
      g.fillRect(cx - 2, cy - 4, 4, 20);
      g.fillStyle(0x27ae60);
      g.fillCircle(cx, cy - 4, 10);
    } else {
      // hazır: büyük renkli meyve + sap + yapraklar
      g.fillStyle(crop.stemColor);
      g.fillRect(cx - 2, cy - 10, 4, 22);
      g.fillStyle(0x27ae60);
      g.fillTriangle(cx - 12, cy - 10, cx - 2, cy - 18, cx - 2, cy - 8);
      g.fillTriangle(cx + 12, cy - 10, cx + 2, cy - 18, cx + 2, cy - 8);
      g.fillStyle(crop.color);
      g.fillCircle(cx, cy, 16);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(cx - 5, cy - 5, 4);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeIcon(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color);
    g.fillCircle(12, 12, 10);
    g.lineStyle(2, 0x8b5a2b);
    g.strokeCircle(12, 12, 10);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }
}

window.BootScene = BootScene;

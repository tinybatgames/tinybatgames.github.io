// Envanter sahnesi: altın + tohum + hasat.
class InventoryScene extends Phaser.Scene {
  constructor() { super("InventoryScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.userData = null;

    this.cameras.main.setBackgroundColor("#2a1e14");

    this.layer = this.add.container(0, 0);

    this.unsubUser = window.FarmDB.listenToUser(this.uid, (user) => {
      this.userData = user;
      this.game.events.emit("userUpdated", user);
      this.rebuild();
    });

    this.events.on("shutdown", () => {
      if (this.unsubUser) this.unsubUser();
    });

    this.rebuild();
  }

  rebuild() {
    this.layer.removeAll(true);
    if (!this.userData) return;
    const cx = this.scale.width / 2;

    const title = this.add.text(cx, 95, "Envanter", {
      fontFamily: "Courier New, monospace", fontSize: "22px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(title);

    // Altın kartı
    const coinBg = this.add.rectangle(cx, 145, 280, 50, 0x3d2a1a).setStrokeStyle(2, 0xffd56b);
    const coinIcon = this.add.image(cx - 100, 145, "icon_coin");
    const coinText = this.add.text(cx - 75, 145, `${this.userData.coins ?? 0} altın`, {
      fontFamily: "Courier New, monospace", fontSize: "20px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    this.layer.add([coinBg, coinIcon, coinText]);

    const seeds = this.userData.inventory?.seeds || {};
    const crops = this.userData.inventory?.crops || {};

    // Tohum bölümü
    const seedTitle = this.add.text(cx, 210, "🌱 Tohumlar", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(seedTitle);
    this.drawInventorySlots(cx, 270, seeds, "tohum");

    // Hasat bölümü
    const cropTitle = this.add.text(cx, 380, "🌾 Hasatlar", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(cropTitle);
    this.drawInventorySlots(cx, 440, crops, "hasat");

    // Alt ipucu
    const hint = this.add.text(cx, 555,
      "Tohum almak için Pazar > Tohum Mağazası • Hasat satmak için Pazar > Sat",
      { fontFamily: "Courier New, monospace", fontSize: "11px", color: "#8b7a5a" }
    ).setOrigin(0.5);
    this.layer.add(hint);
  }

  drawInventorySlots(cxPos, y, map, kind) {
    const keys = window.CROP_KEYS.filter(k => (map[k] || 0) > 0);
    if (keys.length === 0) {
      const t = this.add.text(cxPos, y, `(boş — ${kind} yok)`, {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#8b7a5a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }
    const slotW = 140;
    const spacing = 160;
    const startX = cxPos - ((keys.length - 1) * spacing) / 2;
    keys.forEach((k, i) => {
      const x = startX + i * spacing;
      const bg = this.add.rectangle(x, y, slotW, 90, 0x3d2a1a).setStrokeStyle(2, 0x8b5a2b);
      const icon = this.add.image(x - 36, y, `crop_${k}_ready`).setScale(0.7);
      const name = this.add.text(x + 10, y - 14, window.CROPS[k].name, {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f5e9d7"
      }).setOrigin(0, 0.5);
      const count = this.add.text(x + 10, y + 10, `× ${map[k]}`, {
        fontFamily: "Courier New, monospace", fontSize: "18px", color: "#ffd56b"
      }).setOrigin(0, 0.5);
      this.layer.add([bg, icon, name, count]);
    });
  }
}

window.InventoryScene = InventoryScene;

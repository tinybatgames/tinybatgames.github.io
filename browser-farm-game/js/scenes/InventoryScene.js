// Envanter sahnesi: altın + tohum + hasat. Tür filtresi ve sıralama.
class InventoryScene extends Phaser.Scene {
  constructor() { super("InventoryScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.userData = null;
    this.filter = { crop: "all", sort: "qty_desc" };

    this.cameras.main.setBackgroundColor("#2a1e14");
    this.layer = this.add.container(0, 0);

    this.unsubUser = window.FarmDB.listenToUser(this.uid, (user) => {
      this.userData = user;
      this.game.events.emit("userUpdated", user);
      this.rebuild();
    });

    this.scale.on("resize", this.rebuild, this);

    this.events.on("shutdown", () => {
      if (this.unsubUser) this.unsubUser();
      this.scale.off("resize", this.rebuild, this);
    });

    this.rebuild();
  }

  rebuild() {
    this.layer.removeAll(true);
    if (!this.userData) return;
    const cx = this.scale.width / 2;

    const title = this.add.text(cx, 85, "Envanter", {
      fontFamily: "Courier New, monospace", fontSize: "22px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(title);

    // Altın kartı
    const coinBg = this.add.rectangle(cx, 125, 280, 40, 0x3d2a1a).setStrokeStyle(2, 0xffd56b);
    const coinIcon = this.add.image(cx - 100, 125, "icon_coin");
    const coinText = this.add.text(cx - 75, 125, `${this.userData.coins ?? 0} altın`, {
      fontFamily: "Courier New, monospace", fontSize: "18px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    this.layer.add([coinBg, coinIcon, coinText]);

    this.drawFilterBar(cx, 170);

    const seeds = this.userData.inventory?.seeds || {};
    const crops = this.userData.inventory?.crops || {};

    const seedTitle = this.add.text(cx, 245, "🌱 Tohumlar", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(seedTitle);
    this.drawInventorySlots(cx, 300, seeds, "tohum");

    const cropTitle = this.add.text(cx, 395, "🌾 Hasatlar", {
      fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(cropTitle);
    this.drawInventorySlots(cx, 450, crops, "hasat");

    const hint = this.add.text(cx, this.scale.height - 30,
      "Tohum almak için Pazar > Tohum Mağazası • Hasat satmak için Pazar > Sat",
      { fontFamily: "Courier New, monospace", fontSize: "11px", color: "#8b7a5a" }
    ).setOrigin(0.5);
    this.layer.add(hint);
  }

  drawFilterBar(cx, y) {
    const cropOpts = [
      { key: "all", label: "Tümü" },
      ...window.CROP_KEYS.map(k => ({ key: k, label: window.CROPS[k].name }))
    ];
    const spacing = 85;
    const startX = cx - 160 - ((cropOpts.length - 1) * spacing) / 2;
    const cropLabel = this.add.text(startX - 60, y, "Tür:", {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(cropLabel);
    cropOpts.forEach((opt, i) => {
      const chip = this.makeChip(startX + i * spacing, y, opt.label, this.filter.crop === opt.key, () => {
        this.filter.crop = opt.key; this.rebuild();
      });
      this.layer.add(chip);
    });

    const sortOpts = [
      { key: "qty_desc", label: "Miktar ↓" },
      { key: "name", label: "İsim" }
    ];
    const sortStartX = cx + 220;
    const sortLabelEl = this.add.text(sortStartX - 75, y, "Sırala:", {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(sortLabelEl);
    sortOpts.forEach((opt, i) => {
      const chip = this.makeChip(sortStartX - 15 + i * 85, y, opt.label, this.filter.sort === opt.key, () => {
        this.filter.sort = opt.key; this.rebuild();
      });
      this.layer.add(chip);
    });
  }

  applyFilter(map) {
    let keys = window.CROP_KEYS.filter(k => (map[k] || 0) > 0);
    if (this.filter.crop !== "all") keys = keys.filter(k => k === this.filter.crop);
    if (this.filter.sort === "qty_desc") keys.sort((a, b) => (map[b] || 0) - (map[a] || 0));
    else if (this.filter.sort === "name") keys.sort((a, b) => window.CROPS[a].name.localeCompare(window.CROPS[b].name, "tr"));
    return keys;
  }

  makeChip(x, y, text, active, onClick) {
    const bg = this.add.rectangle(x, y, 75, 26, active ? 0x8b5a2b : 0x3d2a1a)
      .setStrokeStyle(2, active ? 0xffd56b : 0x8b5a2b).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "11px",
      color: active ? "#ffffff" : "#c9b28a"
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(active ? 0xa06a35 : 0x5a3f24));
    bg.on("pointerout", () => bg.setFillStyle(active ? 0x8b5a2b : 0x3d2a1a));
    bg.on("pointerdown", onClick);
    return [bg, t];
  }

  drawInventorySlots(cxPos, y, map, kind) {
    const keys = this.applyFilter(map);
    if (keys.length === 0) {
      const t = this.add.text(cxPos, y, `(boş — ${kind} yok)`, {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#8b7a5a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }
    const slotW = 130;
    const spacing = 150;
    const startX = cxPos - ((keys.length - 1) * spacing) / 2;
    keys.forEach((k, i) => {
      const x = startX + i * spacing;
      const bg = this.add.rectangle(x, y, slotW, 80, 0x3d2a1a).setStrokeStyle(2, 0x8b5a2b);
      const icon = this.add.image(x - 36, y, `crop_${k}_ready`).setScale(0.6);
      const name = this.add.text(x + 10, y - 12, window.CROPS[k].name, {
        fontFamily: "Courier New, monospace", fontSize: "12px", color: "#f5e9d7"
      }).setOrigin(0, 0.5);
      const count = this.add.text(x + 10, y + 10, `× ${map[k]}`, {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#ffd56b"
      }).setOrigin(0, 0.5);
      this.layer.add([bg, icon, name, count]);
    });
  }
}

window.InventoryScene = InventoryScene;

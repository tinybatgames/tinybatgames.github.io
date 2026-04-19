// Envanter sahnesi: grid tabanlı panel, filtre sekmeleri, seçim + alt bilgi çubuğu.
class InventoryScene extends Phaser.Scene {
  constructor() { super("InventoryScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.userData = null;
    this.filter = { kind: "all" };
    this.selected = null;

    this.cameras.main.setBackgroundColor("#1a0e06");
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
    const topY = 100;

    const cols = 6;
    const slotSize = 68;
    const slotGap = 10;
    const rows = 3;

    const gridW = cols * slotSize + (cols - 1) * slotGap;
    const gridH = rows * slotSize + (rows - 1) * slotGap;

    const panelPad = 24;
    const headerH = 54;
    const filterH = 42;
    const footerH = 50;

    const panelW = Math.max(540, gridW + panelPad * 2);
    const panelH = headerH + filterH + gridH + footerH + panelPad * 2;
    const panelX = cx - panelW / 2;
    const panelY = topY;

    // Panel arka plan
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2a1810, 1);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    panelBg.lineStyle(3, 0xc8923a, 1);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);
    // Dış gölge efekti (ince altın hat)
    panelBg.lineStyle(1, 0x6b4220, 0.6);
    panelBg.strokeRoundedRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 14);
    this.layer.add(panelBg);

    // Başlık pankartı
    const bannerW = 280, bannerH = 46;
    const bannerY = panelY + 6;
    const banner = this.add.graphics();
    banner.fillStyle(0x3d2a1a, 1);
    banner.fillRoundedRect(cx - bannerW / 2, bannerY - bannerH / 2 + 22, bannerW, bannerH, 23);
    banner.lineStyle(2, 0xffd56b, 1);
    banner.strokeRoundedRect(cx - bannerW / 2, bannerY - bannerH / 2 + 22, bannerW, bannerH, 23);
    this.layer.add(banner);

    const title = this.add.text(cx, bannerY + 22, "ENVANTER", {
      fontFamily: "Courier New, monospace", fontSize: "20px", fontStyle: "bold", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(title);

    // Filtre sekmeleri
    const tabY = panelY + headerH + 16;
    const tabs = [
      { key: "all", label: "Tümü" },
      { key: "seed", label: "Tohum" },
      { key: "crop", label: "Hasat" }
    ];
    const tabSpacing = 100;
    const tabStartX = cx - ((tabs.length - 1) * tabSpacing) / 2;
    tabs.forEach((t, i) => {
      const btn = this.makeFilterTab(tabStartX + i * tabSpacing, tabY, t.label, this.filter.kind === t.key, () => {
        this.filter.kind = t.key;
        this.selected = null;
        this.rebuild();
      });
      this.layer.add(btn);
    });

    // Öğe listesi
    const items = [];
    const seeds = this.userData.inventory?.seeds || {};
    const crops = this.userData.inventory?.crops || {};

    if (this.filter.kind === "all" || this.filter.kind === "seed") {
      window.CROP_KEYS.forEach(k => {
        if ((seeds[k] || 0) > 0) items.push({ type: "seed", key: k, qty: seeds[k] });
      });
    }
    if (this.filter.kind === "all" || this.filter.kind === "crop") {
      window.CROP_KEYS.forEach(k => {
        if ((crops[k] || 0) > 0) items.push({ type: "crop", key: k, qty: crops[k] });
      });
    }
    items.sort((a, b) => b.qty - a.qty);

    // Grid
    const gridY = tabY + 30;
    const gridX = cx - gridW / 2;
    const totalSlots = cols * rows;

    for (let i = 0; i < totalSlots; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const sx = gridX + c * (slotSize + slotGap) + slotSize / 2;
      const sy = gridY + r * (slotSize + slotGap) + slotSize / 2;
      const item = items[i];
      const isSel = !!item && this.selected
        && this.selected.type === item.type && this.selected.key === item.key;
      const slot = this.drawSlot(sx, sy, slotSize, item, isSel);
      this.layer.add(slot);
    }

    // Footer bar (seçili öğe + altın)
    const footerY = panelY + panelH - panelPad - 12;
    const footerX = panelX + 16;
    const footerW = panelW - 32;
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x140a04, 1);
    footerBg.fillRoundedRect(footerX, footerY - 18, footerW, 36, 10);
    footerBg.lineStyle(2, 0x6b4220, 1);
    footerBg.strokeRoundedRect(footerX, footerY - 18, footerW, 36, 10);
    this.layer.add(footerBg);

    // Seçili öğe (sol)
    let selIconKey = null;
    let selText = "Bir öğe seç";
    let selColor = "#8b7a5a";
    if (this.selected) {
      const def = window.CROPS[this.selected.key];
      selIconKey = this.selected.type === "seed"
        ? `crop_${this.selected.key}_seedling`
        : `crop_${this.selected.key}_ready`;
      const suffix = this.selected.type === "seed" ? "Tohumu" : "Hasadı";
      const qty = this.selected.type === "seed"
        ? (seeds[this.selected.key] || 0)
        : (crops[this.selected.key] || 0);
      selText = `${def.name} ${suffix} × ${qty}`;
      selColor = "#f0e2c0";
    }
    if (selIconKey) {
      const icon = this.add.image(footerX + 22, footerY, selIconKey).setScale(0.5);
      this.layer.add(icon);
    }
    const selLabel = this.add.text(footerX + (selIconKey ? 46 : 16), footerY, selText, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: selColor
    }).setOrigin(0, 0.5);
    this.layer.add(selLabel);

    // Altın (sağ)
    const coinIcon = this.add.image(footerX + footerW - 96, footerY, "icon_coin");
    const coinText = this.add.text(footerX + footerW - 78, footerY, `${this.userData.coins ?? 0} altın`, {
      fontFamily: "Courier New, monospace", fontSize: "14px", fontStyle: "bold", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    this.layer.add([coinIcon, coinText]);

    // İpucu
    const hint = this.add.text(cx, panelY + panelH + 18,
      "Tohum almak için Pazar > Tohum Mağazası • Hasat satmak için Pazar > Sat",
      { fontFamily: "Courier New, monospace", fontSize: "11px", color: "#8b7a5a" }
    ).setOrigin(0.5);
    this.layer.add(hint);
  }

  drawSlot(x, y, size, item, selected) {
    const parts = [];
    const half = size / 2;

    const bg = this.add.graphics();
    const fill = item ? 0x1a0e06 : 0x140a04;
    let border;
    if (selected) border = 0xffd56b;
    else if (!item) border = 0x3d2a1a;
    else if (item.type === "seed") border = 0x6b8a3a;
    else border = 0xc8923a;
    const borderW = selected ? 3 : 2;

    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(x - half, y - half, size, size, 8);
    bg.lineStyle(borderW, border, 1);
    bg.strokeRoundedRect(x - half, y - half, size, size, 8);

    if (item) {
      // İç yumuşak parıltı seçiliyken
      if (selected) {
        bg.lineStyle(1, 0xffd56b, 0.4);
        bg.strokeRoundedRect(x - half + 3, y - half + 3, size - 6, size - 6, 6);
      }
    }
    parts.push(bg);

    if (item) {
      const iconKey = item.type === "seed" ? `crop_${item.key}_seedling` : `crop_${item.key}_ready`;
      const icon = this.add.image(x, y - 2, iconKey).setScale(0.6);
      parts.push(icon);

      // Miktar rozeti (sağ-alt)
      const qtyText = this.add.text(x + half - 5, y + half - 4, String(item.qty), {
        fontFamily: "Courier New, monospace", fontSize: "12px", fontStyle: "bold",
        color: "#ffd56b", stroke: "#0a0502", strokeThickness: 3
      }).setOrigin(1, 1);
      parts.push(qtyText);

      // Tür göstergesi (sol-üst)
      const typeLabel = item.type === "seed" ? "T" : "H";
      const typeColor = item.type === "seed" ? "#9be86b" : "#ffb366";
      const tt = this.add.text(x - half + 5, y - half + 4, typeLabel, {
        fontFamily: "Courier New, monospace", fontSize: "10px", fontStyle: "bold",
        color: typeColor, stroke: "#0a0502", strokeThickness: 2
      }).setOrigin(0, 0);
      parts.push(tt);

      // Tıklama alanı
      const zone = this.add.rectangle(x, y, size, size, 0x000000, 0).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        if (selected) return;
        bg.clear();
        bg.fillStyle(0x2a1810, 1);
        bg.fillRoundedRect(x - half, y - half, size, size, 8);
        bg.lineStyle(2, 0xffd56b, 0.8);
        bg.strokeRoundedRect(x - half, y - half, size, size, 8);
      });
      zone.on("pointerout", () => {
        if (selected) return;
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(x - half, y - half, size, size, 8);
        bg.lineStyle(borderW, border, 1);
        bg.strokeRoundedRect(x - half, y - half, size, size, 8);
      });
      zone.on("pointerdown", () => {
        this.selected = { type: item.type, key: item.key };
        this.rebuild();
      });
      parts.push(zone);
    }

    return parts;
  }

  makeFilterTab(x, y, text, active, onClick) {
    const w = 88, h = 30;
    const g = this.add.graphics();
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "12px", fontStyle: "bold", color: "#c9b28a"
    }).setOrigin(0.5);

    const draw = (hover) => {
      g.clear();
      let fill, border, tc;
      if (active) { fill = 0xc8923a; border = 0xffd56b; tc = "#2a1810"; }
      else if (hover) { fill = 0x5a3f24; border = 0xc8923a; tc = "#ffffff"; }
      else { fill = 0x2a1810; border = 0x8b5a2b; tc = "#c9b28a"; }
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      g.lineStyle(2, border, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      t.setColor(tc);
    };

    draw(false);
    const zone = this.add.rectangle(x, y, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => { if (!active) draw(true); });
    zone.on("pointerout", () => { if (!active) draw(false); });
    zone.on("pointerdown", onClick);
    return [g, zone, t];
  }
}

window.InventoryScene = InventoryScene;

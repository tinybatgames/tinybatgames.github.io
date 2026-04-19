// Pazar sahnesi: 3 sekme — Tohum Mağazası, Oyuncu İlanları, Sat.
class MarketScene extends Phaser.Scene {
  constructor() { super("MarketScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.userData = null;
    this.listings = [];
    this.activeTab = "seeds";
    this.listingFilter = { crop: "all", sort: "newest" };

    this.cameras.main.setBackgroundColor("#1a0e06");

    this.unsubUser = window.FarmDB.listenToUser(this.uid, (user) => {
      this.userData = user;
      this.game.events.emit("userUpdated", user);
      this.rebuild();
    });
    this.unsubMarket = window.FarmDB.listenToMarket((listings) => {
      this.listings = listings;
      if (this.activeTab === "listings") this.rebuild();
    });

    this.events.on("shutdown", () => {
      if (this.unsubUser) this.unsubUser();
      if (this.unsubMarket) this.unsubMarket();
    });

    this.layer = this.add.container(0, 0);
    this.rebuild();
  }

  rebuild() {
    if (!this.userData) return;
    this.layer.removeAll(true);
    this.drawTabs();
    if (this.activeTab === "seeds") this.drawSeedShop();
    else if (this.activeTab === "listings") this.drawListings();
    else if (this.activeTab === "sell") this.drawSellForm();
  }

  drawTabs() {
    const labels = [
      { key: "seeds", text: "Tohum Mağazası" },
      { key: "listings", text: `İlanlar (${this.listings.length})` },
      { key: "sell", text: "Sat" }
    ];
    const y = 105;
    const w = 180, h = 36, gap = 12;
    const totalW = labels.length * w + (labels.length - 1) * gap;
    const startX = (this.scale.width - totalW) / 2;
    labels.forEach((l, i) => {
      const cx = startX + i * (w + gap) + w / 2;
      const active = l.key === this.activeTab;
      this.drawPill(cx, y, w, h, l.text, active, () => {
        this.activeTab = l.key;
        this.rebuild();
      });
    });
  }

  drawPill(cx, cy, w, h, text, active, onClick) {
    const x = cx - w / 2, y = cy - h / 2;
    const g = this.add.graphics();
    const zone = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    const t = this.add.text(cx, cy, text, {
      fontFamily: "Courier New, monospace", fontSize: "13px",
      color: active ? "#2a1810" : "#c8923a"
    }).setOrigin(0.5);

    const draw = (hover) => {
      g.clear();
      let fill, border;
      if (active) { fill = 0xc8923a; border = 0xffd56b; }
      else if (hover) { fill = 0x3a2419; border = 0xc8923a; }
      else { fill = 0x1a1109; border = 0x6b4220; }
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x, y, w, h, h / 2);
      g.lineStyle(2, border, 1);
      g.strokeRoundedRect(x, y, w, h, h / 2);
    };
    draw(false);
    zone.on("pointerdown", onClick);
    zone.on("pointerover", () => !active && draw(true));
    zone.on("pointerout", () => !active && draw(false));
    this.layer.add([g, t, zone]);
  }

  drawSeedShop() {
    const keys = window.CROP_KEYS;
    const cardW = 280, cardH = 210, gap = 20;
    const totalW = keys.length * cardW + (keys.length - 1) * gap;
    const startX = (this.scale.width - totalW) / 2;
    const y0 = 165;

    keys.forEach((key, i) => {
      const c = window.CROPS[key];
      const x = startX + i * (cardW + gap);
      this.drawSeedCard(x, y0, cardW, cardH, key, c);
    });
  }

  drawSeedCard(x, y, w, h, key, c) {
    // Kart arka planı
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1810, 1);
    bg.fillRoundedRect(x, y, w, h, 10);
    bg.lineStyle(2, 0xc8923a, 1);
    bg.strokeRoundedRect(x, y, w, h, 10);
    this.layer.add(bg);

    // Üst: ikon + başlık + fiyat alt yazısı
    const icon = this.add.image(x + 38, y + 42, `crop_${key}_ready`).setScale(0.9);
    const title = this.add.text(x + 80, y + 26, c.name, {
      fontFamily: "Courier New, monospace", fontSize: "20px", fontStyle: "bold", color: "#f0e2c0"
    }).setOrigin(0, 0.5);
    const priceSub = this.add.text(x + 80, y + 52, `${c.seedPrice} Altın / Tohum`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#c8923a"
    }).setOrigin(0, 0.5);
    this.layer.add([icon, title, priceSub]);

    // Ayırıcı
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x6b4220, 0.7);
    divider.lineBetween(x + 16, y + 78, x + w - 16, y + 78);
    this.layer.add(divider);

    // Satır 1: büyüme süresi + "1 al" butonu
    const rowY1 = y + 115;
    const h1 = this.add.text(x + 22, rowY1, "⏳", {
      fontFamily: "Arial", fontSize: "20px", color: "#ffd56b"
    }).setOrigin(0.5);
    const h1Text = this.add.text(x + 42, rowY1 - 8, `${c.growSec} saniye`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
    }).setOrigin(0, 0.5);
    const h1Sub = this.add.text(x + 42, rowY1 + 8, "Büyüme", {
      fontFamily: "Courier New, monospace", fontSize: "11px", color: "#8b7a5a"
    }).setOrigin(0, 0.5);
    const buy1 = this.makeButton(x + w - 54, rowY1, "1 al", async () => {
      if (!window.ActionLock.tryStart()) return;
      try { await window.FarmDB.buySeed(this.uid, key, 1); }
      catch (err) { this.toast(err.message); }
    }, 80);
    this.layer.add([h1, h1Text, h1Sub, ...buy1]);

    // Satır 2: satış fiyatı + "5 al" butonu
    const rowY2 = y + 165;
    const sIcon = this.add.image(x + 22, rowY2, "icon_coin").setScale(0.9);
    const sText = this.add.text(x + 42, rowY2 - 8, `${c.sellPrice} Altın`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
    }).setOrigin(0, 0.5);
    const sSub = this.add.text(x + 42, rowY2 + 8, "Satış", {
      fontFamily: "Courier New, monospace", fontSize: "11px", color: "#8b7a5a"
    }).setOrigin(0, 0.5);
    const buy5 = this.makeButton(x + w - 54, rowY2, "5 al", async () => {
      if (!window.ActionLock.tryStart()) return;
      try { await window.FarmDB.buySeed(this.uid, key, 5); }
      catch (err) { this.toast(err.message); }
    }, 80);
    this.layer.add([sIcon, sText, sSub, ...buy5]);
  }

  drawListings() {
    this.drawFilterBar();
    const filtered = this.applyFilters(this.listings);

    if (filtered.length === 0) {
      const t = this.add.text(this.scale.width / 2, 300, this.listings.length === 0 ? "Henüz ilan yok." : "Filtreye uyan ilan yok.", {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#c9b28a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }
    const y0 = 260;
    const rowH = 52;
    const rowW = 760;
    filtered.slice(0, 6).forEach((l, i) => {
      const c = window.CROPS[l.crop];
      if (!c) return;
      const y = y0 + i * rowH;
      const x = this.scale.width / 2 - rowW / 2;
      const bg = this.add.graphics();
      bg.fillStyle(0x2a1810, 1);
      bg.fillRoundedRect(x, y - 22, rowW, 44, 8);
      bg.lineStyle(2, 0x8b5a2b, 1);
      bg.strokeRoundedRect(x, y - 22, rowW, 44, 8);

      const icon = this.add.image(x + 28, y, `crop_${l.crop}_ready`).setScale(0.55);
      const total = l.quantity * l.pricePerUnit;
      const mine = l.sellerId === this.uid;
      const text = `${c.name} × ${l.quantity}   ${l.pricePerUnit} 🪙/adet (Toplam ${total})   @${l.sellerName}`;
      const info = this.add.text(x + 60, y, text, {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
      }).setOrigin(0, 0.5);

      let btn;
      if (mine) {
        btn = this.makeButton(x + rowW - 60, y, "Geri çek", async () => {
          if (!window.ActionLock.tryStart()) return;
          try { await window.FarmDB.cancelListing(this.uid, l.id); }
          catch (err) { this.toast(err.message); }
        }, 100);
      } else {
        btn = this.makeButton(x + rowW - 60, y, "Satın al", async () => {
          if (!window.ActionLock.tryStart()) return;
          try { await window.FarmDB.buyListing(this.uid, l.id); this.toast("Satın alındı!"); }
          catch (err) { this.toast(err.message); }
        }, 100);
      }
      this.layer.add([bg, icon, info, ...btn]);
    });
  }

  drawSellForm() {
    const crops = this.userData?.inventory?.crops || {};
    const keys = window.CROP_KEYS.filter(k => (crops[k] || 0) > 0);
    const cx = this.scale.width / 2;

    const info = this.add.text(cx, 160, "Envanterinden bir ürün seç:", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(info);

    if (keys.length === 0) {
      const empty = this.add.text(cx, 220, "Satacak hasadın yok.", {
        fontFamily: "Courier New, monospace", fontSize: "14px", color: "#c9b28a"
      }).setOrigin(0.5);
      this.layer.add(empty);
      return;
    }

    if (!this.sellState) this.sellState = { crop: keys[0], qty: 1, price: window.CROPS[keys[0]].sellPrice };
    if (!keys.includes(this.sellState.crop)) {
      this.sellState.crop = keys[0];
      this.sellState.price = window.CROPS[keys[0]].sellPrice;
      this.sellState.qty = 1;
    }

    // Ürün seçici
    const spacing = 110;
    const startX = cx - ((keys.length - 1) * spacing) / 2;
    keys.forEach((k, i) => {
      const x = startX + i * spacing;
      const selected = k === this.sellState.crop;
      const cellW = 96, cellH = 68, cellY = 205;
      const cg = this.add.graphics();
      cg.fillStyle(selected ? 0xc8923a : 0x2a1810, 1);
      cg.fillRoundedRect(x - cellW / 2, cellY - cellH / 2, cellW, cellH, 8);
      cg.lineStyle(2, selected ? 0xffd56b : 0x6b4220, 1);
      cg.strokeRoundedRect(x - cellW / 2, cellY - cellH / 2, cellW, cellH, 8);
      const zone = this.add.rectangle(x, cellY, cellW, cellH, 0x000000, 0).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x, cellY - 8, `crop_${k}_ready`).setScale(0.5);
      const label = this.add.text(x, cellY + 22, `${window.CROPS[k].name} (${crops[k]})`, {
        fontFamily: "Courier New, monospace", fontSize: "10px", color: selected ? "#2a1810" : "#f0e2c0"
      }).setOrigin(0.5);
      zone.on("pointerdown", () => { this.sellState.crop = k; this.sellState.qty = 1; this.rebuild(); });
      this.layer.add([cg, zone, icon, label]);
    });

    const selectedCrop = window.CROPS[this.sellState.crop];
    const max = crops[this.sellState.crop];

    // Miktar
    const qtyY = 270;
    const qtyLabel = this.add.text(cx - 140, qtyY, `Miktar: ${this.sellState.qty} / ${max}`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
    }).setOrigin(0, 0.5);
    const qMinus = this.makeButton(cx + 40, qtyY, "-", () => {
      this.sellState.qty = Math.max(1, this.sellState.qty - 1); this.rebuild();
    }, 36);
    const qPlus = this.makeButton(cx + 85, qtyY, "+", () => {
      this.sellState.qty = Math.min(max, this.sellState.qty + 1); this.rebuild();
    }, 36);
    const qMax = this.makeButton(cx + 145, qtyY, "max", () => {
      this.sellState.qty = max; this.rebuild();
    }, 60);
    this.layer.add([qtyLabel, ...qMinus, ...qPlus, ...qMax]);

    // Ayırıcı 1
    const sep1 = this.add.graphics();
    sep1.lineStyle(1, 0x6b4220, 0.7);
    sep1.lineBetween(cx - 350, 300, cx + 350, 300);
    this.layer.add(sep1);

    // BÖLÜM 1: MARKETE SAT
    const marketUnit = selectedCrop.sellPrice;
    const marketTotal = marketUnit * this.sellState.qty;
    const mTitle = this.add.text(cx - 340, 325, "🏪 Markete Sat", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    const mSub = this.add.text(cx - 340, 345, `Sabit fiyat: ${marketUnit} 🪙 / adet   →   Kazanç: ${marketTotal} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#c9b28a"
    }).setOrigin(0, 0.5);
    const mBtn = this.makeButton(cx + 240, 335, "Markete Sat", async () => {
      if (!window.ActionLock.tryStart()) return;
      try {
        await window.FarmDB.sellCropToMarket(this.uid, this.sellState.crop, this.sellState.qty);
        this.toast(`+${marketTotal} 🪙`);
        this.sellState.qty = 1;
        this.rebuild();
      } catch (err) { this.toast(err.message); }
    }, 140);
    this.layer.add([mTitle, mSub, ...mBtn]);

    // Ayırıcı 2
    const sep2 = this.add.graphics();
    sep2.lineStyle(1, 0x6b4220, 0.7);
    sep2.lineBetween(cx - 350, 380, cx + 350, 380);
    this.layer.add(sep2);

    // BÖLÜM 2: OYUNCU PAZARI
    const pTitle = this.add.text(cx - 340, 405, "👥 Oyuncu Pazarına İlan", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    const pHint = this.add.text(cx - 340, 425, "İstediğin birim fiyatı belirle, başka oyuncular satın alabilir:", {
      fontFamily: "Courier New, monospace", fontSize: "11px", color: "#c9b28a"
    }).setOrigin(0, 0.5);

    const priceLabel = this.add.text(cx - 340, 455, `Birim fiyat: ${this.sellState.price} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
    }).setOrigin(0, 0.5);
    const pMinus10 = this.makeButton(cx - 40, 455, "-10", () => {
      this.sellState.price = Math.max(1, this.sellState.price - 10); this.rebuild();
    }, 42);
    const pMinus = this.makeButton(cx + 10, 455, "-1", () => {
      this.sellState.price = Math.max(1, this.sellState.price - 1); this.rebuild();
    }, 36);
    const pPlus = this.makeButton(cx + 55, 455, "+1", () => {
      this.sellState.price += 1; this.rebuild();
    }, 36);
    const pPlus10 = this.makeButton(cx + 100, 455, "+10", () => {
      this.sellState.price += 10; this.rebuild();
    }, 42);

    const playerTotal = this.sellState.qty * this.sellState.price;
    const totalLabel = this.add.text(cx + 160, 455, `Toplam: ${playerTotal} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#ffd56b"
    }).setOrigin(0, 0.5);

    const listBtn = this.makeButton(cx, 505, "İlana Çıkar", async () => {
      if (!window.ActionLock.tryStart()) return;
      try {
        await window.FarmDB.createListing(this.uid, this.sellState.crop, this.sellState.qty, this.sellState.price);
        this.toast("İlan yayınlandı!");
        this.sellState.qty = 1;
        this.activeTab = "listings";
        this.rebuild();
      } catch (err) { this.toast(err.message); }
    }, 160);

    this.layer.add([pTitle, pHint, priceLabel, ...pMinus10, ...pMinus, ...pPlus, ...pPlus10, totalLabel, ...listBtn]);
  }

  drawFilterBar() {
    const cx = this.scale.width / 2;
    // Tür filtresi
    const cropOpts = [
      { key: "all", label: "Tümü" },
      ...window.CROP_KEYS.map(k => ({ key: k, label: window.CROPS[k].name }))
    ];
    const cropSpacing = 90;
    const cropStartX = cx - ((cropOpts.length - 1) * cropSpacing) / 2;
    const cropLabel = this.add.text(cropStartX - 70, 170, "Tür:", {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(cropLabel);
    cropOpts.forEach((opt, i) => {
      this.makeChip(cropStartX + i * cropSpacing, 170, opt.label, this.listingFilter.crop === opt.key, () => {
        this.listingFilter.crop = opt.key;
        this.rebuild();
      });
    });

    // Sıralama
    const sortOpts = [
      { key: "newest", label: "Yeni" },
      { key: "price_asc", label: "Fiyat ↑" },
      { key: "price_desc", label: "Fiyat ↓" },
      { key: "qty_desc", label: "Miktar ↓" }
    ];
    const sortSpacing = 95;
    const sortStartX = cx - ((sortOpts.length - 1) * sortSpacing) / 2;
    const sortLabel = this.add.text(sortStartX - 70, 210, "Sırala:", {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(sortLabel);
    sortOpts.forEach((opt, i) => {
      this.makeChip(sortStartX + i * sortSpacing, 210, opt.label, this.listingFilter.sort === opt.key, () => {
        this.listingFilter.sort = opt.key;
        this.rebuild();
      });
    });
  }

  applyFilters(listings) {
    let list = listings.slice();
    if (this.listingFilter.crop !== "all") {
      list = list.filter(l => l.crop === this.listingFilter.crop);
    }
    const s = this.listingFilter.sort;
    if (s === "price_asc") list.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    else if (s === "price_desc") list.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    else if (s === "qty_desc") list.sort((a, b) => b.quantity - a.quantity);
    return list;
  }

  makeChip(x, y, text, active, onClick) {
    const w = 78, h = 26;
    const g = this.add.graphics();
    const drawChip = (hover) => {
      g.clear();
      const fill = active ? 0xc8923a : (hover ? 0x3a2419 : 0x1a1109);
      const border = active ? 0xffd56b : (hover ? 0xc8923a : 0x6b4220);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      g.lineStyle(2, border, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    };
    drawChip(false);
    const zone = this.add.rectangle(x, y, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "11px",
      color: active ? "#2a1810" : "#c9b28a"
    }).setOrigin(0.5);
    zone.on("pointerover", () => !active && drawChip(true));
    zone.on("pointerout", () => !active && drawChip(false));
    zone.on("pointerdown", onClick);
    this.layer.add([g, zone, t]);
  }

  makeButton(x, y, text, onClick, width = 70) {
    const h = 30;
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0xe8b050 : 0xc8923a, 1);
      g.fillRoundedRect(x - width / 2, y - h / 2, width, h, h / 2);
      g.lineStyle(2, 0xffd56b, 1);
      g.strokeRoundedRect(x - width / 2, y - h / 2, width, h, h / 2);
    };
    draw(false);
    const zone = this.add.rectangle(x, y, width, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#2a1810"
    }).setOrigin(0.5);
    zone.on("pointerover", () => draw(true));
    zone.on("pointerout", () => draw(false));
    zone.on("pointerdown", onClick);
    return [g, zone, t];
  }

  toast(msg) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = this.add.text(this.scale.width / 2, 560, msg, {
      fontFamily: "Courier New, monospace", fontSize: "15px", color: "#ffd56b",
      backgroundColor: "#00000099", padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({
      targets: this.toastText, alpha: { from: 1, to: 0 }, duration: 3000,
      onComplete: () => this.toastText && this.toastText.destroy()
    });
  }
}

window.MarketScene = MarketScene;

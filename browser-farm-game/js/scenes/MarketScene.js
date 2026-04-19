// Pazar sahnesi: 3 sekme — Tohum Mağazası, Oyuncu İlanları, Sat.
class MarketScene extends Phaser.Scene {
  constructor() { super("MarketScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.userData = null;
    this.listings = [];
    this.activeTab = "seeds";

    this.cameras.main.setBackgroundColor("#2a1e14");

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
    const y = 90;
    const spacing = 200;
    const startX = this.scale.width / 2 - spacing;
    labels.forEach((l, i) => {
      const x = startX + i * spacing;
      const active = l.key === this.activeTab;
      const bg = this.add.rectangle(x, y, 180, 36, active ? 0x8b5a2b : 0x5a3f24)
        .setStrokeStyle(2, 0xffd56b).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y, l.text, {
        fontFamily: "Courier New, monospace", fontSize: "14px",
        color: active ? "#ffffff" : "#c9b28a"
      }).setOrigin(0.5);
      bg.on("pointerdown", () => { this.activeTab = l.key; this.rebuild(); });
      this.layer.add([bg, t]);
    });
  }

  drawSeedShop() {
    const y0 = 160;
    const rowH = 80;
    window.CROP_KEYS.forEach((key, i) => {
      const c = window.CROPS[key];
      const y = y0 + i * rowH;
      const bg = this.add.rectangle(this.scale.width / 2, y, 600, 66, 0x3d2a1a).setStrokeStyle(2, 0x8b5a2b);
      const icon = this.add.image(this.scale.width / 2 - 260, y, `crop_${key}_ready`).setScale(0.7);
      const info = this.add.text(this.scale.width / 2 - 210, y, `${c.name} — ${c.seedPrice} 🪙 / tohum  (Büyüme: ${c.growSec}sn, Satış: ${c.sellPrice} 🪙)`, {
        fontFamily: "Courier New, monospace", fontSize: "14px", color: "#f5e9d7"
      }).setOrigin(0, 0.5);

      const buyOne = this.makeButton(this.scale.width / 2 + 180, y, "1 al", async () => {
        if (!window.ActionLock.tryStart()) return;
        try { await window.FarmDB.buySeed(this.uid, key, 1); }
        catch (err) { this.toast(err.message); }
      });
      const buyFive = this.makeButton(this.scale.width / 2 + 260, y, "5 al", async () => {
        if (!window.ActionLock.tryStart()) return;
        try { await window.FarmDB.buySeed(this.uid, key, 5); }
        catch (err) { this.toast(err.message); }
      });

      this.layer.add([bg, icon, info, ...buyOne, ...buyFive]);
    });
  }

  drawListings() {
    if (this.listings.length === 0) {
      const t = this.add.text(this.scale.width / 2, 200, "Henüz ilan yok.", {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#c9b28a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }
    const y0 = 150;
    const rowH = 56;
    this.listings.slice(0, 10).forEach((l, i) => {
      const c = window.CROPS[l.crop];
      if (!c) return;
      const y = y0 + i * rowH;
      const bg = this.add.rectangle(this.scale.width / 2, y, 720, 48, 0x3d2a1a).setStrokeStyle(2, 0x8b5a2b);
      const icon = this.add.image(this.scale.width / 2 - 330, y, `crop_${l.crop}_ready`).setScale(0.5);
      const total = l.quantity * l.pricePerUnit;
      const mine = l.sellerId === this.uid;
      const text = `${c.name} × ${l.quantity}   ${l.pricePerUnit} 🪙/adet (Toplam ${total})   @${l.sellerName}`;
      const info = this.add.text(this.scale.width / 2 - 290, y, text, {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f5e9d7"
      }).setOrigin(0, 0.5);

      let btn;
      if (mine) {
        btn = this.makeButton(this.scale.width / 2 + 300, y, "Geri çek", async () => {
          if (!window.ActionLock.tryStart()) return;
          try { await window.FarmDB.cancelListing(this.uid, l.id); }
          catch (err) { this.toast(err.message); }
        }, 100);
      } else {
        btn = this.makeButton(this.scale.width / 2 + 300, y, "Satın al", async () => {
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

    const info = this.add.text(cx, 130, "Envanterinden bir ürün seç:", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(info);

    if (keys.length === 0) {
      const empty = this.add.text(cx, 200, "Satacak hasadın yok.", {
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
      const bg = this.add.rectangle(x, 180, 96, 68, selected ? 0x8b5a2b : 0x3d2a1a).setStrokeStyle(2, 0xffd56b)
        .setInteractive({ useHandCursor: true });
      const icon = this.add.image(x, 170, `crop_${k}_ready`).setScale(0.5);
      const label = this.add.text(x, 202, `${window.CROPS[k].name} (${crops[k]})`, {
        fontFamily: "Courier New, monospace", fontSize: "10px", color: "#f5e9d7"
      }).setOrigin(0.5);
      bg.on("pointerdown", () => { this.sellState.crop = k; this.sellState.qty = 1; this.rebuild(); });
      this.layer.add([bg, icon, label]);
    });

    const selectedCrop = window.CROPS[this.sellState.crop];
    const max = crops[this.sellState.crop];

    // Miktar
    const qtyLabel = this.add.text(cx - 140, 245, `Miktar: ${this.sellState.qty} / ${max}`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f5e9d7"
    }).setOrigin(0, 0.5);
    const qMinus = this.makeButton(cx + 40, 245, "-", () => {
      this.sellState.qty = Math.max(1, this.sellState.qty - 1); this.rebuild();
    }, 36);
    const qPlus = this.makeButton(cx + 85, 245, "+", () => {
      this.sellState.qty = Math.min(max, this.sellState.qty + 1); this.rebuild();
    }, 36);
    const qMax = this.makeButton(cx + 145, 245, "max", () => {
      this.sellState.qty = max; this.rebuild();
    }, 60);
    this.layer.add([qtyLabel, ...qMinus, ...qPlus, ...qMax]);

    // Ayırıcı 1
    this.layer.add(this.add.rectangle(cx, 280, 700, 2, 0x8b5a2b));

    // BÖLÜM 1: MARKETE SAT (sabit fiyat)
    const marketUnit = selectedCrop.sellPrice;
    const marketTotal = marketUnit * this.sellState.qty;
    const mTitle = this.add.text(cx - 340, 305, "🏪 Markete Sat", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    const mSub = this.add.text(cx - 340, 325, `Sabit fiyat: ${marketUnit} 🪙 / adet   →   Kazanç: ${marketTotal} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "12px", color: "#c9b28a"
    }).setOrigin(0, 0.5);
    const mBtn = this.makeButton(cx + 240, 315, "Markete Sat", async () => {
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
    this.layer.add(this.add.rectangle(cx, 365, 700, 2, 0x8b5a2b));

    // BÖLÜM 2: OYUNCULARA İLAN (değişken fiyat)
    const pTitle = this.add.text(cx - 340, 390, "👥 Oyuncu Pazarına İlan", {
      fontFamily: "Courier New, monospace", fontSize: "14px", color: "#ffd56b"
    }).setOrigin(0, 0.5);
    const pHint = this.add.text(cx - 340, 410, "İstediğin birim fiyatı belirle, başka oyuncular satın alabilir:", {
      fontFamily: "Courier New, monospace", fontSize: "11px", color: "#c9b28a"
    }).setOrigin(0, 0.5);

    const priceLabel = this.add.text(cx - 340, 440, `Birim fiyat: ${this.sellState.price} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f5e9d7"
    }).setOrigin(0, 0.5);
    const pMinus10 = this.makeButton(cx - 40, 440, "-10", () => {
      this.sellState.price = Math.max(1, this.sellState.price - 10); this.rebuild();
    }, 42);
    const pMinus = this.makeButton(cx + 10, 440, "-1", () => {
      this.sellState.price = Math.max(1, this.sellState.price - 1); this.rebuild();
    }, 36);
    const pPlus = this.makeButton(cx + 55, 440, "+1", () => {
      this.sellState.price += 1; this.rebuild();
    }, 36);
    const pPlus10 = this.makeButton(cx + 100, 440, "+10", () => {
      this.sellState.price += 10; this.rebuild();
    }, 42);

    const playerTotal = this.sellState.qty * this.sellState.price;
    const totalLabel = this.add.text(cx + 160, 440, `Toplam: ${playerTotal} 🪙`, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#ffd56b"
    }).setOrigin(0, 0.5);

    const listBtn = this.makeButton(cx, 490, "İlana Çıkar", async () => {
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

  makeButton(x, y, text, onClick, width = 70) {
    const bg = this.add.rectangle(x, y, width, 30, 0x8b5a2b)
      .setStrokeStyle(2, 0xffd56b).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, text, {
      fontFamily: "Courier New, monospace", fontSize: "13px", color: "#ffffff"
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(0xa06a35));
    bg.on("pointerout", () => bg.setFillStyle(0x8b5a2b));
    bg.on("pointerdown", onClick);
    return [bg, t];
  }

  toast(msg) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = this.add.text(this.scale.width / 2, 540, msg, {
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

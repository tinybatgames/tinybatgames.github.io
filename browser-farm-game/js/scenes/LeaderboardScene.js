// Sıralama sahnesi: Top 100 oyuncu (exp DESC). Tekerlekle scroll edilir.
class LeaderboardScene extends Phaser.Scene {
  constructor() { super("LeaderboardScene"); }

  create() {
    this.uid = firebase.auth().currentUser.uid;
    this.leaders = [];
    this.loading = true;
    this.scrollY = 0;

    this.cameras.main.setBackgroundColor("#1a0e06");
    this.layer = this.add.container(0, 0);

    this.unsubUser = window.FarmDB.listenToUser(this.uid, (user) => {
      this.userData = user;
      this.game.events.emit("userUpdated", user);
    });

    this.events.on("shutdown", () => {
      if (this.unsubUser) this.unsubUser();
      this.input.removeListener("wheel", this.onWheel, this);
    });
    this.events.on("sleep", () => {
      this.input.removeListener("wheel", this.onWheel, this);
    });
    this.events.on("wake", () => {
      this.attachWheel();
      this.loadLeaderboard();
    });

    this.attachWheel();
    this.loadLeaderboard();
  }

  attachWheel() {
    this.input.removeListener("wheel", this.onWheel, this);
    this.input.on("wheel", this.onWheel, this);
  }

  onWheel(_pointer, _objs, _dx, dy) {
    if (!this.rowsContainer) return;
    const max = Math.max(0, this.contentH - this.viewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, max);
    this.rowsContainer.y = this.viewY - this.scrollY;
  }

  async loadLeaderboard() {
    this.loading = true;
    this.rebuild();
    try {
      this.leaders = await window.FarmDB.fetchLeaderboard(100);
    } catch (e) {
      console.error("Sıralama alınamadı:", e);
      this.leaders = [];
    }
    this.loading = false;
    this.scrollY = 0;
    this.rebuild();
  }

  rebuild() {
    this.layer.removeAll(true);
    if (this.rowsContainer) { this.rowsContainer.destroy(); this.rowsContainer = null; }

    const W = this.scale.width;
    const cx = W / 2;

    const title = this.add.text(cx, 100, "Sıralama — İlk 100 Oyuncu", {
      fontFamily: "Courier New, monospace", fontSize: "20px", fontStyle: "bold", color: "#ffd56b"
    }).setOrigin(0.5);
    this.layer.add(title);

    const refreshBtn = this.makeButton(W - 90, 100, "Yenile", () => this.loadLeaderboard(), 110);
    this.layer.add(refreshBtn);

    if (this.loading) {
      const t = this.add.text(cx, 240, "Yükleniyor...", {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#c9b28a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }

    if (this.leaders.length === 0) {
      const t = this.add.text(cx, 240, "Henüz sıralama verisi yok.", {
        fontFamily: "Courier New, monospace", fontSize: "16px", color: "#c9b28a"
      }).setOrigin(0.5);
      this.layer.add(t);
      return;
    }

    // Tablo başlığı
    const tableW = 720;
    const tableX = cx - tableW / 2;
    const headerY = 140;
    const colRank = tableX + 50;
    const colName = tableX + 110;
    const colLevel = tableX + 470;
    const colExp = tableX + 600;

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x2a1810, 1);
    headerBg.fillRoundedRect(tableX, headerY - 18, tableW, 36, 8);
    headerBg.lineStyle(2, 0xc8923a, 1);
    headerBg.strokeRoundedRect(tableX, headerY - 18, tableW, 36, 8);
    this.layer.add(headerBg);

    const hStyle = { fontFamily: "Courier New, monospace", fontSize: "12px", fontStyle: "bold", color: "#c8923a" };
    this.layer.add(this.add.text(colRank, headerY, "Sıra", hStyle).setOrigin(0.5));
    this.layer.add(this.add.text(colName, headerY, "Oyuncu", hStyle).setOrigin(0, 0.5));
    this.layer.add(this.add.text(colLevel, headerY, "Level", hStyle).setOrigin(0.5));
    this.layer.add(this.add.text(colExp, headerY, "EXP", hStyle).setOrigin(0.5));

    // Scrollable list
    this.viewY = 175;
    this.viewH = 640 - this.viewY - 20;

    const rowH = 36;
    const rowGap = 4;
    this.contentH = this.leaders.length * (rowH + rowGap);

    this.rowsContainer = this.add.container(0, this.viewY);
    this.layer.add(this.rowsContainer);

    this.leaders.forEach((l, i) => {
      const y = i * (rowH + rowGap) + rowH / 2;
      const isMe = l.uid === this.uid;
      const isTop3 = i < 3;
      const fillColor = isMe ? 0x3d2a1a : 0x2a1810;
      const borderColor = isMe ? 0xffd56b : (isTop3 ? 0xc8923a : 0x6b4220);

      const rowBg = this.add.graphics();
      rowBg.fillStyle(fillColor, 1);
      rowBg.fillRoundedRect(tableX, y - rowH / 2, tableW, rowH, 6);
      rowBg.lineStyle(isMe ? 2 : 1, borderColor, 1);
      rowBg.strokeRoundedRect(tableX, y - rowH / 2, tableW, rowH, 6);

      // Rank — top 3'e altın renk
      const rankColor = i === 0 ? "#ffd56b" : (i === 1 ? "#dadada" : (i === 2 ? "#c08c4a" : "#a89070"));
      const rankText = this.add.text(colRank, y, `#${i + 1}`, {
        fontFamily: "Courier New, monospace", fontSize: "14px", fontStyle: "bold", color: rankColor
      }).setOrigin(0.5);

      const nameStr = `@${l.username || "?"}${isMe ? "  (sen)" : ""}`;
      const nameText = this.add.text(colName, y, nameStr, {
        fontFamily: "Courier New, monospace", fontSize: "13px",
        color: isMe ? "#ffd56b" : "#f0e2c0"
      }).setOrigin(0, 0.5);

      const lvl = window.levelFromExp(l.exp || 0);
      const lvlText = this.add.text(colLevel, y, `Lv.${lvl}`, {
        fontFamily: "Courier New, monospace", fontSize: "13px", fontStyle: "bold", color: "#ffd56b"
      }).setOrigin(0.5);

      const expText = this.add.text(colExp, y, String(l.exp || 0), {
        fontFamily: "Courier New, monospace", fontSize: "13px", color: "#f0e2c0"
      }).setOrigin(0.5);

      this.rowsContainer.add([rowBg, rankText, nameText, lvlText, expText]);
    });

    // Mask — sadece view alanını göster
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillRect(tableX - 4, this.viewY - 4, tableW + 8, this.viewH + 8);
    this.rowsContainer.setMask(mask.createGeometryMask());

    // Scroll ipucu
    if (this.contentH > this.viewH) {
      const hint = this.add.text(cx, 620, "↕ tekerlek ile kaydır", {
        fontFamily: "Courier New, monospace", fontSize: "10px", color: "#8b7a5a"
      }).setOrigin(0.5);
      this.layer.add(hint);
    }
  }

  makeButton(x, y, text, onClick, width = 100) {
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
}

window.LeaderboardScene = LeaderboardScene;

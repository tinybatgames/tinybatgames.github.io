// Ekin tanımları. Renkler placeholder sprite üretmek için kullanılır.
window.CROPS = {
  wheat: {
    name: "Buğday",
    growSec: 30,
    sellPrice: 8,
    seedPrice: 3,
    exp: 5,
    color: 0xf1c40f,
    stemColor: 0x8b5a2b
  },
  carrot: {
    name: "Havuç",
    growSec: 60,
    sellPrice: 18,
    seedPrice: 8,
    exp: 12,
    color: 0xe67e22,
    stemColor: 0x27ae60
  },
  pumpkin: {
    name: "Kabak",
    growSec: 180,
    sellPrice: 60,
    seedPrice: 25,
    exp: 40,
    color: 0xd35400,
    stemColor: 0x27ae60
  }
};

window.CROP_KEYS = Object.keys(window.CROPS);

window.GRID_COLS = 30;
window.GRID_ROWS = 10;
window.TILE_PX = 32;
window.STARTING_COINS = 1000;
window.TILE_SOURCE_PX = 64;

// Level eğrisi: her level'a geçmek için cumulative XP = 50 * L * (L - 1)
//  L1=0, L2=100, L3=300, L4=600, L5=1000, L10=4500
window.expForLevel = function (level) {
  const l = Math.max(1, level | 0);
  return 50 * l * (l - 1);
};

window.levelFromExp = function (exp) {
  const e = Math.max(0, exp || 0);
  return Math.max(1, Math.floor(0.5 + Math.sqrt(0.25 + e / 50)));
};

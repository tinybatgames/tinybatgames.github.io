// Ekin tanımları. Renkler placeholder sprite üretmek için kullanılır.
window.CROPS = {
  wheat: {
    name: "Buğday",
    growSec: 30,
    sellPrice: 8,
    seedPrice: 3,
    color: 0xf1c40f,
    stemColor: 0x8b5a2b
  },
  carrot: {
    name: "Havuç",
    growSec: 60,
    sellPrice: 18,
    seedPrice: 8,
    color: 0xe67e22,
    stemColor: 0x27ae60
  },
  pumpkin: {
    name: "Kabak",
    growSec: 180,
    sellPrice: 60,
    seedPrice: 25,
    color: 0xd35400,
    stemColor: 0x27ae60
  }
};

window.CROP_KEYS = Object.keys(window.CROPS);

window.GRID_SIZE = 6;
window.TILE_PX = 72;
window.STARTING_COINS = 1000;

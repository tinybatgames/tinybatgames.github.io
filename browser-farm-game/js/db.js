// Firestore CRUD helper'ları. Hepsi `window.FarmDB` altında.
// İş mantığı (coin/envanter/hasat doğrulaması) client-side transaction'larda;
// tutarlılık Firestore security rules ile korunuyor.

(function () {
  function db() { return firebase.firestore(); }
  function now() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function inc(n) { return firebase.firestore.FieldValue.increment(n); }

  function userRef(uid) { return db().collection("users").doc(uid); }
  function tileRef(uid, tileId) { return db().collection("farms").doc(uid).collection("tiles").doc(tileId); }
  function farmTilesRef(uid) { return db().collection("farms").doc(uid).collection("tiles"); }
  function marketRef() { return db().collection("market"); }
  function leaderboardRef(uid) { return db().collection("leaderboard").doc(uid); }
  function leaderboardCol() { return db().collection("leaderboard"); }

  function tileId(row, col) { return `${row}_${col}`; }

  async function initializeNewPlayer(uid, username) {
    const batch = db().batch();
    batch.set(userRef(uid), {
      username,
      coins: window.STARTING_COINS,
      exp: 0,
      inventory: { seeds: {}, crops: {} },
      createdAt: now()
    });
    batch.set(leaderboardRef(uid), {
      username,
      exp: 0,
      updatedAt: now()
    });
    await batch.commit();
  }

  function listenToUser(uid, cb) {
    return userRef(uid).onSnapshot(snap => cb(snap.data()));
  }

  function listenToFarm(uid, cb) {
    return farmTilesRef(uid).onSnapshot(snap => {
      const tiles = {};
      snap.forEach(doc => { tiles[doc.id] = doc.data(); });
      cb(tiles);
    });
  }

  function listenToMarket(cb) {
    return marketRef().orderBy("createdAt", "desc").limit(100).onSnapshot(snap => {
      const listings = [];
      snap.forEach(doc => listings.push({ id: doc.id, ...doc.data() }));
      cb(listings);
    });
  }

  async function fetchLeaderboard(limit = 100) {
    const snap = await leaderboardCol().orderBy("exp", "desc").limit(limit).get();
    const list = [];
    snap.forEach(doc => list.push({ uid: doc.id, ...doc.data() }));
    return list;
  }

  // Tohum satın al (NPC, sabit fiyat)
  async function buySeed(uid, cropKey, qty) {
    const crop = window.CROPS[cropKey];
    if (!crop) throw new Error("Geçersiz ekin.");
    if (qty < 1) throw new Error("Miktar 1+ olmalı.");
    const cost = crop.seedPrice * qty;
    await db().runTransaction(async tx => {
      const userSnap = await tx.get(userRef(uid));
      const user = userSnap.data();
      if (!user) throw new Error("Kullanıcı bulunamadı.");
      if (user.coins < cost) throw new Error("Yetersiz altın.");
      const seeds = { ...(user.inventory?.seeds || {}) };
      seeds[cropKey] = (seeds[cropKey] || 0) + qty;
      tx.update(userRef(uid), {
        coins: user.coins - cost,
        "inventory.seeds": seeds
      });
    });
  }

  // Ekin ek
  async function plantSeed(uid, tId, cropKey) {
    const crop = window.CROPS[cropKey];
    if (!crop) throw new Error("Geçersiz ekin.");
    await db().runTransaction(async tx => {
      const userSnap = await tx.get(userRef(uid));
      const tileSnap = await tx.get(tileRef(uid, tId));
      const user = userSnap.data();
      const tile = tileSnap.data();
      if (tile && tile.crop) throw new Error("Tile dolu.");
      const seeds = { ...(user.inventory?.seeds || {}) };
      if (!seeds[cropKey] || seeds[cropKey] < 1) throw new Error("Tohum yok.");
      seeds[cropKey] -= 1;
      if (seeds[cropKey] === 0) delete seeds[cropKey];
      const plantedAtMs = Date.now();
      const readyAtMs = plantedAtMs + crop.growSec * 1000;
      tx.update(userRef(uid), { "inventory.seeds": seeds });
      tx.set(tileRef(uid, tId), {
        crop: cropKey,
        plantedAt: firebase.firestore.Timestamp.fromMillis(plantedAtMs),
        readyAt: firebase.firestore.Timestamp.fromMillis(readyAtMs)
      });
    });
  }

  // Hazır ekini hasat et — exp kazandırır ve leaderboard'a yansıtır.
  async function harvestTile(uid, tId) {
    let expGain = 0;
    await db().runTransaction(async tx => {
      const tileSnap = await tx.get(tileRef(uid, tId));
      const userSnap = await tx.get(userRef(uid));
      const tile = tileSnap.data();
      const user = userSnap.data();
      if (!tile || !tile.crop) throw new Error("Boş tile.");
      const readyMs = tile.readyAt.toMillis();
      if (Date.now() < readyMs) throw new Error("Henüz hazır değil.");
      const cropKey = tile.crop;
      const cropDef = window.CROPS[cropKey];
      expGain = (cropDef && cropDef.exp) || 0;
      const crops = { ...(user.inventory?.crops || {}) };
      crops[cropKey] = (crops[cropKey] || 0) + 1;
      const userPatch = { "inventory.crops": crops };
      if (expGain > 0) userPatch.exp = inc(expGain);
      tx.update(userRef(uid), userPatch);
      if (expGain > 0) {
        tx.set(leaderboardRef(uid), {
          username: user.username,
          exp: inc(expGain),
          updatedAt: now()
        }, { merge: true });
      }
      tx.delete(tileRef(uid, tId));
    });
    return expGain;
  }

  // İlan oluştur (envanterden düş)
  async function createListing(uid, cropKey, quantity, pricePerUnit) {
    if (quantity < 1) throw new Error("Miktar 1+ olmalı.");
    if (pricePerUnit < 1) throw new Error("Fiyat 1+ olmalı.");
    if (!window.CROPS[cropKey]) throw new Error("Geçersiz ekin.");
    await db().runTransaction(async tx => {
      const userSnap = await tx.get(userRef(uid));
      const user = userSnap.data();
      const crops = { ...(user.inventory?.crops || {}) };
      if (!crops[cropKey] || crops[cropKey] < quantity) throw new Error("Envanterde yeterli ürün yok.");
      crops[cropKey] -= quantity;
      if (crops[cropKey] === 0) delete crops[cropKey];
      const listing = marketRef().doc();
      tx.update(userRef(uid), { "inventory.crops": crops });
      tx.set(listing, {
        sellerId: uid,
        sellerName: user.username,
        crop: cropKey,
        quantity,
        pricePerUnit,
        createdAt: now()
      });
    });
  }

  // İlanı tümüyle satın al (atomik: alıcı altın↓ envanter↑, satıcı altın↑, ilan sil)
  async function buyListing(buyerUid, listingId) {
    await db().runTransaction(async tx => {
      const listingRef = marketRef().doc(listingId);
      const listingSnap = await tx.get(listingRef);
      const listing = listingSnap.data();
      if (!listing) throw new Error("İlan kaldırılmış.");
      if (listing.sellerId === buyerUid) throw new Error("Kendi ilanını alamazsın.");
      const total = listing.quantity * listing.pricePerUnit;
      const buyerSnap = await tx.get(userRef(buyerUid));
      const buyer = buyerSnap.data();
      if (!buyer) throw new Error("Kullanıcı bulunamadı.");
      if (buyer.coins < total) throw new Error("Yetersiz altın.");
      const buyerCrops = { ...(buyer.inventory?.crops || {}) };
      buyerCrops[listing.crop] = (buyerCrops[listing.crop] || 0) + listing.quantity;
      tx.update(userRef(buyerUid), {
        coins: buyer.coins - total,
        "inventory.crops": buyerCrops
      });
      // Satıcı doc'unu read etmeden güncelle (security rule privacy'yi açmaya gerek kalmaz)
      tx.update(userRef(listing.sellerId), {
        coins: inc(total)
      });
      tx.delete(listingRef);
    });
  }

  // Markete sat (NPC, sabit sellPrice)
  async function sellCropToMarket(uid, cropKey, quantity) {
    if (quantity < 1) throw new Error("Miktar 1+ olmalı.");
    const crop = window.CROPS[cropKey];
    if (!crop) throw new Error("Geçersiz ekin.");
    const total = crop.sellPrice * quantity;
    await db().runTransaction(async tx => {
      const userSnap = await tx.get(userRef(uid));
      const user = userSnap.data();
      const crops = { ...(user.inventory?.crops || {}) };
      if (!crops[cropKey] || crops[cropKey] < quantity) throw new Error("Envanterde yeterli ürün yok.");
      crops[cropKey] -= quantity;
      if (crops[cropKey] === 0) delete crops[cropKey];
      tx.update(userRef(uid), {
        coins: user.coins + total,
        "inventory.crops": crops
      });
    });
  }

  async function cancelListing(uid, listingId) {
    await db().runTransaction(async tx => {
      const listingRef = marketRef().doc(listingId);
      const listingSnap = await tx.get(listingRef);
      const listing = listingSnap.data();
      if (!listing) throw new Error("İlan yok.");
      if (listing.sellerId !== uid) throw new Error("Senin ilanın değil.");
      const userSnap = await tx.get(userRef(uid));
      const user = userSnap.data();
      const crops = { ...(user.inventory?.crops || {}) };
      crops[listing.crop] = (crops[listing.crop] || 0) + listing.quantity;
      tx.update(userRef(uid), { "inventory.crops": crops });
      tx.delete(listingRef);
    });
  }

  window.FarmDB = {
    initializeNewPlayer,
    listenToUser, listenToFarm, listenToMarket,
    buySeed, plantSeed, harvestTile,
    sellCropToMarket,
    createListing, buyListing, cancelListing,
    fetchLeaderboard,
    tileId
  };
})();

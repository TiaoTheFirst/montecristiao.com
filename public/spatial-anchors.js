// Explicit image-space anchors. Missing image/object pairs are intentionally not pinned.
var ManorSpatial = (() => {
  const images = {
    "music-day": {},
    "music-night": {},
    "court-day": {},
    "court-night": {},
    "foyer-day": {},
    "foyer-night": {},
    "salon-day": { conversation: [73, 86], musicbox: [83, 90] },
    "salon-night": { conversation: [73, 86], musicbox: [83, 90] },
    "painted/salon-occupied-day-471b8d81": {
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "painted/salon-occupied-night-725b9384": {
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "dining-day": { place: [45, 81] },
    "dining-night": { place: [45, 81] },
    "painted/dining-occupied-day-f445bec6": { place: [84, 82] },
    "painted/dining-occupied-night-c26f73c5": { place: [84, 82] },
    "gallery-day": { seascape: [23, 40] },
    "gallery-night": { seascape: [23, 40] },
    "painted/gallery-occupied-day-8d2c94df": { seascape: [23, 40] },
    "painted/gallery-occupied-night-059be5f1": { seascape: [23, 40] },
    "library-day": {},
    "library-night": {},
    "painted/library-occupied-day-f7511a37": {},
    "painted/library-occupied-night-27835dd7": {},
    "study-day": { books: [36, 65] },
    "study-night": { books: [36, 65] },
    "painted/study-occupied-day-80d8b971": { books: [35, 70] },
    "painted/study-occupied-night-71142954": { books: [35, 70] },
    "letter-day": { seal: [80, 91] },
    "letter-night": { seal: [80, 91] },
    "garden-day": { pool: [50, 61], orangery: [18, 46], pavilion: [82, 47] },
    "painted/garden-occupied-day-bd6cfbd3": {
      pool: [50, 61],
      orangery: [18, 46],
      pavilion: [82, 47],
    },
    "painted/garden-occupied-night-54adb822": {
      pool: [50, 61],
      orangery: [18, 46],
      pavilion: [82, 47],
    },
    "garden-night": { pool: [50, 61], orangery: [18, 46], pavilion: [82, 47] },
  };
  return { images, anchor: (id, key) => images[key]?.[id] || null };
})();

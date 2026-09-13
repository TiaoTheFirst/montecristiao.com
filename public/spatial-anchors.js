// Explicit image-space anchors. Missing image/object pairs are intentionally not pinned.
var ManorSpatial = (() => {
  const images = {
    "music-day": { piano: [72, 60] },
    "music-night": { piano: [72, 60] },
    "court-day": {},
    "court-night": {},
    "foyer-day": { ledger: [10, 79] },
    "foyer-night": { ledger: [10, 79] },
    "salon-day": {
      games: [32, 64.5],
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "salon-night": {
      games: [32, 64.5],
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "painted/salon-occupied-day-471b8d81": {
      games: [32, 64.5],
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "painted/salon-occupied-night-725b9384": {
      games: [32, 64.5],
      conversation: [73, 86],
      musicbox: [83, 90],
    },
    "dining-day": { place: [45, 81] },
    "dining-night": { place: [45, 81] },
    "painted/dining-occupied-day-f445bec6": { place: [84, 82] },
    "painted/dining-occupied-night-c26f73c5": { place: [84, 82] },
    "gallery-day": { seascape: [23, 40], harbor: [36, 45], arch: [41.5, 47] },
    "gallery-night": { seascape: [23, 40], harbor: [36, 45], arch: [41.5, 47] },
    "painted/gallery-occupied-day-8d2c94df": {
      seascape: [23, 40],
      harbor: [36, 45],
      arch: [41.5, 47],
    },
    "painted/gallery-occupied-night-059be5f1": {
      seascape: [23, 40],
      harbor: [36, 45],
      arch: [41.5, 47],
    },
    "library-day": { catalogue: [12, 40] },
    "library-night": { catalogue: [12, 40] },
    "painted/library-occupied-day-f7511a37": { catalogue: [12, 40] },
    "painted/library-occupied-night-27835dd7": { catalogue: [12, 40] },
    "study-day": { books: [36, 65], globe: [49, 55] },
    "study-night": { books: [36, 65], globe: [49, 55] },
    "painted/study-occupied-day-80d8b971": { books: [35, 70], globe: [50, 55] },
    "painted/study-occupied-night-71142954": {
      books: [35, 70],
      globe: [50, 55],
    },
    "letter-day": { letterbox: [73, 82], seal: [80, 91] },
    "letter-night": { letterbox: [73, 82], seal: [80, 91] },
    "garden-day": {
      pool: [50, 61],
      orangery: [18, 46],
      pavilion: [82, 47],
    },
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
    "garden-night": {
      pool: [50, 61],
      orangery: [18, 46],
      pavilion: [82, 47],
    },
  };
  return { images, anchor: (id, key) => images[key]?.[id] || null };
})();

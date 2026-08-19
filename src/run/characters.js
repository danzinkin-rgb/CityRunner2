// Souvenir-economy sink #1: cosmetic characters.
//
// The runner is built procedurally from primitives (src/run/player.js), so a
// new "character" is cheap — a palette swap plus at most one small accessory,
// never new geometry pipelines. Nothing here touches progression: characters
// are pure cosmetics, bought with souvenirs earned by playing.
//
// style fields (all optional — Player fills in defaults for anything missing):
//   hoodie, cap, trousers, shoes, backpack, accent, skin  — hex colour ints
//   accessory — one of: 'satchel' | 'camera' | 'apron' | 'beret' | 'laurel' | null
//     'beret' and 'laurel' replace the baseball cap with alternate headwear;
//     the others add a small chest/shoulder prop. Accessories never change
//     the collision hitbox (see Player#hitbox).

export const CHARACTERS = [
  {
    id: 'runner', name: 'Runner', price: 0,
    style: {}, // the original look — every field defaults inside Player
  },
  {
    id: 'courier', name: 'Courier', price: 500,
    style: {
      hoodie: 0x2b3a67, cap: 0x1c2540, trousers: 0x232323,
      shoes: 0xdedede, backpack: 0x8a5a2b, accent: 0xe08a2b,
      accessory: 'satchel',
    },
  },
  {
    id: 'tourist', name: 'Tourist', price: 750,
    style: {
      hoodie: 0xff5a8a, cap: 0xf4e4c1, trousers: 0xf0d9a0,
      shoes: 0xffffff, backpack: 0x2ec4b6, accent: 0x1a8a80,
      accessory: 'camera',
    },
  },
  {
    id: 'skater', name: 'Skater', price: 1000,
    style: {
      hoodie: 0x8a2be2, cap: 0x1a1a1a, trousers: 0x4a4a52,
      shoes: 0xff3355, backpack: 0x151515, accent: 0x2ec4b6,
    },
  },
  {
    id: 'chef', name: 'Chef', price: 1250,
    style: {
      hoodie: 0xf4f4f4, cap: 0xffffff, trousers: 0x1a1a1a,
      shoes: 0x2a2a2a, backpack: 0xd94f3d, accent: 0xd94f3d,
      accessory: 'apron',
    },
  },
  {
    id: 'artist', name: 'Street Artist', price: 1500,
    style: {
      hoodie: 0x3aa6a0, cap: 0x222222, trousers: 0xd6c39a,
      shoes: 0xfafafa, backpack: 0xe0523c, accent: 0xe0523c,
      accessory: 'beret',
    },
  },
  {
    id: 'cabbie', name: 'Cabbie', price: 1800,
    style: {
      hoodie: 0xf6c343, cap: 0x1a1a1a, trousers: 0x1a1a1a,
      shoes: 0x222222, backpack: 0x1a1a1a, accent: 0x1a1a1a,
    },
  },
  {
    id: 'gladiator', name: 'Gladiator', price: 2200,
    style: {
      hoodie: 0xc98a3e, cap: 0x8a5a2b, trousers: 0xb03a2e,
      shoes: 0x8a5a2b, backpack: 0xc0392b, accent: 0xd4af37,
      accessory: 'laurel',
    },
  },
  {
    id: 'mime', name: 'Mime', price: 2500,
    style: {
      hoodie: 0x161616, cap: 0xffffff, trousers: 0x161616,
      shoes: 0xffffff, backpack: 0x161616, accent: 0xe33636,
      accessory: 'beret',
    },
  },
];

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

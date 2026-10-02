// The city release queue.
//
// Fixes and improvements ship in whatever release comes next, but new cities
// go out ONE AT A TIME, so a city can be finished and merged long before it
// is released. A city listed here is built and tested but hidden from
// players: it is not in the menu, the progression chain, NEXT LEVEL, the
// Game Center totals or the souvenir list, in the store build or on the web.
// Tester builds and the test routes (?view=, ?ui=) see every city.
//
// To release the next city: remove it from the front of this list, and
// follow docs/RELEASES.md (Game Center items, store copy, screenshots).
// test/releases.mjs checks the menu shows exactly the released cities.
//
// In release order: the first entry is the next city to ship.
export const RELEASE_QUEUE = ['jerusalem', 'mexico'];

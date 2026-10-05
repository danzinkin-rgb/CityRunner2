// The cities this build offers players.
//
// Queued cities (src/cities/releases.js) are finished but not yet released,
// so players do not see them, on the store build or on the web. Tester builds
// see them all, and so do the test routes the suites drive (?view=, ?ui=
// other than the menu, ?allcities=); the menu screenshot route (?ui=menu)
// stays player-shaped for the App Store. Everything a player sees reads this
// list: the menu, the progression chain, NEXT LEVEL, the Game Center totals.
import { ALL_CITIES } from './themes.js';
import { RELEASE_QUEUE } from './releases.js';
import { DEBUG_HOOKS, TESTER } from '../core/debug.js';

const showQueued = TESTER || (DEBUG_HOOKS && typeof location !== 'undefined'
  && /[?&](view|allcities)=|[?&]ui=(?!menu\b)/.test(location.search));

export const CITIES = showQueued ? ALL_CITIES : ALL_CITIES.filter((c) => !RELEASE_QUEUE.includes(c.id));

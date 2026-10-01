# Demo verification

Date: 2026-10-01

## Visual reference

Compared `../design/pixel-mockups-v2/01-entry.png` and `03-spymaster.png` alongside live browser screenshots at 1488 × 1058. The remaining v2 screens informed lobby, guide, rules, settings, and results.

Implementation captures: `qa/entry-desktop.png`, `qa/lobby-desktop.png`, `qa/game-desktop.png`, `qa/result.png`.

Preserved cream background, dark slate controls, muted red/blue teams, pixel Chinese/English display fonts and avatars. Entry uses the requested title and lowercase welcome; lobby uses Ready?. No hearts, plant illustrations, or removed taglines. Both teams occupy the left column; Game Log alone occupies the right. Enlarged entry heading/avatars and adjusted team and board dimensions after comparison. This is a responsive interpretation, with simpler square borders and new avatar artwork rather than an exact raster reproduction.

Checked mobile at 390 × 844: no horizontal page overflow; board remains 5 × 5; teams become two columns above the board. Desktop clue input remains within its column.

## Interaction verification

- Nickname and avatar selection, entry and lobby navigation.
- Word pack search and selection; short import rejected; duplicate words removed; valid custom import saved and selected; test pack then removed.
- Illegal board-word clue rejected; valid clue submitted; operative cards hidden until reveal; own-card reveal and assassin loss/result dialog verified.
- Quick Guide open/close and replay verified.
- Browser console contained no warnings or errors during the checked flow.
- Web Audio effects implemented with mute and volume controls; audible output was not independently assessed.

## Automated verification

`npm run build`: passed.

`node --test tests/game.test.mjs`: 8 passed, covering card distribution, clue checks, reveal/turn/win behavior and word pack normalization.

`npm run test:sites`: 4 passed, covering static routing and build packaging.

## Scope

Local interactive demo verified. Roster and room code are demonstration data; online multiplayer and synchronized rooms are not implemented. Profiles, preferences and imported packs use browser-local storage. Game state is not persisted across refreshes.

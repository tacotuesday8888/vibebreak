# Changelog

All notable changes to Vibebreak are documented here.

## Unreleased

## 0.3.5 - 2026-05-10

- Retuned the live CLI colors so terminal rendering looks closer to the brighter GitHub banner.
- Removed the dimmed logo shadow row in favor of a stronger neon purple row.

## 0.3.4 - 2026-05-10

- Switched the CLI and GitHub preview assets to one brighter neon palette.
- Updated in-game item, player, popup, timer, and combo colors to match the VIBEBREAK banner style.

## 0.3.3 - 2026-05-10

- Brightened the live terminal brand colors to better match the GitHub banner.
- Polished the Choose Game and High Scores terminal screens for clearer scanning.

## 0.3.2 - 2026-05-10

- Added pull request CI for `npm test` and `npm pack --dry-run`.
- Added this changelog so releases are easier to scan.
- Added terminal-style README banner and gameplay preview assets.
- Reworked the README into a clearer GitHub landing page.
- Tuned the classic arcade games to be slightly more forgiving.
- Removed the experimental Codex/Claude wrapper from the public CLI to keep the first version focused on the standalone arcade.

## 0.3.1 - 2026-05-10

- Added a smoke test script for CLI parsing, game registry coverage, daily rotation, and score trimming.
- Added `npm test`, which runs typecheck, build, and smoke tests.
- Fixed direct `play`, `daily`, and `scores` commands so `Q` exits cleanly instead of returning to the main menu.
- Prevented Flap Fix from applying multiple collision outcomes in the same tick.
- Updated the release workflow to run the full test suite before publishing.

## 0.3.0 - 2026-05-10

- Added four classic-inspired mini-games: Snake Bytes, Flap Fix, Maze Munch, and Bit Stack.
- Added shared grid and movement helpers for the arcade games.
- Improved the main menu with game icons, objectives, and daily-game context.
- Expanded CLI support for all seven game IDs.

## 0.2.0 - 2026-05-10

- Added the polished game shell with objective text, status chips, combo meter, time bar, event log, hit flash, and banners.
- Added Today's Break daily game rotation.
- Added local high scores at `~/.vibebreak/scores.json`.
- Added the Codex/Claude wrapper command.

## 0.1.0 - 2026-05-10

- Published the first npm release as `vibebreak-arcade`.
- Added the startup wordmark and animated terminal pet.
- Added the original mini-games and basic CLI flow.

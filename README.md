# Vibebreak

<p align="center">
  <img src="assets/vibebreak-banner.svg" alt="VIBEBREAK terminal banner" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vibebreak-arcade"><img alt="npm version" src="https://img.shields.io/npm/v/vibebreak-arcade?label=npm&color=cb5cff"></a>
  <a href="https://github.com/tacotuesday8888/vibebreak/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/tacotuesday8888/vibebreak/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-facc15"></a>
  <img alt="Node.js 22+" src="https://img.shields.io/badge/node-%3E%3D22-67e8f9">
</p>

Vibebreak is a chaotic-cozy terminal break arcade built with Node.js, TypeScript, Ink, and React. It gives you short 45-second mini-games for coding-session resets, with local high scores and no backend, login, cloud service, AI, payments, analytics, or telemetry.

The npm package is [`vibebreak-arcade`](https://www.npmjs.com/package/vibebreak-arcade). The unscoped `vibebreak` package name is already taken by an unrelated project.

## Preview

<p align="center">
  <img src="assets/menu-preview.svg" alt="Vibebreak main menu preview" width="49%">
  <img src="assets/gameplay-preview.svg" alt="Vibebreak gameplay preview" width="49%">
</p>

## Quick Start

Run without installing:

```bash
npx vibebreak-arcade
```

Jump straight into Today's Break:

```bash
npx vibebreak-arcade daily
```

Vibebreak requires Node.js 22 or newer because it uses Ink 7.

## Install

Install globally if you want the command available everywhere:

```bash
npm install --global vibebreak-arcade
```

Then run:

```bash
vibebreak-arcade
vibebreak-arcade daily
vibebreak-arcade play snake-bytes
vibebreak-arcade scores
```

Prefer a shorter command? Add an alias to your shell config:

```bash
alias vibebreak='vibebreak-arcade'
```

## Games

Each round is short, keyboard-simple, and built for quick replay.

| Game | ID | Objective |
| --- | --- | --- |
| Dodge the Bugs | `dodge` | Dodge falling bugs and collect near-miss style points. |
| Commit Catch | `commit-catch` | Catch `✓`, `+`, and `☕`; avoid `🐛` and `!`. |
| Stack Trace Sprint | `stack-sprint` | Grab `FIX` tokens and sidestep noisy `ERR` blocks. |
| Snake Bytes | `snake-bytes` | Steer a growing byte trail, snack cleanly, and avoid tangles. |
| Flap Fix | `flap-fix` | Tap through deploy pipes and grab mid-flight patches. |
| Maze Munch | `maze-munch` | Clear dots, sip coffee, and turn bugs into bonus points. |
| Bit Stack | `bit-stack` | Stack tiny blocks, clear rows, and avoid overflow. |

Run a specific game:

```bash
vibebreak-arcade play bit-stack
```

## Commands

```bash
vibebreak-arcade
vibebreak-arcade daily
vibebreak-arcade play <game-id>
vibebreak-arcade scores
vibebreak-arcade setup
vibebreak-arcade agent <codex|claude> [options] -- [args]
```

Examples:

```bash
vibebreak-arcade play commit-catch
vibebreak-arcade play maze-munch
vibebreak-arcade agent codex --break=start -- "work on the next task"
vibebreak-arcade agent claude --break=both --threshold=15 -- "fix the tests"
```

`daily` chooses the same game for the same local calendar date, so Today's Break rotates without needing the internet.

## Controls

- Move: `W`/`A`/`S`/`D` or arrow keys, depending on the game
- Flap: `Space`, `W`, or up arrow in Flap Fix
- Rotate/drop: `W`/up and `S`/down in Bit Stack
- Menus: arrow keys or `W`/`S`, then `Enter`
- Replay: `Enter` or `R`
- Quit/back: `Q` or `Esc`

## Coding-Agent Breaks

Vibebreak can wrap Codex or Claude and offer a break before or after a session. It does not install shell hooks or modify your shell config by itself.

```bash
vibebreak-arcade agent codex --break=start -- "build the feature"
vibebreak-arcade agent claude --break=end -- "review this repo"
vibebreak-arcade agent codex --break=both --threshold=20 -- "fix the tests"
vibebreak-arcade agent claude --break=off -- --help
```

Break options:

- `--break=start` offers Today's Break before the tool opens.
- `--break=end` offers Today's Break after a long session. This is the default.
- `--break=both` offers both.
- `--break=off` runs the wrapped tool without game prompts.
- `--threshold=25` controls the end-of-session prompt time in minutes.

To route `codex` or `claude` through Vibebreak automatically, print setup notes:

```bash
vibebreak-arcade setup
```

A single terminal cannot comfortably run an interactive coding agent and an interactive game at the same time. For true parallel play, use two terminal panes: run your agent in one and `vibebreak-arcade daily` in the other.

## Local Scores

High scores are saved locally at:

```text
~/.vibebreak/scores.json
```

If Vibebreak cannot write that file, the game still works and keeps the score for the current session only.

## From Source

Clone the repo, install dependencies, and run:

```bash
git clone https://github.com/tacotuesday8888/vibebreak.git
cd vibebreak
npm install
npm start
```

Useful development commands:

```bash
npm run dev
npm run build
npm test
```

Optional Bun convenience scripts are available if you already use Bun:

```bash
npm run bun:start
npm run bun:daily
```

Node remains the default runtime.

## Terminal Compatibility

Vibebreak uses [Ink](https://github.com/vadimdemedes/ink) and needs an interactive TTY. It works in standard terminals such as macOS Terminal, iTerm2, Windows Terminal, GNOME Terminal, kitty, and alacritty. Some sandboxes and CI runners do not provide a real TTY and will not start the interactive menu.

Emoji rendering depends on your terminal font. If `🐛` or `☕` look misaligned, try a font with full emoji support such as JetBrains Mono, Fira Code, or your platform's default monospace.

## Project Status

- Latest stable npm release: `vibebreak-arcade@0.3.1`
- Release history: [CHANGELOG.md](CHANGELOG.md)
- CI: `npm test` and `npm pack --dry-run`
- License: MIT

## Roadmap

- More tiny games
- More gameplay balancing
- A short in-app help screen
- Local score import/export
- Optional plain-text mode for terminals with limited emoji support

## Contributing

Contributions are welcome. Keep the project small, local-first, beginner-friendly, and focused on being a fun CLI break game.

Good first contributions include bug fixes, README improvements, small gameplay tweaks, accessibility improvements, and new mini-game ideas.

Before opening a pull request, run:

```bash
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

## License

Vibebreak is released under the [MIT License](LICENSE).

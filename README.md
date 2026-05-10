# Vibebreak

Vibebreak is a chaotic-cozy terminal break arcade built with Node.js, TypeScript, Ink, and React.

Take a tiny reset during a coding session, play a short terminal game, and keep local high scores without any backend, login, cloud service, AI, payments, or analytics.

The package is published on npm as [`vibebreak-arcade`](https://www.npmjs.com/package/vibebreak-arcade) (the unscoped `vibebreak` slot is taken by an unrelated project).

## Quickstart

No install required:

```bash
npx vibebreak-arcade
```

That opens the main menu. To jump straight into the daily break:

```bash
npx vibebreak-arcade daily
```

Vibebreak uses Ink 7, which requires Node.js 22 or newer.

## Install

Install globally so you can run the CLI from anywhere:

```bash
npm install --global vibebreak-arcade
```

Then run:

```bash
vibebreak-arcade
vibebreak-arcade daily
vibebreak-arcade play dodge
```

Prefer a shorter command? Add an alias to your shell config:

```bash
alias vibebreak='vibebreak-arcade'
```

### From source

Clone the repo, install dependencies, and run from source:

```bash
git clone https://github.com/tacotuesday8888/vibebreak.git
cd vibebreak
npm install
npm start
```

You can also run a built version directly:

```bash
npm run build
node dist/index.js
```

## Commands

```bash
vibebreak-arcade
vibebreak-arcade daily
vibebreak-arcade play dodge
vibebreak-arcade play commit-catch
vibebreak-arcade play stack-sprint
vibebreak-arcade scores
vibebreak-arcade setup
vibebreak-arcade agent codex --break=start -- "work on the next task"
vibebreak-arcade agent codex -- --help
vibebreak-arcade agent claude --break=both -- "fix the tests"
vibebreak-arcade agent claude -- --help
```

`vibebreak-arcade daily` chooses the same game for the same local calendar date, so Today's Break rotates without needing the internet.

`vibebreak-arcade agent <codex|claude> -- [args...]` starts Codex or Claude through Vibebreak. It does not install shell hooks or modify your shell config.

Agent break options:

```bash
vibebreak-arcade agent codex --break=start -- "build the feature"
vibebreak-arcade agent claude --break=end -- "review this repo"
vibebreak-arcade agent codex --break=both --threshold=15 -- "fix the tests"
vibebreak-arcade agent claude --break=off -- --help
```

- `--break=start` offers Today's Break before the tool opens.
- `--break=end` offers Today's Break after a long session. This is the default.
- `--break=both` offers both.
- `--break=off` runs the wrapped tool without game prompts.
- `--threshold=25` controls the end-of-session prompt time in minutes.

To make `codex` or `claude` automatically route through Vibebreak, add aliases in your shell config:

```bash
alias codex='vibebreak-arcade agent codex --break=start --'
alias claude='vibebreak-arcade agent claude --break=start --'
```

A single terminal cannot cleanly show an interactive coding agent and an interactive game at the same time. If you want the agent to work while you play, run the agent in one terminal pane and `vibebreak-arcade daily` in another.

You can print these setup notes anytime:

```bash
vibebreak-arcade setup
```

## Games

Each round is a quick 45-second break with a light difficulty ramp and combo scoring.

- **Dodge the Bugs**: slide away from falling `🐛` bugs, chain dodges, and score extra for near misses.
- **Commit Catch**: catch `✓`, `+`, and `☕`; avoid `🐛` and `!`; keep your streak alive.
- **Stack Trace Sprint**: grab `FIX` tokens, dodge `ERR` blocks, and chain clean sidesteps.

## Controls

- Move: `A`/`D` or left/right arrow keys
- Menus: arrow keys or `W`/`S`, then `Enter`
- Replay: `Enter` or `R`
- Quit/back: `Q` or `Esc`

## Local Scores

High scores are saved locally at:

```text
~/.vibebreak/scores.json
```

If Vibebreak cannot write that file, the game still works and keeps the score for the current session only.

## Terminal compatibility

Vibebreak uses [Ink](https://github.com/vadimdemedes/ink) and needs an interactive TTY. It works in standard terminals (macOS Terminal, iTerm2, Windows Terminal, GNOME Terminal, kitty, alacritty, etc.). Some sandboxes and CI runners do not provide a real TTY and will fail to start the menu.

Emoji rendering depends on your terminal font. If `🐛` or `☕` look misaligned, try a font with full emoji support such as Fira Code, JetBrains Mono, or your platform's default monospace.

## Development

Run with automatic restarts:

```bash
npm run dev
```

If you already use Bun, there are optional convenience scripts:

```bash
npm run bun:start
npm run bun:daily
```

Node remains the default runtime for the project.

Check TypeScript:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

## Features

- Polished terminal menu with a filled selection bar
- Today's Break daily rotation
- Three tiny mini-games
- Shared HUD with score, best score, color-tiered combo meter, warming time bar, and floating score popups
- Bordered end-of-round scorecard with a 5-star rating and a NEW BEST banner
- Local high scores
- Optional Codex/Claude session wrapper
- No backend or external services

## Roadmap

- Add more tiny games
- Add difficulty levels
- Add a short help screen inside the app
- Add import/export for local scores
- Improve terminal compatibility notes

## Contributing

Contributions are welcome. Keep the project small, local-first, beginner-friendly, and focused on being a fun CLI break game.

Good first contributions include bug fixes, README improvements, small gameplay tweaks, accessibility improvements, and new mini-game ideas.

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

## License

Vibebreak is released under the [MIT License](LICENSE).

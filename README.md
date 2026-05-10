# Vibebreak

Vibebreak is a chaotic-cozy terminal break arcade built with Node.js, TypeScript, Ink, and React.

Take a tiny reset during a coding session, play a short terminal game, and keep local high scores without any backend, login, cloud service, AI, payments, or analytics.

## Install

Clone the project, then install dependencies:

```bash
npm install
```

Vibebreak uses Ink 7, which requires Node.js 22 or newer.

## Run

Open the main menu:

```bash
npm start
```

Build the CLI:

```bash
npm run build
```

After building, run the compiled CLI directly:

```bash
node dist/index.js
```

When installed or linked as a package, Vibebreak exposes the `vibebreak` command:

```bash
vibebreak
```

## Commands

```bash
vibebreak
vibebreak daily
vibebreak play dodge
vibebreak play commit-catch
vibebreak play stack-sprint
vibebreak scores
vibebreak setup
vibebreak agent codex --break=start -- "work on the next task"
vibebreak agent codex -- --help
vibebreak agent claude --break=both -- "fix the tests"
vibebreak agent claude -- --help
```

`vibebreak daily` chooses the same game for the same local calendar date, so Today's Break rotates without needing the internet.

`vibebreak agent <codex|claude> -- [args...]` starts Codex or Claude through Vibebreak. It does not install shell hooks or modify your shell config.

Agent break options:

```bash
vibebreak agent codex --break=start -- "build the feature"
vibebreak agent claude --break=end -- "review this repo"
vibebreak agent codex --break=both --threshold=15 -- "fix the tests"
vibebreak agent claude --break=off -- --help
```

- `--break=start` offers Today's Break before the tool opens.
- `--break=end` offers Today's Break after a long session. This is the default.
- `--break=both` offers both.
- `--break=off` runs the wrapped tool without game prompts.
- `--threshold=25` controls the end-of-session prompt time in minutes.

To make `codex` or `claude` automatically route through Vibebreak, add aliases in your shell config:

```bash
alias codex='vibebreak agent codex --break=start --'
alias claude='vibebreak agent claude --break=start --'
```

A single terminal cannot cleanly show an interactive coding agent and an interactive game at the same time. If you want the agent to work while you play, run the agent in one terminal pane and `vibebreak daily` in another.

You can print these setup notes anytime:

```bash
vibebreak setup
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

- Polished terminal menu
- Today's Break daily rotation
- Three tiny mini-games
- Shared game UI with score, time, best score, combo streaks, feedback messages, and framed boards
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

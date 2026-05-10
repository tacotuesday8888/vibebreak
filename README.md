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
vibebreak agent codex -- --help
vibebreak agent claude -- --help
```

`vibebreak daily` chooses the same game for the same local calendar date, so Today's Break rotates without needing the internet.

`vibebreak agent <codex|claude> -- [args...]` starts Codex or Claude through Vibebreak. If you opt in at launch and the wrapped session lasts at least 25 minutes, Vibebreak offers to start Today's Break when the session exits. It does not install shell hooks or modify your shell config.

## Games

- **Dodge the Bugs**: slide away from falling `🐛` bugs and keep the vibe intact.
- **Commit Catch**: catch `✓`, `+`, and `☕`; avoid `🐛` and `!`.
- **Stack Trace Sprint**: grab `FIX` tokens and dodge falling `ERR` blocks.

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
- Shared game UI with score, time, best score, feedback messages, and framed boards
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

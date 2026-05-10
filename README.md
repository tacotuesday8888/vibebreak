# Vibebreak

Vibebreak is a tiny open-source terminal game built with Node.js, TypeScript, Ink, and React.

Take a 60-second break, dodge falling bugs, and see how many points you can keep before time runs out.

## Install

Clone the project, then install dependencies:

```bash
npm install
```

Vibebreak uses Ink 7, which requires Node.js 22 or newer.

## Run

Start the game:

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

Build the CLI output:

```bash
npm run build
```

After building, the CLI entry is available at `dist/index.js`. The package also defines a future command name:

```bash
vibebreak
```

## Features

- Simple terminal menu with `Dodge the Bugs` and `Quit`
- 60-second arcade round
- Player shown as `>`
- Bugs shown as `🐛`
- Move with `A`/`D` or the left/right arrow keys
- Gain score by dodging bugs
- Lose score when bugs hit you
- Final score with a short funny message

## Roadmap

- Add a short help screen
- Add difficulty levels
- Add a local high score
- Add sound-free terminal effects
- Improve keyboard handling on more terminals

## Contributing

Contributions are welcome. Keep the project small, beginner-friendly, and focused on being a simple CLI game.

Good first contributions include bug fixes, README improvements, small gameplay tweaks, and accessibility improvements.

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

## License

Vibebreak is released under the [MIT License](LICENSE).

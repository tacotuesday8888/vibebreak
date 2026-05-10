import type {AgentOptions, AgentTool, AppCommand, GameId} from '../types.js';
import {getGameById, games} from '../games/registry.js';

export type ParsedCommand =
	| AppCommand
	| {args: string[]; kind: 'agent'; options: AgentOptions; tool: AgentTool}
	| {error?: string; kind: 'help'}
	| {kind: 'setup'};

const isAgentTool = (value: string): value is AgentTool =>
	value === 'codex' || value === 'claude';

const defaultAgentOptions: AgentOptions = {
	breakMode: 'end',
	thresholdMinutes: 25,
};

const parseAgentOptions = (
	args: string[],
): {error?: string; options: AgentOptions; toolArgs: string[]} => {
	const separatorIndex = args.indexOf('--');
	const optionArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
	const toolArgs = separatorIndex === -1 ? [] : args.slice(separatorIndex + 1);
	const options: AgentOptions = {...defaultAgentOptions};

	for (const option of optionArgs) {
		if (option.startsWith('--break=')) {
			const breakMode = option.slice('--break='.length);

			if (
				breakMode !== 'start' &&
				breakMode !== 'end' &&
				breakMode !== 'both' &&
				breakMode !== 'off'
			) {
				return {
					error: 'Invalid --break value. Use start, end, both, or off.',
					options,
					toolArgs,
				};
			}

			options.breakMode = breakMode;
			continue;
		}

		if (option.startsWith('--threshold=')) {
			const thresholdMinutes = Number(option.slice('--threshold='.length));

			if (!Number.isFinite(thresholdMinutes) || thresholdMinutes < 1) {
				return {
					error: 'Invalid --threshold value. Use minutes, for example --threshold=25.',
					options,
					toolArgs,
				};
			}

			options.thresholdMinutes = thresholdMinutes;
			continue;
		}

		return {
			error: `Unknown agent option "${option}".`,
			options,
			toolArgs,
		};
	}

	return {options, toolArgs};
};

export const parseCliArgs = (args: string[]): ParsedCommand => {
	const [command, ...rest] = args;

	if (!command) {
		return {kind: 'menu'};
	}

	if (command === '--help' || command === '-h' || command === 'help') {
		return {kind: 'help'};
	}

	if (command === 'daily') {
		return {kind: 'daily'};
	}

	if (command === 'scores') {
		return {kind: 'scores'};
	}

	if (command === 'setup') {
		return {kind: 'setup'};
	}

	if (command === 'play') {
		const [gameId] = rest;

		if (!gameId) {
			return {
				error: 'Missing game id. Try: vibebreak-arcade play dodge',
				kind: 'help',
			};
		}

		if (!getGameById(gameId)) {
			return {
				error: `Unknown game "${gameId}". Available games: ${games
					.map(game => game.id)
					.join(', ')}`,
				kind: 'help',
			};
		}

		return {gameId: gameId as GameId, kind: 'play'};
	}

	if (command === 'agent') {
		const [tool, ...agentArgs] = rest;

		if (!tool || !isAgentTool(tool)) {
			return {
				error:
					'Missing agent tool. Try: vibebreak-arcade agent codex -- --help',
				kind: 'help',
			};
		}

		const parsedAgentOptions = parseAgentOptions(agentArgs);

		if (parsedAgentOptions.error) {
			return {
				error: parsedAgentOptions.error,
				kind: 'help',
			};
		}

		return {
			args: parsedAgentOptions.toolArgs,
			kind: 'agent',
			options: parsedAgentOptions.options,
			tool,
		};
	}

	return {
		error: `Unknown command "${command}".`,
		kind: 'help',
	};
};

export const renderHelp = (): string => `Vibebreak

A chaotic-cozy terminal break arcade.

Usage:
  vibebreak-arcade                  Open the main menu
  vibebreak-arcade daily            Play today's break
  vibebreak-arcade play <game-id>   Play a specific game
  vibebreak-arcade scores           Show local high scores
  vibebreak-arcade setup            Print optional Codex/Claude alias setup
  vibebreak-arcade agent <tool> [options] -- [args]
                                    Wrap codex or claude with break prompts

Agent options:
  --break=end                       Offer a break after long sessions, default
  --break=start                     Offer Today's Break before launching the tool
  --break=both                      Offer before launch and after long sessions
  --break=off                       Run the tool without break prompts
  --threshold=25                    Minutes before the end-of-session prompt

Games:
${games.map(game => `  ${game.id.padEnd(13)} ${game.name}`).join('\n')}

Examples:
  vibebreak-arcade play commit-catch
  vibebreak-arcade play snake-bytes
  vibebreak-arcade play bit-stack
  vibebreak-arcade setup
  vibebreak-arcade agent codex -- --help
  vibebreak-arcade agent claude --break=start -- "fix the tests"
`;

export const renderSetup = (): string => `Vibebreak optional setup

Vibebreak does not modify your shell by itself. If you want it to appear when
you start a coding agent, you can manually add aliases like these to your shell
config file, usually ~/.zshrc on macOS:

  alias codex='vibebreak-arcade agent codex --break=start --'
  alias claude='vibebreak-arcade agent claude --break=start --'

Then restart your terminal, or run:

  source ~/.zshrc

After that, typing "codex ..." or "claude ..." will route that command through
Vibebreak and offer Today's Break before the agent starts.

Useful variants:

  alias codex='vibebreak-arcade agent codex --break=both --threshold=20 --'
  alias claude='vibebreak-arcade agent claude --break=end --threshold=25 --'

Note:
  One terminal cannot comfortably run an interactive coding agent and an
  interactive game at the same time. For true side-by-side play, open two terminal
  panes: run your agent in one and "vibebreak-arcade daily" in the other.
`;

import type {AgentOptions, AgentTool, AppCommand, GameId} from '../types.js';
import {getGameById, games} from '../games/registry.js';

export type ParsedCommand =
	| AppCommand
	| {args: string[]; kind: 'agent'; options: AgentOptions; tool: AgentTool}
	| {error?: string; kind: 'help'};

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

	if (command === 'play') {
		const [gameId] = rest;

		if (!gameId) {
			return {error: 'Missing game id. Try: vibebreak play dodge', kind: 'help'};
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
				error: 'Missing agent tool. Try: vibebreak agent codex -- --help',
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
  vibebreak                         Open the main menu
  vibebreak daily                   Play today's break
  vibebreak play <game-id>          Play a specific game
  vibebreak scores                  Show local high scores
  vibebreak agent <tool> [options] -- [args]
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
  vibebreak play commit-catch
  vibebreak agent codex -- --help
  vibebreak agent claude --break=start -- "fix the tests"
`;

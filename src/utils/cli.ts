import type {AgentTool, AppCommand, GameId} from '../types.js';
import {getGameById, games} from '../games/registry.js';

export type ParsedCommand =
	| AppCommand
	| {args: string[]; kind: 'agent'; tool: AgentTool}
	| {error?: string; kind: 'help'};

const isAgentTool = (value: string): value is AgentTool =>
	value === 'codex' || value === 'claude';

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
		const [tool, separator, ...toolArgs] = rest;

		if (!tool || !isAgentTool(tool)) {
			return {
				error: 'Missing agent tool. Try: vibebreak agent codex -- --help',
				kind: 'help',
			};
		}

		const args = separator === '--' ? toolArgs : rest.slice(1);

		return {args, kind: 'agent', tool};
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
  vibebreak agent <tool> -- [args]  Wrap codex or claude with a break prompt

Games:
${games.map(game => `  ${game.id.padEnd(13)} ${game.name}`).join('\n')}

Examples:
  vibebreak play commit-catch
  vibebreak agent codex -- --help
`;

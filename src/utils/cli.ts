import type {AppCommand, GameId, WaitCommand} from '../types.js';
import {getGameById, games} from '../games/registry.js';

export type ParsedCommand =
	| AppCommand
	| WaitCommand
	| {error?: string; kind: 'help'};

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

	if (command === 'wait') {
		const separatorIndex = rest.indexOf('--');

		if (separatorIndex !== 0) {
			return {
				error: 'Missing -- separator. Try: vibebreak-arcade wait -- npm test',
				kind: 'help',
			};
		}

		const [waitCommand, ...waitArgs] = rest.slice(separatorIndex + 1);

		if (!waitCommand) {
			return {
				error: 'Missing command. Try: vibebreak-arcade wait -- npm test',
				kind: 'help',
			};
		}

		return {args: waitArgs, command: waitCommand, kind: 'wait'};
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
  vibebreak-arcade wait -- <cmd>    Run a command with playable arcade wait mode

Games:
${games.map(game => `  ${game.id.padEnd(13)} ${game.name}`).join('\n')}

Examples:
  vibebreak-arcade play commit-catch
  vibebreak-arcade play snake-bytes
  vibebreak-arcade play bit-stack
  vibebreak-arcade wait -- npm test
  vibebreak-arcade wait -- npm run build
`;

import type {GameDefinition, GameId} from '../types.js';
import {CommitCatchGame} from './CommitCatchGame.js';
import {DodgeGame} from './DodgeGame.js';
import {StackSprintGame} from './StackSprintGame.js';

export const games: GameDefinition[] = [
	{
		accent: 'green',
		component: DodgeGame,
		controls: 'A/D or arrows move · Q quits to menu',
		description: 'Slide away from falling bugs and keep the vibe intact.',
		durationSeconds: 60,
		id: 'dodge',
		name: 'Dodge the Bugs',
	},
	{
		accent: 'cyan',
		component: CommitCatchGame,
		controls: 'A/D or arrows move · catch ✓ + ☕ · avoid 🐛 !',
		description: 'Catch good commit energy and dodge bad merge vibes.',
		durationSeconds: 60,
		id: 'commit-catch',
		name: 'Commit Catch',
	},
	{
		accent: 'magenta',
		component: StackSprintGame,
		controls: 'A/D or arrows move · grab FIX · dodge ERR',
		description: 'Sprint through stack traces and collect tiny fixes.',
		durationSeconds: 60,
		id: 'stack-sprint',
		name: 'Stack Trace Sprint',
	},
];

export const getGameById = (gameId: string): GameDefinition | undefined =>
	games.find(game => game.id === (gameId as GameId));

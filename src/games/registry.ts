import type {GameDefinition, GameId} from '../types.js';
import {CommitCatchGame} from './CommitCatchGame.js';
import {DodgeGame} from './DodgeGame.js';
import {StackSprintGame} from './StackSprintGame.js';

export const games: GameDefinition[] = [
	{
		accent: 'green',
		component: DodgeGame,
		controls: 'A/D or arrows move · near misses score more · Q menu',
		description: 'Slide away from bugs, chain dodges, and flirt with danger.',
		durationSeconds: 45,
		id: 'dodge',
		name: 'Dodge the Bugs',
	},
	{
		accent: 'cyan',
		component: CommitCatchGame,
		controls: 'A/D or arrows move · catch ✓ + ☕ · avoid 🐛 !',
		description: 'Catch good commits, keep a streak, avoid spicy diffs.',
		durationSeconds: 45,
		id: 'commit-catch',
		name: 'Commit Catch',
	},
	{
		accent: 'magenta',
		component: StackSprintGame,
		controls: 'A/D or arrows move · grab FIX · dodge ERR · chain combos',
		description: 'Grab tiny fixes and sidestep errors as the trace speeds up.',
		durationSeconds: 45,
		id: 'stack-sprint',
		name: 'Stack Trace Sprint',
	},
];

export const getGameById = (gameId: string): GameDefinition | undefined =>
	games.find(game => game.id === (gameId as GameId));

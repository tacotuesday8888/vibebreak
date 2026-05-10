import type {GameDefinition, GameId} from '../types.js';
import {BitStackGame} from './BitStackGame.js';
import {CommitCatchGame} from './CommitCatchGame.js';
import {DodgeGame} from './DodgeGame.js';
import {FlapFixGame} from './FlapFixGame.js';
import {MazeMunchGame} from './MazeMunchGame.js';
import {SnakeBytesGame} from './SnakeBytesGame.js';
import {StackSprintGame} from './StackSprintGame.js';

export const games: GameDefinition[] = [
	{
		accent: 'green',
		component: DodgeGame,
		controls: 'A/D or arrows move · near misses score more · Q menu',
		description: 'Slide away from bugs, chain dodges, and flirt with danger.',
		durationSeconds: 45,
		id: 'dodge',
		icon: '🐛',
		name: 'Dodge the Bugs',
		objective: 'Stay loose, dodge falling bugs, and collect near-miss style points.',
	},
	{
		accent: 'cyan',
		component: CommitCatchGame,
		controls: 'A/D or arrows move · catch ✓ + ☕ · avoid 🐛 !',
		description: 'Catch good commits, keep a streak, avoid spicy diffs.',
		durationSeconds: 45,
		id: 'commit-catch',
		icon: '✓',
		name: 'Commit Catch',
		objective: 'Catch useful tokens and leave the suspicious ones alone.',
	},
	{
		accent: 'magenta',
		component: StackSprintGame,
		controls: 'A/D or arrows move · grab FIX · dodge ERR · chain combos',
		description: 'Grab tiny fixes and sidestep errors as the trace speeds up.',
		durationSeconds: 45,
		id: 'stack-sprint',
		icon: '!',
		name: 'Stack Trace Sprint',
		objective: 'Grab FIX tokens and sidestep noisy ERR blocks.',
	},
	{
		accent: 'green',
		component: SnakeBytesGame,
		controls: 'WASD or arrows steer · eat + ☕ · avoid walls/self · Q menu',
		description: 'A tiny command trail that grows when it snacks.',
		durationSeconds: 45,
		id: 'snake-bytes',
		icon: '@',
		name: 'Snake Bytes',
		objective: 'Steer the byte trail, snack cleanly, and avoid tangling yourself.',
	},
	{
		accent: 'cyan',
		component: FlapFixGame,
		controls: 'Space/W/↑ flap · pass gaps · catch FIX · Q menu',
		description: 'Tap through deploy pipes without clipping the build.',
		durationSeconds: 45,
		id: 'flap-fix',
		icon: '>',
		name: 'Flap Fix',
		objective: 'Keep the fix airborne through gaps and grab mid-flight patches.',
	},
	{
		accent: 'yellow',
		component: MazeMunchGame,
		controls: 'WASD or arrows move · eat dots/☕ · dodge bugs · Q menu',
		description: 'Munch through a tiny maze and caffeinate into bug-chomp mode.',
		durationSeconds: 45,
		id: 'maze-munch',
		icon: '@',
		name: 'Maze Munch',
		objective: 'Clear dots, sip coffee, and turn bugs into bonus points.',
	},
	{
		accent: 'blue',
		component: BitStackGame,
		controls: 'A/D move · W/↑ rotate · S/↓ drop · clear rows · Q menu',
		description: 'A compact falling-block stacker for terminal breaks.',
		durationSeconds: 45,
		id: 'bit-stack',
		icon: '[]',
		name: 'Bit Stack',
		objective: 'Stack tiny blocks, clear rows, and avoid overflow.',
	},
];

export const getGameById = (gameId: string): GameDefinition | undefined =>
	games.find(game => game.id === (gameId as GameId));

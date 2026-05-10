import {useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {BoardCell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult} from '../types.js';
import {
	Banner,
	Direction,
	FlashKind,
	Point,
	Popup,
	advanceBanner,
	advanceFlash,
	advancePopups,
	comboBannerFor,
	comboBonus,
	createBoard,
	createPopup,
	movePoint,
	oppositeDirection,
	paintCell,
	pointKey,
	pushMessage,
	samePoint,
	shouldShake,
	useDirectionalControls,
	useFinishOnce,
} from './gameHelpers.js';

const MAZE = [
	'##################',
	'#................#',
	'#.####.####.####.#',
	'#.#....#..#....#.#',
	'#.#.##.#..#.##.#.#',
	'#...##......##...#',
	'###.##.####.##.###',
	'#......#..#......#',
	'#.####.#..#.####.#',
	'#................#',
	'#.##.########.##.#',
	'##################',
];

const TICK_MS = 145;
const MAP_WIDTH = MAZE[0]!.length;
const MAP_HEIGHT = MAZE.length;
const PLAYER_START: Point = {x: 1, y: 1};
const BUG_STARTS: Point[] = [
	{x: 16, y: 1},
	{x: 16, y: 9},
];
const COFFEE_STARTS: Point[] = [
	{x: 1, y: 9},
	{x: 16, y: 5},
];
const POWER_TICKS = 44;

type MazeState = {
	banner: Banner | null;
	bestCombo: number;
	bugs: Point[];
	bugsCaught: number;
	coffees: Set<string>;
	combo: number;
	direction: Direction;
	elapsedMs: number;
	flash: FlashKind;
	flashTicksLeft: number;
	hits: number;
	message: string;
	nextDirection: Direction;
	nextPopupId: number;
	pellets: Set<string>;
	player: Point;
	popups: Popup[];
	powerTicks: number;
	prevMessage: string;
	score: number;
	tick: number;
};

const isWall = (point: Point): boolean =>
	point.x < 0 ||
	point.x >= MAP_WIDTH ||
	point.y < 0 ||
	point.y >= MAP_HEIGHT ||
	MAZE[point.y]![point.x] === '#';

const createPellets = (): Set<string> => {
	const pellets = new Set<string>();

	for (let y = 0; y < MAP_HEIGHT; y += 1) {
		for (let x = 0; x < MAP_WIDTH; x += 1) {
			const point = {x, y};

			if (
				!isWall(point) &&
				!samePoint(point, PLAYER_START) &&
				!BUG_STARTS.some(start => samePoint(start, point)) &&
				!COFFEE_STARTS.some(start => samePoint(start, point))
			) {
				pellets.add(pointKey(point));
			}
		}
	}

	return pellets;
};

const createCoffees = (): Set<string> =>
	new Set(COFFEE_STARTS.map(point => pointKey(point)));

const initialState = (): MazeState => ({
	banner: null,
	bestCombo: 0,
	bugs: BUG_STARTS.map(point => ({...point})),
	bugsCaught: 0,
	coffees: createCoffees(),
	combo: 0,
	direction: 'right',
	elapsedMs: 0,
	flash: null,
	flashTicksLeft: 0,
	hits: 0,
	message: 'Munch dots. Coffee makes bugs temporarily negotiable.',
	nextDirection: 'right',
	nextPopupId: 1,
	pellets: createPellets(),
	player: {...PLAYER_START},
	popups: [],
	powerTicks: 0,
	prevMessage: '',
	score: 0,
	tick: 0,
});

const distance = (first: Point, second: Point): number =>
	Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

const moveBug = (bug: Point, player: Point, powered: boolean): Point => {
	const candidates = (['up', 'down', 'left', 'right'] as Direction[])
		.map(direction => movePoint(bug, direction))
		.filter(point => !isWall(point));

	if (candidates.length === 0) {
		return bug;
	}

	return candidates.sort((first, second) =>
		powered
			? distance(second, player) - distance(first, player)
			: distance(first, player) - distance(second, player),
	)[0]!;
};

const finishMessage = (score: number): string => {
	if (score < 25) {
		return 'The maze remains emotionally unresolved, but you found snacks.';
	}

	if (score < 70) {
		return 'Respectable munching. The bugs looked concerned.';
	}

	return 'Dot vacuum deluxe. The maze filed a tasteful complaint.';
};

const buildBoard = ({
	bugs,
	coffees,
	pellets,
	player,
	popups,
	powerTicks,
}: {
	bugs: Point[];
	coffees: Set<string>;
	pellets: Set<string>;
	player: Point;
	popups: Popup[];
	powerTicks: number;
}): BoardCell[][] => {
	const board = createBoard(MAP_WIDTH, MAP_HEIGHT);

	for (let y = 0; y < MAP_HEIGHT; y += 1) {
		for (let x = 0; x < MAP_WIDTH; x += 1) {
			const point = {x, y};
			const key = pointKey(point);

			if (MAZE[y]![x] === '#') {
				paintCell(board, point, '#', 'blue');
			} else if (coffees.has(key)) {
				paintCell(board, point, '☕', 'yellow');
			} else if (pellets.has(key)) {
				paintCell(board, point, '.', 'white');
			}
		}
	}

	for (const bug of bugs) {
		paintCell(board, bug, 'B', powerTicks > 0 ? 'cyan' : 'red');
	}

	paintCell(board, player, '@', 'yellow');

	for (const popup of popups) {
		paintCell(board, popup, popup.text, popup.kind === 'good' ? 'yellow' : 'red');
	}

	return board;
};

export const MazeMunchGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<MazeState>(() => initialState());

	useDirectionalControls(direction => {
		setState(current => ({...current, nextDirection: direction}));
	}, onExit);

	useEffect(() => {
		const timer = setInterval(() => {
			setState(current => {
				if (current.elapsedMs >= definition.durationSeconds * 1000) {
					return current;
				}

				const elapsedMs = Math.min(
					current.elapsedMs + TICK_MS,
					definition.durationSeconds * 1000,
				);
				const tick = current.tick + 1;
				const direction = current.nextDirection;
				const attemptedPlayer = movePoint(current.player, direction);
				let banner = advanceBanner(current.banner);
				let bestCombo = current.bestCombo;
				let bugs = current.bugs;
				let bugsCaught = current.bugsCaught;
				let combo = current.combo;
				let coffees = new Set(current.coffees);
				let hits = current.hits;
				let message = current.message;
				let nextPopupId = current.nextPopupId;
				let pellets = new Set(current.pellets);
				let player = isWall(attemptedPlayer) ? current.player : attemptedPlayer;
				let powerTicks = Math.max(0, current.powerTicks - 1);
				let score = current.score;
				let newFlash: FlashKind = null;
				const newPopups: Popup[] = [];

				const playerKey = pointKey(player);

				if (pellets.delete(playerKey)) {
					const nextCombo = combo + 1;
					const points = 1 + comboBonus(nextCombo);
					score += points;
					combo = nextCombo;
					bestCombo = Math.max(bestCombo, combo);
					message = `+${points} dot munched. Maze combo x${combo}.`;
					banner = comboBannerFor(current.combo, combo) ?? banner;
					newFlash = 'good';
				}

				if (coffees.delete(playerKey)) {
					const points = 8 + comboBonus(combo + 1);
					score += points;
					combo += 1;
					bestCombo = Math.max(bestCombo, combo);
					powerTicks = POWER_TICKS;
					message = `+${points} coffee mode. Bugs are now bonus snacks.`;
					banner = comboBannerFor(current.combo, combo) ?? banner;
					newFlash = 'good';
					newPopups.push(createPopup(nextPopupId, points, player.x));
					nextPopupId += 1;
				}

				if (tick % 4 === 0) {
					bugs = bugs.map(bug => moveBug(bug, player, powerTicks > 0));
				}

				for (let index = 0; index < bugs.length; index += 1) {
					const bug = bugs[index]!;

					if (!samePoint(bug, player)) {
						continue;
					}

					if (powerTicks > 0) {
						const points = 12 + comboBonus(combo + 1);
						score += points;
						combo += 1;
						bestCombo = Math.max(bestCombo, combo);
						bugsCaught += 1;
						bugs = bugs.map((candidate, bugIndex) =>
							bugIndex === index ? {...BUG_STARTS[index % BUG_STARTS.length]!} : candidate,
						);
						message = `+${points} bug chomp. Debugging tastes crunchy.`;
						newFlash = 'good';
						newPopups.push(createPopup(nextPopupId, points, player.x));
						nextPopupId += 1;
					} else {
						const delta = -8;
						score += delta;
						combo = 0;
						hits += 1;
						player = {...PLAYER_START};
						bugs = BUG_STARTS.map(start => ({...start}));
						message = `${delta} bug ambush. Respawn at the top-left prompt.`;
						newFlash = 'bad';
						newPopups.push(createPopup(nextPopupId, delta, player.x));
						nextPopupId += 1;
						break;
					}
				}

				if (pellets.size === 0) {
					pellets = createPellets();
					coffees = createCoffees();
					message = 'Maze refilled. Fresh dots, fresh nonsense.';
				}

				if (oppositeDirection(direction) === current.direction && isWall(attemptedPlayer)) {
					// Keep the previous direction only when reversing directly into a wall.
					player = current.player;
				}

				const popups = [...advancePopups(current.popups), ...newPopups];
				const {flash, flashTicksLeft} = advanceFlash(
					current.flash,
					current.flashTicksLeft,
					newFlash,
				);
				const log = pushMessage(
					{message: current.message, prevMessage: current.prevMessage},
					message,
				);

				return {
					banner,
					bestCombo,
					bugs,
					bugsCaught,
					coffees,
					combo,
					direction,
					elapsedMs,
					flash,
					flashTicksLeft,
					hits,
					message: log.message,
					nextDirection: direction,
					nextPopupId,
					pellets,
					player,
					popups,
					powerTicks,
					prevMessage: log.prevMessage,
					score,
					tick,
				};
			});
		}, TICK_MS);

		return () => {
			clearInterval(timer);
		};
	}, [definition.durationSeconds]);

	const result: GameResult = useMemo(
		() => ({
			gameId: definition.id,
			gameName: definition.name,
			message: finishMessage(state.score),
			score: state.score,
			stats: [
				{label: 'Dots left', value: state.pellets.size},
				{label: 'Bug chomps', value: state.bugsCaught},
				{label: 'Ambushes', value: state.hits},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.bugsCaught,
			state.hits,
			state.pellets.size,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const board = useMemo(
		() =>
			buildBoard({
				bugs: state.bugs,
				coffees: state.coffees,
				pellets: state.pellets,
				player: state.player,
				popups: state.popups,
				powerTicks: state.powerTicks,
			}),
		[
			state.bugs,
			state.coffees,
			state.pellets,
			state.player,
			state.popups,
			state.powerTicks,
		],
	);

	return (
		<GameShell
			accent={definition.accent}
			banner={state.banner}
			bestScore={bestScore}
			board={board}
			combo={state.combo}
			controls={definition.controls}
			durationSeconds={definition.durationSeconds}
			elapsedMs={state.elapsedMs}
			flash={state.flash}
			message={state.message}
			objective={definition.objective}
			prevMessage={state.prevMessage}
			score={state.score}
			shake={shouldShake(state.flash, state.flashTicksLeft)}
			status={[
				{label: 'Dots', value: state.pellets.size},
				{label: 'Power', value: state.powerTicks > 0 ? 'ON' : 'off'},
				{label: 'Bonks', value: state.hits},
			]}
			title={definition.name}
		/>
	);
};

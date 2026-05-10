import {useEffect, useMemo, useState} from 'react';
import {useInput} from 'ink';
import {GameShell} from '../components/GameShell.js';
import type {BoardCell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {colors} from '../utils/theme.js';
import {
	Banner,
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
	paintCell,
	pushMessage,
	shouldShake,
	useFinishOnce,
} from './gameHelpers.js';

const STACK_WIDTH = 10;
const STACK_HEIGHT = 14;
const TICK_MS = 300;

type StackCell = {
	color: InkColor;
	label: string;
};

type Grid = Array<Array<StackCell | null>>;

type PieceTemplate = {
	color: InkColor;
	label: string;
	rotates?: boolean;
	shape: Point[];
};

type Piece = PieceTemplate & {
	id: number;
	x: number;
	y: number;
};

type StackState = {
	banner: Banner | null;
	bestCombo: number;
	combo: number;
	current: Piece;
	elapsedMs: number;
	flash: FlashKind;
	flashTicksLeft: number;
	grid: Grid;
	lines: number;
	message: string;
	nextId: number;
	nextPopupId: number;
	popups: Popup[];
	prevMessage: string;
	score: number;
	softDrops: number;
	tops: number;
};

const PIECES: PieceTemplate[] = [
	{
		color: colors.accent,
		label: '[]',
		rotates: false,
		shape: [
			{x: 0, y: 0},
			{x: 1, y: 0},
			{x: 0, y: 1},
			{x: 1, y: 1},
		],
	},
	{
		color: colors.brandAlt,
		label: '==',
		shape: [
			{x: 0, y: 0},
			{x: 1, y: 0},
			{x: 2, y: 0},
			{x: 3, y: 0},
		],
	},
	{
		color: colors.brand,
		label: 'LL',
		shape: [
			{x: 0, y: 0},
			{x: 0, y: 1},
			{x: 1, y: 1},
			{x: 2, y: 1},
		],
	},
	{
		color: colors.saved,
		label: 'TT',
		shape: [
			{x: 1, y: 0},
			{x: 0, y: 1},
			{x: 1, y: 1},
			{x: 2, y: 1},
		],
	},
];

const createGrid = (): Grid =>
	Array.from({length: STACK_HEIGHT}, () =>
		Array.from({length: STACK_WIDTH}, () => null),
	);

const normalizeShape = (shape: Point[]): Point[] => {
	const minX = Math.min(...shape.map(point => point.x));
	const minY = Math.min(...shape.map(point => point.y));

	return shape
		.map(point => ({x: point.x - minX, y: point.y - minY}))
		.sort((first, second) => first.y - second.y || first.x - second.x);
};

const createPiece = (id: number): Piece => {
	const template = PIECES[Math.floor(Math.random() * PIECES.length)]!;

	return {
		...template,
		id,
		shape: normalizeShape(template.shape),
		x: Math.floor(STACK_WIDTH / 2) - 2,
		y: 0,
	};
};

const absoluteCells = (piece: Piece): Point[] =>
	piece.shape.map(point => ({x: piece.x + point.x, y: piece.y + point.y}));

const canPlace = (grid: Grid, piece: Piece): boolean =>
	absoluteCells(piece).every(
		point =>
			point.x >= 0 &&
			point.x < STACK_WIDTH &&
			point.y >= 0 &&
			point.y < STACK_HEIGHT &&
			!grid[point.y]![point.x],
	);

const movePiece = (piece: Piece, x: number, y: number): Piece => ({
	...piece,
	x: piece.x + x,
	y: piece.y + y,
});

const rotatePiece = (piece: Piece): Piece => {
	if (piece.rotates === false) {
		return piece;
	}

	const rotated = normalizeShape(
		piece.shape.map(point => ({x: -point.y, y: point.x})),
	);

	return {...piece, shape: rotated};
};

const lockPiece = (grid: Grid, piece: Piece): Grid => {
	const next = grid.map(row => [...row]);

	for (const point of absoluteCells(piece)) {
		if (point.y >= 0 && point.y < STACK_HEIGHT) {
			next[point.y]![point.x] = {color: piece.color, label: piece.label};
		}
	}

	return next;
};

const clearLines = (grid: Grid): {cleared: number; grid: Grid} => {
	const remaining = grid.filter(row => row.some(cell => cell === null));
	const cleared = STACK_HEIGHT - remaining.length;

	while (remaining.length < STACK_HEIGHT) {
		remaining.unshift(Array.from({length: STACK_WIDTH}, () => null));
	}

	return {cleared, grid: remaining};
};

const topOutGrid = (grid: Grid): Grid => [
	...Array.from({length: 5}, () => Array.from({length: STACK_WIDTH}, () => null)),
	...grid.slice(5),
];

const initialState = (): StackState => ({
	banner: null,
	bestCombo: 0,
	combo: 0,
	current: createPiece(1),
	elapsedMs: 0,
	flash: null,
	flashTicksLeft: 0,
	grid: createGrid(),
	lines: 0,
	message: 'Stack tiny blocks. Clear rows before the repo overflows.',
	nextId: 2,
	nextPopupId: 1,
	popups: [],
	prevMessage: '',
	score: 0,
	softDrops: 0,
	tops: 0,
});

const settleCurrentPiece = (current: StackState): StackState => {
	const locked = lockPiece(current.grid, current.current);
	const clearResult = clearLines(locked);
	const nextPiece = createPiece(current.nextId);
	const newPopups: Popup[] = [];
	let banner = advanceBanner(current.banner);
	let bestCombo = current.bestCombo;
	let combo = current.combo;
	let flash: FlashKind = null;
	let grid = clearResult.grid;
	let lines = current.lines;
	let message = 'Piece settled. Keep the stack breathable.';
	let nextId = current.nextId + 1;
	let nextPopupId = current.nextPopupId;
	let score = current.score;
	let tops = current.tops;

	if (clearResult.cleared > 0) {
		const nextCombo = combo + 1;
		const points = clearResult.cleared * 12 + comboBonus(nextCombo);
		score += points;
		combo = nextCombo;
		bestCombo = Math.max(bestCombo, combo);
		lines += clearResult.cleared;
		message = `+${points} row clear. Stack combo x${combo}.`;
		banner = comboBannerFor(current.combo, combo) ?? banner;
		flash = 'good';
		newPopups.push(createPopup(nextPopupId, points, Math.floor(STACK_WIDTH / 2)));
		nextPopupId += 1;
	} else {
		combo = 0;
	}

	let currentPiece = nextPiece;

	if (!canPlace(grid, currentPiece)) {
		const delta = -10;
		score += delta;
		combo = 0;
		tops += 1;
		grid = topOutGrid(grid);
		currentPiece = createPiece(nextId);
		nextId += 1;
		message = `${delta} stack overflow. Cleared some headroom.`;
		flash = 'bad';
		newPopups.push(createPopup(nextPopupId, delta, Math.floor(STACK_WIDTH / 2)));
		nextPopupId += 1;
	}

	const log = pushMessage(
		{message: current.message, prevMessage: current.prevMessage},
		message,
	);

	return {
		...current,
		banner,
		bestCombo,
		combo,
		current: currentPiece,
		grid,
		lines,
		message: log.message,
		nextId,
		nextPopupId,
		popups: [...advancePopups(current.popups), ...newPopups],
		prevMessage: log.prevMessage,
		score,
		tops,
		...advanceFlash(current.flash, current.flashTicksLeft, flash),
	};
};

const finishMessage = (score: number): string => {
	if (score < 20) {
		return 'The stack is legally a sculpture now.';
	}

	if (score < 70) {
		return 'Solid stacking. The blocks respect your boundaries.';
	}

	return 'Tiny block wizardry. The terminal made room out of nowhere.';
};

const buildBoard = ({
	current,
	grid,
	popups,
}: {
	current: Piece;
	grid: Grid;
	popups: Popup[];
}): BoardCell[][] => {
	const board = createBoard(STACK_WIDTH, STACK_HEIGHT);

	for (let y = 0; y < STACK_HEIGHT; y += 1) {
		for (let x = 0; x < STACK_WIDTH; x += 1) {
			const cell = grid[y]![x];

			if (cell) {
				paintCell(board, {x, y}, cell.label, cell.color);
			}
		}
	}

	for (const point of absoluteCells(current)) {
		paintCell(board, point, current.label, current.color);
	}

	for (const popup of popups) {
		paintCell(
			board,
			popup,
			popup.text,
			popup.kind === 'good' ? colors.accent : colors.failed,
		);
	}

	return board;
};

export const BitStackGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<StackState>(() => initialState());

	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (normalizedInput === 'q' || key.escape) {
			onExit();
			return;
		}

		if (key.leftArrow || normalizedInput === 'a') {
			setState(current => {
				const moved = movePiece(current.current, -1, 0);
				return canPlace(current.grid, moved) ? {...current, current: moved} : current;
			});
			return;
		}

		if (key.rightArrow || normalizedInput === 'd') {
			setState(current => {
				const moved = movePiece(current.current, 1, 0);
				return canPlace(current.grid, moved) ? {...current, current: moved} : current;
			});
			return;
		}

		if (key.upArrow || normalizedInput === 'w') {
			setState(current => {
				const rotated = rotatePiece(current.current);
				return canPlace(current.grid, rotated)
					? {...current, current: rotated}
					: current;
			});
			return;
		}

		if (key.downArrow || normalizedInput === 's') {
			setState(current => {
				const moved = movePiece(current.current, 0, 1);

				if (!canPlace(current.grid, moved)) {
					return current;
				}

				return {
					...current,
					current: moved,
					score: current.score + 1,
					softDrops: current.softDrops + 1,
				};
			});
		}
	});

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
				const moved = movePiece(current.current, 0, 1);

				if (canPlace(current.grid, moved)) {
					return {
						...current,
						banner: advanceBanner(current.banner),
						current: moved,
						elapsedMs,
						popups: advancePopups(current.popups),
						...advanceFlash(current.flash, current.flashTicksLeft, null),
					};
				}

				return {...settleCurrentPiece(current), elapsedMs};
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
				{label: 'Rows', value: state.lines},
				{label: 'Soft drops', value: state.softDrops},
				{label: 'Overflows', value: state.tops},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.lines,
			state.score,
			state.softDrops,
			state.tops,
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
				current: state.current,
				grid: state.grid,
				popups: state.popups,
			}),
		[state.current, state.grid, state.popups],
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
				{label: 'Rows', value: state.lines},
				{label: 'Drops', value: state.softDrops},
				{label: 'Tops', value: state.tops},
			]}
			title={definition.name}
		/>
	);
};

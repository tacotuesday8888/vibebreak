import {useEffect, useMemo, useRef} from 'react';
import {useInput} from 'ink';
import type {BoardCell} from '../components/GameShell.js';
import type {GameResult, InkColor} from '../types.js';
import {colors} from '../utils/theme.js';

export const BOARD_WIDTH = 18;
export const BOARD_HEIGHT = 12;
export const PLAYER_ROW = BOARD_HEIGHT - 1;

export const PLAYER_SPRITE = '<o>';
export const PLAYER_SPRITE_HIT = '>x<';
export const POPUP_TICKS_TO_LIVE = 3;
export const POPUP_START_Y = PLAYER_ROW - 1;

export type FlashKind = 'bad' | 'good' | null;

export type FallingItem<TKind extends string> = {
	id: number;
	kind: TKind;
	label: string;
	x: number;
	y: number;
};

export type Point = {
	x: number;
	y: number;
};

export type Direction = 'down' | 'left' | 'right' | 'up';

const DIRECTION_DELTAS: Record<Direction, Point> = {
	down: {x: 0, y: 1},
	left: {x: -1, y: 0},
	right: {x: 1, y: 0},
	up: {x: 0, y: -1},
};

export const pointKey = (point: Point): string => `${point.x},${point.y}`;

export const samePoint = (first: Point, second: Point): boolean =>
	first.x === second.x && first.y === second.y;

export const isInsideBoard = (
	point: Point,
	width = BOARD_WIDTH,
	height = BOARD_HEIGHT,
): boolean =>
	point.x >= 0 && point.x < width && point.y >= 0 && point.y < height;

export const movePoint = (point: Point, direction: Direction): Point => {
	const delta = DIRECTION_DELTAS[direction];
	return {x: point.x + delta.x, y: point.y + delta.y};
};

export const oppositeDirection = (direction: Direction): Direction => {
	if (direction === 'up') {
		return 'down';
	}

	if (direction === 'down') {
		return 'up';
	}

	if (direction === 'left') {
		return 'right';
	}

	return 'left';
};

export const createBoard = (width = BOARD_WIDTH, height = BOARD_HEIGHT): BoardCell[][] =>
	Array.from({length: height}, () =>
		Array.from({length: width}, () => ({label: ' '})),
	);

export const paintCell = (
	board: BoardCell[][],
	point: Point,
	label: string,
	color?: BoardCell['color'],
): void => {
	if (!isInsideBoard(point, board[0]?.length ?? 0, board.length)) {
		return;
	}

	board[point.y]![point.x] = {color, label};
};

export const randomOpenPoint = (
	width: number,
	height: number,
	blocked: Set<string>,
	fallback: Point,
): Point => {
	const open: Point[] = [];

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const point = {x, y};

			if (!blocked.has(pointKey(point))) {
				open.push(point);
			}
		}
	}

	if (open.length === 0) {
		return fallback;
	}

	return open[Math.floor(Math.random() * open.length)]!;
};

export type PopupKind = 'bad' | 'good';

export type Popup = {
	id: number;
	kind: PopupKind;
	text: string;
	ticksLeft: number;
	x: number;
	y: number;
};

export const formatPopupText = (delta: number): string => {
	const sign = delta >= 0 ? '+' : '-';
	const magnitude = Math.min(Math.abs(delta), 99);
	return `${sign}${magnitude}`.padEnd(3, ' ').slice(0, 3);
};

export const createPopup = (
	id: number,
	delta: number,
	x: number,
	kind: PopupKind = delta >= 0 ? 'good' : 'bad',
	y: number = POPUP_START_Y,
): Popup => ({
	id,
	kind,
	text: formatPopupText(delta),
	ticksLeft: POPUP_TICKS_TO_LIVE,
	x,
	y,
});

export const advancePopups = (popups: Popup[]): Popup[] =>
	popups
		.map(popup => ({
			...popup,
			ticksLeft: popup.ticksLeft - 1,
			y: popup.y - 1,
		}))
		.filter(popup => popup.ticksLeft > 0 && popup.y >= 0);

export const popupColor = (kind: PopupKind): InkColor =>
	kind === 'good' ? colors.accent : colors.failed;

export const advanceFlash = (
	currentFlash: FlashKind,
	currentTicksLeft: number,
	newFlash: FlashKind,
): {flash: FlashKind; flashTicksLeft: number} => {
	if (newFlash !== null) {
		return {flash: newFlash, flashTicksLeft: 2};
	}

	const next = Math.max(0, currentTicksLeft - 1);

	if (next === 0) {
		return {flash: null, flashTicksLeft: 0};
	}

	return {flash: currentFlash, flashTicksLeft: next};
};

export const playerSpriteFor = (flash: FlashKind): string =>
	flash === 'bad' ? PLAYER_SPRITE_HIT : PLAYER_SPRITE;

export const playerColorFor = (flash: FlashKind): InkColor => {
	if (flash === 'bad') {
		return colors.failed;
	}

	if (flash === 'good') {
		return colors.accent;
	}

	return colors.text;
};

export const useDirectionalControls = (
	onDirection: (direction: Direction) => void,
	onExit: () => void,
	onAction?: () => void,
) => {
	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (normalizedInput === 'q' || key.escape) {
			onExit();
			return;
		}

		if (key.upArrow || normalizedInput === 'w') {
			onDirection('up');
			return;
		}

		if (key.downArrow || normalizedInput === 's') {
			onDirection('down');
			return;
		}

		if (key.leftArrow || normalizedInput === 'a') {
			onDirection('left');
			return;
		}

		if (key.rightArrow || normalizedInput === 'd') {
			onDirection('right');
			return;
		}

		if ((normalizedInput === ' ' || key.return) && onAction) {
			onAction();
		}
	});
};

// Shake on the very first tick of a bad flash; advanceFlash sets ticksLeft to
// 2 when a new flash starts, so that uniquely identifies the moment of impact.
export const shouldShake = (flash: FlashKind, flashTicksLeft: number): boolean =>
	flash === 'bad' && flashTicksLeft === 2;

export type Banner = {
	color: InkColor;
	text: string;
	ticksLeft: number;
};

const BANNER_TICKS_TO_LIVE = 6;

const COMBO_BANNERS: Array<{
	color: InkColor;
	text: string;
	threshold: number;
}> = [
	{color: colors.brandAlt, text: 'TIDY!', threshold: 3},
	{color: colors.brand, text: 'CRISP!', threshold: 6},
	{color: colors.accent, text: 'VIBE WAVE!', threshold: 10},
];

export const comboBannerFor = (
	previousCombo: number,
	nextCombo: number,
): Banner | null => {
	// Walk thresholds high-to-low so a single tick can only emit the highest
	// banner it just unlocked, not all of them.
	for (let index = COMBO_BANNERS.length - 1; index >= 0; index -= 1) {
		const tier = COMBO_BANNERS[index]!;

		if (previousCombo < tier.threshold && nextCombo >= tier.threshold) {
			return {
				color: tier.color,
				text: tier.text,
				ticksLeft: BANNER_TICKS_TO_LIVE,
			};
		}
	}

	return null;
};

export const advanceBanner = (banner: Banner | null): Banner | null => {
	if (!banner) {
		return null;
	}

	const ticksLeft = banner.ticksLeft - 1;

	if (ticksLeft <= 0) {
		return null;
	}

	return {...banner, ticksLeft};
};

export type MessageLog = {
	message: string;
	prevMessage: string;
};

export const pushMessage = (
	current: MessageLog,
	newMessage: string,
): MessageLog => {
	if (newMessage === current.message) {
		return current;
	}

	return {message: newMessage, prevMessage: current.message};
};

export const useHorizontalControls = (
	onMoveLeft: () => void,
	onMoveRight: () => void,
	onExit: () => void,
) => {
	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (normalizedInput === 'q' || key.escape) {
			onExit();
			return;
		}

		if (key.leftArrow || normalizedInput === 'a') {
			onMoveLeft();
			return;
		}

		if (key.rightArrow || normalizedInput === 'd') {
			onMoveRight();
		}
	});
};

export const useFinishOnce = (
	shouldFinish: boolean,
	result: GameResult,
	onFinish: (result: GameResult) => void,
) => {
	const hasFinishedRef = useRef(false);

	useEffect(() => {
		if (!shouldFinish || hasFinishedRef.current) {
			return;
		}

		hasFinishedRef.current = true;
		onFinish(result);
	}, [onFinish, result, shouldFinish]);
};

export const useBoard = <TItem extends FallingItem<string>>({
	itemColor,
	items,
	playerColor = colors.text,
	playerLabel = PLAYER_SPRITE,
	playerX,
	popups = [],
}: {
	itemColor: (item: TItem) => BoardCell['color'];
	items: TItem[];
	playerColor?: BoardCell['color'];
	playerLabel?: string;
	playerX: number;
	popups?: Popup[];
}): BoardCell[][] =>
	useMemo(() => {
		const board = createBoard();

		for (const item of items) {
			if (
				item.y >= 0 &&
				item.y < BOARD_HEIGHT &&
				item.x >= 0 &&
				item.x < BOARD_WIDTH
			) {
				board[item.y]![item.x] = {
					color: itemColor(item),
					label: item.label,
				};
			}
		}

		board[PLAYER_ROW]![playerX] = {color: playerColor, label: playerLabel};

		// Popups paint on top so the score change always reads.
		for (const popup of popups) {
			if (
				popup.y >= 0 &&
				popup.y < BOARD_HEIGHT &&
				popup.x >= 0 &&
				popup.x < BOARD_WIDTH
			) {
				board[popup.y]![popup.x] = {
					color: popupColor(popup.kind),
					label: popup.text,
				};
			}
		}

		return board;
	}, [itemColor, items, playerColor, playerLabel, playerX, popups]);

export const moveLeft = (position: number): number => Math.max(0, position - 1);

export const moveRight = (position: number): number =>
	Math.min(BOARD_WIDTH - 1, position + 1);

export const comboBonus = (combo: number): number =>
	Math.min(8, Math.floor(combo / 3));

export const pacingLevel = (
	durationSeconds: number,
	elapsedMs: number,
): number => {
	const durationMs = durationSeconds * 1000;
	const progress = durationMs === 0 ? 1 : elapsedMs / durationMs;

	return Math.min(3, Math.floor(progress * 4));
};

export const spawnEveryTicks = (
	baseInterval: number,
	durationSeconds: number,
	elapsedMs: number,
): number => Math.max(1, baseInterval - pacingLevel(durationSeconds, elapsedMs));

export const timeLeftSeconds = (
	durationSeconds: number,
	elapsedMs: number,
): number => Math.max(0, Math.ceil(durationSeconds - elapsedMs / 1000));

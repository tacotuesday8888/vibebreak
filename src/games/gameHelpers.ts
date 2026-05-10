import {useEffect, useMemo, useRef} from 'react';
import {useInput} from 'ink';
import type {BoardCell} from '../components/GameShell.js';
import type {GameResult} from '../types.js';

export const BOARD_WIDTH = 18;
export const BOARD_HEIGHT = 12;
export const PLAYER_ROW = BOARD_HEIGHT - 1;

export type FallingItem<TKind extends string> = {
	id: number;
	kind: TKind;
	label: string;
	x: number;
	y: number;
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
	playerX,
	playerLabel = '>',
}: {
	itemColor: (item: TItem) => BoardCell['color'];
	items: TItem[];
	playerLabel?: string;
	playerX: number;
}): BoardCell[][] =>
	useMemo(() => {
		const board: BoardCell[][] = Array.from({length: BOARD_HEIGHT}, () =>
			Array.from({length: BOARD_WIDTH}, () => ({label: ' '})),
		);

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

		board[PLAYER_ROW]![playerX] = {color: 'white', label: playerLabel};

		return board;
	}, [itemColor, items, playerLabel, playerX]);

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

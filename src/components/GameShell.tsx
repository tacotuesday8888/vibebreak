import {Box, Text} from 'ink';
import type {InkColor} from '../types.js';

export type BoardCell = {
	color?: InkColor;
	label: string;
};

type GameShellProps = {
	accent: InkColor;
	bestScore?: number;
	board: BoardCell[][];
	controls: string;
	durationSeconds: number;
	elapsedMs: number;
	flash?: 'bad' | 'good' | null;
	message: string;
	score: number;
	status: Array<{
		label: string;
		value: string | number;
	}>;
	title: string;
};

const CELL_WIDTH = 3;
const PROGRESS_WIDTH = 24;

const formatCell = (label: string): string => {
	if (label === '🐛' || label === '☕') {
		return `${label} `;
	}

	return label.padEnd(3, ' ').slice(0, 3);
};

const borderColor = (
	flash: GameShellProps['flash'],
	accent: InkColor,
): InkColor => {
	if (flash === 'bad') {
		return 'red';
	}

	if (flash === 'good') {
		return 'yellow';
	}

	return accent;
};

const progressBar = (elapsedMs: number, durationSeconds: number): string => {
	const durationMs = durationSeconds * 1000;
	const progress = durationMs === 0 ? 1 : Math.min(1, elapsedMs / durationMs);
	const filled = Math.round(progress * PROGRESS_WIDTH);

	return `${'█'.repeat(filled)}${'░'.repeat(PROGRESS_WIDTH - filled)}`;
};

const vibeLabel = (flash: GameShellProps['flash']): string => {
	if (flash === 'bad') {
		return 'bonk';
	}

	if (flash === 'good') {
		return 'spark';
	}

	return 'steady';
};

export const createEmptyBoard = (width: number, height: number): BoardCell[][] =>
	Array.from({length: height}, () =>
		Array.from({length: width}, () => ({label: ' '})),
	);

export const GameShell = ({
	accent,
	bestScore,
	board,
	controls,
	durationSeconds,
	elapsedMs,
	flash = null,
	message,
	score,
	status,
	title,
}: GameShellProps) => {
	const rowWidth = (board[0]?.length ?? 0) * CELL_WIDTH;
	const divider = '─'.repeat(rowWidth + 2);
	const rows = board.map(row => row.map(cell => formatCell(cell.label)).join(''));
	const currentBorderColor = borderColor(flash, accent);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color={accent}>
					✦ VIBEBREAK // {title}
				</Text>
				<Text>
					Score <Text bold>{score}</Text>
					{bestScore === undefined ? '' : `  Best ${bestScore}`}
					{'  '}
					{status.map(item => `${item.label} ${item.value}`).join('  ')}
				</Text>
				<Text color={accent}>
					[{progressBar(elapsedMs, durationSeconds)}] vibe:{' '}
					{vibeLabel(flash)}
				</Text>
			</Box>

			<Box flexDirection="column">
				<Text color={currentBorderColor}>╭{divider}╮</Text>
				{rows.map((row, rowIndex) => (
					<Text key={rowIndex} color={currentBorderColor}>
						│ <Text color="white">{row}</Text> │
					</Text>
				))}
				<Text color={currentBorderColor}>╰{divider}╯</Text>
			</Box>

			<Box flexDirection="column">
				<Text
					bold={flash !== null}
					color={flash === 'bad' ? 'red' : flash === 'good' ? 'yellow' : accent}
				>
					{flash === 'bad' ? '!! ' : flash === 'good' ? '++ ' : '·  '}
					{message}
				</Text>
				<Text dimColor>{controls}</Text>
			</Box>
		</Box>
	);
};

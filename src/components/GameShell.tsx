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
	flash?: 'bad' | 'good' | null;
	message: string;
	score: number;
	status: Array<{
		label: string;
		value: string | number;
	}>;
	title: string;
};

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

export const createEmptyBoard = (width: number, height: number): BoardCell[][] =>
	Array.from({length: height}, () =>
		Array.from({length: width}, () => ({label: ' '})),
	);

export const GameShell = ({
	accent,
	bestScore,
	board,
	controls,
	flash = null,
	message,
	score,
	status,
	title,
}: GameShellProps) => (
	<Box flexDirection="column" gap={1}>
		<Box flexDirection="column">
			<Text bold color={accent}>
				✦ {title}
			</Text>
			<Text>
				Score: <Text bold>{score}</Text>
				{bestScore === undefined ? '' : `  Best: ${bestScore}`}
				{'  '}
				{status.map(item => `${item.label}: ${item.value}`).join('  ')}
			</Text>
		</Box>

		<Box
			borderColor={borderColor(flash, accent)}
			borderStyle="round"
			flexDirection="column"
		>
			{board.map((row, rowIndex) => (
				<Text key={rowIndex}>
					{row.map((cell, cellIndex) => (
						<Text key={cellIndex} color={cell.color}>
							{formatCell(cell.label)}
						</Text>
					))}
				</Text>
			))}
		</Box>

		<Box flexDirection="column">
			<Text color={flash === 'bad' ? 'red' : flash === 'good' ? 'yellow' : accent}>
				{message}
			</Text>
			<Text dimColor>{controls}</Text>
		</Box>
	</Box>
);

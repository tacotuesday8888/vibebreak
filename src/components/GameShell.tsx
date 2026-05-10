import {Box, Text} from 'ink';
import type {InkColor} from '../types.js';
import {colors} from '../utils/theme.js';

export type BoardCell = {
	color?: InkColor;
	label: string;
};

type ShellBanner = {
	color: InkColor;
	text: string;
};

type GameShellProps = {
	accent: InkColor;
	banner?: ShellBanner | null;
	bestScore?: number;
	board: BoardCell[][];
	combo: number;
	controls: string;
	durationSeconds: number;
	elapsedMs: number;
	flash?: 'bad' | 'good' | null;
	message: string;
	objective: string;
	prevMessage?: string;
	score: number;
	shake?: boolean;
	status: Array<{
		label: string;
		value: string | number;
	}>;
	title: string;
};

const CELL_WIDTH = 3;
const PROGRESS_WIDTH = 24;
const COMBO_BAR_WIDTH = 16;

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
		return colors.failed;
	}

	if (flash === 'good') {
		return colors.accent;
	}

	return accent;
};

const fillBar = (filled: number, width: number): string => {
	const safeFilled = Math.max(0, Math.min(width, filled));
	return `${'█'.repeat(safeFilled)}${'░'.repeat(width - safeFilled)}`;
};

const progressBar = (elapsedMs: number, durationSeconds: number): string => {
	const durationMs = durationSeconds * 1000;
	const progress = durationMs === 0 ? 1 : Math.min(1, elapsedMs / durationMs);
	return fillBar(Math.round(progress * PROGRESS_WIDTH), PROGRESS_WIDTH);
};

const comboColor = (combo: number): InkColor => {
	if (combo >= 6) {
		return colors.brand;
	}

	if (combo >= 3) {
		return colors.brandAlt;
	}

	return colors.text;
};

const timeColor = (remainingMs: number, durationMs: number): InkColor => {
	if (remainingMs <= 5000) {
		return colors.failed;
	}

	if (durationMs > 0 && remainingMs / durationMs <= 0.34) {
		return colors.accent;
	}

	return colors.saved;
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

const ComboMeter = ({combo}: {combo: number}) => {
	const color = comboColor(combo);
	const isMaxed = combo >= 9;
	const isLow = combo > 0 && combo < 3;
	const fill = Math.round((Math.min(combo, 9) / 9) * COMBO_BAR_WIDTH);
	const labelText = isMaxed ? `x${combo} ★` : `x${combo}`;

	return (
		<Text>
			<Text dimColor>Combo </Text>
			<Text bold={isMaxed} color={color} dimColor={isLow}>
				{labelText}
			</Text>{' '}
			<Text color={color} dimColor={isLow}>
				[{fillBar(fill, COMBO_BAR_WIDTH)}]
			</Text>
		</Text>
	);
};

const TimeBar = ({
	durationSeconds,
	elapsedMs,
	flash,
}: Pick<GameShellProps, 'durationSeconds' | 'elapsedMs' | 'flash'>) => {
	const durationMs = durationSeconds * 1000;
	const remainingMs = Math.max(0, durationMs - elapsedMs);
	const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
	const color = timeColor(remainingMs, durationMs);
	const isCritical = remainingMs > 0 && remainingMs <= 5000;
	const blinkDim = isCritical && Math.floor(elapsedMs / 500) % 2 === 1;

	return (
		<Text>
			<Text dimColor>Time </Text>
			<Text color={color}>
				{remainingSec}s
			</Text>{' '}
			<Text color={color} dimColor={blinkDim}>
				[{progressBar(elapsedMs, durationSeconds)}]
			</Text>{' '}
			<Text dimColor>vibe: {vibeLabel(flash)}</Text>
		</Text>
	);
};

const StatChip = ({
	accent,
	label,
	value,
}: {
	accent: InkColor;
	label: string;
	value: string | number;
}) => (
	<Text>
		<Text color={accent}>[</Text>
		<Text dimColor>{label} </Text>
		<Text bold>{value}</Text>
		<Text color={accent}>]</Text>
	</Text>
);

const renderBannerTopBorder = (
	dividerWidth: number,
	banner: ShellBanner | null | undefined,
): {color: InkColor; text: string} | null => {
	if (!banner) {
		return null;
	}

	const label = ` ✦ ${banner.text} ✦ `;

	if (label.length >= dividerWidth - 2) {
		return null;
	}

	const leftPad = Math.floor((dividerWidth - label.length) / 2);
	const rightPad = dividerWidth - label.length - leftPad;
	const text = `╭${'─'.repeat(leftPad)}${label}${'─'.repeat(rightPad)}╮`;

	return {color: banner.color, text};
};

export const GameShell = ({
	accent,
	banner = null,
	bestScore,
	board,
	combo,
	controls,
	durationSeconds,
	elapsedMs,
	flash = null,
	message,
	objective,
	prevMessage,
	score,
	shake = false,
	status,
	title,
}: GameShellProps) => {
	const rowWidth = (board[0]?.length ?? 0) * CELL_WIDTH;
	const divider = '─'.repeat(rowWidth + 2);
	const currentBorderColor = borderColor(flash, accent);
	const bannerBorder = renderBannerTopBorder(divider.length, banner);
	const shakeIndent = shake ? ' ' : '';

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color={accent}>
					✦ VIBEBREAK // {title}
				</Text>
				<Text dimColor>{objective}</Text>
				<Text>
					<StatChip accent={accent} label="Score" value={score} />
					{bestScore === undefined ? null : (
						<>
							{'  '}
							<StatChip accent={accent} label="Best" value={bestScore} />
						</>
					)}
					{status.map(item => (
						<Text key={item.label}>
							{'  '}
							<StatChip
								accent={accent}
								label={item.label}
								value={item.value}
							/>
						</Text>
					))}
				</Text>
				<ComboMeter combo={combo} />
				<TimeBar
					durationSeconds={durationSeconds}
					elapsedMs={elapsedMs}
					flash={flash}
				/>
			</Box>

			<Box flexDirection="column">
				{bannerBorder ? (
					<Text bold color={bannerBorder.color}>
						{shakeIndent}
						{bannerBorder.text}
					</Text>
				) : (
					<Text color={currentBorderColor}>
						{shakeIndent}╭{divider}╮
					</Text>
				)}
				{board.map((row, rowIndex) => (
					<Text key={rowIndex} color={currentBorderColor}>
						{`${shakeIndent}│ `}
						{row.map((cell, cellIndex) => {
							if (cell.label === ' ') {
								return (
									<Text key={cellIndex} dimColor>
										{' · '}
									</Text>
								);
							}

							return (
								<Text key={cellIndex} color={cell.color ?? colors.text}>
									{formatCell(cell.label)}
								</Text>
							);
						})}
						{' │'}
					</Text>
				))}
				<Text color={currentBorderColor}>
					{shakeIndent}╰{divider}╯
				</Text>
			</Box>

			<Box flexDirection="column">
				<Text
					bold={flash !== null}
					color={
						flash === 'bad'
							? colors.failed
							: flash === 'good'
								? colors.accent
								: accent
					}
				>
					{flash === 'bad' ? '!! ' : flash === 'good' ? '++ ' : '·  '}
					{message}
				</Text>
				{prevMessage ? <Text dimColor>·  {prevMessage}</Text> : null}
				<Text dimColor>{controls}</Text>
			</Box>
		</Box>
	);
};

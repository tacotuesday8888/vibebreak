import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import type {InkColor} from '../types.js';
import {colors} from '../utils/theme.js';
import {VERSION} from '../utils/version.js';

type LogoProps = {
	dailyGameName: string;
};

const WORDMARK = [
	'██╗   ██╗██╗██████╗ ███████╗██████╗ ██████╗ ███████╗ █████╗ ██╗  ██╗',
	'██║   ██║██║██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██║ ██╔╝',
	'██║   ██║██║██████╔╝█████╗  ██████╔╝██████╔╝█████╗  ███████║█████╔╝ ',
	'╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██╔══██╗██╔══██╗██╔══╝  ██╔══██║██╔═██╗ ',
	' ╚████╔╝ ██║██████╔╝███████╗██████╔╝██║  ██║███████╗██║  ██║██║  ██╗',
	'  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝',
];

type RowStyle = {
	bold?: boolean;
	color: InkColor;
	dim?: boolean;
};

const WORDMARK_STYLES: RowStyle[] = [
	{color: colors.brandAlt},
	{color: colors.brandAlt},
	{bold: true, color: colors.brandAlt},
	{bold: true, color: colors.brand},
	{color: colors.brand},
	{color: colors.brand, dim: true},
];

type PetFrame = {
	headline: string;
	rows: string[];
};

const PET_FRAMES: PetFrame[] = [
	{
		headline: 'vibe pet, idle',
		rows: [' /\\_/\\ ', '( ◕‿◕ )', ' > ^ < '],
	},
	{
		headline: 'vibe pet, blink',
		rows: [' /\\_/\\ ', '( -‿- )', ' > ^ < '],
	},
	{
		headline: 'vibe pet, sparkle',
		rows: [' /\\_/\\✦', '( ◕‿◕ )', ' > ^ < '],
	},
	{
		headline: 'vibe pet, happy',
		rows: [' /\\_/\\ ', '( ◡‿◡ )', ' > ^ < '],
	},
];

const PET_FRAME_MS = 1000;

const usePetFrame = (): PetFrame => {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setIndex(current => (current + 1) % PET_FRAMES.length);
		}, PET_FRAME_MS);

		return () => {
			clearInterval(id);
		};
	}, []);

	return PET_FRAMES[index] ?? PET_FRAMES[0]!;
};

export const Logo = ({dailyGameName}: LogoProps) => {
	const pet = usePetFrame();

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				{WORDMARK.map((line, index) => {
					const style = WORDMARK_STYLES[index] ?? {color: colors.brandAlt};
					return (
						<Text
							key={index}
							bold={style.bold}
							color={style.color}
							dimColor={style.dim}
						>
							{line}
						</Text>
					);
				})}
			</Box>

			<Box flexDirection="column">
				<Text>
					<Text bold color={colors.accent}>
						tiny chaos arcade
					</Text>
					<Text dimColor>{'  ✦  '}</Text>
					<Text color={colors.brand}>{`v${VERSION}`}</Text>
				</Text>
				<Text dimColor>take a 45-second break, then back to coding.</Text>
			</Box>

			<Box gap={3}>
				<Box flexDirection="column">
					{pet.rows.map((row, index) => (
						<Text key={index} color={colors.accent}>
							{row}
						</Text>
					))}
				</Box>

				<Box flexDirection="column">
					<Text color={colors.brandAlt}>✦ today's break</Text>
					<Text bold>{dailyGameName}</Text>
					<Text dimColor>45 seconds · local high scores</Text>
				</Box>
			</Box>
		</Box>
	);
};

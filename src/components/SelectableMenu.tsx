import {useState} from 'react';
import type {ReactNode} from 'react';
import {Box, Text, useInput} from 'ink';
import type {InkColor} from '../types.js';
import {colors} from '../utils/theme.js';

export type MenuOption = {
	description?: string | string[];
	icon?: string;
	label: string;
	onSelect: () => void;
};

type SelectableMenuProps = {
	accent?: InkColor;
	footer?: string;
	header?: ReactNode;
	onCancel?: () => void;
	options: MenuOption[];
	subtitle?: string;
	title: string;
};

const BAR_PADDING = 4;

const optionLabelText = (option: MenuOption, index: number): string => {
	const iconSegment = option.icon ? `${option.icon} ` : '';
	return `${index + 1}. ${iconSegment}${option.label}`;
};

export const SelectableMenu = ({
	accent = colors.brandAlt,
	footer,
	header,
	onCancel,
	options,
	subtitle,
	title,
}: SelectableMenuProps) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.upArrow || normalizedInput === 'w') {
			setSelectedIndex(index => (index + options.length - 1) % options.length);
			return;
		}

		if (key.downArrow || normalizedInput === 's') {
			setSelectedIndex(index => (index + 1) % options.length);
			return;
		}

		const numericChoice = Number.parseInt(normalizedInput, 10);

		if (
			Number.isInteger(numericChoice) &&
			numericChoice >= 1 &&
			numericChoice <= options.length
		) {
			options[numericChoice - 1]?.onSelect();
			return;
		}

		if ((normalizedInput === 'q' || key.escape) && onCancel) {
			onCancel();
			return;
		}

		if (key.return) {
			options[selectedIndex]?.onSelect();
		}
	});

	const longestLabel = options.reduce(
		(max, option, index) => Math.max(max, optionLabelText(option, index).length),
		0,
	);
	const barInnerWidth = longestLabel + BAR_PADDING;

	return (
		<Box flexDirection="column" gap={1}>
			{header ?? (
				<Box flexDirection="column">
					<Text bold color={accent}>
						╭─ {title}
					</Text>
					{subtitle ? <Text color={accent}>╰─ {subtitle}</Text> : null}
				</Box>
			)}

			<Box flexDirection="column">
				{options.map((option, index) => {
					const isSelected = index === selectedIndex;
					const labelText = optionLabelText(option, index);
					const paddedLabel = labelText.padEnd(barInnerWidth, ' ');

					return (
						<Box key={option.label} flexDirection="column">
							{isSelected ? (
								<Text backgroundColor={accent} bold color="black">
									{` ▸ ${paddedLabel}  `}
								</Text>
							) : (
								<Text>{`   ${paddedLabel}  `}</Text>
							)}
							{option.description
								? (Array.isArray(option.description)
										? option.description
										: [option.description]
									).map((line, lineIndex) => (
										<Text key={lineIndex} dimColor>
											{`     ${line}`}
										</Text>
									))
								: null}
						</Box>
					);
				})}
			</Box>

			<Text dimColor>
				{footer ?? 'Use arrows or W/S, Enter to choose, Q to go back.'}
			</Text>
		</Box>
	);
};

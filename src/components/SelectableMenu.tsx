import {useState} from 'react';
import type {ReactNode} from 'react';
import {Box, Text, useInput} from 'ink';
import type {InkColor} from '../types.js';

export type MenuOption = {
	description?: string;
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

export const SelectableMenu = ({
	accent = 'cyan',
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

					return (
						<Box key={option.label} flexDirection="column">
							<Text bold={isSelected} color={isSelected ? accent : undefined}>
								{isSelected ? '› ' : '  '}
								{index + 1}. {option.icon ? `${option.icon} ` : ''}
								{option.label}
							</Text>
							{option.description ? (
								<Text dimColor>     {option.description}</Text>
							) : null}
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

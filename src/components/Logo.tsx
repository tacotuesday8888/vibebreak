import {Box, Text} from 'ink';

type LogoProps = {
	dailyGameName: string;
};

export const Logo = ({dailyGameName}: LogoProps) => (
	<Box flexDirection="column">
		<Text bold color="magenta">
			✦ vibebreak ✦
		</Text>
		<Text color="cyan">
			<Text bold>{'>_'}</Text> tiny chaos arcade ☕
		</Text>
		<Text color="yellow">today's break: {dailyGameName}</Text>
	</Box>
);

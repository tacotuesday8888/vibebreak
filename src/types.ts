import type {ReactNode} from 'react';

export type GameId =
	| 'bit-stack'
	| 'commit-catch'
	| 'dodge'
	| 'flap-fix'
	| 'maze-munch'
	| 'snake-bytes'
	| 'stack-sprint';

export type InkColor =
	| 'blue'
	| 'cyan'
	| 'green'
	| 'magenta'
	| 'red'
	| 'white'
	| 'yellow';

export type GameMode = 'daily' | 'selected' | 'direct';

export type ScoreEntry = {
	gameId: GameId;
	gameName: string;
	mode: GameMode;
	playedAt: string;
	score: number;
};

export type ScoreWriteResult = {
	error?: string;
	saved: boolean;
	scores: ScoreEntry[];
};

export type GameResult = {
	gameId: GameId;
	gameName: string;
	message: string;
	score: number;
	stats: Array<{
		label: string;
		value: string | number;
	}>;
};

export type GameComponentProps = {
	bestScore?: number;
	definition: GameDefinition;
	onExit: () => void;
	onFinish: (result: GameResult) => void;
};

export type GameDefinition = {
	accent: InkColor;
	component: (props: GameComponentProps) => ReactNode;
	controls: string;
	description: string;
	durationSeconds: number;
	id: GameId;
	icon: string;
	name: string;
	objective: string;
};

export type AppCommand =
	| {kind: 'menu'}
	| {kind: 'daily'}
	| {gameId: GameId; kind: 'play'}
	| {kind: 'scores'};

export type AgentTool = 'claude' | 'codex';

export type AgentBreakMode = 'both' | 'end' | 'off' | 'start';

export type AgentOptions = {
	breakMode: AgentBreakMode;
	thresholdMinutes: number;
};

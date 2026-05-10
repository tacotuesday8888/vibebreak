import {useCallback, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {getBestScore, getScoresPath, readScores, recordScore, sortScores} from '../utils/scores.js';
import {formatDateTime} from '../utils/format.js';
import {getDailyGame} from '../utils/daily.js';
import {getGameById, games} from '../games/registry.js';
import type {
	AppCommand,
	GameDefinition,
	GameId,
	GameMode,
	GameResult,
	InkColor,
	ScoreEntry,
	ScoreWriteResult,
} from '../types.js';
import {colors} from '../utils/theme.js';
import {Logo} from './Logo.js';
import {SelectableMenu} from './SelectableMenu.js';

type Screen =
	| {name: 'choose'}
	| {
			name: 'finished';
			priorBest: number | undefined;
			result: GameResult;
			scoreWrite: ScoreWriteResult;
	  }
	| {gameId: GameId; mode: GameMode; name: 'playing'; returnTo: ReturnTarget}
	| {name: 'menu'}
	| {name: 'scores'};

type AppProps = {
	initialCommand?: AppCommand;
};

type ReturnTarget = 'exit' | 'menu';

const initialScreenFromCommand = (command: AppCommand): Screen => {
	if (command.kind === 'daily') {
		return {
			gameId: getDailyGame(games).id,
			mode: 'daily',
			name: 'playing',
			returnTo: 'exit',
		};
	}

	if (command.kind === 'play') {
		return {
			gameId: command.gameId,
			mode: 'direct',
			name: 'playing',
			returnTo: 'exit',
		};
	}

	if (command.kind === 'scores') {
		return {name: 'scores'};
	}

	return {name: 'menu'};
};

const MainMenu = ({
	dailyGame,
	onChooseGame,
	onQuit,
	onScores,
	onStartDaily,
}: {
	dailyGame: GameDefinition;
	onChooseGame: () => void;
	onQuit: () => void;
	onScores: () => void;
	onStartDaily: () => void;
}) => (
	<SelectableMenu
		accent={colors.brand}
		footer="Use arrows or W/S, Enter to choose, Q to quit."
		header={<Logo dailyGameName={dailyGame.name} />}
		onCancel={onQuit}
		options={[
			{
				description: `Today: ${dailyGame.icon} ${dailyGame.name} · ${dailyGame.objective}`,
				icon: dailyGame.icon,
				label: "Play Today's Break",
				onSelect: onStartDaily,
			},
			{
				description: 'Pick from the cozy chaos arcade.',
				icon: '▣',
				label: 'Choose Game',
				onSelect: onChooseGame,
			},
			{
				description: 'Local best scores from this machine.',
				icon: '★',
				label: 'High Scores',
				onSelect: onScores,
			},
			{icon: '×', label: 'Quit', onSelect: onQuit},
		]}
		subtitle="Tiny games for when your brain needs a stretch."
		title="Vibebreak ✦ cozy chaos arcade"
	/>
);

const ChooseGameScreen = ({
	onBack,
	onPlay,
}: {
	onBack: () => void;
	onPlay: (gameId: GameId) => void;
}) => (
	<SelectableMenu
		accent="cyan"
		onCancel={onBack}
		options={games.map(game => ({
			description: [
				game.description,
				game.controls.replace(/\s*·\s*Q back\s*$/, ''),
			],
			icon: game.icon,
			label: game.name,
			onSelect: () => {
				onPlay(game.id);
			},
		}))}
		subtitle="Each round is short, local, and mildly ridiculous."
		title="Choose Game"
	/>
);

const ScoresScreen = ({
	onBack,
	scores,
}: {
	onBack: () => void;
	scores: ScoreEntry[];
}) => {
	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.return || key.escape || normalizedInput === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color={colors.accent}>
					╭─ High Scores
				</Text>
				<Text color={colors.accent}>╰─ Top 5 per game on this machine.</Text>
				<Text dimColor>{getScoresPath()}</Text>
			</Box>

			{games.map(game => {
				const topScores = sortScores(
					scores.filter(score => score.gameId === game.id),
				).slice(0, 5);

				return (
					<Box key={game.id} flexDirection="column">
						<Text bold color={game.accent}>
							{game.name}
						</Text>
						{topScores.length === 0 ? (
							<Text dimColor>  No scores yet.</Text>
						) : (
							topScores.map((score, index) => (
								<Text key={`${score.playedAt}-${index}`}>
									<Text dimColor>
										{String(index + 1).padStart(2, ' ')}.{' '}
									</Text>
									<Text bold>{String(score.score).padStart(4)}</Text>
									<Text dimColor>
										{`  · ${score.mode} · ${formatDateTime(score.playedAt)}`}
									</Text>
								</Text>
							))
						)}
					</Box>
				);
			})}

			<Text dimColor>Press Enter or Q to return.</Text>
		</Box>
	);
};

const SCORECARD_INNER_WIDTH = 36;

const padToInner = (visibleLength: number): string =>
	' '.repeat(Math.max(0, SCORECARD_INNER_WIDTH - visibleLength));

const computeStars = (score: number, priorBest: number | undefined): number => {
	if (score < 0) {
		return 1;
	}

	if (priorBest === undefined || priorBest <= 0) {
		if (score >= 60) {
			return 5;
		}

		if (score >= 35) {
			return 4;
		}

		if (score >= 18) {
			return 3;
		}

		if (score >= 5) {
			return 2;
		}

		return 1;
	}

	if (score > priorBest) {
		return 5;
	}

	const ratio = score / priorBest;

	if (ratio >= 0.9) {
		return 4;
	}

	if (ratio >= 0.7) {
		return 3;
	}

	if (ratio >= 0.5) {
		return 2;
	}

	return 1;
};

const renderStars = (stars: number): string =>
	'★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));

const FinalScreen = ({
	onMenu,
	onQuit,
	onRestart,
	onScores,
	priorBest,
	result,
	scoreWrite,
}: {
	onMenu: () => void;
	onQuit: () => void;
	onRestart: () => void;
	onScores: () => void;
	priorBest: number | undefined;
	result: GameResult;
	scoreWrite: ScoreWriteResult;
}) => {
	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.return || normalizedInput === 'r') {
			onRestart();
			return;
		}

		if (normalizedInput === 'm') {
			onMenu();
			return;
		}

		if (normalizedInput === 's') {
			onScores();
			return;
		}

		if (normalizedInput === 'q' || key.escape) {
			onQuit();
		}
	});

	const game = getGameById(result.gameId);
	const accent: InkColor = game?.accent ?? 'magenta';
	const stars = computeStars(result.score, priorBest);
	const starsText = renderStars(stars);
	const isNewBest =
		priorBest === undefined ? result.score > 0 : result.score > priorBest;
	const divider = '─'.repeat(SCORECARD_INNER_WIDTH + 2);
	const gameNamePad = padToInner(result.gameName.length);
	const scoreStr = String(result.score).padStart(4);
	const bestStr =
		priorBest === undefined ? null : String(priorBest).padStart(4);
	const scoreLineVisible =
		bestStr === null
			? `Score ${scoreStr}`
			: `Score ${scoreStr}  Best ${bestStr}`;
	const scoreLinePad = padToInner(scoreLineVisible.length);
	const starsPad = padToInner(starsText.length);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				{isNewBest ? (
					<Text bold color={colors.accent}>
						✦ new best
					</Text>
				) : null}
				<Text bold color={colors.brand}>
					Break complete ✦
				</Text>
			</Box>

			<Box flexDirection="column">
				<Text color={accent}>╭{divider}╮</Text>
				<Text color={accent}>
					{'│ '}
					<Text bold color="white">
						{result.gameName}
					</Text>
					{gameNamePad}
					{' │'}
				</Text>
				<Text color={accent}>
					{'│ '}
					<Text dimColor>Score </Text>
					<Text bold color="white">
						{scoreStr}
					</Text>
					{bestStr === null ? null : (
						<>
							<Text dimColor>{'  Best '}</Text>
							<Text color="white">{bestStr}</Text>
						</>
					)}
					{scoreLinePad}
					{' │'}
				</Text>
				<Text color={accent}>
					{'│ '}
					<Text bold color={colors.accent}>
						{starsText}
					</Text>
					{starsPad}
					{' │'}
				</Text>
				{result.stats.map(stat => {
					const valueStr = String(stat.value).padStart(4);
					const text = `${stat.label} ${valueStr}`;
					const pad = padToInner(text.length);
					return (
						<Text key={stat.label} color={accent}>
							{'│ '}
							<Text dimColor>{stat.label} </Text>
							<Text color="white">{valueStr}</Text>
							{pad}
							{' │'}
						</Text>
					);
				})}
				<Text color={accent}>╰{divider}╯</Text>
			</Box>

			<Text color={colors.accent}>{result.message}</Text>

			<Box flexDirection="column">
				<Text color={scoreWrite.saved ? colors.saved : colors.failed}>
					{scoreWrite.saved
						? 'Saved to local high scores.'
						: 'Could not save locally; keeping this score for the session.'}
				</Text>
				{scoreWrite.error ? <Text dimColor>{scoreWrite.error}</Text> : null}
			</Box>

			<Text dimColor>
				Enter/R replay · M menu · S scores · Q quit
			</Text>
		</Box>
	);
};

export const App = ({initialCommand = {kind: 'menu'}}: AppProps) => {
	const {exit} = useApp();
	const [initialScreen] = useState<Screen>(() =>
		initialScreenFromCommand(initialCommand),
	);
	const [scores, setScores] = useState<ScoreEntry[]>(() => readScores());
	const [screen, setScreen] = useState<Screen>(() => initialScreen);
	const [lastGame, setLastGame] = useState<{
		gameId: GameId;
		mode: GameMode;
		returnTo: ReturnTarget;
	} | null>(() =>
		initialScreen.name === 'playing'
			? {
					gameId: initialScreen.gameId,
					mode: initialScreen.mode,
					returnTo: initialScreen.returnTo,
			  }
			: null,
	);
	const dailyGame = useMemo(() => getDailyGame(games), []);

	const startGame = useCallback(
		(gameId: GameId, mode: GameMode, returnTo: ReturnTarget = 'menu') => {
			setLastGame({gameId, mode, returnTo});
			setScreen({gameId, mode, name: 'playing', returnTo});
		},
		[],
	);

	const finishGame = useCallback(
		(result: GameResult) => {
			const mode = lastGame?.mode ?? 'selected';
			const priorBest = getBestScore(scores, result.gameId);
			const scoreWrite = recordScore({
				gameId: result.gameId,
				gameName: result.gameName,
				mode,
				playedAt: new Date().toISOString(),
				score: result.score,
			});

			setScores(scoreWrite.scores);
			setScreen({name: 'finished', priorBest, result, scoreWrite});
		},
		[lastGame?.mode, scores],
	);

	if (screen.name === 'playing') {
		const game = getGameById(screen.gameId) ?? dailyGame;
		const GameComponent = game.component;

		return (
			<GameComponent
				bestScore={getBestScore(scores, game.id)}
				definition={game}
				onExit={() => {
					if (screen.returnTo === 'exit') {
						exit();
						return;
					}

					setScreen({name: 'menu'});
				}}
				onFinish={finishGame}
			/>
		);
	}

	if (screen.name === 'choose') {
		return (
			<ChooseGameScreen
				onBack={() => {
					setScreen({name: 'menu'});
				}}
				onPlay={gameId => {
					startGame(gameId, 'selected');
				}}
			/>
		);
	}

	if (screen.name === 'scores') {
		return (
			<ScoresScreen
				onBack={() => {
					if (initialCommand.kind === 'scores') {
						exit();
						return;
					}

					setScreen({name: 'menu'});
				}}
				scores={scores}
			/>
		);
	}

	if (screen.name === 'finished') {
		return (
			<FinalScreen
				onMenu={() => {
					setScreen({name: 'menu'});
				}}
				onQuit={exit}
				onRestart={() => {
					if (lastGame) {
						startGame(lastGame.gameId, lastGame.mode, lastGame.returnTo);
					}
				}}
				onScores={() => {
					setScreen({name: 'scores'});
				}}
				priorBest={screen.priorBest}
				result={screen.result}
				scoreWrite={screen.scoreWrite}
			/>
		);
	}

	return (
		<MainMenu
			dailyGame={dailyGame}
			onChooseGame={() => {
				setScreen({name: 'choose'});
			}}
			onQuit={exit}
			onScores={() => {
				setScreen({name: 'scores'});
			}}
			onStartDaily={() => {
				startGame(dailyGame.id, 'daily');
			}}
		/>
	);
};

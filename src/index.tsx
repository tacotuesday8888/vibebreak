#!/usr/bin/env node

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, render, useApp, useInput} from 'ink';

const GAME_WIDTH = 24;
const GAME_HEIGHT = 11;
const PLAYER_ROW = GAME_HEIGHT - 1;
const GAME_DURATION_MS = 60_000;
const TICK_MS = 250;
const BUG_SPAWN_EVERY_TICKS = 3;

type Screen = 'menu' | 'playing' | 'finished';

type Bug = {
	id: number;
	x: number;
	y: number;
};

type GameState = {
	bugs: Bug[];
	dodges: number;
	elapsedMs: number;
	hits: number;
	nextBugId: number;
	playerX: number;
	score: number;
	tick: number;
};

const createInitialGameState = (): GameState => ({
	bugs: [],
	dodges: 0,
	elapsedMs: 0,
	hits: 0,
	nextBugId: 1,
	playerX: Math.floor(GAME_WIDTH / 2),
	score: 0,
	tick: 0,
});

const funnyMessage = (score: number): string => {
	if (score < 0) {
		return 'The bugs formed a tiny union and filed a complaint.';
	}

	if (score < 10) {
		return 'You survived with the grace of a loose shopping cart.';
	}

	if (score < 25) {
		return 'Respectable dodging. The bugs are mildly annoyed.';
	}

	return 'Certified vibe guardian. The bugs are requesting a rematch.';
};

const Menu = ({
	onQuit,
	onStart,
}: {
	onQuit: () => void;
	onStart: () => void;
}) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const options = useMemo(
		() => [
			{label: 'Dodge the Bugs', action: onStart},
			{label: 'Quit', action: onQuit},
		],
		[onQuit, onStart],
	);

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

		if (normalizedInput === '1') {
			onStart();
			return;
		}

		if (normalizedInput === '2' || normalizedInput === 'q') {
			onQuit();
			return;
		}

		if (key.return) {
			options[selectedIndex]?.action();
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color="cyan">
					vibebreak
				</Text>
				<Text>Take a 60-second bug-dodging break.</Text>
			</Box>

			<Box flexDirection="column">
				{options.map((option, index) => (
					<Text
						key={option.label}
						color={selectedIndex === index ? 'green' : undefined}
					>
						{selectedIndex === index ? '> ' : '  '}
						{index + 1}. {option.label}
					</Text>
				))}
			</Box>

			<Text dimColor>Use arrows or W/S, then Enter. Press Q to quit.</Text>
		</Box>
	);
};

const Game = ({onFinish}: {onFinish: (score: number) => void}) => {
	const [game, setGame] = useState<GameState>(() => createInitialGameState());
	const hasFinishedRef = useRef(false);

	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.leftArrow || normalizedInput === 'a') {
			setGame(current => ({
				...current,
				playerX: Math.max(0, current.playerX - 1),
			}));
			return;
		}

		if (key.rightArrow || normalizedInput === 'd') {
			setGame(current => ({
				...current,
				playerX: Math.min(GAME_WIDTH - 1, current.playerX + 1),
			}));
		}
	});

	useEffect(() => {
		const timer = setInterval(() => {
			setGame(current => {
				if (current.elapsedMs >= GAME_DURATION_MS) {
					return current;
				}

				const nextElapsedMs = Math.min(
					current.elapsedMs + TICK_MS,
					GAME_DURATION_MS,
				);
				const nextTick = current.tick + 1;
				let nextScore = current.score;
				let nextDodges = current.dodges;
				let nextHits = current.hits;
				const bugs: Bug[] = [];

				for (const bug of current.bugs) {
					const movedBug = {...bug, y: bug.y + 1};

					if (movedBug.y === PLAYER_ROW && movedBug.x === current.playerX) {
						nextScore -= 5;
						nextHits += 1;
						continue;
					}

					if (movedBug.y > PLAYER_ROW) {
						nextScore += 1;
						nextDodges += 1;
						continue;
					}

					bugs.push(movedBug);
				}

				let nextBugId = current.nextBugId;

				if (nextElapsedMs < GAME_DURATION_MS && nextTick % BUG_SPAWN_EVERY_TICKS === 0) {
					bugs.push({
						id: nextBugId,
						x: Math.floor(Math.random() * GAME_WIDTH),
						y: 0,
					});
					nextBugId += 1;
				}

				return {
					...current,
					bugs,
					dodges: nextDodges,
					elapsedMs: nextElapsedMs,
					hits: nextHits,
					nextBugId,
					score: nextScore,
					tick: nextTick,
				};
			});
		}, TICK_MS);

		return () => {
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		if (game.elapsedMs < GAME_DURATION_MS || hasFinishedRef.current) {
			return;
		}

		hasFinishedRef.current = true;
		onFinish(game.score);
	}, [game.elapsedMs, game.score, onFinish]);

	const rows = useMemo(() => {
		const bugsByPosition = new Set(game.bugs.map(bug => `${bug.x}:${bug.y}`));

		return Array.from({length: GAME_HEIGHT}, (_, y) =>
			Array.from({length: GAME_WIDTH}, (_, x) => {
				if (y === PLAYER_ROW && x === game.playerX) {
					return '> ';
				}

				if (bugsByPosition.has(`${x}:${y}`)) {
					return '🐛';
				}

				return '  ';
			}).join(''),
		);
	}, [game.bugs, game.playerX]);

	const timeLeft = Math.ceil((GAME_DURATION_MS - game.elapsedMs) / 1000);

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color="cyan">
				Dodge the Bugs
			</Text>

			<Box flexDirection="column">
				<Text>
					Time: {timeLeft}s  Score: {game.score}  Dodged: {game.dodges}  Hits:{' '}
					{game.hits}
				</Text>
				<Text dimColor>Move with A/D or left/right arrows.</Text>
			</Box>

			<Box borderStyle="round" borderColor="green" flexDirection="column">
				{rows.map((row, index) => (
					<Text key={index}>{row}</Text>
				))}
			</Box>
		</Box>
	);
};

const FinalScore = ({
	onQuit,
	onRestart,
	score,
}: {
	onQuit: () => void;
	onRestart: () => void;
	score: number;
}) => {
	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.return || normalizedInput === 'r') {
			onRestart();
			return;
		}

		if (normalizedInput === 'q' || key.escape) {
			onQuit();
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color="cyan">
				Time!
			</Text>
			<Text>
				Final score: <Text bold>{score}</Text>
			</Text>
			<Text color="yellow">{funnyMessage(score)}</Text>
			<Text dimColor>Press Enter to play again, R to restart, or Q to quit.</Text>
		</Box>
	);
};

const App = () => {
	const {exit} = useApp();
	const [screen, setScreen] = useState<Screen>('menu');
	const [finalScore, setFinalScore] = useState(0);

	const startGame = useCallback(() => {
		setScreen('playing');
	}, []);

	const finishGame = useCallback((score: number) => {
		setFinalScore(score);
		setScreen('finished');
	}, []);

	if (screen === 'playing') {
		return <Game onFinish={finishGame} />;
	}

	if (screen === 'finished') {
		return (
			<FinalScore onQuit={exit} onRestart={startGame} score={finalScore} />
		);
	}

	return <Menu onQuit={exit} onStart={startGame} />;
};

render(<App />);

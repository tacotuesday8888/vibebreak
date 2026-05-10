import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_WIDTH,
	FallingItem,
	PLAYER_ROW,
	comboBonus,
	moveLeft,
	moveRight,
	spawnEveryTicks,
	timeLeftSeconds,
	useBoard,
	useFinishOnce,
	useHorizontalControls,
} from './gameHelpers.js';

const TICK_MS = 170;
const SPAWN_EVERY_TICKS = 2;

type CommitItem = FallingItem<'bad' | 'good'> & {
	points: number;
};

type CommitState = {
	bestCombo: number;
	catches: number;
	combo: number;
	elapsedMs: number;
	flash: 'bad' | 'good' | null;
	items: CommitItem[];
	message: string;
	misses: number;
	nextId: number;
	playerX: number;
	score: number;
	tick: number;
};

const goodItems = [
	{label: '✓', points: 4},
	{label: '+', points: 3},
	{label: '☕', points: 5},
];

const badItems = [
	{label: '🐛', points: -6},
	{label: '!', points: -4},
];

const initialState = (): CommitState => ({
	catches: 0,
	bestCombo: 0,
	combo: 0,
	elapsedMs: 0,
	flash: null,
	items: [],
	message: 'Catch useful commits. Avoid chaos with legs.',
	misses: 0,
	nextId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
	score: 0,
	tick: 0,
});

const createItem = (id: number): CommitItem => {
	const isGood = Math.random() > 0.34;
	const source = isGood ? goodItems : badItems;
	const item = source[Math.floor(Math.random() * source.length)]!;

	return {
		id,
		kind: isGood ? 'good' : 'bad',
		label: item.label,
		points: item.points,
		x: Math.floor(Math.random() * BOARD_WIDTH),
		y: 0,
	};
};

const finishMessage = (score: number): string => {
	if (score < 15) {
		return 'Your branch compiles emotionally, which is still something.';
	}

	if (score < 45) {
		return 'Solid commit energy. The diff is wearing a tiny cardigan.';
	}

	return 'Beautiful history. Even the merge conflicts applauded politely.';
};

export const CommitCatchGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<CommitState>(() => initialState());

	useHorizontalControls(
		() => {
			setState(current => ({...current, playerX: moveLeft(current.playerX)}));
		},
		() => {
			setState(current => ({...current, playerX: moveRight(current.playerX)}));
		},
		onExit,
	);

	useEffect(() => {
		const timer = setInterval(() => {
			setState(current => {
				if (current.elapsedMs >= definition.durationSeconds * 1000) {
					return current;
				}

				const elapsedMs = Math.min(
					current.elapsedMs + TICK_MS,
					definition.durationSeconds * 1000,
				);
				const tick = current.tick + 1;
				const items: CommitItem[] = [];
				let bestCombo = current.bestCombo;
				let catches = current.catches;
				let combo = current.combo;
				let misses = current.misses;
				let score = current.score;
				let message = current.message;
				let flash: CommitState['flash'] = null;

				for (const item of current.items) {
					const movedItem = {...item, y: item.y + 1};

					if (movedItem.y === PLAYER_ROW && movedItem.x === current.playerX) {
						score += movedItem.points;

						if (movedItem.kind === 'good') {
							combo += 1;
							bestCombo = Math.max(bestCombo, combo);
							const bonus = comboBonus(combo);
							score += bonus;
							catches += 1;
							message =
								bonus > 0
									? `+${movedItem.points + bonus} caught ${movedItem.label}. Combo x${combo}.`
									: `+${movedItem.points} caught ${movedItem.label}. Ship it gently.`;
							flash = 'good';
						} else {
							combo = 0;
							misses += 1;
							message = `${movedItem.points} caught ${movedItem.label}. Oops, spicy diff.`;
							flash = 'bad';
						}

						continue;
					}

					if (movedItem.y > PLAYER_ROW) {
						if (movedItem.kind === 'good') {
							score -= 1;
							combo = 0;
							misses += 1;
							message = '-1 useful thing drifted away. Combo took a nap.';
							flash = 'bad';
						}

						continue;
					}

					items.push(movedItem);
				}

				let nextId = current.nextId;

				if (
					elapsedMs < definition.durationSeconds * 1000 &&
					tick %
						spawnEveryTicks(
							SPAWN_EVERY_TICKS,
							definition.durationSeconds,
							elapsedMs,
						) ===
						0
				) {
					items.push(createItem(nextId));
					nextId += 1;
				}

				return {
					bestCombo,
					catches,
					combo,
					elapsedMs,
					flash,
					items,
					message,
					misses,
					nextId,
					playerX: current.playerX,
					score,
					tick,
				};
			});
		}, TICK_MS);

		return () => {
			clearInterval(timer);
		};
	}, [definition.durationSeconds]);

	const result: GameResult = useMemo(
		() => ({
			gameId: definition.id,
			gameName: definition.name,
			message: finishMessage(state.score),
			score: state.score,
			stats: [
				{label: 'Caught', value: state.catches},
				{label: 'Oops', value: state.misses},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.catches,
			state.misses,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const itemColor = useCallback(
		(item: CommitItem): InkColor => (item.kind === 'good' ? 'cyan' : 'red'),
		[],
	);
	const board = useBoard({itemColor, items: state.items, playerX: state.playerX});

	return (
		<GameShell
			accent={definition.accent}
			bestScore={bestScore}
			board={board}
			controls={definition.controls}
			durationSeconds={definition.durationSeconds}
			elapsedMs={state.elapsedMs}
			flash={state.flash}
			message={state.message}
			score={state.score}
			status={[
				{label: 'Time', value: `${timeLeftSeconds(definition.durationSeconds, state.elapsedMs)}s`},
				{label: 'Combo', value: `x${state.combo}`},
				{label: 'Caught', value: state.catches},
				{label: 'Oops', value: state.misses},
			]}
			title={definition.name}
		/>
	);
};

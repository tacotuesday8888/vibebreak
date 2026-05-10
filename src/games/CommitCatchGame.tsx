import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_WIDTH,
	Banner,
	FallingItem,
	FlashKind,
	PLAYER_ROW,
	Popup,
	advanceBanner,
	advanceFlash,
	advancePopups,
	comboBannerFor,
	comboBonus,
	createPopup,
	moveLeft,
	moveRight,
	playerColorFor,
	playerSpriteFor,
	pushMessage,
	shouldShake,
	spawnEveryTicks,
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
	banner: Banner | null;
	bestCombo: number;
	catches: number;
	combo: number;
	elapsedMs: number;
	flash: FlashKind;
	flashTicksLeft: number;
	items: CommitItem[];
	message: string;
	misses: number;
	nextId: number;
	nextPopupId: number;
	playerX: number;
	popups: Popup[];
	prevMessage: string;
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
	banner: null,
	catches: 0,
	bestCombo: 0,
	combo: 0,
	elapsedMs: 0,
	flash: null,
	flashTicksLeft: 0,
	items: [],
	message: 'Catch useful commits. Avoid chaos with legs.',
	misses: 0,
	nextId: 1,
	nextPopupId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
	popups: [],
	prevMessage: '',
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
				const newPopups: Popup[] = [];
				let nextPopupId = current.nextPopupId;
				let bestCombo = current.bestCombo;
				let catches = current.catches;
				let combo = current.combo;
				let misses = current.misses;
				let score = current.score;
				let message = current.message;
				let newFlash: FlashKind = null;

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
							const totalDelta = movedItem.points + bonus;
							message =
								bonus > 0
									? `+${totalDelta} caught ${movedItem.label}. Combo x${combo}.`
									: `+${movedItem.points} caught ${movedItem.label}. Ship it gently.`;
							newFlash = 'good';
							newPopups.push(
								createPopup(nextPopupId, totalDelta, current.playerX),
							);
							nextPopupId += 1;
						} else {
							combo = 0;
							misses += 1;
							message = `${movedItem.points} caught ${movedItem.label}. Oops, spicy diff.`;
							newFlash = 'bad';
							newPopups.push(
								createPopup(nextPopupId, movedItem.points, current.playerX),
							);
							nextPopupId += 1;
						}

						continue;
					}

					if (movedItem.y > PLAYER_ROW) {
						if (movedItem.kind === 'good') {
							score -= 1;
							combo = 0;
							misses += 1;
							message = '-1 useful thing drifted away. Combo took a nap.';
							newFlash = 'bad';
							newPopups.push(createPopup(nextPopupId, -1, movedItem.x));
							nextPopupId += 1;
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

				const popups = [...advancePopups(current.popups), ...newPopups];
				const {flash, flashTicksLeft} = advanceFlash(
					current.flash,
					current.flashTicksLeft,
					newFlash,
				);
				const banner =
					comboBannerFor(current.combo, combo) ?? advanceBanner(current.banner);
				const log = pushMessage(
					{message: current.message, prevMessage: current.prevMessage},
					message,
				);

				return {
					banner,
					bestCombo,
					catches,
					combo,
					elapsedMs,
					flash,
					flashTicksLeft,
					items,
					message: log.message,
					misses,
					nextId,
					nextPopupId,
					playerX: current.playerX,
					popups,
					prevMessage: log.prevMessage,
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
	const board = useBoard({
		itemColor,
		items: state.items,
		playerColor: playerColorFor(state.flash),
		playerLabel: playerSpriteFor(state.flash),
		playerX: state.playerX,
		popups: state.popups,
	});

	return (
		<GameShell
			accent={definition.accent}
			banner={state.banner}
			bestScore={bestScore}
			board={board}
			combo={state.combo}
			controls={definition.controls}
			durationSeconds={definition.durationSeconds}
			elapsedMs={state.elapsedMs}
			flash={state.flash}
			message={state.message}
			prevMessage={state.prevMessage}
			score={state.score}
			shake={shouldShake(state.flash, state.flashTicksLeft)}
			status={[
				{label: 'Caught', value: state.catches},
				{label: 'Oops', value: state.misses},
			]}
			title={definition.name}
		/>
	);
};

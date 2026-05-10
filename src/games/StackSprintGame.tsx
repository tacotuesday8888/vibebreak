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

const TICK_MS = 160;
const SPAWN_EVERY_TICKS = 2;

type StackItem = FallingItem<'err' | 'fix'>;

type StackState = {
	banner: Banner | null;
	bestCombo: number;
	combo: number;
	elapsedMs: number;
	errors: number;
	fixes: number;
	flash: FlashKind;
	flashTicksLeft: number;
	items: StackItem[];
	message: string;
	nextId: number;
	nextPopupId: number;
	playerX: number;
	popups: Popup[];
	prevMessage: string;
	score: number;
	tick: number;
};

const initialState = (): StackState => ({
	banner: null,
	bestCombo: 0,
	combo: 0,
	elapsedMs: 0,
	errors: 0,
	fixes: 0,
	flash: null,
	flashTicksLeft: 0,
	items: [],
	message: 'Grab FIX. Let ERR fall anywhere else.',
	nextId: 1,
	nextPopupId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
	popups: [],
	prevMessage: '',
	score: 0,
	tick: 0,
});

const createItem = (id: number): StackItem => {
	const isFix = Math.random() > 0.58;

	return {
		id,
		kind: isFix ? 'fix' : 'err',
		label: isFix ? 'FIX' : 'ERR',
		x: Math.floor(Math.random() * BOARD_WIDTH),
		y: 0,
	};
};

const finishMessage = (score: number): string => {
	if (score < 10) {
		return 'The stack trace is still narrating, but you did stretch.';
	}

	if (score < 40) {
		return 'A tidy little debugging jog. Hydration strongly implied.';
	}

	return 'You outran the stack trace and left it a nice note.';
};

export const StackSprintGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<StackState>(() => initialState());

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
				const items: StackItem[] = [];
				const newPopups: Popup[] = [];
				let nextPopupId = current.nextPopupId;
				let bestCombo = current.bestCombo;
				let combo = current.combo;
				let errors = current.errors;
				let fixes = current.fixes;
				let score = current.score;
				let message = current.message;
				let newFlash: FlashKind = null;

				for (const item of current.items) {
					const movedItem = {...item, y: item.y + 1};

					if (movedItem.y === PLAYER_ROW && movedItem.x === current.playerX) {
						if (movedItem.kind === 'fix') {
							combo += 1;
							bestCombo = Math.max(bestCombo, combo);
							const points = 7 + comboBonus(combo);
							score += points;
							fixes += 1;
							message = `+${points} FIX collected. Combo x${combo}.`;
							newFlash = 'good';
							newPopups.push(createPopup(nextPopupId, points, current.playerX));
							nextPopupId += 1;
						} else {
							const delta = -8;
							score += delta;
							combo = 0;
							errors += 1;
							message = '-8 ERR bonk. Combo stack overflowed.';
							newFlash = 'bad';
							newPopups.push(createPopup(nextPopupId, delta, current.playerX));
							nextPopupId += 1;
						}

						continue;
					}

					if (movedItem.y > PLAYER_ROW) {
						if (movedItem.kind === 'fix') {
							score -= 2;
							combo = 0;
							message = '-2 missed FIX. It waved sadly.';
							newFlash = 'bad';
							newPopups.push(createPopup(nextPopupId, -2, movedItem.x));
							nextPopupId += 1;
						} else {
							combo += 1;
							bestCombo = Math.max(bestCombo, combo);
							const points = 1 + comboBonus(combo);
							score += points;
							message = `+${points} ERR avoided. Smooth little sidestep.`;
							newFlash = 'good';
							newPopups.push(createPopup(nextPopupId, points, movedItem.x));
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
					combo,
					elapsedMs,
					errors,
					fixes,
					flash,
					flashTicksLeft,
					items,
					message: log.message,
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
				{label: 'Fixes', value: state.fixes},
				{label: 'ERR hits', value: state.errors},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.errors,
			state.fixes,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const itemColor = useCallback(
		(item: StackItem): InkColor => (item.kind === 'fix' ? 'green' : 'red'),
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
				{label: 'Fixes', value: state.fixes},
				{label: 'ERR hits', value: state.errors},
			]}
			title={definition.name}
		/>
	);
};

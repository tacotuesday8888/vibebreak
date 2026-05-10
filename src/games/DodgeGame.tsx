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

const TICK_MS = 180;
const SPAWN_EVERY_TICKS = 3;

type Bug = FallingItem<'bug'>;

type DodgeState = {
	banner: Banner | null;
	bugs: Bug[];
	combo: number;
	bestCombo: number;
	dodges: number;
	elapsedMs: number;
	flash: FlashKind;
	flashTicksLeft: number;
	hits: number;
	message: string;
	nextId: number;
	nextPopupId: number;
	playerX: number;
	popups: Popup[];
	prevMessage: string;
	score: number;
	tick: number;
};

const initialState = (): DodgeState => ({
	banner: null,
	bugs: [],
	bestCombo: 0,
	combo: 0,
	dodges: 0,
	elapsedMs: 0,
	flash: null,
	flashTicksLeft: 0,
	hits: 0,
	message: 'Float left and right. Bugs are not invited.',
	nextId: 1,
	nextPopupId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
	popups: [],
	prevMessage: '',
	score: 0,
	tick: 0,
});

const finishMessage = (score: number): string => {
	if (score < 0) {
		return 'The bugs held a tiny standup and marked you as blocked.';
	}

	if (score < 20) {
		return 'You dodged with the energy of a sleepy keyboard shortcut.';
	}

	if (score < 45) {
		return 'Clean moves. The bugs are opening a retro about this.';
	}

	return 'Untouchable vibe. The bugs are filing duplicate tickets.';
};

export const DodgeGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<DodgeState>(() => initialState());

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
				const bugs: Bug[] = [];
				const newPopups: Popup[] = [];
				let nextPopupId = current.nextPopupId;
				let score = current.score;
				let hits = current.hits;
				let dodges = current.dodges;
				let combo = current.combo;
				let bestCombo = current.bestCombo;
				let message = current.message;
				let newFlash: FlashKind = null;

				for (const bug of current.bugs) {
					const movedBug = {...bug, y: bug.y + 1};

					if (movedBug.y === PLAYER_ROW && movedBug.x === current.playerX) {
						const delta = -6;
						score += delta;
						hits += 1;
						combo = 0;
						message = '-6 bug hug. Combo composted.';
						newFlash = 'bad';
						newPopups.push(createPopup(nextPopupId, delta, current.playerX));
						nextPopupId += 1;
						continue;
					}

					if (movedBug.y > PLAYER_ROW) {
						const nearMiss = Math.abs(movedBug.x - current.playerX) === 1;
						combo += 1;
						bestCombo = Math.max(bestCombo, combo);
						const bonus = comboBonus(combo);
						const points = nearMiss ? 4 + bonus : 2 + bonus;
						score += points;
						dodges += 1;
						message = nearMiss
							? `+${points} near miss. Cozy but alarming.`
							: `+${points} clean dodge. Combo x${combo}.`;
						newFlash = 'good';
						newPopups.push(createPopup(nextPopupId, points, movedBug.x));
						nextPopupId += 1;
						continue;
					}

					bugs.push(movedBug);
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
					bugs.push({
						id: nextId,
						kind: 'bug',
						label: '🐛',
						x: Math.floor(Math.random() * BOARD_WIDTH),
						y: 0,
					});
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
					bugs,
					combo,
					dodges,
					elapsedMs,
					flash,
					flashTicksLeft,
					hits,
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
				{label: 'Dodged', value: state.dodges},
				{label: 'Hits', value: state.hits},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.dodges,
			state.hits,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const itemColor = useCallback((): InkColor => 'green', []);
	const board = useBoard({
		itemColor,
		items: state.bugs,
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
				{label: 'Dodged', value: state.dodges},
				{label: 'Hits', value: state.hits},
			]}
			title={definition.name}
		/>
	);
};

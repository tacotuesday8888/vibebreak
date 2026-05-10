import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_WIDTH,
	FallingItem,
	PLAYER_ROW,
	moveLeft,
	moveRight,
	timeLeftSeconds,
	useBoard,
	useFinishOnce,
	useHorizontalControls,
} from './gameHelpers.js';

const TICK_MS = 220;
const SPAWN_EVERY_TICKS = 3;

type Bug = FallingItem<'bug'>;

type DodgeState = {
	bugs: Bug[];
	dodges: number;
	elapsedMs: number;
	flash: 'bad' | 'good' | null;
	hits: number;
	message: string;
	nextId: number;
	playerX: number;
	score: number;
	tick: number;
};

const initialState = (): DodgeState => ({
	bugs: [],
	dodges: 0,
	elapsedMs: 0,
	flash: null,
	hits: 0,
	message: 'Float left and right. Bugs are not invited.',
	nextId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
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
				let score = current.score;
				let hits = current.hits;
				let dodges = current.dodges;
				let message = current.message;
				let flash: DodgeState['flash'] = null;

				for (const bug of current.bugs) {
					const movedBug = {...bug, y: bug.y + 1};

					if (movedBug.y === PLAYER_ROW && movedBug.x === current.playerX) {
						score -= 6;
						hits += 1;
						message = '-6 bug hug. Deeply unnecessary.';
						flash = 'bad';
						continue;
					}

					if (movedBug.y > PLAYER_ROW) {
						score += 2;
						dodges += 1;
						message = '+2 clean dodge. The vibe survives.';
						flash = 'good';
						continue;
					}

					bugs.push(movedBug);
				}

				let nextId = current.nextId;

				if (elapsedMs < definition.durationSeconds * 1000 && tick % SPAWN_EVERY_TICKS === 0) {
					bugs.push({
						id: nextId,
						kind: 'bug',
						label: '🐛',
						x: Math.floor(Math.random() * BOARD_WIDTH),
						y: 0,
					});
					nextId += 1;
				}

				return {
					bugs,
					dodges,
					elapsedMs,
					flash,
					hits,
					message,
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
				{label: 'Dodged', value: state.dodges},
				{label: 'Hits', value: state.hits},
			],
		}),
		[definition.id, definition.name, state.dodges, state.hits, state.score],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const itemColor = useCallback((): InkColor => 'green', []);
	const board = useBoard({itemColor, items: state.bugs, playerX: state.playerX});

	return (
		<GameShell
			accent={definition.accent}
			bestScore={bestScore}
			board={board}
			controls={definition.controls}
			flash={state.flash}
			message={state.message}
			score={state.score}
			status={[
				{label: 'Time', value: `${timeLeftSeconds(definition.durationSeconds, state.elapsedMs)}s`},
				{label: 'Dodged', value: state.dodges},
				{label: 'Hits', value: state.hits},
			]}
			title={definition.name}
		/>
	);
};

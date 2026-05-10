import {useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {BoardCell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	Banner,
	Direction,
	FlashKind,
	Point,
	Popup,
	advanceBanner,
	advanceFlash,
	advancePopups,
	comboBannerFor,
	comboBonus,
	createBoard,
	createPopup,
	isInsideBoard,
	movePoint,
	oppositeDirection,
	paintCell,
	pointKey,
	pushMessage,
	randomOpenPoint,
	samePoint,
	shouldShake,
	useDirectionalControls,
	useFinishOnce,
} from './gameHelpers.js';

const TICK_MS = 150;
const START_X = Math.floor(BOARD_WIDTH / 2);
const START_Y = Math.floor(BOARD_HEIGHT / 2);

type Snack = {
	label: '+' | '☕';
	point: Point;
	points: number;
};

type SnakeState = {
	banner: Banner | null;
	bestCombo: number;
	bites: number;
	combo: number;
	crashes: number;
	direction: Direction;
	elapsedMs: number;
	flash: FlashKind;
	flashTicksLeft: number;
	message: string;
	nextDirection: Direction;
	nextPopupId: number;
	popups: Popup[];
	prevMessage: string;
	score: number;
	snack: Snack;
	snake: Point[];
};

const createInitialSnake = (): Point[] => [
	{x: START_X, y: START_Y},
	{x: START_X - 1, y: START_Y},
	{x: START_X - 2, y: START_Y},
];

const createSnack = (snake: Point[]): Snack => {
	const blocked = new Set(snake.map(pointKey));
	const point = randomOpenPoint(BOARD_WIDTH, BOARD_HEIGHT, blocked, {
		x: START_X + 2,
		y: START_Y,
	});
	const isCoffee = Math.random() > 0.72;

	return {
		label: isCoffee ? '☕' : '+',
		point,
		points: isCoffee ? 7 : 4,
	};
};

const initialState = (): SnakeState => {
	const snake = createInitialSnake();

	return {
		banner: null,
		bestCombo: 0,
		bites: 0,
		combo: 0,
		crashes: 0,
		direction: 'right',
		elapsedMs: 0,
		flash: null,
		flashTicksLeft: 0,
		message: 'Steer the command trail. Eat snacks, skip self-owning.',
		nextDirection: 'right',
		nextPopupId: 1,
		popups: [],
		prevMessage: '',
		score: 0,
		snack: createSnack(snake),
		snake,
	};
};

const finishMessage = (score: number): string => {
	if (score < 15) {
		return 'The snake compiled, then immediately questioned its life choices.';
	}

	if (score < 50) {
		return 'Clean little trail. Your terminal looks freshly linted.';
	}

	return 'Byte serpent supremacy. The coffee never stood a chance.';
};

const buildBoard = ({
	popups,
	snack,
	snake,
}: {
	popups: Popup[];
	snack: Snack;
	snake: Point[];
}): BoardCell[][] => {
	const board = createBoard();

	paintCell(board, snack.point, snack.label, snack.label === '☕' ? 'yellow' : 'cyan');

	for (let index = snake.length - 1; index >= 0; index -= 1) {
		const point = snake[index]!;
		paintCell(board, point, index === 0 ? '@' : 'o', index === 0 ? 'green' : 'cyan');
	}

	for (const popup of popups) {
		paintCell(board, popup, popup.text, popup.kind === 'good' ? 'yellow' : 'red');
	}

	return board;
};

export const SnakeBytesGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<SnakeState>(() => initialState());

	useDirectionalControls(
		direction => {
			setState(current => {
				if (oppositeDirection(direction) === current.direction) {
					return current;
				}

				return {...current, nextDirection: direction};
			});
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
				const direction = current.nextDirection;
				const head = current.snake[0]!;
				const nextHead = movePoint(head, direction);
				const tail = current.snake[current.snake.length - 1]!;
				const bodyWithoutTail = current.snake.slice(0, -1);
				const hitsWall = !isInsideBoard(nextHead);
				const hitsSelf = bodyWithoutTail.some(point => samePoint(point, nextHead));
				const newPopups: Popup[] = [];
				let banner = advanceBanner(current.banner);
				let bestCombo = current.bestCombo;
				let bites = current.bites;
				let combo = current.combo;
				let crashes = current.crashes;
				let message = current.message;
				let nextPopupId = current.nextPopupId;
				let newFlash: FlashKind = null;
				let score = current.score;
				let snack = current.snack;
				let snake = current.snake;

				if (hitsWall || hitsSelf) {
					const delta = -8;
					score += delta;
					combo = 0;
					crashes += 1;
					snake = createInitialSnake();
					snack = createSnack(snake);
					message = `${delta} command trail tangled. Fresh prompt, fresh start.`;
					newFlash = 'bad';
					newPopups.push(createPopup(nextPopupId, delta, head.x));
					nextPopupId += 1;
				} else if (samePoint(nextHead, current.snack.point)) {
					const nextCombo = combo + 1;
					const bonus = comboBonus(nextCombo);
					const points = current.snack.points + bonus;
					score += points;
					combo = nextCombo;
					bestCombo = Math.max(bestCombo, combo);
					bites += 1;
					snake = [nextHead, ...current.snake];
					snack = createSnack(snake);
					message =
						bonus > 0
							? `+${points} snack chain. Byte combo x${combo}.`
							: `+${points} snack. Tiny terminal nutrition.`;
					banner = comboBannerFor(current.combo, combo) ?? banner;
					newFlash = 'good';
					newPopups.push(createPopup(nextPopupId, points, nextHead.x));
					nextPopupId += 1;
				} else {
					snake = [nextHead, ...bodyWithoutTail, tail].slice(
						0,
						current.snake.length,
					);
				}

				const popups = [...advancePopups(current.popups), ...newPopups];
				const {flash, flashTicksLeft} = advanceFlash(
					current.flash,
					current.flashTicksLeft,
					newFlash,
				);
				const log = pushMessage(
					{message: current.message, prevMessage: current.prevMessage},
					message,
				);

				return {
					banner,
					bestCombo,
					bites,
					combo,
					crashes,
					direction,
					elapsedMs,
					flash,
					flashTicksLeft,
					message: log.message,
					nextDirection: direction,
					nextPopupId,
					popups,
					prevMessage: log.prevMessage,
					score,
					snack,
					snake,
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
				{label: 'Snacks', value: state.bites},
				{label: 'Tanglings', value: state.crashes},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.bites,
			state.crashes,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const board = useMemo(
		() =>
			buildBoard({
				popups: state.popups,
				snack: state.snack,
				snake: state.snake,
			}),
		[state.popups, state.snack, state.snake],
	);

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
			objective={definition.objective}
			prevMessage={state.prevMessage}
			score={state.score}
			shake={shouldShake(state.flash, state.flashTicksLeft)}
			status={[
				{label: 'Snacks', value: state.bites},
				{label: 'Tanglings', value: state.crashes},
			]}
			title={definition.name}
		/>
	);
};

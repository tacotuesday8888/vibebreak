import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import type {GameId, ScoreEntry, ScoreWriteResult} from '../types.js';

const SCORE_DIR = join(homedir(), '.vibebreak');
const SCORE_PATH = join(SCORE_DIR, 'scores.json');
const SCORE_LIMIT_PER_GAME = 10;

type ScoreFile = {
	scores: ScoreEntry[];
	version: 1;
};

const isScoreEntry = (value: unknown): value is ScoreEntry => {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const entry = value as ScoreEntry;

	return (
		typeof entry.gameId === 'string' &&
		typeof entry.gameName === 'string' &&
		typeof entry.mode === 'string' &&
		typeof entry.playedAt === 'string' &&
		typeof entry.score === 'number'
	);
};

export const getScoresPath = (): string => SCORE_PATH;

export const readScores = (): ScoreEntry[] => {
	try {
		if (!existsSync(SCORE_PATH)) {
			return [];
		}

		const parsed = JSON.parse(readFileSync(SCORE_PATH, 'utf8')) as Partial<ScoreFile>;

		if (!Array.isArray(parsed.scores)) {
			return [];
		}

		return parsed.scores.filter(isScoreEntry);
	} catch {
		return [];
	}
};

export const sortScores = (scores: ScoreEntry[]): ScoreEntry[] =>
	[...scores].sort((first, second) => {
		if (second.score !== first.score) {
			return second.score - first.score;
		}

		return second.playedAt.localeCompare(first.playedAt);
	});

export const trimScores = (scores: ScoreEntry[]): ScoreEntry[] => {
	const byGame = new Map<GameId, ScoreEntry[]>();

	for (const score of sortScores(scores)) {
		const entries = byGame.get(score.gameId) ?? [];

		if (entries.length < SCORE_LIMIT_PER_GAME) {
			entries.push(score);
			byGame.set(score.gameId, entries);
		}
	}

	return [...byGame.values()].flat();
};

export const recordScore = (entry: ScoreEntry): ScoreWriteResult => {
	const scores = trimScores([entry, ...readScores()]);
	const file: ScoreFile = {scores, version: 1};

	try {
		mkdirSync(SCORE_DIR, {recursive: true});
		writeFileSync(SCORE_PATH, `${JSON.stringify(file, null, 2)}\n`, 'utf8');

		return {saved: true, scores};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : 'Unable to save score.',
			saved: false,
			scores,
		};
	}
};

export const getBestScore = (
	scores: ScoreEntry[],
	gameId: GameId,
): number | undefined => {
	const best = sortScores(scores.filter(score => score.gameId === gameId))[0];

	return best?.score;
};

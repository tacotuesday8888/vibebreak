import type {GameDefinition} from '../types.js';

export const getLocalDateKey = (date = new Date()): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
};

const hashString = (value: string): number => {
	let hash = 0;

	for (const character of value) {
		hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	}

	return hash;
};

export const getDailyGame = (
	games: GameDefinition[],
	date = new Date(),
): GameDefinition => {
	const dateKey = getLocalDateKey(date);
	const index = hashString(dateKey) % games.length;

	return games[index]!;
};

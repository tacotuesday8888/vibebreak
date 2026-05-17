import assert from 'node:assert/strict';
import {games} from '../dist/games/registry.js';
import {
	exitStatusFromResult,
	sanitizeCommandOutput,
	startCommandRunner,
} from '../dist/utils/commandRunner.js';
import {getDailyGame, getLocalDateKey} from '../dist/utils/daily.js';
import {parseCliArgs, renderHelp} from '../dist/utils/cli.js';
import {sortScores, trimScores} from '../dist/utils/scores.js';

const expectedGameIds = [
	'dodge',
	'commit-catch',
	'stack-sprint',
	'snake-bytes',
	'flap-fix',
	'maze-munch',
	'bit-stack',
];

assert.deepEqual(
	games.map(game => game.id),
	expectedGameIds,
	'game registry should expose every public game in menu order',
);

assert.equal(new Set(games.map(game => game.id)).size, games.length);

for (const gameId of expectedGameIds) {
	assert.deepEqual(parseCliArgs(['play', gameId]), {gameId, kind: 'play'});
	assert.match(renderHelp(), new RegExp(`\\b${gameId}\\b`));
}

assert.deepEqual(parseCliArgs([]), {kind: 'menu'});
assert.deepEqual(parseCliArgs(['daily']), {kind: 'daily'});
assert.deepEqual(parseCliArgs(['scores']), {kind: 'scores'});
assert.deepEqual(parseCliArgs(['wait', '--', 'npm', 'test']), {
	args: ['test'],
	command: 'npm',
	kind: 'wait',
});
assert.equal(parseCliArgs(['play']).kind, 'help');
assert.equal(parseCliArgs(['play', 'missing']).kind, 'help');
assert.equal(parseCliArgs(['wait']).kind, 'help');
assert.equal(parseCliArgs(['wait', '--']).kind, 'help');
assert.equal(parseCliArgs(['missing']).kind, 'help');
assert.match(renderHelp(), /wait -- <cmd>/);

const dailyDate = new Date(2026, 4, 10);
assert.equal(getLocalDateKey(dailyDate), '2026-05-10');
assert.equal(getDailyGame(games, dailyDate).id, getDailyGame(games, dailyDate).id);
assert.ok(expectedGameIds.includes(getDailyGame(games, dailyDate).id));

const tieScores = sortScores([
	{
		gameId: 'dodge',
		gameName: 'Dodge the Bugs',
		mode: 'direct',
		playedAt: '2026-05-10T10:00:00.000Z',
		score: 10,
	},
	{
		gameId: 'dodge',
		gameName: 'Dodge the Bugs',
		mode: 'direct',
		playedAt: '2026-05-10T11:00:00.000Z',
		score: 10,
	},
]);

assert.equal(tieScores[0].playedAt, '2026-05-10T11:00:00.000Z');

const manyScores = Array.from({length: 12}, (_, index) => ({
	gameId: 'dodge',
	gameName: 'Dodge the Bugs',
	mode: 'direct',
	playedAt: `2026-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
	score: index,
}));
const trimmedScores = trimScores(manyScores);

assert.equal(trimmedScores.length, 10);
assert.deepEqual(
	trimmedScores.map(score => score.score),
	[11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
);

assert.equal(sanitizeCommandOutput('\u001B[31mred\u001B[0m'), 'red');

const successRun = await startCommandRunner({
	args: ['-e', 'console.log("runner ok")'],
	command: process.execPath,
}).result;
assert.equal(exitStatusFromResult(successRun), 0);
assert.ok(successRun.outputLines.some(line => line.text.includes('runner ok')));

const failureRun = await startCommandRunner({
	args: ['-e', 'console.error("runner fail"); process.exit(7)'],
	command: process.execPath,
}).result;
assert.equal(exitStatusFromResult(failureRun), 7);
assert.ok(failureRun.outputLines.some(line => line.text.includes('runner fail')));

const missingRun = await startCommandRunner({
	args: [],
	command:
		process.platform === 'win32'
			? 'definitely-not-a-vibebreak-command'
			: '/definitely/not-a-vibebreak-command',
}).result;
assert.notEqual(exitStatusFromResult(missingRun), 0);

console.log('smoke tests passed');

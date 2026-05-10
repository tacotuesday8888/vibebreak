#!/usr/bin/env node

import {render} from 'ink';
import {runAgentWrapper} from './agent.js';
import {App} from './components/App.js';
import {parseCliArgs, renderHelp} from './utils/cli.js';

const command = parseCliArgs(process.argv.slice(2));

if (command.kind === 'help') {
	if (command.error) {
		console.error(command.error);
		console.error('');
		process.exitCode = 1;
	}

	console.log(renderHelp());
} else if (command.kind === 'agent') {
	process.exitCode = await runAgentWrapper(command.tool, command.args);
} else {
	render(<App initialCommand={command} />);
}

#!/usr/bin/env node

import {render} from 'ink';
import {App} from './components/App.js';
import {WaitMode} from './components/WaitMode.js';
import {
	exitStatusFromResult,
	runCommandPassthrough,
} from './utils/commandRunner.js';
import {parseCliArgs, renderHelp} from './utils/cli.js';

const command = parseCliArgs(process.argv.slice(2));

if (command.kind === 'help') {
	if (command.error) {
		console.error(command.error);
		console.error('');
		process.exitCode = 1;
	}

	console.log(renderHelp());
} else if (command.kind === 'wait') {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		const result = await runCommandPassthrough(command);

		if (result.error) {
			console.error(result.error);
		}

		process.exitCode = exitStatusFromResult(result);
	} else {
		render(
			<WaitMode
				args={command.args}
				command={command.command}
				onExitCode={exitCode => {
					process.exitCode = exitCode;
				}}
			/>,
		);
	}
} else {
	render(<App initialCommand={command} />);
}

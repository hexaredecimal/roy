const { version } = require('node:os');
const { parseArgs } = require('node:util');


const appConfig = {
    name: "rml",
    description: "Functional language compiling to JS. Proud fork of Roy",
    commands: {
        build: {
            description: 'Build the project/file',
            subcommands: {
                exe: { description: 'Build a native executable' },
                stdout: { description: 'Dump the built sources to stdout' },
                stdin: { description: 'Read the source code from stdin' }
            },
            optional: {
                file: { description: 'Run a specific file (optional positional argument)' }
            }
        },
        run: {
            description: 'Run the project/file',
            subcommands: {
                repl: { description: 'Start REPL mode' }
            },
            optional: {
                file: { description: 'Run a specific file (optional positional argument)' }
            }
        },
        version: {
            description: "Displays the version of the app",
            standalone: true
        }
    }
};

function parseCLI(argv = process.argv.slice(2)) {
    if (argv.length === 0) {
        showHelp('root');
        process.exit(0);
    }

    const commands = appConfig.commands;
    const commandNames = Object.keys(commands);
    const state = {};

    for (const name of commandNames) {
        state[name] = { [name]: false, args: [] };
        const subs = commands[name].subcommands || {};
        for (const sub of Object.keys(subs)) {
            state[name][sub] = false;
        }
    }

    const { positionals, values } = parseArgs({
        allowPositionals: true,
        options: buildOptions(commands)
    });

    const mainCommand = positionals[0];
    const subCommand = positionals[1];
    const maybeHelp = positionals[2];

    if (!mainCommand) {
        showHelp('root');
        process.exit(0);
    }

    // Global help
    if (mainCommand === 'help' || values.help) {
        showHelp('root');
        process.exit(0);
    }

    // Command-level help
    if (mainCommand && subCommand === 'help') {
        showHelp(mainCommand);
        process.exit(0);
    }

    // Subcommand-level help
    if (mainCommand && subCommand && maybeHelp === 'help') {
        showHelp(`${mainCommand}:${subCommand}`);
        process.exit(0);
    }

    if (!state[mainCommand]) {
        console.error(`Unknown command: ${mainCommand}`);
        showHelp('root');
        process.exit(1);
    }

    // Mark main command active
    state[mainCommand][mainCommand] = true;

    // Standalone commands
    if (commands[mainCommand].standalone) {
        return state;
    }

    const subcmds = Object.keys(commands[mainCommand].subcommands || {});
    let anySubActive = false;

    for (const sub of subcmds) {
        if (values[sub] || subCommand === sub) {
            state[mainCommand][sub] = true;
            anySubActive = true;
        }
    }

    // Show help if no subcommand provided for non-standalone commands
    if (!anySubActive && !subCommand && Object.keys(values).length === 0) {
        showHelp(mainCommand);
        process.exit(0);
    }

    // Handle dynamic optional args (positional inputs)
    const dynamicArgsStart = anySubActive ? 2 : 1;
    const extraArgs = positionals.slice(dynamicArgsStart);
    if (extraArgs.length > 0) {
        state[mainCommand].args.push(...extraArgs);
    }

    return state;
}

function buildOptions(commands) {
    const opts = {
        help: { type: 'boolean', short: 'h', description: 'Show help message' }
    };
    for (const [cmd, def] of Object.entries(commands)) {
        const sub = def.subcommands || {};
        for (const subName of Object.keys(sub)) {
            opts[subName] = { type: 'boolean' };
        }
    }
    return opts;
}

function showHelp(scope) {
    const commands = appConfig.commands;
    if (scope === 'root') {
        console.log(`Usage: ${appConfig.name} <command>\n`);
        console.log(`${appConfig.description}\n`);
        console.log('Commands:');
        for (const [name, cmd] of Object.entries(commands)) {
            console.log(`  ${name.padEnd(10)} ${cmd.description}`);
        }
        console.log(`\nUse "${appConfig.name} <command> help" for details on a specific command.`);
        return;
    }

    const [commandName, subName] = scope.split(':');
    const command = commands[commandName];
    if (!command) {
        console.error(`Unknown command: ${commandName}`);
        return;
    }

    // Standalone commands: simple usage
    if (command.standalone) {
        console.log(`Usage: ${appConfig.name} ${commandName}\n`);
        console.log(command.description);
        return;
    }

    // Build usage line dynamically
    let usage = `Usage: ${appConfig.name} ${commandName} <subcommand>`;
    if (command.optional && Object.keys(command.optional).length > 0) {
        const optionals = Object.keys(command.optional)
            .map(o => `[${o}]`)
            .join(' ');
        usage += ` ${optionals}`;
    }

    if (!subName) {
        console.log(`${usage}\n`);
        console.log(command.description);

        // Optional args section
        if (command.optional && Object.keys(command.optional).length > 0) {
            console.log('\nOptional:');
            for (const [opt, info] of Object.entries(command.optional)) {
                console.log(`  ${opt.padEnd(10)} ${info.description}`);
            }
        }

        // Subcommands section
        console.log('\nSubcommands:');
        for (const [name, sub] of Object.entries(command.subcommands || {})) {
            console.log(`  ${name.padEnd(10)} ${sub.description}`);
        }

        console.log(`\nUse "${appConfig.name} ${commandName} <subcommand> help" for details on a subcommand.`);
        return;
    }

    const sub = command.subcommands[subName];
    if (sub) {
        console.log(`Usage: ${appConfig.name} ${commandName} ${subName}\n`);
        console.log(sub.description);
    } else {
        console.error(`Unknown subcommand: ${commandName} ${subName}`);
    }
}

module.exports = { parseCLI, showHelp };

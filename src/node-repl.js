var compile = require('./compile').compile,
    lexer = require('./lexer'),
    loadModule = require('./modules').loadModule,
    parser = require('../lib/parser').parser,
    types = require('./types'),
    nodeToType = require('./typeinference').nodeToType,
    _ = require('underscore');

const { parseCLI } = require('./cli');

var getSandbox = function () {
    var sandbox = { require: require, exports: exports };

    var name;
    for (name in global) {
        sandbox[name] = global[name];
    }

    return sandbox;
};

var getFileContents = function (filename) {
    var fs = require('fs'),
        filenames,
        foundFilename;


    filenames = /\..+$/.test(filename) ? // if an extension is specified,
        [filename] :             // don't bother checking others
        _.map(["", ".rml", ".js"], function (ext) {
            return filename + ext;
        });

    foundFilename = _.find(filenames, function (filename) {
        return fs.existsSync(filename);
    });

    if (foundFilename) {
        return fs.readFileSync(foundFilename, 'utf8');
    }
    else {
        throw new Error("File(s) not found: " + filenames.join(", "));
    }
};

var colorLog = function (color) {
    var args = [].slice.call(arguments, 1);

    args[0] = '\u001b[' + color + 'm' + args[0];
    args[args.length - 1] = args[args.length - 1] + '\u001b[0m';

    console.log.apply(console, args);
};

var nodeRepl = function (opts) {
    var readline = require('readline'),
        path = require('path'),
        vm = require('vm');

    var stdout = process.stdout;
    var stdin = process.openStdin();
    var repl = readline.createInterface(stdin, stdout);

    var env = {};
    var sources = {};
    var aliases = {};
    var sandbox = getSandbox();

    var block = [];
    var inBlock = false;

    console.log("RoyML: " + opts.info.description);
    console.log(opts.info.author);
    console.log(":? for help");

    var fs = require('fs');
    var prelude = fs.readFileSync(path.dirname(__dirname) + '/lib/prelude.roy', 'utf8');
    vm.runInNewContext(compile(prelude, env, {}, { nodejs: true }).output, sandbox, 'eval');
    repl.setPrompt('> ');
    repl.on('close', function () {
        stdin.destroy();
    });
    repl.on('line', function (line) {
        var compiled;
        var output;
        var joined;

        var tokens;
        var ast;

        // Check for a "metacommand"
        // e.g. ":q" or ":l test.roy"
        var metacommand = line.replace(/^\s+/, '').split(' ');
        var lastFunction = null;
        try {
            if (!inBlock && /^:/.test(metacommand[0])) {
                compiled = processMeta(metacommand, env, aliases, sources);
            } else if (/(=|->|→|\(|\{|\[|\bthen|\b(match)\s+.+?)\s*$/.test(line)) {
                // A block is starting.
                // E.g.: let, lambda, object, match, etc.
                // Remember that, change the prompt to signify we're in a block,
                // and start keeping track of the lines in this block.
                inBlock = true;
                repl.setPrompt('.... ');
                block.push(line);
            } else if (inBlock && /\S/.test(line)) {
                // We're still in the block.
                block.push(line);
            } else {
                // End of a block.
                // Add the final line to the block, and reset our stuff.
                block.push(line);
                joined = block.join('\n');

                inBlock = false;
                repl.setPrompt('> ');
                block = [];

                // Remember the source if it's a binding
                tokens = lexer.tokenise(joined);
                ast = parser.parse(tokens);

                if (typeof ast.body[0] != 'undefined') {
                    ast.body[0].accept({
                        // Simple bindings.
                        // E.g.: let x = 37
                        visitLet: function (n) {
                            sources[n.name] = n.value;
                        },
                        // Bindings that are actually functions.
                        // E.g.: let f x = 37
                        visitFunction: function (n) {
                            sources[n.name] = n;
                            lastFunction = n.name;
                        }
                    });
                }

                // Just eval it
                compiled = compile(joined, env, aliases, { nodejs: true, filename: ".", run: true });
            }

            if (compiled) {
                output = vm.runInNewContext(compiled.output, sandbox, 'eval');

                if (typeof output != 'undefined') {
                    colorLog(32, (
                        typeof output == 'object'
                            ? JSON.stringify(output) : output
                    ) + " : " + compiled.type);
                }
                lastFunction = null;
            }
        } catch (e) {
            colorLog(31, (e.stack || e.toString()));
            // Reset the block because something wasn't formatted properly.
            block = [];
        }
        repl.prompt();
    });
    repl.prompt();
};

var writeModule = function (env, exported, filename) {
    var fs = require('fs');

    var moduleOutput = _.map(exported, function (v, k) {
        if (v instanceof types.TagType) {
            return 'type ' + v.toString();
        }
        return k + ': ' + v.toString();
    }).join('\n') + '\n';
    fs.writeFile(filename, moduleOutput, 'utf8');
};

var importModule = function (name, env, opts) {
    var addTypesToEnv = function (moduleTypes) {
        _.each(moduleTypes, function (v, k) {
            var dataType = [new types.TagNameType(k)];
            _.each(function () {
                dataType.push(new types.Variable());
            });
            env[k] = new types.TagType(dataType);
        });
    };

    var moduleTypes;
    if (opts.nodejs) {
        // Need to convert to absolute paths for the CLI
        if (opts.run) {
            var path = require("path");
            name = path.resolve(path.dirname(opts.filename), name);
        }

        moduleTypes = loadModule(name, opts);
        addTypesToEnv(moduleTypes.types);
        var variable = name.substr(name.lastIndexOf("/") + 1);
        env[variable] = new types.Variable();
        var props = {};
        _.each(moduleTypes.env, function (v, k) {
            props[k] = nodeToType(v, env, {});
        });
        env[variable] = new types.ObjectType(props);

        console.log("Using sync CommonJS module:", name);

        return variable + " = require(" + JSON.stringify(name) + ")";
    } else {
        moduleTypes = loadModule(name, opts);
        addTypesToEnv(moduleTypes.types);
        _.each(moduleTypes.env, function (v, k) {
            env[k] = nodeToType(v, env, {});
        });

        if (console) console.log("Using browser module:", name);

        return "";
    }
};

var runRoy = function (argv, opts) {
    var fs = require('fs');
    var path = require('path');
    var vm = require('vm');

    var extensions = /\.rml$/;

    var exported;
    var env = {};
    var aliases = {};
    var sandbox = getSandbox();

    _.each(argv, function (filename) {
        var source = getFileContents(filename);
        var rtSources = getFileContents("./runtime/runtime.js");

        exported = {};
        var outputPath = filename.replace(extensions, '.js');
        var SourceMapGenerator = require('source-map').SourceMapGenerator;
        var sourceMap = new SourceMapGenerator({ file: path.basename(outputPath) });

        var compiled = compile(source, env, aliases, {
            nodejs: opts.nodejs,
            filename: filename,
            run: false,
            exported: exported,
            sourceMap: sourceMap
        });


        if (opts.run) {
            vm.runInNewContext(compiled.output, sandbox, 'eval');
        } else {
            let output = `${compiled.output}\n`
            if (output.includes("var main = function")) {
                output += `\nmain();\n`
            }

            opts.exe = !opts.stdout;
            if (opts.stdout) {
                console.log(output);
                return;
            } else if (opts.exe) {
                output = rtSources + "\n\n" + output;
                fs.writeFile(outputPath, output, (err) => {
                    if (err) throw err;
                })
                const proc = require("child_process")
                const cmd = (cmd) => proc.execSync(cmd, { encoding: 'utf-8' });

                var binaryPath = filename.replace(extensions, '');
                cmd(`qjsc -o ${binaryPath} ${outputPath}`)
                try {
                    fs.unlinkSync(output);
                } catch (_) {
                    // ignore if file doesn't exist
                }
            }
        }
    });
};



var processFlags = function (argv, opts) {

    const state = parseCLI();

    if (state.version.version) {
        console.log("RoyML: " + opts.info.description);
        console.log(opts.info.version);
        return
    }

    if (state.build.stdin) {
        var source = '';
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', function (data) {
            source += data;
        });
        process.stdin.on('end', function () {
            console.log(compile(source, null, null, opts).output);
        });
        return;
    }

    if (state.build.args.length > 0) {
        runRoy(state.build.args, state.build);
        return;
    }


    if (state.run.repl) {
        nodeRepl(opts);
        return;
    }

    if (state.run.args.length > 0) {
        runRoy(state.run.args, { run: true });
    }
};

var processMeta = function (commands, env, aliases, sources) {
    var compiled,
        prettyPrint = require('./prettyprint').prettyPrint,
        source;

    switch (commands[0]) {
        case ":q":
            // Exit
            process.exit();
            break;
        case ":l":
            // Load
            source = getFileContents(commands[1]);
            return compile(source, env, aliases, { nodejs: true, filename: ".", run: true });
        case ":t":
            if (commands[1] in env) {
                console.log(env[commands[1]].toString());
            } else {
                colorLog(33, commands[1], "is not defined.");
            }
            break;
        case ":s":
            // Source
            if (sources[commands[1]]) {
                colorLog(33, commands[1], "=", prettyPrint(sources[commands[1]]));
            } else {
                if (commands[1]) {
                    colorLog(33, commands[1], "is not defined.");
                } else {
                    console.log("Usage :s command ");
                    console.log(":s [identifier] :: show original code about identifier.");
                }
            }
            break;
        case ":?":
            // Help
            colorLog(32, "Commands available from the prompt");
            console.log(":l -- load and run an external file");
            console.log(":q -- exit REPL");
            console.log(":s -- show original code about identifier");
            console.log(":t -- show the type of the identifier");
            console.log(":? -- show help");
            break;
        default:
            colorLog(31, "Invalid command");
            console.log(":? for help");
            break;
    }
};

var main = function () {
    var argv = process.argv.slice(2);

    // Roy package information
    var fs = require('fs');
    var path = require('path');

    // Meta-commands configuration
    var opts = {
        info: JSON.parse(fs.readFileSync(path.dirname(__dirname) + '/package.json', 'utf8')),
        nodejs: true,
        run: false,
        includePrelude: true,
        strict: false
    };

    processFlags(argv, opts);
};
module.exports = main;

if (module && !module.parent) {
    main();
}

var typeinference = require('./typeinference'),
    loadModule = require('./modules').loadModule,
    exportType = require('./modules').exportType,
    types = require('./types'),
    nodeToType = require('./typeinference').nodeToType,
    nodes = require('./nodes').nodes,
    lexer = require('./lexer'),
    parser = require('../lib/parser').parser,
    typeparser = require('../lib/typeparser').parser,
    escodegen = require('escodegen'),
    _ = require('underscore');


var typecheck = typeinference.typecheck;
// Assigning the nodes to `parser.yy` allows the grammar to access the nodes from
// the `yy` namespace.
parser.yy = typeparser.yy = nodes;

parser.lexer = typeparser.lexer = {
    "lex": function () {
        var token = this.tokens[this.pos] ? this.tokens[this.pos] : ['EOF'];
        this.yytext = token[1];
        this.yylineno = token[2];
        this.yycolumn = token[3];
        if (token[0] != 'EOF' && this.pos - 1 >= 0) {
            this.yycolumn = this.tokens[this.pos - 1][3];
        }
        this.pos++;
        return token[0];
    },
    "setInput": function (tokens) {
        this.tokens = tokens;
        this.pos = 0;
    },
    "upcomingInput": function () {
        return "";
    }
};


parser.parseError = function (str, hash) {
    var errors = require("./errors.js");
    var filename = this.yy.filename || "stdin";
    var line = hash.line;
    var column = this.lexer.yycolumn;
    var token = hash.token;
    var message = "Encountered unexpected token: `" + token + "`";
    errors.reportError(filename, line, column, message);
};




var jsNodeIsExpression = function (node) {
    return !!(/Expression$/.test(node.type) || node.type === 'Identifier' || node.type === 'Literal');
};

var jsNodeIsStatement = function (node) {
    return !!(/Statement$/.test(node.type) || /Declaration$/.test(node.type));
};

var ensureJsASTStatement = function (node) {
    if (jsNodeIsExpression(node)) {
        return { type: "ExpressionStatement", expression: node };
    }
    return node;
};
var ensureJsASTStatements = function (nodes) {
    if (typeof nodes.length !== "undefined") {
        return _.map(
            _.filter(nodes, function (x) {
                // console.log("x:", x);
                // console.log("typeof x:", typeof x);
                return typeof x !== "undefined";
            }),
            ensureJsASTStatement
        );
    } else {
        throw new Error("ensureJsASTStatements wasn't given an Array, got " + nodes + " (" + typeof nodes + ")");
    }
};

// Separate end comments from other expressions
var splitComments = function (body) {
    return _.reduceRight(body, function (accum, node) {
        if (accum.length && node instanceof nodes.Comment) {
            if (!accum[0].comments) {
                accum[0].comments = [];
            }
            accum[0].comments.unshift(node);
            return accum;
        }
        accum.unshift(node);
        return accum;
    }, []);
};
// Ensure comments are attached to a statement where possible
var liftComments = function (jsAst) {
    var helper = function (node) {
        var result, i, comments = [];
        if (!(node && node.type)) {
            // Break out early when we're not looking at a proper node
            return [node, comments];
        }
        for (var key in node) if (node.hasOwnProperty(key)) {
            if (key === "leadingComments" && jsNodeIsExpression(node)) {
                // Lift comments from expressions
                comments = comments.concat(node[key]);
                delete node[key];
            } else if (node[key] && node[key].type) {
                // Recurse into child nodes...
                result = helper(node[key]);
                comments = comments.concat(result[1]);
            } else if (node[key] && node[key].length) {
                // ...and arrays of nodes
                for (i = 0; i < node[key].length; i += 1) {
                    result = helper(node[key][i]);
                    node[key][i] = result[0];
                    comments = comments.concat(result[1]);
                }
            }
        }
        if (jsNodeIsStatement(node) && comments.length) {
            // Attach lifted comments to statement nodes
            if (typeof node.leadingComments === "undefined") {
                node.leadingComments = [];
            }
            node.leadingComments = node.leadingComments.concat(comments);
            comments = [];
        }
        return [node, comments];
    };
    return helper(jsAst)[0];
};

var extraComments = []

var compileNodeWithEnvToJsAST = function (n, env, opts) {
    if (!opts) opts = {};
    var compileNode = function (n) {
        return compileNodeWithEnvToJsAST(n, env);
    };

    var result = n.accept({
        // Top level file
        visitModule: function () {
            var nodes = _.map(splitComments(n.body), compileNode);
            nodes = _.flatten(nodes);  
            return {
                type: "Program",
                body: ensureJsASTStatements(nodes)
            };
        },
        visitImportIntoModule: function () {
            var modulePath = './tmp/' + n.path.join('.') + ".js";  
            var modulePathKey = n.path.map(p => p.toLowerCase()).join('/');  
            
            // Get cached module info  
            var cached = env.$importCache && env.$importCache[modulePathKey]   
                ? env.$importCache[modulePathKey]   
                : null;  
            
            if (!cached) {  
                // Module not loaded - shouldn't happen if typecheck ran first  
                return [];  
            }  
            
            // Helper to check if name is operator  
            var operatorChars = '+-*/%<>=!|&?@:';  
            var isOperator = function(name) {  
                return name.split('').every(function(c) {  
                    return operatorChars.includes(c);  
                });  
            };  
            
            if (n.liftedIds && n.liftedIds.length > 0) {

                var specifiers = [];  
                var typeComments = [];  
                
                _.each(n.liftedIds, function(id) {  
                    var exportedSymbol = cached.exports[id];  
                    
                    if (!exportedSymbol) {  
                        return;  
                    }  

                    if (isOperator(id)) {      
                        var overloads = exportedSymbol;  
                        _.each(overloads, function(overload) {      
                            var mangledName = '__op_' +      
                                typeinference.encodeOperatorName(id) +      
                                '_' +      
                                overload.types.map(function(t) {      
                                    return typeinference.sanitizeTypeName(t.toString());      
                                }).join('_');      
                            
                            specifiers.push({      
                                type: "ImportSpecifier",      
                                imported: { type: "Identifier", name: mangledName },      
                                local: { type: "Identifier", name: mangledName }      
                            });      
                        });  
                    }
                      
                    else if (exportedSymbol.aliased) {  
                        typeComments.push({  
                            type: "Line",  
                            value: " Type alias: " + id + " = " + exportedSymbol.toString()  
                        });  
                    }  
                    else if (exportedSymbol instanceof types.TagType) {  
                        typeComments.push({  
                            type: "Line",  
                            value: " ADT type: " + id  
                        });  
                        
                        _.each(cached.exports, function(sym, symName) {  
                            if (sym instanceof types.FunctionType &&   
                                sym.types[sym.types.length - 1].toString().indexOf(id) === 0) {  
                                specifiers.push({  
                                    type: "ImportSpecifier",  
                                    imported: { type: "Identifier", name: symName },  
                                    local: { type: "Identifier", name: symName }  
                                });  
                            }  
                        });  
                    }  
                    else {      
                        specifiers.push({      
                            type: "ImportSpecifier",      
                            imported: { type: "Identifier", name: id },      
                            local: { type: "Identifier", name: id }      
                        });      
                    }      
                });  
                
                var result = {        
                    type: "ImportDeclaration",        
                    specifiers: specifiers,      
                    source: {        
                        type: "Literal",        
                        value: modulePath        
                    }        
                };  
                
                if (typeComments.length > 0) {  
                    result.leadingComments = typeComments;  
                }  
                
                return result;  


            
            } else {  
                var moduleName = n.path[n.path.length - 1];    
                var operatorSpecifiers = [];    
                
                // Only iterate through THIS module's exported operators  
                _.each(cached.exports, function(symbolType, symbolName) {  
                    if (isOperator(symbolName) && Array.isArray(symbolType)) {  
                        _.each(symbolType, function(overload) {  
                            var mangledName = '__op_' +    
                                typeinference.encodeOperatorName(symbolName) +    
                                '_' +    
                                overload.types.map(function(t) {    
                                    return typeinference.sanitizeTypeName(t.toString());    
                                }).join('_');    
                            
                            operatorSpecifiers.push({    
                                type: "ImportSpecifier",    
                                imported: {    
                                    type: "Identifier",    
                                    name: mangledName    
                                },    
                                local: {    
                                    type: "Identifier",    
                                    name: mangledName    
                                }    
                            });    
                        });  
                    }  
                });  
                
                var imports = [{    
                    type: "ImportDeclaration",    
                    specifiers: [{    
                        type: "ImportNamespaceSpecifier",    
                        local: {    
                            type: "Identifier",    
                            name: moduleName    
                        }    
                    }],    
                    source: {    
                        type: "Literal",    
                        value: modulePath    
                    }    
                }];    
                
                if (operatorSpecifiers.length > 0) {  
                    imports.push({    
                        type: "ImportDeclaration",    
                        specifiers: operatorSpecifiers,    
                        source: {    
                            type: "Literal",    
                            value: modulePath    
                        }    
                    });    
                }    
                
                return imports;                          
            }      
                
        },
        // Function definition to JavaScript function.
        visitFunction: function () {
            var body = {
                type: "BlockStatement",
                body: []
            };
            if (n.whereDecls.length) {
                _.each(n.whereDecls, function (w) {
                    body.body.push(compileNode(w));
                });
            }

            if (n.body === null || (Array.isArray(n.body) && n.body.length === 1 && n.body[0] === null)) {  
                throw new Error("Function '" + (n.name || "<anonymous>") + "' at line " + n.lineno +   
                            " has no body. Did you forget #[extern] annotation?");  
            }  
      
            
            var exprsWithoutComments = _.map(splitComments(n.body), compileNode);
            exprsWithoutComments.push({
                type: "ReturnStatement",
                argument: exprsWithoutComments.pop()
            });
            body.body = ensureJsASTStatements(body.body.concat(exprsWithoutComments));
            var func = {
                type: "FunctionExpression",
                id: null,
                params: _.map(n.args, function (a) {
                    return {
                        type: "Identifier",
                        name: a.name
                    };
                }),
                body: body
            };
            if (!n.name) {
                return func;
            }
            var declaration = {  
                type: "VariableDeclaration",  
                kind: "const",  // Use const for exports  
                declarations: [{  
                    type: "VariableDeclarator",  
                    id: {  
                        type: "Identifier",  
                        name: n.mangledName || n.name  
                    },  
                    init: func  
                }]  
            };  
            if (n.isExport) {  
                return {  
                    type: "ExportNamedDeclaration",  
                    declaration: declaration,  
                    specifiers: [],  
                    source: null  
                };  
            }  
            
            return declaration;  
        },
        visitIfThenElse: function () {
            var ifTrue = _.map(splitComments(n.ifTrue), compileNode);
            if (ifTrue.length === 1) {
                ifTrue = ifTrue[0];
            } else if (ifTrue.length > 1) {
                ifTrue.push({
                    type: "ReturnStatement",
                    argument: ifTrue.pop()
                });
                ifTrue = {
                    type: "CallExpression",
                    'arguments': [],
                    callee: {
                        type: "FunctionExpression",
                        id: null,
                        params: [],
                        body: {
                            type: "BlockStatement",
                            body: ensureJsASTStatements(ifTrue)
                        }
                    }
                };
            }

            var ifFalse = _.map(splitComments(n.ifFalse), compileNode);
            if (ifFalse.length === 1) {
                ifFalse = ifFalse[0];
            } else if (ifFalse.length > 1) {
                ifFalse.push({
                    type: "ReturnStatement",
                    argument: ifFalse.pop()
                });
                ifFalse = {
                    type: "CallExpression",
                    'arguments': [],
                    callee: {
                        type: "FunctionExpression",
                        id: null,
                        params: [],
                        body: {
                            type: "BlockStatement",
                            body: ensureJsASTStatements(ifFalse)
                        }
                    }
                };
            }

            return {
                type: "ConditionalExpression",
                test: compileNode(n.condition),
                consequent: ifTrue,
                alternate: ifFalse
            };
        },
        // Let binding to JavaScript variable.
        visitLet: function () {
            return {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [{
                    type: "VariableDeclarator",
                    id: {
                        type: "Identifier",
                        name: n.name
                    },
                    init: compileNode(n.value)
                }]
            };
        },
        visitInstance: function () {
            return {
                type: "VariableDeclaration",
                kind: "var",
                declarations: [{
                    type: "VariableDeclarator",
                    id: {
                        type: "Identifier",
                        name: n.name
                    },
                    init: compileNode(n.object)
                }]
            };
        },
        visitAssignment: function () {
            return {
                type: "AssignmentExpression",
                operator: "=",
                left: compileNode(n.name),
                right: compileNode(n.value)
            };
        },
        visitData: function () {
            var declarations = _.map(n.tags, compileNode);  
            
            // Check if data type should be exported  
            if (n.isExport) {  
                // Export each constructor individually  
                return _.map(declarations, function(decl) {  
                    return {  
                        type: "ExportNamedDeclaration",  
                        declaration: {  
                            type: "VariableDeclaration",  
                            kind: "const",  
                            declarations: [decl]  
                        },  
                        specifiers: [],  
                        source: null  
                    };  
                });  
            } else {  
                // Regular non-exported data type  
                return {  
                    type: "VariableDeclaration",  
                    kind: "const",  
                    declarations: declarations  
                };  
            }  
        },
        visitReturn: function () {
            return {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    computed: false,
                    object: {
                        type: "Identifier",
                        name: "__monad__"
                    },
                    property: {
                        type: "Identifier",
                        name: "return"
                    }
                },
                "arguments": [compileNode(n.value)]
            };
        },
        visitBind: function () {
            var body = _.map(n.rest.slice(0, n.rest.length - 1), compileNode);
            body.push({
                type: "ReturnStatement",
                argument: compileNode(n.rest[n.rest.length - 1])
            });
            return {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    computed: false,
                    object: {
                        type: "Identifier",
                        name: "__monad__"
                    },
                    property: {
                        type: "Identifier",
                        name: "bind"
                    }
                },
                "arguments": [compileNode(n.value), {
                    type: "FunctionExpression",
                    id: null,
                    params: [{
                        type: "Identifier",
                        name: n.name
                    }],
                    body: {
                        type: "BlockStatement",
                        body: ensureJsASTStatements(body)
                    }
                }]
            };
        },
        visitDo: function () {
            var compiledInit = [];
            var firstBind;
            var lastBind;
            var lastBindIndex = 0;
            _.each(n.body, function (node, i) {
                if (node instanceof nodes.Bind) {
                    if (!lastBind) {
                        firstBind = node;
                    } else {
                        lastBind.rest = n.body.slice(lastBindIndex + 1, i + 1);
                    }
                    lastBindIndex = i;
                    lastBind = node;
                } else {
                    if (!lastBind) {
                        compiledInit.push(compileNode(node));
                    }
                }
            });
            if (lastBind) {
                lastBind.rest = n.body.slice(lastBindIndex + 1);
            }
            var monadDecl = {
                type: "VariableDeclaration",
                kind: "var",
                declarations: [{
                    type: "VariableDeclarator",
                    id: {
                        type: "Identifier",
                        name: "__monad__"
                    },
                    init: compileNode(n.value)
                }]
            };
            var body = {
                type: "BlockStatement",
                body: []
            };
            body.body = _.flatten([monadDecl, compiledInit, {
                type: "ReturnStatement",
                argument: compileNode(firstBind)
            }]);
            return {
                type: "CallExpression",
                "arguments": [],
                callee: {
                    type: "FunctionExpression",
                    id: null,
                    params: [],
                    body: body
                }
            };
        },
        visitTag: function () {
            var tagName = {
                type: "Identifier",
                name: n.name
            };
            var args = _.map(n.vars, function (v, i) {
                return {
                    type: "Identifier",
                    name: v.value + "_" + i
                };
            });
            var setters = _.map(args, function (v, i) {
                return { // "this._" + i + " = " + v;
                    type: "ExpressionStatement",
                    expression: {
                        type: "AssignmentExpression",
                        operator: "=",
                        left: {
                            type: "MemberExpression",
                            computed: false,
                            object: {
                                type: "ThisExpression"
                            },
                            property: {
                                type: "Identifier",
                                name: "_" + i
                            }
                        },
                        right: v
                    }
                };
            });
            var constructorCheck = {
                type: "IfStatement",
                test: {
                    type: "UnaryExpression",
                    operator: "!",
                    argument: {
                        type: "BinaryExpression",
                        operator: "instanceof",
                        left: { type: "ThisExpression" },
                        right: tagName
                    }
                },
                consequent: {
                    type: "BlockStatement",
                    body: [{
                        type: "ReturnStatement",
                        argument: {
                            type: "NewExpression",
                            callee: tagName,
                            'arguments': args
                        }
                    }]
                },
                alternate: null
            };
            setters.unshift(constructorCheck);
            var constructorBody = {
                type: "BlockStatement",
                body: ensureJsASTStatements(setters)
            };
            return {
                type: "VariableDeclarator",
                id: tagName,
                init: {
                    type: "FunctionExpression",
                    id: null,
                    params: args,
                    body: constructorBody
                }
            };
        },
        visitMatch: function () {
            var valuePlaceholder = '__match';

            // Helper to extract variable bindings from patterns  
            var extractVars = function (pattern, valueExpr, vars) {
                pattern.accept({
                    visitNumber: function () {
                        // Literals don't bind variables  
                    },
                    visitString: function () {
                        // Literals don't bind variables  
                    },
                    visitBoolean: function () {
                        // Literals don't bind variables  
                    },
                    visitIdentifier: function () {
                        if (pattern.value === '_') return;

                        vars.push({
                            type: "VariableDeclarator",
                            id: { type: "Identifier", name: pattern.value },
                            init: valueExpr
                        });
                    },
                    visitArray: function () {
                        _.each(pattern.values, function (elemPattern, i) {
                            extractVars(elemPattern, {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Literal", value: i },
                                computed: true
                            }, vars);
                        });
                    },
                    visitTuple: function () {
                        _.each(pattern.values, function (elemPattern, i) {
                            extractVars(elemPattern, {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Literal", value: i },
                                computed: true
                            }, vars);
                        });
                    },
                    visitObject: function () {
                        for (var key in pattern.values) {
                            extractVars(pattern.values[key], {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Identifier", name: key }
                            }, vars);
                        }
                    },
                    visitListConstPattern: function () {
                        // Process all elements except the last  
                        _.each(pattern.patterns.slice(0, -1), function (elemPattern, i) {    
                            extractVars(elemPattern, {    
                                type: "MemberExpression",    
                                object: valueExpr,    
                                property: { type: "Literal", value: i },    
                                computed: true    
                            }, vars);    
                        });  
                        
                        // The last element gets the rest of the array via slice  
                        if (pattern.patterns.length > 0) {  
                            var lastPattern = pattern.patterns[pattern.patterns.length - 1];  
                            extractVars(lastPattern, {  
                                type: "CallExpression",  
                                callee: {  
                                    type: "MemberExpression",  
                                    object: valueExpr,  
                                    property: { type: "Identifier", name: "slice" },  
                                    computed: false  
                                },  
                                arguments: [{   
                                    type: "Literal",   
                                    value: pattern.patterns.length - 1   
                                }]  
                            }, vars);  
                        }  
                    },
                    visitPattern: function () {
                        // Wildcard - no binding  
                        if (pattern.tag === '_') {
                            return;
                        }

                        // Lowercase identifier - variable binding  
                        if (pattern.vars.length === 0 && pattern.tag[0] === pattern.tag[0].toLowerCase()) {
                            vars.push({
                                type: "VariableDeclarator",
                                id: { type: "Identifier", name: pattern.tag },
                                init: valueExpr
                            });
                            return;
                        }

                        // Constructor with arguments - recursively extract from args  
                        _.each(pattern.vars, function (v, i) {
                            extractVars(v, {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Identifier", name: "_" + i }
                            }, vars);
                        });
                    }
                });
            };


            // Helper to build test conditions  
            var buildTest = function (pattern, valueExpr) {
                return pattern.accept({
                    visitNumber: function () {
                        return {
                            type: "BinaryExpression",
                            operator: "===",
                            left: valueExpr,
                            right: { type: "Literal", value: parseFloat(pattern.value) }
                        };
                    },
                    visitString: function () {
                        return {
                            type: "BinaryExpression",
                            operator: "===",
                            left: valueExpr,
                            right: { type: "Literal", value: eval(pattern.value) }
                        };
                    },
                    visitBoolean: function () {
                        return {
                            type: "BinaryExpression",
                            operator: "===",
                            left: valueExpr,
                            right: { type: "Literal", value: pattern.value === "true" }
                        };
                    },
                    visitIdentifier: function () {
                        // Identifiers are bindings, not tests - they always match  
                        return { type: "Literal", value: true };
                    },
                    visitArray: function () {
                        var lengthCheck = {
                            type: "LogicalExpression",
                            operator: "&&",
                            left: {
                                type: "CallExpression",
                                callee: {
                                    type: "MemberExpression",
                                    object: { type: "Identifier", name: "Array" },
                                    property: { type: "Identifier", name: "isArray" }
                                },
                                arguments: [valueExpr]
                            },
                            right: {
                                type: "BinaryExpression",
                                operator: "===",
                                left: {
                                    type: "MemberExpression",
                                    object: valueExpr,
                                    property: { type: "Identifier", name: "length" }
                                },
                                right: { type: "Literal", value: pattern.values.length }
                            }
                        };

                        // Add checks for nested literal patterns  
                        var result = lengthCheck;
                        _.each(pattern.values, function (elemPattern, i) {
                            var elemTest = buildTest(elemPattern, {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Literal", value: i },
                                computed: true
                            });
                            if (elemTest && elemTest.type !== "Literal") {
                                result = {
                                    type: "LogicalExpression",
                                    operator: "&&",
                                    left: result,
                                    right: elemTest
                                };
                            }
                        });
                        return result;
                    },
                    visitTuple: function () {
                        // Same as array  
                        return buildTest({ values: pattern.values, accept: function (v) { return v.visitArray.call(this); } }, valueExpr);
                    },
                    visitObject: function () {
                        var propChecks = [];
                        for (var key in pattern.values) {
                            propChecks.push({
                                type: "BinaryExpression",
                                operator: "in",
                                left: { type: "Literal", value: key },
                                right: valueExpr
                            });

                            var elemTest = buildTest(pattern.values[key], {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Identifier", name: key }
                            });
                            if (elemTest && elemTest.type !== "Literal") {
                                propChecks.push(elemTest);
                            }
                        }

                        return _.reduce(propChecks, function (acc, check) {
                            return acc ? {
                                type: "LogicalExpression",
                                operator: "&&",
                                left: acc,
                                right: check
                            } : check;
                        }, null);
                    },
                    visitListConstPattern: function () {
                        // Check if it's an array with at least the required length  
                        var lengthCheck = {    
                            type: "LogicalExpression",    
                            operator: "&&",    
                            left: {    
                                type: "CallExpression",    
                                callee: {    
                                    type: "MemberExpression",    
                                    object: { type: "Identifier", name: "Array" },    
                                    property: { type: "Identifier", name: "isArray" }    
                                },    
                                arguments: [valueExpr]    
                            },    
                            right: {    
                                type: "BinaryExpression",    
                                operator: ">=",  // Changed from === to >=  
                                left: {    
                                    type: "MemberExpression",    
                                    object: valueExpr,    
                                    property: { type: "Identifier", name: "length" }    
                                },    
                                right: { type: "Literal", value: pattern.patterns.length }    
                            }    
                        };    
                    
                        // Add checks for nested literal patterns (only for non-tail elements)  
                        var result = lengthCheck;    
                        _.each(pattern.patterns.slice(0, -1), function (elemPattern, i) {  // Only check non-tail elements  
                            var elemTest = buildTest(elemPattern, {    
                                type: "MemberExpression",    
                                object: valueExpr,    
                                property: { type: "Literal", value: i },    
                                computed: true    
                            });    
                            if (elemTest && elemTest.type !== "Literal") {    
                                result = {    
                                    type: "LogicalExpression",    
                                    operator: "&&",    
                                    left: result,    
                                    right: elemTest    
                                };    
                            }    
                        });    
                        return result;    
                    },
                    visitPattern: function () {
                        // Wildcard always matches  
                        if (pattern.tag === '_') {
                            return { type: "Literal", value: true };
                        }

                        // Lowercase identifier - always matches (it's a binding)  
                        if (pattern.vars.length === 0 && pattern.tag[0] === pattern.tag[0].toLowerCase()) {
                            return { type: "Literal", value: true };
                        }

                        // Constructor pattern  
                        var test = {
                            type: "BinaryExpression",
                            operator: "instanceof",
                            left: valueExpr,
                            right: { type: "Identifier", name: pattern.tag }
                        };

                        // Add checks for nested patterns in constructor arguments  
                        _.each(pattern.vars, function (v, i) {
                            var argTest = buildTest(v, {
                                type: "MemberExpression",
                                object: valueExpr,
                                property: { type: "Identifier", name: "_" + i }
                            });
                            if (argTest && argTest.type !== "Literal") {
                                test = {
                                    type: "LogicalExpression",
                                    operator: "&&",
                                    left: test,
                                    right: argTest
                                };
                            }
                        });

                        return test;
                    }
                });
            };

            var pathConditions = _.map(n.cases, function (c) {
                var vars = [];
                var valueExpr = { type: "Identifier", name: valuePlaceholder };

                extractVars(c.pattern, valueExpr, vars);
                var test = buildTest(c.pattern, valueExpr);

                var body = [];
                if (vars.length > 0) {
                    body.push({
                        type: "VariableDeclaration",
                        kind: "var",
                        declarations: vars
                    });
                }

                body.push({
                    type: "ReturnStatement",
                    argument: compileNode(c.value)
                });

                return {
                    type: "IfStatement",
                    test: test,
                    consequent: { type: "BlockStatement", body: ensureJsASTStatements(body) },
                    alternate: null
                };
            });

            return {
                type: "CallExpression",
                "arguments": [compileNode(n.value)],
                callee: {
                    type: "SequenceExpression",
                    expressions: [{
                        type: "FunctionExpression",
                        id: null,
                        params: [{ type: "Identifier", name: valuePlaceholder }],
                        body: {
                            type: "BlockStatement",
                            body: ensureJsASTStatements(pathConditions)
                        }
                    }]
                }
            };

        },
        // Call to JavaScript call.
        visitCall: function () {
            var args = _.map(n.args, compileNode);

            // Regular function call handling  
            if (n.typeClassInstance) {
                args.unshift({
                    type: "Identifier",
                    name: n.typeClassInstance
                });
            }

            var result = compileNode(n.func);

            if (n.isEager) {  
                return {  
                    type: "CallExpression",  
                    "arguments": args,  
                    callee: result  
                };  
            }  


            _.each(args, function (arg) {
                result = {
                    type: "CallExpression",
                    "arguments": [arg],
                    callee: result
                };
            });

            return result;
        },
        visitPropertyAccess: function () {
            return {
                type: "MemberExpression",
                computed: false,
                object: compileNode(n.value),
                property: { type: "Identifier", name: n.property }
            };
        },
        visitAccess: function () {
            return {
                type: "MemberExpression",
                computed: true,
                object: compileNode(n.value),
                property: compileNode(n.property)
            };
        },
        visitUnaryBooleanOperator: function () {
            return {
                type: "UnaryExpression",
                operator: n.name,
                argument: compileNode(n.value)
            };
        },
        visitBinaryGenericOperator: function () {
            return {
                type: "BinaryExpression",
                operator: n.name,
                left: compileNode(n.left),
                right: compileNode(n.right)
            };
        },
        visitBinaryNumberOperator: function () {
            return {
                type: "BinaryExpression",
                operator: n.name,
                left: compileNode(n.left),
                right: compileNode(n.right)
            };
        },
        visitBinaryBooleanOperator: function () {
            return {
                type: "BinaryExpression",
                operator: n.name,
                left: compileNode(n.left),
                right: compileNode(n.right)
            };
        },
        visitBinaryStringOperator: function () {
            return {
                type: "BinaryExpression",
                operator: n.name,
                left: compileNode(n.left),
                right: compileNode(n.right)
            };
        },
        visitWith: function () {
            var copyLoop = function (varName) {
                return {
                    type: "ForInStatement",
                    left: { type: "Identifier", name: "__n__" },
                    right: { type: "Identifier", name: varName },
                    body: {
                        type: "BlockStatement",
                        body: [{
                            type: "ExpressionStatement",
                            expression: {
                                type: "AssignmentExpression",
                                operator: "=",
                                left: {
                                    type: "MemberExpression",
                                    computed: true,
                                    object: { type: "Identifier", name: "__o__" },
                                    property: { type: "Identifier", name: "__n__" }
                                },
                                right: {
                                    type: "MemberExpression",
                                    computed: true,
                                    object: { type: "Identifier", name: varName },
                                    property: { type: "Identifier", name: "__n__" }
                                }
                            }
                        }]
                    }
                };
            };
            var funcBody = [];
            funcBody.push({
                type: "VariableDeclaration",
                kind: "var",
                declarations: [{
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "__o__" },
                    init: { type: "ObjectExpression", properties: [] }
                }, {
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "__n__" },
                    init: null
                }]
            });
            funcBody.push(copyLoop("__l__"));
            funcBody.push(copyLoop("__r__"));
            funcBody.push({
                type: "ReturnStatement",
                argument: { type: "Identifier", name: "__o__" }
            });

            return {
                type: "CallExpression",
                'arguments': _.map([n.left, n.right], compileNode),
                callee: {
                    type: "FunctionExpression",
                    id: null,
                    params: [
                        { type: "Identifier", name: "__l__" },
                        { type: "Identifier", name: "__r__" }
                    ],
                    body: { type: "BlockStatement", body: ensureJsASTStatement(funcBody) }
                }
            };
        },
        // Print all other nodes directly.
        visitIdentifier: function () {
            if (n.typeClassInstance) {
                return {
                    type: "MemberExpression",
                    computed: false,
                    object: {
                        type: "Identifier",
                        name: n.typeClassInstance
                    },
                    property: {
                        type: "Identifier",
                        name: n.value
                    }
                };
            }
            return {
                type: "Identifier",
                name: n.mangledName || n.value
            };
        },
        visitNumber: function () {
            return {
                type: "Literal",
                value: parseFloat(n.value)
            };
        },
        visitString: function () {
            /*jshint evil: true */
            return {
                type: "Literal",
                value: eval(n.value)
            };
        },
        visitBoolean: function () {
            return {
                type: "Literal",
                value: n.value === "true"
            };
        },
        visitUnit: function () {
            return {
                type: "NewExpression",
                callee: {
                    type: "Identifier",
                    name: "Unit"
                },
                arguments: []
            };
        },
        visitArray: function () {
            return {
                type: "ArrayExpression",
                elements: _.map(n.values, compileNode)
            };
        },
        visitTuple: function () {
            return {
                type: "ArrayExpression",
                elements: _.map(n.values, compileNode)
            };
        },
        visitObject: function () {
            var cleanedKey, key, pairs = [];

            for (key in n.values) {
                if (key[0] === "'" || key[0] === '"') {
                    cleanedKey = String.prototype.slice.call(key, 1, key.length - 1);
                } else {
                    cleanedKey = key;
                }
                pairs.push({
                    type: "Property",
                    key: {
                        type: "Literal",
                        value: cleanedKey
                    },
                    value: compileNode(n.values[key])
                });
            }
            return {
                type: "ObjectExpression",
                properties: pairs
            };
        }
    });
    if (typeof result === "undefined") {
        if (n.comments && n.comments.length) {
            extraComments = extraComments.concat(n.comments);
        }
    } else {
        if (extraComments && extraComments.length) {
            if (!(n.comments && n.comments.length)) {
                n.comments = extraComments;
            } else {
                n.comments = extraComments.concat(n.comments);
            }
            extraComments = [];
        }
        result.leadingComments = _.map(n.comments, function (c) {
            if (c.value.startsWith('/*')) {
                var inner = c.value.slice(2, -2);
                return {
                    type: "Block",
                    value: inner
                };
            } else {
                return {
                    type: "Line",
                    value: c.value.slice(2).trim()
                };
            }
        });
    }
    return result;
};
exports.compileNodeWithEnvToJsAST = compileNodeWithEnvToJsAST;
var compileNodeWithEnv = function (n, env, opts) {
    var ast = compileNodeWithEnvToJsAST(n, env, opts);
    if (typeof ast === "string") {
        //        console.warn("Got AST already transformed into string: ", ast);
        return ast;
    } else if (typeof ast === "undefined") {
        return "";
    } else {
        ast = liftComments(ast);
        var generated = escodegen.generate(ensureJsASTStatement(ast), { comment: true });
        return generated;
    }
};
exports.compileNodeWithEnv = compileNodeWithEnv;

var compile = function (source, env, aliases, opts) {
    if (!env) {
        env = {};
    }
    if (!aliases) aliases = {};
    if (!opts) opts = {};


    if (!opts.exported) opts.exported = {};

    parser.yy.filename = opts.filename || "stdin";
    env.filename = parser.yy.filename;

    // Parse the file to an AST.
    var tokens = lexer.tokenise(source, { filename: opts.filename });
    var ast = parser.parse(tokens);

    // Typecheck the AST. Any type errors will throw an exception.
    var resultType = typecheck(ast.body, env, aliases, opts);

    // Export types
    ast.body = _.map(ast.body, function (n) {

        if (n.annotations && n.annotations.length > 0) {  
           var shouldExport = false; 
            for (var i = 0; i < n.annotations.length; i++) {  
                var ann = n.annotations[i];
                
                if (ann instanceof nodes.IdAnnotation) {  
                    if (ann.name === 'export') {  
                        n.isExport = true;
                    }  
                    if (ann.name === 'async') {  
                        n.isAsync = true;  
                    }  
                }  
                
                if (ann instanceof nodes.FuncAnnotation) {
                    if (ann.name === 'extern') {  
                        // Validate it's a Function node  
                        if (!(n instanceof nodes.Function)) {  
                            throw new Error("extern annotation can only be applied to functions at line " + n.lineno);  
                        }  
                        
                        // Find the innermost curried function by traversing down  
                        var currentFunc = n;  
                        while (currentFunc.body &&   
                            currentFunc.body.length === 1 &&   
                            currentFunc.body[0] instanceof nodes.Function) {  
                            currentFunc = currentFunc.body[0];  
                        }  
                        
                        if (currentFunc.body && currentFunc.body.length == 1 && (currentFunc.body[0] !== null)) {  
                            throw new Error("extern functions must not have a body at line " + n.lineno);  
                        }  
                        
                        var missingTypes = [];  
                        var funcChain = currentFunc;  
                        while (funcChain) {  
                            _.each(funcChain.args, function(arg) {  
                                if (!arg.type) {  
                                    missingTypes.push(arg.name);  
                                }  
                            });  
                            funcChain = funcChain.parent;  
                        }  
                        
                        if (missingTypes.length > 0) {  
                            throw new Error("extern function '" + n.name + "' at line " + n.lineno +   
                                        " has arguments without type annotations: " + missingTypes.join(", "));  
                        }  
                        
                        var outermostFunc = currentFunc;  
                        while (outermostFunc.parent) {  
                            outermostFunc = outermostFunc.parent;  
                        }  
                        
                        if (!outermostFunc.type) {  
                            throw new Error("extern function '" + (outermostFunc.name || n.name) + "' at line " + n.lineno +   
                                        " must have a return type annotation");  
                        }  
                        
                        var externPath = ann.args[0].replace(/^`|`$/g, '');  
                        
                        var allArgs = [];  
                        var funcChain = currentFunc;  
                        while (funcChain) {  
                            _.each(funcChain.args, function(arg) {  
                                allArgs.unshift(new nodes.Identifier(arg.name));  
                            });  
                            funcChain = funcChain.parent;  
                        }  
                        
                        var externCall = new nodes.Call(  
                            new nodes.Identifier(externPath),  
                            allArgs  
                        );
                        externCall.isEager = true;   
                        
                        currentFunc.body = [externCall];
                    }  

                
                }  
            }  
        }  
      
    
    
        if (n instanceof nodes.Call && n.func.value == 'export') {
            return exportType(n.args[0], env, opts.exported, opts.nodejs);
        }
        return n;
    });

    var jsAst = liftComments(compileNodeWithEnvToJsAST(ast, env, opts));

    if (opts.strict) {
        jsAst.body.unshift({
            type: "ExpressionStatement",
            expression: {
                type: "Literal",
                value: "use strict"
            }
        });
    }

    return {
        ast: ast,
        type: resultType,
        output: escodegen.generate(
            ensureJsASTStatement(jsAst),
            {
                comment: true
            }
        )
    };
};
exports.compile = compile;

// ## Algorithm W (Damas-Hindley-Milner)
//
// This is based on Robert Smallshire's [Python code](http://bit.ly/bbVmmX).
// Which is based on Andrew's [Scala code](http://bit.ly/aztXwD). Which is based
// on Nikita Borisov's [Perl code](http://bit.ly/myq3uA). Which is based on Luca
// Cardelli's [Modula-2 code](http://bit.ly/Hjpvb). Wow.

// Type variable and built-in types are defined in the `types` module.
var t = require('./types'),
    n = require('./nodes').nodes,
    _ = require('underscore'),
    getFreeVariables = require('./freeVariables').getFreeVariables,
    stronglyConnectedComponents = require('./tarjan').stronglyConnectedComponents;

var errors = require("./errors.js");

var currentFile = null;
// ### Unification
//
// This is the process of finding a type that satisfies some given constraints.
// In this system, unification will try to satisfy that either:
//
// 1. `t1` and `t2` are equal type variables
// 2. `t1` and `t2` are equal types
//
// In case #1, if `t1` is a type variable and `t2` is not currently equal,
// unification will set `t1` to have an instance of `t2`. When `t1` is pruned,
// it will unchain to a type without an instance.
//
// In case #2, do a deep unification on the type, using recursion.
//
// If neither constraint can be met, the process will throw an error message.
var unify = function (t1, t2, node, die = true) {
    var alias = t1.aliased || t2.aliased;
    var i;
    t1 = t.prune(t1);
    t2 = t.prune(t2);
    if (t1 instanceof t.Variable) {
        if (t1 != t2) {
            if (t.occursInType(t1, t2)) {
                errors.reportError(node.filename, node.lineno, node.column, "Recursive unification");
            }
            t1.instance = t2;
        }
    } else if (t1 instanceof t.BaseType && t2 instanceof t.Variable) {
        unify(t2, t1, node);
    } else if (t1 instanceof t.NativeType || t2 instanceof t.NativeType) {
        // do nothing.
        // coercing Native to any type.
    } else if (t1 instanceof t.BaseType && t2 instanceof t.BaseType) {
        var t1str = t1.aliased || t1.toString();
        var t2str = t2.aliased || t2.toString();


        if (t1.name != t2.name || t1.types.length != t2.types.length) {
            const errorMessage = "Type error: " + t1str + " is not " + t2str;
            if (!die) throw errorMessage;
            errors.reportError(node.filename, node.lineno, node.column, errorMessage);
        }
        if (t1 instanceof t.ObjectType) {
            for (i in t2.props) {
                if (!(i in t1.props)) {
                    const errorMessage = "Type error: " + + ": " + t1str + " is not " + t2str;
                    if (!die) throw errorMessage;
                    errors.reportError(node.filename, node.lineno, node.column, errorMessage);
                }
                unify(t1.props[i], t2.props[i], node);
            }
        }
        for (i = 0; i < t1.types.length; i++) {
            unify(t1.types[i], t2.types[i], node);
        }
        if (alias) t1.aliased = t2.aliased = alias;
    }
    else {
        const errorMessage = "Type error: Not unified: " + t1 + ", " + t2;
        if (!die) throw errorMessage;
        errors.reportError(node.filename, node.lineno, node.column, errorMessage);
    }
};

var flattenFunctionType = function (argTypes, resultType) {
    var types = argTypes.slice();

    var currentType = resultType;
    while (t.prune(currentType) instanceof t.FunctionType) {
        var prunedType = t.prune(currentType);
        for (var i = 0; i < prunedType.types.length - 1; i++) {
            types.push(prunedType.types[i]);
        }
        currentType = prunedType.types[prunedType.types.length - 1];
    }
    types.push(currentType);

    return new t.FunctionType(types);
};

function sanitizeTypeName(type) {
    var typeStr = type.toString();

    // Handle tuple types: (T1, T2, ...) -> tuple_T1_T2_...  
    if (typeStr.match(/^\([^)]+\)$/)) {
        var innerTypes = typeStr.slice(1, -1).split(',').map(function (t) {
            return t.trim().replace(/[^a-zA-Z0-9]/g, '_');
        }).join('_');
        return 'tuple_' + innerTypes;
    }

    // Handle array types: [T] -> array_T  
    if (typeStr.match(/^\[.+\]$/)) {
        var innerType = typeStr.slice(1, -1).trim().replace(/[^a-zA-Z0-9]/g, '_');
        return 'array_' + innerType;
    }

    // Handle object types: {x: T1, y: T2} -> object_x_T1_y_T2  
    if (typeStr.match(/^\{.+\}$/)) {
        var props = typeStr.slice(1, -1).split(',').map(function (prop) {
            var parts = prop.split(':').map(function (p) { return p.trim(); });
            return parts.join('_');
        }).join('_');
        return 'object_' + props.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    // Default: just sanitize the string  
    return typeStr.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
}


function encodeOperatorName(opName) {
    var encoding = {
        '+': 'add',
        '-': 'sub',
        '*': 'mul',
        '/': 'div',
        '%': 'mod',
        '<': 'lt',
        '>': 'gt',
        '=': 'eq',
        '!': 'not',
        '|': 'or',
        '&': 'and',
        '?': 'qmark',
        '@': 'at',
        ':': 'colon'
    };

    return opName.split('').map(function (c) {
        return encoding[c] || c;
    }).join('_');
}


// ### Helper functions for function definitions
//
var analyseFunction = function (functionDecl, funcType, env, nonGeneric, aliases, constraints) {
    var types = [];
    var newEnv = _.clone(env);

    var argNames = {};
    _.each(functionDecl.args, function (arg, i) {
        if (argNames[arg.name]) {
            errors.reportError(functionDecl.filename, functionDecl.lineno, functionDecl.column, "Repeated function argument '" + arg.name + "'");
        }

        var argType;
        if (arg.type) {
            argType = nodeToType(arg.type, env, aliases);
        } else {
            argType = funcType.types[i];
        }
        newEnv[arg.name] = argType;
        argNames[arg.name] = argType;
        types.push(argType);
    });

    analyseWhereDataDecls(functionDecl.whereDecls, newEnv, nonGeneric, aliases, constraints);

    var whereFunctionTypeMap =
        analyseWhereFunctions(functionDecl.whereDecls, newEnv, nonGeneric, aliases, constraints);

    for (var name in whereFunctionTypeMap) {
        newEnv[name] = whereFunctionTypeMap[name];
    }

    var resultType;  

    var retType = functionDecl.type;
    let parent = functionDecl;
    if ((functionDecl.name == undefined || functionDecl.name == null) && functionDecl.parent) {
        while (parent.name == undefined) 
          parent = parent.parent;
    }

    if (!functionDecl.body[0]) {
        let node = functionDecl;
        while (node.lineno == undefined) 
          node = node.parent;
          
        // For functions without bodies, use the annotated return type  
        if (!parent.type) {  
            errors.reportError(node.filename, node.lineno, node.column, "Function '" + (functionDecl.name || "<anonymous>" ) + "has no body and no return type annotation");
        }  
        resultType = nodeToType(parent.type, env, aliases);  
    } else {  
        var scopeTypes = _.map(withoutComments(functionDecl.body), function (expression) {  
            return analyse(expression, newEnv, nonGeneric, aliases, constraints);  
        });  
        resultType = scopeTypes[scopeTypes.length - 1];  
    }  
    var functionType = flattenFunctionType(types, resultType);

    var annotationType;
    if (functionDecl.type) {
        annotationType = nodeToType(functionDecl.type, env, aliases);

        // Unwrap resultType to get the final return type  
        var finalResultType = resultType;
        while (t.prune(finalResultType) instanceof t.FunctionType) {
            var prunedType = t.prune(finalResultType);
            finalResultType = prunedType.types[prunedType.types.length - 1];
        }

        unify(finalResultType, annotationType, functionDecl);
    }

    return functionType;
};

var analyseWhereFunctions = function (whereDecls, env, nonGeneric, aliases, constraints) {
    var newEnv = _.clone(env);

    var functionDecls = _.filter(whereDecls, function (whereDecl) {
        return whereDecl instanceof n.Function;
    });

    var dependencyGraph = createDependencyGraph(functionDecls);

    var components = stronglyConnectedComponents(dependencyGraph);

    var functionTypes = {};

    _.each(components, function (component) {
        var newNonGeneric = nonGeneric.slice();

        var functionDecls = _.map(component, function (vertex) {
            return vertex.declaration;
        });

        _.each(functionDecls, function (functionDecl) {
            var funcTypeAndNonGenerics = createTemporaryFunctionType(functionDecl);
            var funcType = funcTypeAndNonGenerics[0];

            newNonGeneric = newNonGeneric.concat(funcTypeAndNonGenerics[1]);

            newEnv[functionDecl.name] = funcType;
        });

        _.each(functionDecls, function (functionDecl) {
            var functionType = newEnv[functionDecl.name];

            functionTypes[functionDecl.name] =
                analyseFunction(functionDecl, functionType, newEnv, newNonGeneric, aliases);
        });
    });

    return functionTypes;
};

var createTemporaryFunctionType = function (node) {
    var nonGeneric = [];

    var tempTypes = _.map(node.args, function (arg) {
        var typeVar = new t.Variable();

        if (!arg.type) {
            nonGeneric.push(typeVar);
        }

        return typeVar;
    });

    var resultType = new t.Variable();

    tempTypes.push(resultType);

    nonGeneric.push(resultType);

    return [new t.FunctionType(tempTypes), nonGeneric];
};

var createDependencyGraph = function (functionDecls) {
    var verticesMap = {};

    _.each(functionDecls, function (declaration) {
        verticesMap[declaration.name] = {
            id: declaration.name,
            declaration: declaration
        };
    });

    var vertices = _.values(verticesMap);

    var edges = {};

    _.each(vertices, function (vertex) {
        var freeVariables = getFreeVariables(vertex.declaration);

        var followings = _.map(freeVariables, function (value, identifier) {
            return verticesMap[identifier];
        });

        followings = _.without(followings, undefined);

        edges[vertex.declaration.name] = followings;
    });

    return {
        vertices: vertices,
        edges: edges
    };
};

var analyseWhereDataDecls = function (whereDecls, env, nonGeneric, aliases, constraints) {
    var dataDecls = _.filter(whereDecls, function (whereDecl) {
        return whereDecl instanceof n.Data;
    });

    _.each(dataDecls, function (dataDecl) {
        var nameType = new t.TagNameType(dataDecl.name);
        var types = [nameType];

        if (env[dataDecl.name]) {
            errors.reportError(dataDecl.filename, dataDecl.lineno, dataDecl.column, "Multiple declarations of type constructor: " + dataDecl.name);
        }

        var argNames = {};
        var argEnv = _.clone(env);
        _.each(dataDecl.args, function (arg) {
            if (argNames[arg.name]) {
                errors.reportError(dataDecl.filename, dataDecl.lineno, dataDecl.column, "Repeated type variable '" + arg.name + "'");
            }

            var argType;
            if (arg.type) {
                argType = nodeToType(arg, argEnv, aliases);
            } else {
                argType = new t.Variable();
            }
            argEnv[arg.name] = argType;
            argNames[arg.name] = argType;
            types.push(argType);
        });

        env[dataDecl.name] = new t.TagType(types);
    });

    _.each(dataDecls, function (dataDecl) {
        var type = env[dataDecl.name];
        var newEnv = _.clone(env);

        _.each(dataDecl.args, function (arg, i) {
            var argType = type.types[i + 1];
            newEnv[arg.name] = argType;
        });

        _.each(dataDecl.tags, function (tag) {
            if (env[tag.name]) {
                errors.reportError(dataDecl.filename, dataDecl.lineno, dataDecl.column, "Multiple declarations for data constructor: " + tag.name);
            }

            var tagTypes = [];
            _.each(tag.vars, function (v, i) {
                tagTypes[i] = nodeToType(v, newEnv, aliases);
            });
            tagTypes.push(type);
            env[tag.name] = new t.FunctionType(tagTypes);
        });
    });
};

// Want to skip typing of comments in bodies
var withoutComments = function (xs) {
    return _.filter(xs, function (x) {
        return !(x instanceof n.Comment);
    });
};




// ### Type analysis
//
// `analyse` is the core inference function. It takes an AST node and returns
// the infered type.
var analyse = function (node, env, nonGeneric, aliases, constraints) {
    if (!nonGeneric) nonGeneric = [];

    return node.accept({
        // #### Function definition
        //
        // Assigns a type variable to each typeless argument and return type.
        //
        // Each typeless argument also gets added to the non-generic scope
        // array. The `fresh` function can then return the existing type from
        // the scope.
        //
        // Assigns the function's type in the environment and returns it.
        //
        // We create temporary types for recursive definitions.
        visitUnit: function () {
            return new t.UnitType();
        },
        visitFunction: function () {

            var newNonGeneric = nonGeneric.slice();
            var newEnv = _.clone(env);

            var funcTypeAndNonGenerics = createTemporaryFunctionType(node);
            var funcType = funcTypeAndNonGenerics[0];

            if (node.type) {
                var returnTypeAnnotation = nodeToType(node.type, env, aliases);

                unify(funcType.types[funcType.types.length - 1], returnTypeAnnotation, node);
            }

            newNonGeneric = newNonGeneric.concat(funcTypeAndNonGenerics[1]);


            var functionConstraints = [];
            var functionType = analyseFunction(node, funcType, newEnv, newNonGeneric, aliases, functionConstraints);
            if (node.type) {
                var returnTypeAnnotation = nodeToType(node.type, env, aliases);
                if (functionType instanceof t.FunctionType) {
                    unify(returnTypeAnnotation, functionType.types[functionType.types.length - 1], node);
                } else {
                    unify(returnTypeAnnotation, functionType, node);
                }
            }


            var operatorChars = '+-*/%<>=!|&?@:';
            if (node.name && operatorChars.includes(node.name[0])) {
                var argCount = functionType.types.length - 1; // Last type is return type  

                if (argCount == 0 || argCount > 2) {
                    errors.reportError(
                        node.filename,
                        node.lineno,
                        node.column,
                        "Invalid operator function for `" + node.name + "`. Operator functions must have 1 to 2 parameters (1 for Unary and 2 for Binary Operators)"                        
                    );
                }
                
                var tableKey = argCount === 1 ? 'unary' : argCount === 2 ? 'binary' : null;

                if (tableKey) {
                    var mangledName = '__op_' +
                        encodeOperatorName(node.name) +
                        '_' +
                        functionType.types.map(function (t) {
                            return sanitizeTypeName(t.toString());
                        }).join('_');

                    node.mangledName = mangledName;
                    if (!env.$operators[tableKey][node.name]) {
                        env.$operators[tableKey][node.name] = [];
                    }

                    env.$operators[tableKey][node.name].push({
                        types: functionType.types,
                        name: node.name,
                        type: functionType
                    });
                }
            }


            var typeClassArgs = [];
            _.each(functionConstraints, function (constraint) {
                solveTypeClassConstraint(constraint, newEnv, function (instance) {
                    constraint.node.typeClassInstance = instance.name;

                    var exists = _.find(typeClassArgs, function (a) {
                        try {
                            unify(instance.fresh(), a.fresh(), constraint);
                        } catch (e) {
                            return false;
                        }
                        return true;
                    });
                    if (exists) return;

                    typeClassArgs.push(instance);
                });
            });

            _.each(typeClassArgs, function (instance) {
                node.args.unshift(new n.Arg(instance.name, instance));
                functionType.typeClasses.push(instance);
            });

            if (node.name && !operatorChars.includes(node.name[0])) {
                if (env[node.name]) {
                    errors.reportError(
                        node.filename,
                        node.lineno,
                        node.column,
                        "Function `" + node.name + "` is already defined"
                    );
                }
                env[node.name] = functionType;
            }

            return functionType;

        },
        visitIfThenElse: function () {
            // if statements are compiled into (function() {...})(), thus they introduce a new environment.
            var newEnv = _.clone(env);

            var conditionType = analyse(node.condition, newEnv, nonGeneric, aliases, constraints);

            unify(conditionType, new t.BooleanType(), node.condition);

            var ifTrueScopeTypes = _.map(withoutComments(node.ifTrue), function (expression) {
                return analyse(expression, newEnv, nonGeneric, aliases, constraints);
            });
            var ifTrueType = ifTrueScopeTypes[ifTrueScopeTypes.length - 1];

            var ifFalseScopeTypes = _.map(withoutComments(node.ifFalse), function (expression) {
                return analyse(expression, newEnv, nonGeneric, aliases, constraints);
            });
            var ifFalseType = ifFalseScopeTypes[ifFalseScopeTypes.length - 1];

            unify(ifTrueType, ifFalseType, node);

            return ifTrueType;
        },
        // #### Function call
        //
        // Ensures that all argument types `unify` with the defined function and
        // returns the function's result type.
        visitCall: function () {
            var types = _.map(node.args, function (arg) {
                return analyse(arg, env, nonGeneric, aliases, constraints);
            });

            // Check if this is an operator call - ALL chars must be operator symbols  
            var operatorChars = '+-*/%<>=!|&?@:';
            var funcName = node.func.value;

            // Check if funcName is composed entirely of operator characters  
            var isOperator = funcName && funcName.length > 0 &&
                funcName.split('').every(function (c) {
                    return operatorChars.includes(c);
                });

            const mergeIdentifiers = () => {
                _.each(node.args, function (arg, i) {
                    isOperator = arg.value && arg.value.length > 0 &&
                        arg.value.split('').every(function (c) {
                            return operatorChars.includes(c);
                        });

                    if (!isOperator || !(arg instanceof n.Identifier)) return;
                    if (arg.value && isOperator) {
                        var argType = types[i];
                        var mangledName = '__op_' +
                            encodeOperatorName(arg.value) +
                            '_' +
                            argType.types.map(function (t) {
                                return sanitizeTypeName(t.toString());
                            }).join('_');
                        arg.mangledName = mangledName;
                    }
                });
            }

            if (isOperator && env.$operators) {
                var tableKey = types.length === 1 ? 'unary' : types.length === 2 ? 'binary' : null;

                if (tableKey && env.$operators[tableKey][funcName]) {
                    var candidates = env.$operators[tableKey][funcName];

                    for (var i = 0; i < candidates.length; i++) {
                        var candidate = candidates[i];
                        var success = true;

                        try {
                            var candidateType = candidate.type.fresh(nonGeneric);
                            var currentType = candidateType;

                            for (var j = 0; j < types.length; j++) {
                                if (!(currentType instanceof t.FunctionType)) {
                                    success = false;
                                    break;
                                }
                                unify(types[j], currentType.types[0], node, false);

                                if (currentType.types.length === 2) {
                                    currentType = currentType.types[1];
                                } else {
                                    currentType = new t.FunctionType(currentType.types.slice(1));
                                }
                            }

                            if (success) {
                                var mangledName = '__op_' +
                                    encodeOperatorName(funcName) +
                                    '_' +
                                    candidate.types.map(function (t) {
                                        return sanitizeTypeName(t.toString());
                                    }).join('_');

                                mergeIdentifiers()
                                node.func.mangledName = mangledName;
                                return currentType;
                            }
                        } catch (e) {
                            continue;
                        }
                    }

                    const errorMessage = "No matching overload found for operator " + funcName +
                        " with argument types: " + types.map(function (t) {
                            return t.toString();
                        }).join(", ");

                    errors.reportError(node.filename, node.lineno, node.column, errorMessage);
                } else {
                    errors.reportError(node.filename, node.lineno, node.column, "Operator `" + funcName + "` is not defined");
                }
            }

            // Fall back to regular function call handling  
            var funType = t.prune(analyse(node.func, env, nonGeneric, aliases, constraints));
            if (funType instanceof t.NativeType) {
                mergeIdentifiers()
                return new t.NativeType();
            }

            _.each(funType.typeClasses, function (type) {
                constraints.push({
                    node: node,
                    type: type
                });
            });

            if (funType instanceof t.TagType) {
                var tagType = env[node.func.value].fresh(nonGeneric);

                _.each(tagType, function (x, i) {
                    if (!types[i]) errors.reportError(node.filename, node.lineno, node.column, "Not enough arguments to " + node.func.value);

                    var index = tagType.types.indexOf(x);
                    if (index != -1) {
                        unify(funType.types[index], types[i], node);
                    }
                    unify(x, types[i], node);
                });

                mergeIdentifiers()
                return funType;
            }

            if (funType instanceof t.FunctionType) {
                var expectedArgCount = funType.types.length - 1;
                var providedArgCount = types.length;

                for (var i = 0; i < providedArgCount; i++) {
                    if (i >= expectedArgCount) {
                        errors.reportError(node.filename, node.lineno, node.column, "Too many arguments provided on line " + node);
                    }
                    unify(types[i], funType.types[i], node);
                }

                if (providedArgCount < expectedArgCount) {
                    var remainingTypes = funType.types.slice(providedArgCount);
                    mergeIdentifiers()
                    return new t.FunctionType(remainingTypes);
                }

                mergeIdentifiers()
                return funType.types[funType.types.length - 1];
            }

            var resultType = new t.Variable();
            types.push(resultType);
            unify(new t.FunctionType(types), funType, node);

            mergeIdentifiers()
            return resultType;
        },
        // #### Let binding
        //
        // Infer the value's type, assigns it in the environment and returns it.
        visitLet: function () {
            var valueType = analyse(node.value, env, nonGeneric, aliases, constraints);

            var annotationType;
            if (node.type) {
                annotationType = nodeToType(node.type, env, aliases);
                if (t.prune(valueType) instanceof t.NativeType) {
                    valueType = annotationType;
                } else {
                    unify(valueType, annotationType, node);
                }
            }

            env[node.name] = valueType;

            return valueType;
        },
        visitTypeClass: function () {
            var genericType = nodeToType(node.generic, env, aliases);
            env[node.name] = new t.TypeClassType(node.name, genericType);

            _.each(node.types, function (typeNode, name) {
                if (env[name]) {
                    throw new Error("Can't define " + name + " on a typeclass - already defined");
                }
                var nameType = nodeToType(typeNode, env, aliases);
                nameType.typeClass = node.name;
                env[name] = nameType;
            });

            return env[node.name];
        },
        visitInstance: function () {
            var typeClassType = env[node.typeClassName].fresh(nonGeneric);

            var instanceType = nodeToType(node.typeName, env, aliases);
            unify(typeClassType.type, instanceType, node);
            var objectType = analyse(node.object, env, nonGeneric, aliases, constraints);
            _.each(objectType.props, function (propType, key) {
                if (!env[key]) {
                    throw new Error("Instance couldn't find " + JSON.stringify(key) + " in environment");
                }
                if (env[key].typeClass != node.typeClassName) {
                    throw new Error(JSON.stringify(key) + " doesn't exist on type-class " + JSON.stringify(node.typeClassName));
                }
                unify(propType, env[key].fresh(nonGeneric), node);
            });

            objectType.typeClassInstance = {
                name: node.typeClassName,
                type: typeClassType
            };
            env[node.name] = objectType;
        },
        visitAssignment: function () {
            var valueType = analyse(node.value, env, nonGeneric, aliases, constraints);

            if (env[node.name]) {
                if (t.prune(valueType) instanceof t.NativeType) {
                    return env[node.name];
                } else {
                    unify(valueType, env[node.name], node);
                }
            } else {
                env[node.name] = valueType;
            }

            return valueType;
        },
        visitDo: function () {
            // TODO: Make cleaner
            return env[node.value.value].props['return'].types[1];
        },
        visitPropertyAccess: function () {
            var valueType = analyse(node.value, env, nonGeneric, aliases, constraints);

            if (t.prune(valueType) instanceof t.NativeType) {
                return new t.NativeType();
            }

            // TODO: Properly generate property constraints
            if (valueType instanceof t.ObjectType) {
                if (!valueType.props[node.property]) {
                    valueType.props[node.property] = new t.Variable();
                }
            } else {
                var propObj = {};
                propObj[node.property] = new t.Variable();
                unify(valueType, new t.ObjectType(propObj), node);
            }

            return t.prune(valueType).getPropertyType(node.property);
        },
        visitAccess: function () {
            var valueType = analyse(node.value, env, nonGeneric, aliases, constraints);

            if (t.prune(valueType) instanceof t.NativeType) {
                return new t.NativeType();
            }

            unify(valueType, new t.ArrayType(new t.Variable()), node);

            var accessType = analyse(node.property, env, nonGeneric, aliases, constraints);
            unify(accessType, new t.NumberType(), node);
            return t.prune(valueType).type;
        },
        visitUnaryBooleanOperator: function () {
            var resultType = new t.BooleanType();
            var valueType = analyse(node.value, env, nonGeneric, aliases, constraints);
            unify(valueType, resultType, node.value);

            return resultType;
        },
        visitBinaryGenericOperator: function () {
            var leftType = analyse(node.left, env, nonGeneric, aliases, constraints);
            var rightType = analyse(node.right, env, nonGeneric, aliases, constraints);
            unify(leftType, rightType, node);

            return new t.BooleanType();
        },
        visitBinaryNumberOperator: function () {
            var resultType = new t.NumberType();
            var leftType = analyse(node.left, env, nonGeneric, aliases, constraints);
            var rightType = analyse(node.right, env, nonGeneric, aliases, constraints);
            unify(leftType, resultType, node.left);
            unify(rightType, resultType, node.right);

            return resultType;
        },
        visitBinaryBooleanOperator: function () {
            var resultType = new t.BooleanType();
            var leftType = analyse(node.left, env, nonGeneric, aliases, constraints);
            var rightType = analyse(node.right, env, nonGeneric, aliases, constraints);
            unify(leftType, resultType, node.left);
            unify(rightType, resultType, node.right);

            return resultType;
        },
        visitBinaryStringOperator: function () {
            var resultType = new t.StringType();
            var leftType = analyse(node.left, env, nonGeneric, aliases, constraints);
            var rightType = analyse(node.right, env, nonGeneric, aliases, constraints);
            unify(leftType, resultType, node.left);
            unify(rightType, resultType, node.right);

            return resultType;
        },
        visitWith: function () {
            var leftType = analyse(node.left, env, nonGeneric, aliases, constraints);
            var rightType = analyse(node.right, env, nonGeneric, aliases, constraints);
            var combinedTypes = {};

            var emptyObjectType = new t.ObjectType({});
            unify(leftType, emptyObjectType, node.left);
            unify(rightType, emptyObjectType, node.right);

            var name;
            for (name in leftType.props) {
                combinedTypes[name] = leftType.props[name];
            }
            for (name in rightType.props) {
                combinedTypes[name] = rightType.props[name];
            }

            return new t.ObjectType(combinedTypes);
        },
        visitData: function () {
            analyseWhereDataDecls([node], env, nonGeneric, aliases, constraints);

            return new t.NativeType();
        },
        visitMatch: function () {
            var resultType = new t.Variable();
            var value = analyse(node.value, env, nonGeneric, aliases, constraints);
            var newEnv = _.clone(env);

            // Helper function to handle pattern binding recursively  
            var handlePatternBinding = function (pattern, expectedType, env, nonGeneric) {
                pattern.accept({
                    visitNumber: function () {
                        unify(expectedType, new t.NumberType(), pattern);
                    },
                    visitString: function () {
                        unify(expectedType, new t.StringType(), pattern);
                    },
                    visitBoolean: function () {
                        unify(expectedType, new t.BooleanType(), pattern);
                    },

                    visitIdentifier: function () {
                        if (pattern.value === '_') return; // Wildcard pattern  

                        // OCaml convention: uppercase = constructor, lowercase = binding  
                        if (pattern.value[0] === pattern.value[0].toUpperCase()) {
                            // Constructor with 0 args  
                            var tagType = env[pattern.value];
                            if (!tagType)
                                errors.reportError(pattern.filename, pattern.lineno, pattern.column, "Couldn't find constructor: " + pattern.value)
                            unify(expectedType, _.last(t.prune(tagType).types).fresh(nonGeneric), pattern);
                        } else {
                            // Variable binding  
                            env[pattern.value] = expectedType;
                            nonGeneric.push(expectedType);
                        }
                    },

                    visitArray: function () {
                        var elemType = new t.Variable();
                        unify(expectedType, new t.ArrayType(elemType), pattern);
                        _.each(pattern.values, function (elemPattern) {
                            handlePatternBinding(elemPattern, elemType, env, nonGeneric);
                        });
                    },
                    visitTuple: function () {
                        var propTypes = {};
                        _.each(pattern.values, function (elemPattern, i) {
                            propTypes[i] = new t.Variable();
                            handlePatternBinding(elemPattern, propTypes[i], env, nonGeneric);
                        });
                        unify(expectedType, new t.TupleType(propTypes), pattern);
                    },
                    visitObject: function () {
                        var propTypes = {};
                        for (var key in pattern.values) {
                            propTypes[key] = new t.Variable();
                            handlePatternBinding(pattern.values[key], propTypes[key], env, nonGeneric);
                        }
                        unify(expectedType, new t.ObjectType(propTypes), pattern);
                    },
                    visitListConstPattern: function () {
                        var elemType = new t.Variable();  
                        unify(expectedType, new t.ArrayType(elemType), pattern);  
                        
                        // Process all elements except the last as individual elements  
                        _.each(pattern.patterns.slice(0, -1), function (elemPattern) {  
                            handlePatternBinding(elemPattern, elemType, env, nonGeneric);  
                        });  
                        
                        // The last element represents the rest of the list (tail)  
                        if (pattern.patterns.length > 0) {  
                            var lastPattern = pattern.patterns[pattern.patterns.length - 1];  
                            handlePatternBinding(lastPattern, new t.ArrayType(elemType), env, nonGeneric);  
                        } 
                    },
                    visitPattern: function () {
                        // Handle wildcard pattern  
                        if (pattern.tag === '_') {
                            return;
                        }

                        // Handle variable binding (lowercase identifier with no args)  
                        if (pattern.vars.length === 0 && pattern.tag[0] === pattern.tag[0].toLowerCase()) {
                            env[pattern.tag] = expectedType;
                            nonGeneric.push(expectedType);
                            return;
                        }

                        // Handle constructor pattern (uppercase identifier)  
                        var tagType = env[pattern.tag];
                        if (!tagType) {
                            errors.reportError(pattern.filename, pattern.lineno, pattern.column, "Couldn't find type tag: " + pattern.value)
                        }

                        unify(expectedType, _.last(t.prune(tagType).types).fresh(nonGeneric), pattern);

                        // Process constructor arguments  
                        _.each(pattern.vars, function (v, i) {
                            var argType = env[pattern.tag][i];
                            handlePatternBinding(v, argType, env, nonGeneric);
                        });
                    }
                });
            };

            _.each(node.cases, function (nodeCase) {
                var newNonGeneric = nonGeneric.slice();
                var caseEnv = _.clone(newEnv);

                handlePatternBinding(nodeCase.pattern, value, caseEnv, newNonGeneric);

                var caseType = analyse(nodeCase.value, caseEnv, newNonGeneric, aliases, constraints);
                if (caseType instanceof t.FunctionType && caseType.types.length == 1) {
                    unify(resultType, _.last(caseType.types), nodeCase);
                } else {
                    unify(resultType, caseType, nodeCase);
                }
            });

            return resultType;
        },
        // Type alias
        visitType: function () {
            var argEnv = _.clone(env);
            var argTypes = [];

            // Create type variables for each generic parameter    
            _.each(node.args, function (arg) {
                var typeVar = new t.Variable(arg.name);
                argEnv[arg.name] = typeVar;
                argTypes.push(typeVar);
            });

            var resolvedType = nodeToType(node.value, argEnv, aliases);

            if (argTypes.length > 0) {
                aliases[node.name] = {
                    params: argTypes,
                    body: resolvedType
                };
            } else {
                aliases[node.name] = resolvedType;
            }

            aliases[node.name].aliased = node.name;
            return new t.NativeType();
        },
        // #### Identifier
        //
        // Creates a `fresh` copy of a type if the name is found in an
        // environment, otherwise throws an error.
        visitIdentifier: function () {
            // Regular identifier lookup  
            if (env[node.value]) {
                return env[node.value].fresh(nonGeneric);
            }
            return new t.NativeType();
        },
        // #### Primitive type
        visitNumber: function () {
            return new t.NumberType();
        },
        visitString: function () {
            return new t.StringType();
        },
        visitBoolean: function () {
            return new t.BooleanType();
        },
        visitArray: function () {
            var valueType = new t.Variable();
            _.each(node.values, function (v) {
                unify(valueType, analyse(v, env, nonGeneric, aliases, constraints), v);
            });
            return new t.ArrayType(valueType);
        },
        visitTuple: function () {
            var propTypes = {};
            _.each(node.values, function (v, i) {
                propTypes[i] = analyse(v, env, nonGeneric, aliases, constraints);
            });

            var typesArray = [];          
            for (var i = 0; i < Object.keys(propTypes).length; i++) {  
                typesArray.push(propTypes[i]);  
            }  
            return new t.TupleType(typesArray);  
        },
        visitObject: function () {
            var propTypes = {};
            var prop;
            for (prop in node.values) {
                propTypes[prop] = analyse(node.values[prop], env, nonGeneric, aliases, constraints);
            }
            return new t.ObjectType(propTypes);
        }
    });
};

// Converts an AST node to type system type.
var nodeToType = function (n, env, aliases) {
    return n.accept({
        visitGeneric: function (g) {
            return new t.Variable(g.value);
        },
        visitTypeFunction: function (tf) {
            return new t.FunctionType(_.map(tf.args, function (v) {
                return nodeToType(v, env, aliases);
            }));
        },
        visitTypeArray: function (ta) {
            return new t.ArrayType(nodeToType(ta.value, env, aliases));
        },
        visitTypeName: function (tn) {
            if (tn.value in aliases) {
                var alias = aliases[tn.value];

                // Handle parameterized type aliases  
                if (alias.params && alias.params.length > 0) {
                    if (tn.args.length !== alias.params.length) {
                        throw new Error("Type '" + tn.value + "' expects " +
                            alias.params.length + " arguments but got " + tn.args.length);
                    }

                    // Create fresh copy and substitute type arguments  
                    var freshAlias = alias.body.fresh();
                    _.forEach(tn.args, function (argNode, i) {
                        var argType = nodeToType(argNode, env, aliases);
                        unify(alias.params[i], argType, argNode);
                    });
                    return freshAlias;
                }

                return aliases[tn.value];

            }

            if (!tn.args.length) {
                switch (tn.value) {
                    case 'Number':
                        return new t.NumberType();
                    case 'String':
                        return new t.StringType();
                    case 'Boolean':
                        return new t.BooleanType();
                    case 'Unit':
                        return new t.UnitType();
                }
            }

            var envType = env[tn.value];
            if (envType) {
                if (t.prune(envType) instanceof t.Variable) {
                    return envType;
                }

                if (tn.args.length != envType.types.length - 1) {
                    throw new Error("Type arg lengths differ: '" + tn.value + "' given " + tn.args.length + " but should be " + (envType.types.length - 1));
                }

                envType = t.prune(envType).fresh();
                _.forEach(tn.args, function (v, k) {
                    var argType = nodeToType(v, env, aliases);
                    unify(envType.types[1 + k], argType, v);
                });
                return envType;
            }

            throw new Error("Can't convert from explicit type: `" + tn.value + "`")
        },
        visitTypeObject: function (to) {
            var keys = Object.keys(to.values);
            var isTuple = keys.every(function (k, i) { return k == i; });

            if (isTuple) {
                var types = _.map(to.values, function (v) {
                    return nodeToType(v, env, aliases);
                });
                return new t.TupleType(types);
            }

            var types = {};
            _.forEach(to.values, function (v, k) {
                types[k] = nodeToType(v, env, aliases);
            });
            return new t.ObjectType(types);
        }
    });
};
exports.nodeToType = nodeToType;

var functionTypeClassConstraint = function (constraint, env) {
    return constraint.type;
};

var identifierTypeClassConstraint = function (constraint, env) {
    var typeClassValue = env[constraint.node.value];
    var typeClass = env[typeClassValue.typeClass];

    var instanceTypeClass = typeClass.fresh();

    // TODO: Remove difference between types with subtypes and types without
    var types = t.prune(typeClassValue).types;

    if (!types) {
        if (typeClass.type.id == typeClassValue.id) {
            unify(instanceTypeClass.type, constraint.type);
        }
    }

    _.each(t.prune(typeClassValue).types, function (vt, j) {
        if (typeClass.type.id != vt.id) return;

        unify(instanceTypeClass.type, constraint.type.types[j]);
    });

    return instanceTypeClass;
};

// Adds a property, referencing the name of a type-class instance to
// identifier nodes that are defined on a type-class.
var solveTypeClassConstraint = function (constraint, env, unsolvedCallback) {
    var instanceTypeClass;
    if (constraint.node.func) {
        instanceTypeClass = functionTypeClassConstraint(constraint, env);
    } else {
        instanceTypeClass = identifierTypeClassConstraint(constraint, env);
    }

    if (t.prune(instanceTypeClass.type) instanceof t.Variable) {
        return unsolvedCallback(instanceTypeClass);
    }

    var solved = _.find(env, function (t, n) {
        if (!t.typeClassInstance || t.typeClassInstance.name != instanceTypeClass.name) {
            return false;
        }

        try {
            unify(instanceTypeClass.fresh(), t.typeClassInstance.type.fresh());
        } catch (e) {
            return false;
        }

        constraint.node.typeClassInstance = n;

        return true;
    });

    if (solved) return;

    unsolvedCallback(instanceTypeClass);
};

// Run inference on an array of AST nodes.
var typecheck = function (ast, env, aliases, opts) {
    currentFile = opts.filename;
    if (!env.$operators) {
        env.$operators = {
            binary: {},
            unary: {}
        };


        // Add built-in binary operators  
        var NumberType = new t.NumberType();
        var StringType = new t.StringType();
        var BooleanType = new t.BooleanType();

        // Arithmetic operators  
        env.$operators.binary['++'] = [
            {
                types: [StringType, StringType, StringType],
                name: '++',
                type: new t.FunctionType([StringType, StringType, StringType]),
                builtin: true
            }
        ];

        env.$operators.binary['+'] = [
            {
                types: [NumberType, NumberType, NumberType],
                name: '+',
                type: new t.FunctionType([NumberType, NumberType, NumberType]),
                builtin: true
            }
        ];



        env.$operators.binary['-'] = [{
            types: [NumberType, NumberType, NumberType],
            name: '-',
            type: new t.FunctionType([NumberType, NumberType, NumberType]),
            builtin: true
        }];

        env.$operators.binary['*'] = [{
            types: [NumberType, NumberType, NumberType],
            name: '*',
            type: new t.FunctionType([NumberType, NumberType, NumberType]),
            builtin: true
        }];

        env.$operators.binary['/'] = [{
            types: [NumberType, NumberType, NumberType],
            name: '/',
            type: new t.FunctionType([NumberType, NumberType, NumberType]),
            builtin: true
        }];

        env.$operators.binary['%'] = [{
            types: [NumberType, NumberType, NumberType],
            name: '%',
            type: new t.FunctionType([NumberType, NumberType, NumberType]),
            builtin: true
        }];


        // Comparison operators  
        env.$operators.binary['<'] = [{
            types: [NumberType, NumberType, BooleanType],
            name: '<',
            type: new t.FunctionType([NumberType, NumberType, BooleanType]),
            builtin: true
        }];

        env.$operators.binary['>'] = [{
            types: [NumberType, NumberType, BooleanType],
            name: '>',
            type: new t.FunctionType([NumberType, NumberType, BooleanType]),
            builtin: true
        }];

        // Unary operators  
        env.$operators.unary['!'] = [{
            types: [BooleanType, BooleanType],
            name: '!',
            type: new t.FunctionType([BooleanType, BooleanType]),
            builtin: true
        }];

        env.$operators.binary['=='] = [{
            types: [new t.Variable(), new t.Variable(), BooleanType],
            name: '==',
            type: new t.FunctionType([new t.Variable(), new t.Variable(), BooleanType]),
            builtin: true
        }];

        env.$operators.binary['!='] = [{
            types: [new t.Variable(), new t.Variable(), BooleanType],
            name: '!=',
            type: new t.FunctionType([new t.Variable(), new t.Variable(), BooleanType]),
            builtin: true
        }];
        env.$operators.binary['<='] = [{
            types: [NumberType, NumberType, BooleanType],
            name: '<=',
            type: new t.FunctionType([NumberType, NumberType, BooleanType]),
            builtin: true
        }];

        env.$operators.binary['>='] = [{
            types: [NumberType, NumberType, BooleanType],
            name: '>=',
            type: new t.FunctionType([NumberType, NumberType, BooleanType]),
            builtin: true
        }];

        env.$operators.binary['@'] = [{
            types: [],
            name: '@',
            type: new t.FunctionType([new t.ArrayType(new t.Variable()), NumberType, new t.Variable()]),
            builtin: true
        }];

    }

    env['__rml_sys_list_addFirst'] = new t.FunctionType([
        new t.Variable(),
        new t.ArrayType(new t.Variable()),
        new t.ArrayType(new t.Variable())
    ]);
    env['__rml_sys_list_addLast'] = new t.FunctionType([
        new t.Variable(),
        new t.ArrayType(new t.Variable()),
        new t.ArrayType(new t.Variable())
    ]);

    env['__rml_print'] = new t.FunctionType([
        new t.Variable(),
        new t.UnitType()
    ]);
    env['exit'] = new t.FunctionType([
        new t.NumberType(),
        new t.UnitType()
    ]);


    var types = _.map(ast, function (node) {
        try {

            var constraints = [];
            var type = analyse(node, env, [], aliases, constraints);
            _.each(constraints, function (constraint) {
                solveTypeClassConstraint(constraint, env, function (instance) {
                    throw "Couldn't find instance of: " + instance.toString();
                });
            });

            return type;
        } catch (err) {
            console.log(err)
            errors.reportError(node.filename, node.lineno, node.column, err);
        }
    });
    return types && types[0];
};
exports.typecheck = typecheck;

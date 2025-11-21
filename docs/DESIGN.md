## Introduction
This document contains the design decisions for Llaml. 
Most of these are inherited from the fork parent.

## Language Reference

### Literals
#### Comments
```c
// Hello. I am a comment

/*
Multi-line comment.
*/
```

#### Numbers
```f#
20
20.5
20_000
0xffffff
```

#### String
```f#
"Hello, world"
"
Hey I can span multiple lines
"
"I am {name}."
```

#### Boolean
```f#
true false
```


#### List
```f#
[]
[1,2,3]
1:[1,3,4]
1:1

[1,2,3] @ 0
```

#### Object
```f#
{name: "Hello", age: 20}
{name, age}
```


#### Tuple
```f#
(1, "Hello", true)
```


#### Unit
```f#
()
```

### Types

- Number
- String
- Boolean
- Tuple
```f#
(Number, Number)
```
- Object
```f#
{x: Number, y: Number}
```
- Function
```f#
type VecOp = Vec2 -> Vec2 -> Vec3
```
- Generic Type
```f#
't 'a
```
- Enum
```f#
type Switch = On | Off
type Option 'a = Some 'a | None
type List 'a = ['a]
```
- Type Alias
```f#
type NumberList = List Number
type AgeData = Number
```
- Reference
```f#
type MutableNumber = &Number
```


### Functions

Function are declared like this:

```f#
let add a b = a + b
let mul a b = a * b
```

Type annotations can be provided to function parameters and the return
```f#
let add (a: Number) (b: Number) : Number = a + b
let getHead (list: ['a]): 'a = list @ 0
```
> getHead does not account for the case of []. Its just an example. 

Functions are curried by default . We will see an example of that later.

### Variables
Variables are immutable by default.
```f#
let langName = "Llaml"
let width = 200
let 
  var1 = 3
  var2 = var1 * var1
  var3 = var2 * var2
in var1 + var2 + var3
```

Mutability is handled using references. A variable of type ```&'t``` can be modified.
```f#
let langName = &"Llaml" // Produces &String
langName = "Llaml2"
```

### Function Currying
>>In mathematics and computer science, currying is the technique of translating a function that takes multiple arguments into a sequence of families of functions, each taking a single argument - [Wikipedia](https://en.wikipedia.org/wiki/Currying)

In short: currying allows us to call a function with missing argument to partialy evaluate it. 
If all arguments are provided then it gets called eargerly.
```f#
let add a b = a + b 
let addTen = add 10 // Partially evaluating add and producing a function that takes b
let result = addTen 20 // => 30
```

### Pattern matching
This will allow to easily de-structure variant enums, tuples and objects. 
Infact, this will work with any type.

```kotlin
when (a, b) is 
  | (x, 0) -> Err "Divide by zero"
  | (x, y) -> Ok (x/y)
```

### Modules
Modules should be dictated by the code storage structure. Similar to how golang does it.

```f#
open Std.Printf // maps to std/printf/*.rml
open Std.String.{format, concat} // You can even import the exported functions directly
open GameState // assumes gamestate dir is in the same directory as the file you are importing from
```

### Annotations
Annotations allow us to inject code transformations both at runtime and compiletime. 
Annotations are used only for functions, like this:
```f#
//std/string/lib.rml
#[export]
let concat (lhs: String) (rhs: String) : String = .. 

#[async]
let getUser id = ...
```
Using annotations we can even call external functions at compile time. E.g:
```f#
#[extern("Math.sin")]
let sin (a: Number) : Number
```
becomes this, at compiletime
```f#
let sin (a: Number) : Number = Math.sin a
```
#### Note: External functions MUST have type declarations for arguments and the return type. Your program cannot compile if they are missing.


## Llaml

## Why
I forked the "Roy" project because the original dev gave up and I would like to use it
as a hands on learning tool for learning type inference and structural typing.
I also would like to use it to learn how does a language like ocaml combine 
imperative concepts (Such as loops and references) while still being a functional language.

## Features
- [X] No `do` block/Monads
- [X] Function currying
- [X] Structural typing
- [X] Cli Improvements
- [X] Modules
- [X] Proper error messages
- [ ] Formatter/Pretty printer (WIP)
- [X] Include files
- [X] Pattern matching
- [X] Typed external functions
- [X] Annotations
- [X] Operator overloading
- [X] Mutability (Using References)
- [X] Custom stdlib
- [X] Build binaries (Using QuickJS as the runtime)
- [X] Let in expression

## Example
```ocaml
open Std.Printf
open Std.List ((:), map, filter)
open Std.Pipe ((|>))

let main () = 
  1:2:3:4:5
  |> map (\x -> x * 2)
  |> filter (\x -> x > 2)
  |> Printf.println
```


## Building

#### Build Requirements
In the project to compile and run without issues please make sure the following are installed
and available on your path.
- NodeJS
- QuickJS

#### Build Steps

Run the following steps in sequence
 
```sh
$ git clone https://github.com/hexaredecimal/Llaml.git
$ cd Llaml
$ npm install
$ make || make clean && make dist
$ ./llml help
```



## Contributions
Contributions are welcome and be mindful that this is a fork of project that is greater than 12 years. 
The JS standard is so 2013 (using var, instead of let and const). 


## References and study material
[Archived Roy](https://github.com/puffnfresh/roy) - This repository was archived by the owner on Nov 23, 2017. It is now read-only.

[Imperative to Functional Programming Succinctly](https://www.syncfusion.com/succinctly-free-ebooks/imperative)

[Functional Programming in OCaml](https://www.ps.uni-saarland.de/~smolka/drafts/prog2021.pdf)

[Learning F# by Designing Your Own Language by Oleksii Holub | JetBrains](http://youtube.com/watch?v=34C_7halqGw)

<a href="https://deepwiki.com/hexaredecimal/royml"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>

## Reference Projects
[Reason ML](https://reasonml.github.io/en/)

[Ocaml](https://ocaml.org/)

[Sml](https://smlfamily.github.io/)

[F#](https://fsharp.org/)


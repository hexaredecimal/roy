## RoyML

## Why
I forked the "Roy" project because the original dev gave up and I would like to use it
as a hands on learning tool for learning type inference and structural typing.
I also would like to use it to learn how does a language like ocaml combine 
FP concepts while still being imparative.

## Features
- [ ] References
- [X] No `do` block/Monads
- [X] Function currying
- [X] Structural typing (WIP)
- [X] Cli Improvements
- [ ] Modules (Golang inspired)
- [ ] Proper error messages
- [ ] Formatter/Pretty printer (WIP)
- [ ] Include files
- [ ] Pattern matching
- [ ] Typed external functions
- [ ] Operator overloading
- [ ] Mutability/References
- [ ] Custom stdlib (With few external functions)
- [ ] Build binaries (Using QuickJS as the runtime)

## What I aim to achieve
```ocaml

open Std.Printf

let add a b = sum a b
  where
    sum a b = a + b

let main = 
  Printf.printf "{}" (add 10 10)
  
```

## References
[Archived Roy](https://github.com/puffnfresh/roy) - This repository was archived by the owner on Nov 23, 2017. It is now read-only.

## Reference Projects
[Reason ML](https://reasonml.github.io/en/)

[Ocaml](https://ocaml.org/)

[Sml](https://smlfamily.github.io/)

[F#](https://fsharp.org/)


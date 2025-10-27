## RoyML

## Why
I forked the "Roy" project because the original dev gave up and I would like to use it
as a hands on learning tool for learning type inference and structural typing.
I also would like to use it to learn how does a language like ocaml combine 
FP concepts while still being imparative.

## Features
- [ ] References
- [ ] No `do` block/Monads
- [ ] Function currying
- [ ] Structural typing
- [ ] Modules
- [ ] Include files
- [ ] Pattern matching
- [ ] Typed external functions
- [ ] Operator overloading

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
[Archived Roy](https://github.com/puffnfresh/roy)

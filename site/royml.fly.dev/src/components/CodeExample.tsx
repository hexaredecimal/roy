const CodeExample = () => {
  const codeSnippet = `// Define a polymorphic function
let map f xs = match xs with
  | [] -> []
  | x::xs -> f x :: map f xs

// Type inference at work
let numbers = [1; 2; 3; 4; 5]
let doubled = map (fun x -> x * 2) numbers

// Pattern matching with algebraic types
type tree 'a =
  | Leaf
  | Node of 'a * tree 'a * tree 'a

let rec sum tree = match tree with
  | Leaf -> 0
  | Node (x, left, right) -> 
      x + sum left + sum right`;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">OCaml-Like</span> Syntax
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Write expressive, type-safe code with familiar OCaml patterns
          </p>
        </div>
        
        <div className="glass-panel rounded-2xl p-8 overflow-x-auto animate-fade-in">
          <pre className="text-sm md:text-base">
            <code className="text-foreground/90 font-mono leading-relaxed">
              {codeSnippet}
            </code>
          </pre>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Compiles to clean, readable JavaScript • Full type inference • No runtime overhead
          </p>
        </div>
      </div>
    </section>
  );
};

export default CodeExample;

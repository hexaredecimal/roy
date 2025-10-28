import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, FileCode } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/CodeEditor";

const defaultCode = `
let fib n =
  when n
  | 0 = 0
  | 1 = 1
  | n = fib (n - 1) + fib (n - 2)
`;

const examples = [
  {
    name: "Fibonacci",
    code: defaultCode,
  },
  {
    name: "List Operations",
    code: `
let list = [1,2,3,4,5]
let first = list @ 0
  `},
  {
    name: "Type Alias",
    code: `
type person = { name: String, age: Number }

let greet p = "Hello, " ++ p.name ++ "!"

let 
  alice = { name = "Alice"; age = 30 }
in greet alice
`,
},
];

const Playground = () => {
  const [code, setCode] = useState(defaultCode);
  const [showOutput, setShowOutput] = useState(false);
  const [compiledJS, setCompiledJS] = useState("");

  const handleRun = () => {
    // Simulate compilation to JavaScript
    const mockJS = `// Compiled JavaScript
function fib(n) {
  if (n === 0) return 0;
  if (n === 1) return 1;
  return fib(n - 1) + fib(n - 2);
}

const result = fib(10);
console.log(result); // 55`;
    
    setCompiledJS(mockJS);
  };

  const handleLoadExample = (exampleName: string) => {
    const example = examples.find(ex => ex.name === exampleName);
    if (example) {
      setCode(example.code);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gradient mb-4">RoyML Playground</h1>
            <p className="text-muted-foreground">
              Write and test RoyML code in real-time
            </p>
          </div>

          <div className="glass-panel p-6 mb-6 flex flex-wrap items-center gap-4">
            <Button onClick={handleRun} className="btn-glow">
              <Play className="h-4 w-4" />
              Run
            </Button>

            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <Label htmlFor="examples" className="text-sm">Examples:</Label>
              <Select onValueChange={handleLoadExample}>
                <SelectTrigger id="examples" className="w-[180px]">
                  <SelectValue placeholder="Select example" />
                </SelectTrigger>
                <SelectContent>
                  {examples.map((example) => (
                    <SelectItem key={example.name} value={example.name}>
                      {example.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="show-output"
                checked={showOutput}
                onCheckedChange={setShowOutput}
              />
              <Label htmlFor="show-output">Show JS Output</Label>
            </div>
          </div>

          <div className={`grid h-80 gap-6 ${showOutput ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="glass-panel overflow-hidden f-full">
              <div className="bg-muted/30 px-4 py-2 border-b border-border/50">
                <span className="text-sm font-medium">RoyML Code</span>
              </div>
              <CodeEditor value={code} onChange={setCode} language="royml" />
            </div>

            {showOutput && (
              <div className="glass-panel overflow-hidden h-full">
                <div className="bg-muted/30 px-4 py-2 border-b border-border/50">
                  <span className="text-sm font-medium">Compiled JavaScript</span>
                </div>
                <CodeEditor value={compiledJS} language="javascript" readOnly />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Playground;

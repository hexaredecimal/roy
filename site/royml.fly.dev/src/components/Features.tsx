import { Code2, Zap, Shield, GitBranch } from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "OCaml-Inspired Syntax",
    description: "Familiar syntax for OCaml developers with the power of JavaScript runtime"
  },
  {
    icon: Shield,
    title: "Strong Type System",
    description: "Damas-Hindley-Milner type inference with structural typing guarantees"
  },
  {
    icon: Zap,
    title: "Compiles to JavaScript",
    description: "Generate clean, readable JavaScript that runs anywhere"
  },
  {
    icon: GitBranch,
    title: "Fast compiler",
    description: "Fast compile times are a priority"
  }
];

const Features = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why <span className="text-gradient-accent">RoyML</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Modern functional programming with type safety and JavaScript interoperability
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-panel rounded-2xl p-8 hover:scale-105 hover:animate-glow transition-all duration-300 animate-fade-in group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:animate-glow">
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

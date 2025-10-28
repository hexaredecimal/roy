import { Button } from "@/components/ui/button";
import { Github, BookOpen, ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20 pt-32 overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      
      <div className="max-w-6xl mx-auto text-center relative z-10 animate-fade-in">
        <div className="inline-block mb-6 px-4 py-2 glass-panel rounded-full">
          <span className="text-sm font-medium text-gradient">Functional programming + JS</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
          <span className="text-gradient">RoyML</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-foreground/80 mb-4 max-w-3xl mx-auto leading-relaxed">
          A modern fork of Roy that brings you closer to OCaml
        </p>
        
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
          Structural typing with Damas-Hindley-Milner type system, compiling to JavaScript
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground btn-glow transition-all duration-300 group">
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="lg" variant="outline" className="glass-panel hover:bg-foreground/5 transition-all duration-300">
            <Github className="mr-2 h-5 w-5" />
            View on GitHub
          </Button>
          <Button size="lg" variant="ghost" className="hover:bg-foreground/5 transition-all duration-300">
            <BookOpen className="mr-2 h-5 w-5" />
            Documentation
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;

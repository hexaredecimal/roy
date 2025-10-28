import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Github, MessageCircle, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gradient cursor-pointer">
            <Link to="/">RoyML</Link>
	  </h1>
        </div>

        {/* Navigation Links - Center */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-foreground/5">
                Documentation
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-panel border-border/50">
              <DropdownMenuItem className="">Getting Started</DropdownMenuItem>
              <DropdownMenuItem>Type System</DropdownMenuItem>
              <DropdownMenuItem>Syntax Guide</DropdownMenuItem>
              <DropdownMenuItem>API Reference</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-foreground/5">
                Learn
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-panel border-border/50">
              <DropdownMenuItem>Tutorial</DropdownMenuItem>
              <DropdownMenuItem>Examples</DropdownMenuItem>
              <DropdownMenuItem>Best Practices</DropdownMenuItem>
              <DropdownMenuItem>Migration Guide</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-foreground/5">
                Community
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-panel border-border/50">
              <DropdownMenuItem>Discord</DropdownMenuItem>
              <DropdownMenuItem>GitHub Discussions</DropdownMenuItem>
              <DropdownMenuItem>Blog</DropdownMenuItem>
              <DropdownMenuItem>Contribute</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" className="hover:bg-foreground/5 btn-glow" asChild>
            <Link to="/playground">Playground</Link>
          </Button>
        </div>

        {/* Social Links - Far Right */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-foreground/5"
            asChild
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-foreground/5"
            asChild
          >
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

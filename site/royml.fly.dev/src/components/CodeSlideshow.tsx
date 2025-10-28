import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/CodeEditor";

const codeExamples = [
  {
    title: "Hello World",
    code: 
`
    open Std.Printf

    // greet: String -> String
    let greet name = "Hello" ++ name

    let main =
        let 
          wrld = ", World"
        in wrld 
	      |> greet 
	      |> Printf.printf
`
  },
  {
    title: "Variants",
    code: 
`
  type Option a = Some a | None
 
  type Weekdays = 
    Monday
    | Tuesday
    | Wednesday
    | Thursday
    | Friday

  let getWeekdayIndex (weekday: Weekdays) : Option Number = 
    when weekday
     | Monday = Some 0
     | Tuesday = Some 1
     | Wednesday = Some 2
     | Thursday = Some 3
     | Friday = Some 4
     | _ = None
`
  },
  {
    title: "Function currying",
    code: 
`
    open Std.List
    
    let incrementList = List.fold_l (+) 0

    let newList oldList = incrementList oldList
`
  },
];

const CodeSlideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % codeExamples.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const nextSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev + 1) % codeExamples.length);
  };

  const prevSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev - 1 + codeExamples.length) % codeExamples.length);
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            See <span className="text-gradient">RoyML</span> in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore expressive, type-safe code examples
          </p>
        </div>

        <div className="relative glass-panel rounded-2xl p-8 animate-fade-in">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gradient-accent">
              {codeExamples[currentSlide].title}
            </h3>
          </div>

          <div className="relative overflow-hidden rounded-lg p-6 min-h-[300px] flex items-center">
	    <CodeEditor value={codeExamples[currentSlide].code}/>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              className="hover:bg-foreground/5"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex gap-2">
              {codeExamples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAutoPlay(false);
                    setCurrentSlide(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted hover:bg-muted-foreground"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              className="hover:bg-foreground/5"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Auto-play indicator */}
          <div className="text-center mt-4">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isAutoPlay ? "⏸ Pause" : "▶ Play"} Auto-advance
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodeSlideshow;

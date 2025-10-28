import { useState, useEffect } from "react";
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';



interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "royml" | "javascript";
  readOnly?: boolean;
}

const CodeEditor = ({ value, onChange, language = "royml", readOnly = false }: CodeEditorProps) => {
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    hljs.registerLanguage('royml', function(hljs) {
      return {
        name: 'RoyML',
        keywords: {
          keyword: 'let in with if then else when type where open',
          built_in: '',
          literal: 'true false'
        },
        contains: [
          hljs.COMMENT('//', '$'),
          {
            className: 'string',
            begin: '"',
            end: '"',
            contains: [hljs.BACKSLASH_ESCAPE]
          },
          {
            className: 'number',
            begin: '\\b\\d+(\\.\\d+)?\\b'
          },
          {
            className: 'function',
            beginKeywords: 'function',
            end: '=',
            contains: [
              {
                className: 'title',
                begin: '[a-zA-Z_][a-zA-Z0-9_]*'
              },
              {
                className: 'params',
                begin: '\\(',
                end: '\\)',
                contains: [
                  {
                    className: 'variable',
                    begin: '[a-zA-Z_][a-zA-Z0-9_]*'
                  }
                ]
              }
            ]
          },
          {
            className: 'operator',
            begin: '(\\|>|->|=|\\+|\\-|\\*|\\/|<|>)'
          }
        ]
      };
    });

    // Now highlight the code
    try {
      const result = hljs.highlight(value, { language: language == 'royml' && "royml" || "javascript" });
      setHighlightedCode(result.value);
    } catch (error) {
      console.error('Highlighting error:', error);
      setHighlightedCode(value);
    }
  }, [value]);
  const lines = value.split('\n');



  return (
      <div className="relative flex rounded-lg overflow-hidden">
	<div className="select-none text-gray-500 text-sm font-mono text-right pr-4 pl-2 py-6 border-r border-gray-700 h-full">
	  {lines.map((_, i) => (
		<div key={i} className="leading-relaxed">{i + 1}</div>
	  ))}
	</div>

        <pre className="p-6 overflow-x-auto text-sm leading-relaxed text-left">
          <code 
            className={`text-gray-300 font-mono block text-left language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
  );
};

export default CodeEditor;

// src/app/components/JsonViewer.tsx
"use client";

import { useState } from "react";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Helper to handle circular JSON references if any
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

export function JsonViewer({ data }: { data: any }) {
  const [copied, setCopied] = useState(false);

  // Safely format the JSON
  const jsonString = typeof data === "string" 
    ? data 
    : JSON.stringify(data, getCircularReplacer(), 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* Header / Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* JSON Label */}
        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-500 select-none">
          JSON
        </span>
        
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={cls(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
            "border shadow-sm backdrop-blur-md",
            copied
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600"
          )}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Code Block */}
      <pre
        className={cls(
          "text-xs font-mono leading-relaxed p-4 rounded-xl pt-10", // Added pt-10 for button space
          "bg-[#0F172A] border border-slate-800 text-blue-200/80",
          "overflow-x-auto max-h-[500px]",
          // CSS Scrollbar Styling (Modern Browsers + Webkit)
          // This sets thumb to Slate-700 and track to Transparent
          "[scrollbar-width:thin] [scrollbar-color:#334155_transparent]", 
          "selection:bg-blue-500/30"
        )}
        style={{
            // Fallback for older webkit browsers if Tailwind arbitrary values fail
            // @ts-ignore
            "--webkit-scrollbar-background": "transparent",
        }}
      >
        {jsonString}
      </pre>
      
      {/* CSS Injection for Webkit Scrollbars (Chrome/Safari/Edge) */}
      <style jsx>{`
        pre::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        pre::-webkit-scrollbar-track {
          background: transparent;
        }
        pre::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 4px;
          border: 2px solid #0F172A; /* Creates padding effect */
        }
        pre::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
        pre::-webkit-scrollbar-corner {
            background: transparent;
        }
      `}</style>
    </div>
  );
}
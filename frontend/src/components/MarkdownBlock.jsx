import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders markdown content (headings, bold, italic, lists, tables, code blocks, blockquotes).
 * Use for AI responses and any content that may contain **bold**, *italic*, tables, etc.
 * Avoids raw symbols like *** or // showing to the user.
 */
export function MarkdownBlock({ content, className = '' }) {
  if (!content || typeof content !== 'string') return null;
  return (
    <div className={`markdown-block ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...p }) => <h1 className="text-xl font-bold text-examia-dark mt-4 mb-2 first:mt-0" {...p} />,
          h2: ({ node, ...p }) => <h2 className="text-lg font-bold text-examia-dark mt-4 mb-2 first:mt-0" {...p} />,
          h3: ({ node, ...p }) => <h3 className="text-base font-semibold text-examia-dark mt-3 mb-1.5 first:mt-0" {...p} />,
          h4: ({ node, ...p }) => <h4 className="text-sm font-semibold text-examia-dark mt-2 mb-1 first:mt-0" {...p} />,
          h5: ({ node, ...p }) => <h5 className="text-sm font-medium text-examia-dark mt-2 mb-1" {...p} />,
          h6: ({ node, ...p }) => <h6 className="text-sm font-medium text-examia-dark mt-2 mb-1" {...p} />,
          p: ({ node, ...p }) => <p className="text-examia-dark text-sm my-1.5 leading-relaxed" {...p} />,
          strong: ({ node, ...p }) => <strong className="font-semibold text-examia-dark" {...p} />,
          em: ({ node, ...p }) => <em className="italic text-examia-dark" {...p} />,
          ul: ({ node, ...p }) => <ul className="list-disc list-inside my-2 space-y-0.5 text-examia-dark text-sm" {...p} />,
          ol: ({ node, ...p }) => <ol className="list-decimal list-inside my-2 space-y-0.5 text-examia-dark text-sm" {...p} />,
          li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
          hr: ({ node, ...p }) => <hr className="border-examia-soft/50 my-3" {...p} />,
          blockquote: ({ node, ...p }) => (
            <blockquote className="border-l-4 border-examia-mid/50 pl-4 my-2 text-examia-dark text-sm italic" {...p} />
          ),
          code: ({ node, inline, ...p }) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded bg-examia-soft/40 text-examia-dark text-sm font-mono" {...p} />
            ) : (
              <code className="block p-3 rounded-lg bg-examia-soft/30 text-examia-dark text-sm font-mono overflow-x-auto my-2" {...p} />
            ),
          pre: ({ node, ...p }) => <pre className="p-3 rounded-lg bg-examia-soft/20 overflow-x-auto my-2 text-sm" {...p} />,
          table: ({ node, ...p }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-examia-soft/50 rounded-lg overflow-hidden text-sm text-examia-dark" {...p} />
            </div>
          ),
          thead: ({ node, ...p }) => <thead className="bg-examia-soft/30" {...p} />,
          tbody: ({ node, ...p }) => <tbody className="divide-y divide-examia-soft/30" {...p} />,
          tr: ({ node, ...p }) => <tr className="border-b border-examia-soft/30 last:border-0" {...p} />,
          th: ({ node, ...p }) => (
            <th className="px-3 py-2 text-left font-semibold text-examia-dark border-r border-examia-soft/30 last:border-r-0" {...p} />
          ),
          td: ({ node, ...p }) => (
            <td className="px-3 py-2 text-examia-dark border-r border-examia-soft/20 last:border-r-0" {...p} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

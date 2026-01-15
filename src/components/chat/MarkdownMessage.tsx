import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with proper formatting for AI messages.
 * Supports bold, italic, lists, code blocks, and GitHub Flavored Markdown.
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // Inline code
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        // Code blocks
        pre: ({ children }) => (
          <pre className="my-2 p-3 rounded-lg bg-muted overflow-x-auto">
            {children}
          </pre>
        ),
        // Unordered lists
        ul: ({ children }) => (
          <ul className="my-2 ml-4 space-y-1 list-disc list-outside">{children}</ul>
        ),
        // Ordered lists
        ol: ({ children }) => (
          <ol className="my-2 ml-4 space-y-1 list-decimal list-outside">{children}</ol>
        ),
        // List items
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="my-2 pl-3 border-l-2 border-muted-foreground/30 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
        // Horizontal rules
        hr: () => (
          <hr className="my-4 border-border" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function decodeHtmlEntities(value: string) {
  if (typeof document === "undefined" || !value.includes("&")) {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function normalizeMarkdownSource(value: string) {
  let normalized = value.replace(/\r\n?/g, "\n");
  const hasEscapedControlCharacters = /\\r\\n|\\n|\\r|\\t/.test(normalized);

  if (hasEscapedControlCharacters) {
    normalized = normalized
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\([`*_{}\[\]()#+\-.!>])/g, "$1");
  }

  normalized = decodeHtmlEntities(normalized)
    .replace(/\*\*\s+([^\n*][^\n]*?[^\s*])\s+\*\*/g, "**$1**")
    .replace(/\*\*([^\n*][^\n]*?[^\s*])\s+\*\*/g, "**$1**")
    .replace(/\*\*\s+([^\n*][^\n]*?[^\s*])\*\*/g, "**$1**")
    .replace(/__\s+([^\n_][^\n]*?[^\s_])\s+__/g, "__$1__")
    .replace(/__([^\n_][^\n]*?[^\s_])\s+__/g, "__$1__")
    .replace(/__\s+([^\n_][^\n]*?[^\s_])__/g, "__$1__")
    .replace(/([^\s])(\[[^[\]]+\]\([^)]+\))/g, "$1 $2");

  return normalized;
}

export function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const normalizedContent = normalizeMarkdownSource(children);

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_em]:italic [&_h1]:my-5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:my-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-4 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node: _node, href, ...props }) => {
            const isExternal = typeof href === "string"
              ? /^(https?:)?\/\//.test(href)
              : false;

            return (
              <a
                href={href}
                rel={isExternal ? "noreferrer" : undefined}
                target={isExternal ? "_blank" : undefined}
                {...props}
              />
            );
          },
          p: ({ node: _node, className: paragraphClassName, ...props }) => (
            <p
              className={cn("whitespace-pre-line", paragraphClassName)}
              {...props}
            />
          ),
          strong: ({ node: _node, className: strongClassName, ...props }) => (
            <strong
              className={cn("font-bold text-foreground", strongClassName)}
              {...props}
            />
          ),
          em: ({ node: _node, className: emphasisClassName, ...props }) => (
            <em
              className={cn("italic", emphasisClassName)}
              {...props}
            />
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

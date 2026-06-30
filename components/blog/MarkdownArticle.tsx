/* eslint-disable @next/next/no-img-element */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownArticle({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-10 text-3xl font-bold text-slate-950 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-10 text-2xl font-bold text-slate-950">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-8 text-xl font-semibold text-slate-900">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mt-5 text-base leading-8 text-slate-700">{children}</p>
        ),
        a: ({ href, children }) => {
          const external = href?.startsWith("http");
          return (
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-800"
            >
              {children}
            </a>
          );
        },
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-950">{children}</strong>
        ),
        em: ({ children }) => <em className="text-slate-700">{children}</em>,
        ul: ({ children }) => (
          <ul className="mt-5 list-disc space-y-2 pl-6 text-slate-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-5 list-decimal space-y-2 pl-6 text-slate-700">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mt-6 border-l-4 border-blue-300 bg-blue-50 px-5 py-3 text-slate-700">
            {children}
          </blockquote>
        ),
        pre: ({ children }) => (
          <pre className="mt-6 overflow-x-auto rounded-lg bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            {children}
          </pre>
        ),
        code: ({ children, className }) => (
          <code
            className={
              className
                ? className
                : "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-900"
            }
          >
            {children}
          </code>
        ),
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt ?? "Article visual"}
            loading="lazy"
            className="mt-8 max-h-[620px] w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
          />
        ),
        hr: () => <hr className="my-10 border-slate-200" />,
        table: ({ children }) => (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-200 px-4 py-3 text-slate-700">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

import type { DocPage, DocBlockType } from "@/data/docs-content";
import { DocsCallout } from "./DocsCallout";
import { DocsCodeBlock } from "./DocsCodeBlock";
import { cn } from "@/lib/utils";

function renderInlineMarkdown(text: string) {
  // Handle bold (**text**) and inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-secondary text-sm font-mono text-primary">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function Block({ block }: { block: DocBlockType }) {
  switch (block.type) {
    case "paragraph":
      return (
        <div className="my-3 text-muted-foreground leading-7 text-[15px] whitespace-pre-line">
          {renderInlineMarkdown(block.text)}
        </div>
      );
    case "heading":
      const Tag = block.level === 2 ? "h2" : "h3";
      return (
        <Tag
          id={block.id}
          className={cn(
            "scroll-mt-20 font-semibold text-foreground",
            block.level === 2 ? "text-xl mt-10 mb-3" : "text-lg mt-8 mb-2"
          )}
        >
          <a href={`#${block.id}`} className="hover:text-primary transition-colors">
            {block.text}
          </a>
        </Tag>
      );
    case "code":
      return <DocsCodeBlock blocks={block.blocks} />;
    case "callout":
      return (
        <DocsCallout variant={block.variant} title={block.title}>
          {renderInlineMarkdown(block.text)}
        </DocsCallout>
      );
    case "list":
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className={cn("my-3 space-y-2 text-[15px]", block.ordered ? "list-decimal pl-6" : "list-disc pl-6")}>
          {block.items.map((item, i) => (
            <li key={i} className="text-muted-foreground leading-7">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ListTag>
      );
    default:
      return null;
  }
}

interface DocsContentProps {
  page: DocPage;
}

export function DocsContent({ page }: DocsContentProps) {
  return (
    <article className="min-w-0 flex-1 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">{page.title}</h1>
      <p className="text-muted-foreground text-[15px] mb-8 leading-7">{page.description}</p>
      {page.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </article>
  );
}

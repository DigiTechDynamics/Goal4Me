export type ArticleBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

/**
 * Money lessons and running guides use a tiny article format: paragraphs separated by blank lines and
 * "- " bullet lines. Parsing it ourselves avoids shipping a markdown engine.
 */
export function parseArticleBody(body: string): ArticleBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): ArticleBlock => {
      const lines = chunk.split("\n").map((line) => line.trim());
      return lines.every((line) => line.startsWith("- "))
        ? { type: "list", items: lines.map((line) => line.slice(2).trim()) }
        : { type: "paragraph", text: lines.join(" ") };
    });
}

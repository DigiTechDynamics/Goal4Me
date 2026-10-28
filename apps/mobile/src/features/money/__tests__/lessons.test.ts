import { describe, expect, it } from "vitest";
import { parseLessonBody } from "../lessonBody";

describe("parseLessonBody", () => {
  it("splits paragraphs and bullet lists", () => {
    const blocks = parseLessonBody(`First line
continues here.

- One
- Two

Last.`);
    expect(blocks).toEqual([
      { type: "paragraph", text: "First line continues here." },
      { type: "list", items: ["One", "Two"] },
      { type: "paragraph", text: "Last." },
    ]);
  });

  it("ignores extra blank lines", () => {
    expect(parseLessonBody("\n\nA\n\n\n\nB\n")).toHaveLength(2);
  });
});

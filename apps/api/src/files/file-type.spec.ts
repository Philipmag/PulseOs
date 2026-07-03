import { classifyFileType } from "./file-type.js";

describe("classifyFileType", () => {
  it("detects by extension", () => {
    expect(classifyFileType("deck.pdf")).toBe("pdf");
    expect(classifyFileType("notes.DOCX")).toBe("docx");
    expect(classifyFileType("readme.txt")).toBe("text");
    expect(classifyFileType("call.mp3")).toBe("audio");
    expect(classifyFileType("demo.mp4")).toBe("audio");
  });

  it("detects by mime when extension is absent/misleading", () => {
    expect(classifyFileType("blob", "application/pdf")).toBe("pdf");
    expect(classifyFileType("blob", "audio/wav")).toBe("audio");
    expect(classifyFileType("blob", "text/markdown")).toBe("text");
  });

  it("returns unknown for unsupported types", () => {
    expect(classifyFileType("archive.zip")).toBe("unknown");
    expect(classifyFileType("image.png")).toBe("unknown");
  });
});

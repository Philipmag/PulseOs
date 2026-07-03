export type ExtractableType = "pdf" | "docx" | "text" | "audio" | "unknown";

/**
 * Classifies an uploaded file into an extraction strategy. Pure + testable.
 * Supported per spec: PDF, DOCX, TXT, MP3/MP4 (audio → Whisper transcript).
 */
export function classifyFileType(
  fileName: string,
  mimeType?: string,
): ExtractableType {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const mime = (mimeType ?? "").toLowerCase();

  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (ext === "txt" || ext === "md" || mime.startsWith("text/")) return "text";
  if (
    ["mp3", "mp4", "m4a", "wav", "webm"].includes(ext) ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/")
  ) {
    return "audio";
  }
  return "unknown";
}

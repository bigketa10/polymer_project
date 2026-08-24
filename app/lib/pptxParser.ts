export type NativeSlide = { number: number; title: string; body: string[] };

function readString(bytes: Uint8Array, start: number, length: number) {
  return new TextDecoder().decode(bytes.slice(start, start + length));
}

async function inflate(bytes: Uint8Array) {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  await writer.write(bytes.slice().buffer as ArrayBuffer);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function readZipEntries(file: ArrayBuffer) {
  const bytes = new Uint8Array(file);
  const view = new DataView(file);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = readString(bytes, offset + 30, nameLength);
    const dataStart = offset + 30 + nameLength + extraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.set(name, method === 0 ? compressed : await inflate(compressed));
    offset = dataStart + compressedSize;
  }
  return entries;
}

export async function parsePptx(
  file: File,
  onProgress?: (message: string) => void,
): Promise<NativeSlide[]> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read PowerPoint files. Try the latest Chrome or Edge.");
  }
  onProgress?.("Reading PowerPoint file...");
  const entries = await readZipEntries(await file.arrayBuffer());
  const slideNames = [...entries.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  onProgress?.(`Found ${slideNames.length} slides. Extracting text...`);
  return slideNames.map((name, index) => {
    const data = entries.get(name)!;
    const document = new DOMParser().parseFromString(readString(data, 0, data.length), "application/xml");
    const paragraphs = [...document.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "p")]
      .map((paragraph) => [...paragraph.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "t")]
        .map((text) => text.textContent || "").join(""))
      .map((text) => text.trim()).filter(Boolean);
    return { number: index + 1, title: paragraphs[0] || `Slide ${index + 1}`, body: paragraphs.slice(1) };
  });
}
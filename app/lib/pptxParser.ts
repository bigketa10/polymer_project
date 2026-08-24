import JSZip from "jszip";

export type NativeSlide = { number: number; title: string; body: string[] };

const DRAWING_NAMESPACE = "http://schemas.openxmlformats.org/drawingml/2006/main";

export async function parsePptx(
  file: File,
  onProgress?: (message: string) => void,
): Promise<NativeSlide[]> {
  onProgress?.("Opening PowerPoint file...");
  const zip = await JSZip.loadAsync(file);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

  if (slideNames.length === 0) return [];
  const slides: NativeSlide[] = [];

  for (let index = 0; index < slideNames.length; index += 1) {
    const name = slideNames[index];
    onProgress?.(`Reading slide ${index + 1} of ${slideNames.length}...`);
    const xml = await zip.file(name)!.async("string");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphs = [...document.getElementsByTagNameNS(DRAWING_NAMESPACE, "p")]
      .map((paragraph) => [...paragraph.getElementsByTagNameNS(DRAWING_NAMESPACE, "t")]
        .map((text) => text.textContent || "").join(""))
      .map((text) => text.trim())
      .filter(Boolean);
    slides.push({
      number: index + 1,
      title: paragraphs[0] || `Slide ${index + 1}`,
      body: paragraphs.slice(1),
    });
  }

  return slides;
}

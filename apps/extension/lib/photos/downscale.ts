interface DownscaleOptions {
  maxEdge?: number;
  quality?: number;
}

interface Size {
  width: number;
  height: number;
}

export const fitWithin = (
  width: number,
  height: number,
  maxEdge: number,
): Size => {
  const scale = Math.min(1, maxEdge / Math.max(width, height));

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The photo could not be read as a data URL"));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function downscale(
  file: Blob,
  { maxEdge = 1600, quality = 0.85 }: DownscaleOptions = {},
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The canvas has no 2d context");

    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    return await readAsDataUrl(
      await canvas.convertToBlob({ type: "image/jpeg", quality }),
    );
  } finally {
    bitmap.close();
  }
}

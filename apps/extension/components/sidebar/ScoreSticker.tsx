import { signedEuros } from "@/lib/format";

export interface ScoreStickerProps {
  score: number;
  margin: number;
  size: "full" | "mini";
}

const SCORE = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ScoreSticker({ score, margin, size }: ScoreStickerProps) {
  const label = `Score ${SCORE.format(score)} sur 10, marge ${signedEuros(margin)}`;

  if (size === "mini")
    return (
      <span className="sticker sticker-mini" role="img" aria-label={label}>
        {SCORE.format(score)}
      </span>
    );

  return (
    <p className="sticker flex flex-col" role="img" aria-label={label}>
      <span className="sticker-score">{SCORE.format(score)}</span>
      <span className="sticker-margin">{signedEuros(margin)} de marge</span>
    </p>
  );
}

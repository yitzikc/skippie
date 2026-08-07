import type { ScoreState } from "../sim/types";

type Props = {
  score: ScoreState;
};

const labels: Array<[keyof ScoreState, string]> = [
  ["situationalAwareness", "Awareness"],
  ["workloadDistribution", "Delegation"],
  ["communicationClarity", "Clarity"],
  ["proceduralCompliance", "Procedure"],
  ["safetyMargin", "Safety"],
];

export function ScoreBars({ score }: Props) {
  return (
    <div className="score-bars">
      {labels.map(([key, label]) => (
        <label className="score-row" key={key}>
          <span>{label}</span>
          <meter min="0" max="100" value={score[key]} />
          <strong>{score[key]}</strong>
        </label>
      ))}
    </div>
  );
}

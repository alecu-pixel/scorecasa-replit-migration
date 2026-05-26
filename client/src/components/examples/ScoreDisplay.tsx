import ScoreDisplay from '../ScoreDisplay';

export default function ScoreDisplayExample() {
  return (
    <ScoreDisplay
      score={7.8}
      scoreBreakdown={[
        { label: 'Market Strength', score: 85, weight: 0.25 },
        { label: 'Demographic Trends', score: 78, weight: 0.20 },
        { label: 'School Quality', score: 80, weight: 0.20 },
        { label: 'Safety Score', score: 72, weight: 0.15 },
        { label: 'Walkability', score: 65, weight: 0.10 },
        { label: 'Rental Potential', score: 68, weight: 0.10 },
      ]}
    />
  );
}

import WalkabilityDisplay from '../WalkabilityDisplay';

export default function WalkabilityDisplayExample() {
  return (
    <WalkabilityDisplay
      data={{
        walkScore: 78,
        transitScore: 65,
        bikeScore: 72,
        amenityCount: 45,
        amenities: [],
      }}
    />
  );
}

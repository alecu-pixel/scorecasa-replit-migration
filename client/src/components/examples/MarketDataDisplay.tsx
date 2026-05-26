import MarketDataDisplay from '../MarketDataDisplay';

export default function MarketDataDisplayExample() {
  return (
    <MarketDataDisplay
      data={{
        zipCode: "78701",
        medianHomeValue: 485000,
        medianRent: 1850,
        homeownershipRate: 42.5,
        totalHousingUnits: 9250,
        occupiedUnits: 8621,
        vacantUnits: 629,
        vacancyRate: 4.2,
      }}
    />
  );
}

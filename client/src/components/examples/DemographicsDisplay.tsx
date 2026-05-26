import DemographicsDisplay from '../DemographicsDisplay';

export default function DemographicsDisplayExample() {
  return (
    <DemographicsDisplay
      data={{
        medianIncome: 75000,
        population: 45000,
        employmentRate: 94.5,
        collegeDegreePct: 38.2,
        housingUnits: 18500,
        zipName: 'ZCTA5 78701',
        populationGrowth5yr: 5.2,
        incomeGrowth5yr: 8.5,
        housingGrowth5yr: 4.1,
      }}
    />
  );
}

import PropertyDetails from '../PropertyDetails';

export default function PropertyDetailsExample() {
  return (
    <PropertyDetails
      data={{
        price: 425000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1850,
        yearBuilt: 2008,
        pricePerSqft: 230,
        estimatedRent: 2400,
      }}
    />
  );
}

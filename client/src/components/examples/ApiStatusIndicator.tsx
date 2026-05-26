import ApiStatusIndicator from '../ApiStatusIndicator';

export default function ApiStatusIndicatorExample() {
  return (
    <div className="flex flex-wrap gap-3">
      <ApiStatusIndicator status="loading" label="Census API" />
      <ApiStatusIndicator status="success" label="Growth Data" />
      <ApiStatusIndicator status="error" label="Walkability" />
    </div>
  );
}

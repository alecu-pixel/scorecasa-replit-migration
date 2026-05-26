import SearchInput from '../SearchInput';

export default function SearchInputExample() {
  return (
    <SearchInput 
      onAnalyze={(address) => console.log('Analyze:', address)} 
      loading={false}
    />
  );
}

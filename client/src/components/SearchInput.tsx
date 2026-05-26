import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  onAnalyze: (address: string) => void;
  loading?: boolean;
}

export default function SearchInput({ onAnalyze, loading = false }: SearchInputProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onAnalyze(address.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex gap-3">
        <div className="relative flex-1 search-futuristic">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <Input
            type="text"
            placeholder="Enter property address with ZIP code (e.g., 123 Main St, Austin, TX 78701)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            className="pl-12 h-14 text-base bg-transparent border-0 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-address"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !address.trim()}
          size="lg"
          className="h-14 px-8 btn-gradient-purple"
          data-testid="button-analyze"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing
            </>
          ) : (
            'Analyze Property'
          )}
        </Button>
      </div>
      <p className="text-sm text-gray-500 mt-3">
        Example: 1600 Pennsylvania Avenue NW, Washington, DC 20500
      </p>
    </form>
  );
}

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

interface ApiStatusIndicatorProps {
  status: ApiStatus;
  label: string;
}

export default function ApiStatusIndicator({ status, label }: ApiStatusIndicatorProps) {
  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          className: 'bg-gray-700/50 text-gray-300 border-gray-600',
          text: 'Loading...',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          text: 'Success',
        };
      case 'error':
        return {
          icon: <XCircle className="w-3 h-3 text-red-400" />,
          className: 'bg-red-500/10 text-red-400 border-red-500/30',
          text: 'Failed',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <Badge className={`gap-1.5 ${config.className}`} data-testid={`status-${label}`}>
      {config.icon}
      <span className="text-xs">{label}: {config.text}</span>
    </Badge>
  );
}

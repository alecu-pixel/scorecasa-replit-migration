import MetricCard from '../MetricCard';
import { TrendingUp } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <MetricCard
      icon={TrendingUp}
      title="Market Strength"
      score={85}
      description="Strong appreciation and healthy rental yield"
    />
  );
}

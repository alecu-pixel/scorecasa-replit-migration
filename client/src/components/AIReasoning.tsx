import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface AIReasoningProps {
  reasoning: string;
}

export default function AIReasoning({ reasoning }: AIReasoningProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Market outlook in plain English</h3>
      </div>
      
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-base leading-relaxed whitespace-pre-wrap" data-testid="text-ai-reasoning">
          {reasoning}
        </p>
      </div>
    </Card>
  );
}

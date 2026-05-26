import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center hero-glow">
      <Card className="w-full max-w-md mx-4 glass-card border-gray-700/50">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Button 
            className="w-full mt-6 btn-gradient-purple" 
            onClick={() => setLocation('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

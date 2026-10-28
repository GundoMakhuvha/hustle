import { HustleMark } from "@/components/brand/HustleLogo";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 bg-foreground text-background rounded-2xl flex items-center justify-center">
          <HustleMark className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">Hustle</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

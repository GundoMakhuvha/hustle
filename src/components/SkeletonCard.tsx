import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  variant?: "service" | "conversation" | "booking";
}

const SkeletonCard = ({ variant = "service" }: SkeletonCardProps) => {
  if (variant === "conversation") {
    return (
      <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    );
  }

  if (variant === "booking") {
    return (
      <div className="p-4 bg-secondary rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl overflow-hidden">
      <Skeleton className="w-full h-32" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
};

export default SkeletonCard;

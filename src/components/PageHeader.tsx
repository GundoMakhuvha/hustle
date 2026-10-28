import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backTo?: string;
}

const PageHeader = ({ title, subtitle, action, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="p-2 -ml-2 rounded-lg hover:bg-secondary md:hidden"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl md:text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm md:text-base text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

export default PageHeader;

import { Link, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { HustleMark } from "@/components/brand/HustleLogo";

const NotFound = () => {
  const { pathname } = useLocation();
  return (
    <Layout>
      <div className="px-6 py-24 text-center flex flex-col items-center">
        <HustleMark className="w-16 h-16 text-foreground/15 mb-6" />
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="text-3xl md:text-4xl font-extrabold mt-2">This page took the day off.</h1>
        <p className="text-muted-foreground mt-3 max-w-sm">
          We couldn't find <span className="font-mono text-foreground">{pathname}</span>. It may have moved or never existed.
        </p>
        <div className="flex gap-2 mt-8">
          <Button asChild className="rounded-full">
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/browse">Browse services</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;

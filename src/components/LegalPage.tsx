import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

const LegalPage = ({ title, updated, children }: LegalPageProps) => {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView();
  }, [hash]);

  return (
    <Layout width="medium">
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-6">
        <PageHeader title={title} subtitle={`Last updated ${updated}`} />
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-h2:text-lg prose-h2:mt-8 prose-p:leading-relaxed prose-li:my-1">
          {children}
        </article>
      </div>
    </Layout>
  );
};

export default LegalPage;

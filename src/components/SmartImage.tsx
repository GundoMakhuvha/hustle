import { ImgHTMLAttributes, ReactNode, useState } from "react";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Rendered instead of the image if it is missing or fails to load. */
  fallback: ReactNode;
}

/** An <img> that swaps to a fallback when the source is empty or broken. */
const SmartImage = ({ src, fallback, ...props }: SmartImageProps) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return <img src={src} onError={() => setFailed(true)} {...props} />;
};

export default SmartImage;

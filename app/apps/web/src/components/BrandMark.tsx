import Image from "next/image";

/** Mascot logo (public/logo.png), shown beside the "FirstJobJab" wordmark. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/logo.png" width={size} height={size} alt="FirstJobJab" className={className} priority />;
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="font-display text-[120px] leading-none text-surface-2 select-none">404</p>
      <h1 className="font-display text-3xl text-white mb-3 -mt-4">PAGE NOT FOUND</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        This page doesn&apos;t exist or the anime was removed.
      </p>
      <Link
        href="/"
        className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default function LoadingSpinner({ fullPage = false, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-3' };
  const spinner = (
    <div className={`animate-spin rounded-full border-primary-200 border-t-primary-700 ${sizes[size]}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }
  return spinner;
}

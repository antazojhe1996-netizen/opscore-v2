export default function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <h1 className="text-3xl font-black text-red-400">
          Access Denied
        </h1>

        <p className="mt-3 text-slate-400">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  );
}
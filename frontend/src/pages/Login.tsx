export function Login() {
  const failed = new URLSearchParams(window.location.search).get('error');
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-brand">ReachInbox</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to schedule and track your emails.</p>
        {failed && <p className="mt-4 text-sm text-red-600">Sign-in failed. Please try again.</p>}
        <a
          href="/auth/google"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}

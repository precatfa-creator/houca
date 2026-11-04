/** Shown instead of the app when the Supabase environment variables are missing. */
export function SetupNotice() {
  return (
    <div dir="ltr" className="max-w-xl mx-auto mt-24 p-8 rounded-2xl bg-white shadow-xl font-mono text-sm space-y-3">
      <h1 className="text-xl font-bold font-sans">Supabase is not configured</h1>
      <p className="font-sans">Set these variables (see <code>.env.example</code>), then restart or rebuild:</p>
      <pre className="bg-gray-100 rounded-lg p-3">VITE_SUPABASE_URL=https://xxxx.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=sb_publishable_...</pre>
      <p className="font-sans text-gray-600">On Netlify: Site configuration → Environment variables, then redeploy.</p>
    </div>
  );
}

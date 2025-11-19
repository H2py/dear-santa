import { createClient } from "@/utils/supabase/server";

export default async function Notes() {
  const supabase = createClient();
  const { data: notes, error } = await supabase.from("notes").select();

  if (error) {
    return (
      <div className="p-4 text-sm text-red-300">
        Failed to load notes: {error.message}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <h1 className="text-xl font-semibold">Supabase Notes</h1>
      <pre className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
        {JSON.stringify(notes, null, 2)}
      </pre>
    </main>
  );
}

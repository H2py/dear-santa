import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Notes() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <h1 className="text-xl font-semibold">Supabase Notes</h1>
        <p className="mt-4 text-sm text-slate-300">
          Supabase 환경변수가 설정되어 있지 않아 노트를 불러올 수 없습니다.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: notes, error } = await supabase.from("notes").select();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <h1 className="text-xl font-semibold">Supabase Notes</h1>
      {error ? (
        <p className="mt-4 text-sm text-red-300">Failed to load notes: {error.message}</p>
      ) : (
        <pre className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
          {JSON.stringify(notes, null, 2)}
        </pre>
      )}
    </main>
  );
}

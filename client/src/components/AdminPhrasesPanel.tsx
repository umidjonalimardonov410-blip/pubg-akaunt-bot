import { useMemo, useState } from "react";
import { Languages, LoaderCircle, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PHRASES } from "@/lib/phrases";
import { setPhraseOverrides } from "@/lib/phraseStore";

type Draft = { uz: string; ru: string; en: string };

const PAGE_SIZE = 25;

/**
 * Admin panel: UZ/RU/EN tarjimalarini tahrirlash.
 * Saqlangan zahoti barcha foydalanuvchilarda real vaqtda yangilanadi.
 */
export default function AdminPhrasesPanel() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const utils = trpc.useUtils();
  const overridesQuery = trpc.phrases.list.useQuery(undefined, { staleTime: 5_000 });

  const overrides = useMemo(() => {
    const map: Record<string, Draft> = {};
    for (const row of overridesQuery.data ?? []) {
      map[row.key] = { uz: row.uz ?? "", ru: row.ru ?? "", en: row.en ?? "" };
    }
    return map;
  }, [overridesQuery.data]);

  const refresh = async () => {
    const rows = await utils.phrases.list.fetch();
    setPhraseOverrides(rows as any);
    utils.phrases.list.setData(undefined, rows);
  };

  const save = trpc.phrases.upsert.useMutation({
    onSuccess: async () => {
      toast.success("Tarjima saqlandi va real vaqtda qo‘llandi");
      await refresh();
    },
    onError: error => toast.error(error.message || "Saqlab bo‘lmadi"),
  });

  const remove = trpc.phrases.remove.useMutation({
    onSuccess: async () => {
      toast.success("Tarjima asl holatiga qaytarildi");
      await refresh();
    },
    onError: error => toast.error(error.message || "Tiklab bo‘lmadi"),
  });

  const keys = useMemo(() => {
    const all = Object.keys(PHRASES);
    for (const key of Object.keys(overrides)) if (!all.includes(key)) all.push(key);
    const query = search.trim().toLowerCase();
    const filtered = query
      ? all.filter(key => {
          const base = PHRASES[key];
          const override = overrides[key];
          return (
            key.toLowerCase().includes(query) ||
            (base?.ru ?? "").toLowerCase().includes(query) ||
            (base?.en ?? "").toLowerCase().includes(query) ||
            (override?.ru ?? "").toLowerCase().includes(query) ||
            (override?.en ?? "").toLowerCase().includes(query)
          );
        })
      : all;
    return filtered.sort((a, b) => a.localeCompare(b, "uz"));
  }, [search, overrides]);

  const pageCount = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = keys.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const draftFor = (key: string): Draft => {
    if (drafts[key]) return drafts[key];
    const override = overrides[key];
    const base = PHRASES[key];
    return {
      uz: override?.uz ?? key,
      ru: override?.ru || base?.ru || "",
      en: override?.en || base?.en || "",
    };
  };

  const setDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts(current => ({ ...current, [key]: { ...draftFor(key), ...patch } }));

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-[#0e1013] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Localization desk</span>
          <h2 className="mt-2 flex items-center gap-2 font-display text-lg font-black text-white">
            <Languages className="h-5 w-5 text-sky-300" />
            Tarjimalar (UZ / RU / EN)
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Matnni tahrirlab saqlaganda o‘zgarish barcha foydalanuvchilarda real vaqtda ko‘rinadi.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-white/50">
          {keys.length} ta ibora · {Object.keys(overrides).length} tahrirlangan
        </span>
      </div>

      <label className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3">
        <Search className="h-4 w-4 text-white/35" />
        <input
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder="Ibora yoki tarjimani qidirish..."
          className="min-h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>

      {overridesQuery.isLoading ? (
        <div className="mt-5 flex items-center gap-2 text-xs text-white/45">
          <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />
          Tarjimalar yuklanmoqda...
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map(key => {
            const draft = draftFor(key);
            const edited = Boolean(overrides[key]);
            return (
              <article key={key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black leading-5 text-white/80">{key}</p>
                  {edited ? (
                    <span className="shrink-0 rounded-full border border-sky-400/40 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                      tahrirlangan
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {(["uz", "ru", "en"] as const).map(code => (
                    <label key={code} className="block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">{code}</span>
                      <textarea
                        value={draft[code]}
                        onChange={event => setDraft(key, { [code]: event.target.value } as Partial<Draft>)}
                        className="field-input mt-1 min-h-16 resize-y text-xs"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate({ key, uz: draft.uz.trim(), ru: draft.ru.trim(), en: draft.en.trim() })
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black transition active:scale-[.98] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Saqlash
                  </button>
                  {edited ? (
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => {
                        setDrafts(current => {
                          const next = { ...current };
                          delete next[key];
                          return next;
                        });
                        remove.mutate({ key });
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-bold text-white/70 transition hover:text-white active:scale-[.98] disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Asl holat
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
              Qidiruv bo‘yicha ibora topilmadi.
            </p>
          ) : null}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/70 disabled:opacity-40"
          >
            Oldingi
          </button>
          <span className="text-[11px] text-white/40">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/70 disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      ) : null}
    </section>
  );
}

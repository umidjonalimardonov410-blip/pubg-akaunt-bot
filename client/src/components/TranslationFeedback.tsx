import { useEffect, useState } from "react";
import { Languages, MousePointerClick, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { telegramHaptic } from "@/lib/telegram";

/**
 * Tarjima xatosini xabar qilish:
 * 1) globus tugmasi -> "belgilash rejimi";
 * 2) noto'g'ri yozuvni bosish -> matn olinadi;
 * 3) izoh bilan adminga yuboriladi.
 */
export default function TranslationFeedback() {
  const { lang } = useI18n();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const report = trpc.phrases.report.useMutation();

  useEffect(() => {
    if (!picking) return;
    document.body.classList.add("i18n-picking");
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("[data-i18n-feedback]")) return;
      event.preventDefault();
      event.stopPropagation();
      const text = (target.innerText || target.textContent || "").trim().slice(0, 300);
      if (!text) {
        toast.error("Bu joyda matn topilmadi");
        return;
      }
      telegramHaptic("light");
      setSelected(text);
      setPicking(false);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.body.classList.remove("i18n-picking");
      document.removeEventListener("click", onClick, true);
    };
  }, [picking]);

  const send = () => {
    if (!selected) return;
    report.mutate(
      {
        text: selected,
        lang,
        page: `${window.location.pathname}${window.location.search}`,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Rahmat! Tarjima xatosi adminga yuborildi");
          setSelected(null);
          setComment("");
        },
        onError: () => toast.error("Yuborib bo‘lmadi, keyinroq urinib ko‘ring"),
      },
    );
  };

  return (
    <div data-i18n-feedback>
      <button
        type="button"
        onClick={() => {
          telegramHaptic("light");
          setPicking(value => !value);
          setSelected(null);
        }}
        aria-label="Tarjima xatosini belgilash"
        title="Tarjima xatosini belgilash"
        className="fixed bottom-24 right-3 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground/70 shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
      >
        {picking ? <X className="h-4 w-4" /> : <Languages className="h-4 w-4" />}
      </button>

      {picking && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 bg-primary/90 px-3 py-2 text-xs font-medium text-primary-foreground">
          <MousePointerClick className="h-4 w-4" />
          Noto‘g‘ri yozuvni bosing
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-4 shadow-xl">
            <div className="mb-2 text-sm font-semibold">Tarjima xatosi</div>
            <div className="mb-3 max-h-24 overflow-auto rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">{selected}</div>
            <textarea
              value={comment}
              onChange={event => setComment(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="To‘g‘ri variantni yozing (ixtiyoriy)"
              className="mb-3 w-full resize-none rounded-lg border border-border/60 bg-background p-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setComment("");
                }}
                className="flex-1 rounded-lg border border-border/60 py-2 text-sm"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={send}
                disabled={report.isPending}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {report.isPending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

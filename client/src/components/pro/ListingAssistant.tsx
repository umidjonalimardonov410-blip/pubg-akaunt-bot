import React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, LoaderCircle, Sparkles, Wand2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getLang } from '@/lib/i18n';
import { telegramHaptic } from '@/lib/telegram';

/** Rasmni kichik JPEG data URL ga aylantiradi (AI uchun yetarli, trafik kam). */
async function toSmallDataUrl(file: File, max = 768): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}

export default function ListingAssistant({ text, facts, files, onApply }: {
  text: string;
  facts: Record<string, unknown>;
  files: File[];
  onApply: (description: string) => void;
}) {
  const improve = trpc.listingAI.improve.useMutation();
  const [result, setResult] = React.useState<{ improvedDescription: string; missingInfo: string[]; tips: string[] } | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const busy = preparing || improve.isPending;
  const imageCount = files.filter(file => file.type.startsWith('image/')).length;

  const run = async () => {
    telegramHaptic('light');
    setPreparing(true);
    try {
      const images = (await Promise.all(files.filter(f => f.type.startsWith('image/')).slice(0, 4).map(f => toSmallDataUrl(f)))).filter(Boolean) as string[];
      setPreparing(false);
      const data = await improve.mutateAsync({ lang: getLang(), text, facts, images });
      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI yordamchisi hozir ishlamayapti');
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#22c9ee]/30 bg-[linear-gradient(135deg,rgba(34,201,238,.10),rgba(245,197,66,.06))] p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#22c9ee]/15 text-[#22c9ee]"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">AI tavsif yordamchisi</p>
          <p className="mt-0.5 text-[11px] leading-5 text-white/50">Matn va rasmlarni tahlil qilib, tavsifni aniqroq yozadi va yetishmayotgan ma’lumotlarni ko‘rsatadi.</p>
        </div>
      </div>
      <button type="button" onClick={run} disabled={busy} className="pubg-press mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#22c9ee] px-4 text-[13px] font-black text-black transition active:scale-[.98] disabled:opacity-60">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {busy ? 'AI tahlil qilmoqda...' : 'AI bilan yaxshilash'}
      </button>
      {imageCount > 0 && !result && <p className="mt-2 text-center text-[10px] text-white/40">{imageCount} {'ta rasm ham tahlil qilinadi'}</p>}
      {result && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#22c9ee]">Taklif qilingan tavsif</p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-white/85">{result.improvedDescription}</p>
            <button type="button" onClick={() => { onApply(result.improvedDescription); telegramHaptic('success' as any); toast.success('Tavsif qo‘yildi'); }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-[12px] font-black text-black active:scale-[.98]">
              <Check className="h-4 w-4" />Tavsifni qo‘llash
            </button>
          </div>
          {result.missingInfo.length > 0 && (
            <div className="rounded-xl border border-amber-300/30 bg-amber-400/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Yetishmayotgan ma’lumotlar</p>
              <ul className="mt-2 space-y-1.5">{result.missingInfo.map(item => <li key={item} className="flex gap-2 text-[12px] leading-5 text-white/80"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />{item}</li>)}</ul>
            </div>
          )}
          {result.tips.length > 0 && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Maslahatlar</p>
              <ul className="mt-2 space-y-1.5">{result.tips.map(item => <li key={item} className="text-[12px] leading-5 text-white/75">• {item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Premium UX qatlami: Telegram haptik javob, bosish to‘lqini (ripple),
 * skroll bo‘yicha ochilish animatsiyasi va rasmlarni blur-up bilan ko‘rsatish.
 * Butun ilovaga global tarzda ishlaydi — komponentlarni o‘zgartirish shart emas.
 */

type Haptic = {
  impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred?: (type: "error" | "success" | "warning") => void;
  selectionChanged?: () => void;
};

function haptic(): Haptic | undefined {
  return (globalThis as unknown as { Telegram?: { WebApp?: { HapticFeedback?: Haptic } } })
    .Telegram?.WebApp?.HapticFeedback;
}

export function tapFeedback(style: "light" | "medium" | "heavy" = "light") {
  try {
    haptic()?.impactOccurred?.(style);
  } catch {
    /* Telegram tashqarisida ishlamaydi */
  }
}

export function successFeedback() {
  try {
    haptic()?.notificationOccurred?.("success");
  } catch {
    /* noop */
  }
}

export function errorFeedback() {
  try {
    haptic()?.notificationOccurred?.("error");
  } catch {
    /* noop */
  }
}

const INTERACTIVE = 'button,a,[role="button"],label,input[type="checkbox"],input[type="radio"],select';

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function addRipple(target: HTMLElement, event: PointerEvent) {
  if (reducedMotion()) return;
  if (target.dataset.noRipple !== undefined) return;
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const style = getComputedStyle(target);
  if (style.position === "static") target.style.position = "relative";
  if (style.overflow === "visible") target.style.overflow = "hidden";
  const span = document.createElement("span");
  const size = Math.max(rect.width, rect.height) * 1.35;
  span.className = "px-ripple";
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.left = `${event.clientX - rect.left - size / 2}px`;
  span.style.top = `${event.clientY - rect.top - size / 2}px`;
  target.appendChild(span);
  window.setTimeout(() => span.remove(), 620);
}

/** Global bosish effektlari: haptika + ripple. */
function initTapLayer() {
  document.addEventListener(
    "pointerdown",
    event => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(INTERACTIVE);
      if (!target || target.hasAttribute("disabled")) return;
      tapFeedback("light");
      addRipple(target, event);
    },
    { passive: true }
  );
}

/** Skroll bo‘yicha yumshoq ochilish — har bir section/karta bir marta animatsiyalanadi. */
function initReveal() {
  if (reducedMotion() || typeof IntersectionObserver === "undefined") return;
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("px-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  const mark = (root: ParentNode) => {
    const nodes = root.querySelectorAll<HTMLElement>("main > section, main > div > section, [data-reveal]");
    nodes.forEach((node, index) => {
      if (node.dataset.pxReveal !== undefined) return;
      node.dataset.pxReveal = "";
      node.classList.add("px-reveal");
      node.style.setProperty("--px-delay", `${Math.min(index, 6) * 55}ms`);
      observer.observe(node);
    });
  };

  mark(document);
  new MutationObserver(() => mark(document)).observe(document.body, { childList: true, subtree: true });
}

/** Rasmlar yuklanganda blur-up bilan chiqadi. */
function initImageReveal() {
  const paint = (img: HTMLImageElement) => {
    if (img.dataset.pxImg !== undefined) return;
    img.dataset.pxImg = "";
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add("px-img", "px-img-ready");
      return;
    }
    img.classList.add("px-img");
    img.addEventListener("load", () => img.classList.add("px-img-ready"), { once: true });
    img.addEventListener("error", () => img.classList.add("px-img-ready"), { once: true });
  };
  const scan = () => document.querySelectorAll<HTMLImageElement>("img").forEach(paint);
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

let started = false;

/** Barcha premium effektlarni bir marta ishga tushiradi. */
export function initPremiumUx() {
  if (started || typeof document === "undefined") return;
  started = true;
  document.documentElement.classList.add("px-premium");
  initTapLayer();
  initReveal();
  initImageReveal();
}

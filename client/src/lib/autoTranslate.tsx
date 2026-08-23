import { useEffect, useSyncExternalStore } from "react";
import { PHRASES } from "./phrases";
import { useI18n, type Lang } from "./i18n";
import { getPhraseOverride, getPhraseOverridesVersion, subscribePhraseOverrides } from "./phraseStore";

const ORIGINAL = new WeakMap<Node, string>();
// O'zimiz yozgan qiymatlar: MutationObserver ularni "yangi original" deb
// hisoblab qolmasligi uchun kuzatib boramiz (aks holda til bir marta
// almashgach qotib qoladi).
const SELF_TEXT = new WeakMap<Node, string>();
const SELF_ATTR = new WeakMap<Element, Record<string, string>>();
const ORIGINAL_ATTR = new WeakMap<Element, Record<string, string>>();
const ATTRS = ["placeholder", "aria-label", "title", "alt", "value"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH"]);

const NORMALIZED: Record<string, { ru: string; en: string }> = {};
function normalize(value: string) {
  return value.replace(/[‘’ʻ`]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}
for (const [key, value] of Object.entries(PHRASES)) NORMALIZED[normalize(key)] = value;

export function translatePhrase(text: string, lang: Lang): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 2) return null;
  // Admin panelda tahrirlangan tarjima har doim ustun turadi (UZ ham).
  const override = getPhraseOverride(trimmed, lang);
  if (override) return text.replace(trimmed, override);
  if (lang === "uz") return null;
  const entry = PHRASES[trimmed] ?? NORMALIZED[normalize(trimmed)];
  if (!entry) return null;
  const translated = entry[lang];
  if (!translated || translated === trimmed) return null;
  return text.replace(trimmed, translated);
}

function applyToTextNode(node: Text, lang: Lang) {
  const original = ORIGINAL.get(node) ?? node.nodeValue ?? "";
  if (!original.trim()) return;
  if (!ORIGINAL.has(node)) ORIGINAL.set(node, original);
  const next = translatePhrase(original, lang) ?? original;
  if (node.nodeValue !== next) {
    SELF_TEXT.set(node, next);
    node.nodeValue = next;
  }
}

function applyToElement(element: Element, lang: Lang) {
  for (const attribute of ATTRS) {
    if (attribute === "value" && element.tagName !== "INPUT") continue;
    if (attribute === "value" && (element as HTMLInputElement).type !== "button" && (element as HTMLInputElement).type !== "submit") continue;
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    const store = ORIGINAL_ATTR.get(element) ?? {};
    if (!(attribute in store)) {
      store[attribute] = current;
      ORIGINAL_ATTR.set(element, store);
    }
    const original = store[attribute];
    const next = translatePhrase(original, lang) ?? original;
    if (current !== next) {
      const self = SELF_ATTR.get(element) ?? {};
      self[attribute] = next;
      SELF_ATTR.set(element, self);
      element.setAttribute(attribute, next);
    }
  }
}

function walk(root: Node, lang: Lang) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyToTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (SKIP_TAGS.has((root as Element).tagName)) return;
  applyToElement(root as Element, lang);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
      if (parent && SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) applyToTextNode(node as Text, lang);
    else applyToElement(node as Element, lang);
    node = walker.nextNode();
  }
}

/** Butun sahifani darhol qayta tarjima qiladi (til almashganda chaqiriladi). */
export function retranslateDocument(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", lang);
  walk(document.body, lang);
}

/**
 * Butun interfeysni tanlangan tilga avtomatik o‘giradi:
 * DOM matn tugunlari va placeholder/aria-label/title atributlari kuzatiladi.
 */
export function AutoTranslate() {
  const { lang } = useI18n();
  const overridesVersion = useSyncExternalStore(subscribePhraseOverrides, getPhraseOverridesVersion, () => 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    let frame = 0;
    const run = () => walk(document.body, lang);
    run();

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          const textNode = mutation.target as Text;
          if (SELF_TEXT.get(textNode) === textNode.nodeValue) continue;
          ORIGINAL.delete(mutation.target);
          applyToTextNode(mutation.target as Text, lang);
        }
        if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const element = mutation.target as Element;
          const selfStore = SELF_ATTR.get(element);
          if (mutation.attributeName && selfStore && selfStore[mutation.attributeName] === element.getAttribute(mutation.attributeName)) continue;
          const store = ORIGINAL_ATTR.get(mutation.target as Element);
          if (store && mutation.attributeName) delete store[mutation.attributeName];
          applyToElement(mutation.target as Element, lang);
        }
        mutation.addedNodes.forEach(node => walk(node, lang));
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [lang, overridesVersion]);

  return null;
}

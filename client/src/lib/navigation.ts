/**
 * Ortga qaytish har bir bo'limda bir xil va bashoratli ishlashi uchun
 * har bir sahifaning mantiqiy "ota" yo'li shu yerda belgilanadi.
 * window.history.back() ba'zan mini app'dan tashqariga yoki noto'g'ri
 * sahifaga olib ketgani uchun biz doim shu xaritaga tayanamiz.
 */
const STATIC_PARENTS: Record<string, string> = {
  '/': '/',
  '': '/',
  '/accounts': '/',
  '/sell': '/',
  '/orders': '/',
  '/saved': '/',
  '/chats': '/',
  '/notifications': '/',
  '/profile': '/',
  '/support': '/',
  '/rules': '/',
  '/flash': '/',
  '/mystery': '/',
  '/referral': '/profile',
  '/transactions': '/profile',
  '/reviews': '/profile',
  '/admin': '/profile',
};

/** Dinamik sahifalar: /account/12 -> /accounts, /escrow/4 -> /orders, /chat/9 -> /chats */
const DYNAMIC_PARENTS: Array<[RegExp, string]> = [
  [/^\/account\/[^/]+$/, '/accounts'],
  [/^\/escrow\/[^/]+$/, '/orders'],
  [/^\/chat\/[^/]+$/, '/chats'],
  [/^\/order\/[^/]+$/, '/orders'],
];

export function getParentPath(pathname: string): string {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (STATIC_PARENTS[path]) return STATIC_PARENTS[path];
  for (const [pattern, parent] of DYNAMIC_PARENTS) {
    if (pattern.test(path)) return parent;
  }
  // Noma'lum ichki sahifa bo'lsa — bir pog'ona yuqoriga, aks holda bosh sahifa.
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) return `/${segments.slice(0, -1).join('/')}`;
  return '/';
}

export function isHomePath(pathname: string): boolean {
  const path = (pathname || '/').split('?')[0];
  return path === '/' || path === '';
}

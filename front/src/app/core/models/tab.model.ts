import { ActivatedRouteSnapshot } from '@angular/router';

export interface AppTab {
  id: string;
  title: string;
  url: string;
  closable: boolean;
}

export const DASHBOARD_TAB: AppTab = {
  id: '/dashboard',
  title: 'Tableau de bord',
  url: '/dashboard',
  closable: false
};

export function normalizeTabUrl(url: string): string {
  const trimmedUrl = url.trim() || '/dashboard';
  const hashIndex = trimmedUrl.indexOf('#');
  const fragment = hashIndex >= 0 ? trimmedUrl.slice(hashIndex) : '';
  const withoutFragment = hashIndex >= 0 ? trimmedUrl.slice(0, hashIndex) : trimmedUrl;
  const queryIndex = withoutFragment.indexOf('?');
  const query = queryIndex >= 0 ? withoutFragment.slice(queryIndex) : '';
  const path = queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;
  const normalizedPath = `/${path.replace(/^\/+|\/+$/g, '')}`;

  return `${normalizedPath === '/' ? '/dashboard' : normalizedPath}${canonicalQuery(query)}${fragment}`;
}

/**
 * Paramètres triés et encodés comme `tabUrlFromSnapshot` : une même page a la
 * même URL d'onglet que l'adresse vienne du code ou du routeur Angular, qui
 * n'encode pas « : @ $ , ; » (ex. recherche « 24/319 : CORAIL »).
 */
function canonicalQuery(query: string): string {
  if (query.length <= 1) {
    return '';
  }
  const decode = (text: string) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  };
  const params = query
    .slice(1)
    .split('&')
    .filter(Boolean)
    .map(param => {
      const equal = param.indexOf('=');
      return equal >= 0 ? [decode(param.slice(0, equal)), decode(param.slice(equal + 1))] : [decode(param), ''];
    })
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return params.length ? `?${params.join('&')}` : '';
}

export function tabUrlFromSnapshot(route: ActivatedRouteSnapshot): string {
  const segments = route.pathFromRoot.flatMap(snapshot =>
    snapshot.url.map(segment => segment.toString())
  );

  let child = route.firstChild;
  while (child) {
    segments.push(...child.url.map(segment => segment.toString()));
    child = child.firstChild;
  }

  const path = `/${segments.filter(Boolean).join('/')}`;
  const query = Object.entries(route.queryParams)
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const fragment = route.fragment ? `#${route.fragment}` : '';

  return normalizeTabUrl(`${path}${query ? `?${query}` : ''}${fragment}`);
}
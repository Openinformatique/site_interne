import { ActivatedRouteSnapshot } from '@angular/router';

export interface AppTab {
  id: string;
  title: string;
  url: string;
  closable: boolean;
}

export const DASHBOARD_TAB: AppTab = {
  id: '/dashboard',
  title: 'Dashboard',
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

  return `${normalizedPath === '/' ? '/dashboard' : normalizedPath}${query}${fragment}`;
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
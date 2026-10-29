import { SearchResultType } from './enums';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  label: string;
  subtitle: string;
  url: string; // route FRONT prête (ex. /contacts/:id)
}

export interface SearchResponse {
  query: string;
  results: Partial<Record<SearchResultType, SearchResult[]>>;
  total: number;
}

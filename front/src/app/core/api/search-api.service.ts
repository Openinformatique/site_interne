import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { SearchResponse } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private api = inject(ApiClient);

  search(q: string): Observable<SearchResponse> {
    return this.api.get<SearchResponse>('/search', { q });
  }
}

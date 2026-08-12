import {
  SEARCH_MAX_PAGES,
  getNextSearchPage,
} from './useRepositorySearch';
import type {SearchResponse} from '@/entities/repository/model/schema';

function page(total = 100_000): SearchResponse {
  return {
    total_count: total,
    incomplete_results: false,
    items: [],
  };
}

describe('getNextSearchPage', () => {
  it('returns the next page number when more results are available', () => {
    const pages = [page(), page()];
    expect(getNextSearchPage(page(), pages)).toBe(3);
  });

  it('stops at the Search API 1000-result ceiling (page 10 has no next)', () => {
    const pages = Array.from({length: SEARCH_MAX_PAGES}, () => page());
    expect(getNextSearchPage(page(), pages)).toBeUndefined();
  });

  it('stops when total_count is exhausted before the ceiling', () => {
    const pages = [page(150), page(150)];
    // 200 loaded, total_count=150 → no more pages
    expect(getNextSearchPage(page(150), pages)).toBeUndefined();
  });

  it('returns undefined when total_count is zero', () => {
    expect(getNextSearchPage(page(0), [page(0)])).toBeUndefined();
  });
});

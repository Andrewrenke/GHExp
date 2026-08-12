import {
  repositorySchema,
  searchResponseSchema,
} from './schema';
import fixture from './__fixtures__/searchResponse.json';

describe('repository schemas', () => {
  it('parses a real GitHub search response', () => {
    const parsed = searchResponseSchema.parse(fixture);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]?.full_name).toBe('facebook/react-native');
  });

  it('accepts null description and language (real-world edge cases)', () => {
    const parsed = searchResponseSchema.parse(fixture);
    const empty = parsed.items[1];
    expect(empty?.description).toBeNull();
    expect(empty?.language).toBeNull();
  });

  it('rejects an item missing required fields', () => {
    const bad = {id: 1, full_name: 'x/y'};
    expect(() => repositorySchema.parse(bad)).toThrow();
  });

  it('ignores fields we do not model (extra keys pass through untyped)', () => {
    const parsed = repositorySchema.parse({
      id: 1,
      name: 'r',
      full_name: 'o/r',
      description: null,
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      language: null,
      updated_at: '2026-01-01T00:00:00Z',
      html_url: 'https://github.com/o/r',
      owner: {
        login: 'o',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        html_url: 'https://github.com/o',
      },
      unmodeled_field: 'ignored',
    });
    expect(parsed.name).toBe('r');
  });
});

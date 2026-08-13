import {repositoryDetailSchema, repositorySchema, searchResponseSchema} from './schema';
import fixture from './__fixtures__/searchResponse.json';

const baseRepository = {
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
};

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
      ...baseRepository,
      unmodeled_field: 'ignored',
    });
    expect(parsed.name).toBe('r');
  });
});

// The detail endpoint returns fields the list does not, and DetailScreen
// renders every one of them. None of this was covered before.
describe('repositoryDetailSchema', () => {
  it('parses the detail-only fields', () => {
    const parsed = repositoryDetailSchema.parse({
      ...baseRepository,
      subscribers_count: 12,
      topics: ['react', 'mobile'],
      default_branch: 'main',
      license: {spdx_id: 'MIT', name: 'MIT License'},
    });

    expect(parsed.subscribers_count).toBe(12);
    expect(parsed.topics).toEqual(['react', 'mobile']);
    expect(parsed.default_branch).toBe('main');
    expect(parsed.license?.name).toBe('MIT License');
  });

  // GitHub returns `license: null` for unlicensed repos, and omits the detail
  // fields entirely on some responses. Both must parse rather than throw —
  // this is what lets a list-level Repository stand in as placeholder data.
  it('accepts a null license', () => {
    const parsed = repositoryDetailSchema.parse({...baseRepository, license: null});
    expect(parsed.license).toBeNull();
  });

  it('accepts a list-level repository with no detail fields at all', () => {
    const parsed = repositoryDetailSchema.parse(baseRepository);
    expect(parsed.topics).toBeUndefined();
    expect(parsed.license).toBeUndefined();
  });

  it('accepts a null spdx_id (license present but unrecognised)', () => {
    const parsed = repositoryDetailSchema.parse({
      ...baseRepository,
      license: {spdx_id: null, name: 'Other'},
    });
    expect(parsed.license?.spdx_id).toBeNull();
  });
});

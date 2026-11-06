import { describe, expect, it } from 'vitest';

import { safeNextPath } from '@/lib/auth';

describe('redirect after sign-in', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/registry/c102?tab=comments', '/overview')).toBe('/registry/c102?tab=comments');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login?next=/x'])('falls back for %j', (next) => {
    expect(safeNextPath(next, '/overview')).toBe('/overview');
  });
});

import { describe, expect, it } from 'vitest';

import { transformJobs, type LocalMeta, type RawJob } from '../transform';

describe('transformJobs', () => {
  const baseJob: RawJob = {
    name: 'ubuntu',
    upstream: 'rsync://archive.ubuntu.com/ubuntu/',
    status: 'success',
    size: '500G',
    last_ended_ts: 1_700_000_000,
    next_schedule_ts: 1_700_086_400,
    last_update_ts: 1_700_000_000,
  };

  it('maps backend "success" status to "succeeded"', () => {
    const [m] = transformJobs([baseJob]);
    expect(m.status).toBe('succeeded');
  });

  it('falls back to capitalized id when local meta omits name', () => {
    const [m] = transformJobs([baseJob]);
    expect(m.name.zh).toBe('Ubuntu');
    expect(m.name.en).toBe('Ubuntu');
  });

  it('does not lose en label when local meta only provides zh', () => {
    // 这是旧 Object.assign 实现的真实 bug：local.name = { zh } 会整体覆盖
    // base.name，导致 mirror.name.en = undefined
    const local: Record<string, LocalMeta> = {
      ubuntu: { name: { zh: 'Ubuntu 镜像' } },
    };
    const [m] = transformJobs([baseJob], local);
    expect(m.name.zh).toBe('Ubuntu 镜像');
    expect(m.name.en).toBe('Ubuntu'); // 关键：兜底而不是 undefined
  });

  it('skips file entries with javascript: protocol (XSS guard)', () => {
    const local: Record<string, LocalMeta> = {
      ubuntu: {
        files: [
          { name: 'safe.iso', url: '/ubuntu/safe.iso' },
          // 危险：以前会被原样塞入 mirror.files，让 <a href> 渲染恶意脚本
          { name: 'evil', url: 'javascript:alert(1)' as unknown as string },
          { name: 'data', url: 'data:text/html,evil' as unknown as string },
        ],
      },
    };
    const [m] = transformJobs([baseJob], local);
    expect(m.files).toHaveLength(1);
    expect(m.files[0].name).toBe('safe.iso');
  });

  it('drops jobs with missing or empty name instead of crashing', () => {
    const bad = [
      baseJob,
      { ...baseJob, name: '' } as RawJob,
      { name: 'no-fields' } as unknown as RawJob,
    ];
    const out = transformJobs(bad);
    // 空 name 被剔除；no-fields 的 name 合法所以保留
    expect(out.map((m) => m.id)).toEqual(['ubuntu', 'no-fields']);
  });

  it('maps unknown backend status to "unknown"', () => {
    const [m] = transformJobs([{ ...baseJob, status: 'martian' }]);
    expect(m.status).toBe('unknown');
  });

  it('maps "pre-syncing" to "cached"', () => {
    const [m] = transformJobs([{ ...baseJob, status: 'pre-syncing' }]);
    expect(m.status).toBe('cached');
  });

  it('maps "disabled" to "disabled"', () => {
    const [m] = transformJobs([{ ...baseJob, status: 'disabled' }]);
    expect(m.status).toBe('disabled');
  });

  it('maps "none" to "unknown"', () => {
    const [m] = transformJobs([{ ...baseJob, status: 'none' }]);
    expect(m.status).toBe('unknown');
  });

  it('maps "paused" to "paused"', () => {
    const [m] = transformJobs([{ ...baseJob, status: 'paused' }]);
    expect(m.status).toBe('paused');
  });

  it('preserves timestamps as strings (consumer formats them)', () => {
    const [m] = transformJobs([baseJob]);
    expect(m.lastUpdated).toBe('1700000000');
    expect(m.nextScheduled).toBe('1700086400');
    expect(m.lastSuccess).toBe('1700000000');
  });
});

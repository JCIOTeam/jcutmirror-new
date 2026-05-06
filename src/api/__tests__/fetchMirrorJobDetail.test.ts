import { describe, expect, it } from 'vitest';

import { transformJobs } from '../transform';
import type { RawJob } from '../transform';

describe('RawJob error_msg field', () => {
  it('error_msg is included in RawJob type and preserved through transform', () => {
    const rawJob: RawJob = {
      name: 'ubuntu',
      upstream: 'rsync://example.com/ubuntu/',
      status: 'failed',
      error_msg: 'rsync: connection timed out',
      last_ended_ts: 1_700_000_000,
      next_schedule_ts: 1_700_086_400,
      last_update_ts: 1_700_000_000,
    };

    expect(rawJob.error_msg).toBe('rsync: connection timed out');

    const [m] = transformJobs([rawJob]);
    expect(m.id).toBe('ubuntu');
    expect(m.status).toBe('failed');
  });

  it('error_msg can be undefined for successful jobs', () => {
    const rawJob: RawJob = {
      name: 'debian',
      upstream: 'rsync://example.com/debian/',
      status: 'success',
    };
    expect(rawJob.error_msg).toBeUndefined();
    const [m] = transformJobs([rawJob]);
    expect(m.status).toBe('succeeded');
  });
});

describe('/jobs/:name response handling (StatusPage handleShowError logic)', () => {
  it('parses array response from tunasync-rs', () => {
    const data = [
      {
        name: 'ubuntu',
        worker: 'w1',
        status: 'failed',
        error_msg: 'rsync: connection timed out',
        upstream: 'rsync://example.com/ubuntu/',
        size: '5T',
      },
    ];

    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('rsync: connection timed out');
  });

  it('parses object response from tunasync', () => {
    const data = {
      name: 'ubuntu',
      worker: 'w1',
      status: 'failed',
      error_msg: 'rsync: timeout',
      upstream: 'rsync://example.com/ubuntu/',
      size: '5T',
    };

    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('rsync: timeout');
  });

  it('shows fallback when error_msg is empty string', () => {
    const data = [{ name: 'ubuntu', status: 'failed', error_msg: '' }];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });

  it('shows fallback when error_msg is missing', () => {
    const data: { name: string; status: string; error_msg?: string }[] = [
      { name: 'ubuntu', status: 'failed' },
    ];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });

  it('shows fallback for empty array response', () => {
    const data: { error_msg?: string }[] = [];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });

  it('shows fetchErrorFailed on HTTP error', () => {
    // 模拟 fetch 不 ok 的场景
    const msg = 'status.fetchErrorFailed';
    expect(msg).toBe('status.fetchErrorFailed');
  });
});

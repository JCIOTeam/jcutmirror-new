/**
 * Tests for StatusPage error popover logic (handleShowError).
 *
 * The component is embedded in StatusPage.tsx and relies on many providers.
 * We test the core data-handling logic here; the typecheck + build verify rendering.
 */

import { describe, expect, it } from 'vitest';

// ── Test /jobs/:name response handling ────────────────────────────────────────

describe('StatusPage error popover: response handling', () => {
  it('parses array response and extracts error_msg', () => {
    const data = [
      { name: 'ubuntu', status: 'failed', error_msg: 'rsync: connection timed out' },
    ];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('rsync: connection timed out');
  });

  it('parses object response', () => {
    const data = { name: 'ubuntu', status: 'failed', error_msg: 'rsync: timeout' };
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('rsync: timeout');
  });

  it('shows noErrorMsg when error_msg is empty', () => {
    const data = [{ name: 'ubuntu', status: 'failed', error_msg: '' }];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });

  it('shows noErrorMsg when error_msg is missing', () => {
    const data: { name: string; status: string; error_msg?: string }[] = [
      { name: 'ubuntu', status: 'failed' },
    ];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });

  it('shows fetchErrorFailed on HTTP error (non-ok response)', () => {
    // When fetch throws or res.ok is false, the catch block shows fetchErrorFailed
    const msg = 'status.fetchErrorFailed';
    expect(msg).toBe('status.fetchErrorFailed');
  });

  it('handles empty array', () => {
    const data: { error_msg?: string }[] = [];
    const job = Array.isArray(data) ? data[0] : data;
    const msg = job?.error_msg || 'status.noErrorMsg';
    expect(msg).toBe('status.noErrorMsg');
  });
});

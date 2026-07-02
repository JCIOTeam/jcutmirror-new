import { describe, expect, it } from 'vitest';

import { calcHealth } from '../statusHealth';

describe('calcHealth', () => {
  it('total=0 视为 operational（无镜像即无故障）', () => {
    expect(calcHealth(0, 0)).toBe('operational');
    expect(calcHealth(0, 5)).toBe('operational');
  });

  it('unavailable=0 为 operational', () => {
    expect(calcHealth(100, 0)).toBe('operational');
  });

  it('失败占比 < 20% 为 degraded', () => {
    expect(calcHealth(100, 1)).toBe('degraded');
    expect(calcHealth(10, 1)).toBe('degraded');
    expect(calcHealth(100, 19)).toBe('degraded');
  });

  it('失败占比 >= 20% 为 outage', () => {
    expect(calcHealth(100, 20)).toBe('outage');
    expect(calcHealth(10, 2)).toBe('outage');
    expect(calcHealth(5, 5)).toBe('outage'); // 全失败
  });

  it('边界：1/10 = 10% 为 degraded，2/10 = 20% 为 outage', () => {
    expect(calcHealth(10, 1)).toBe('degraded');
    expect(calcHealth(10, 2)).toBe('outage');
  });
});

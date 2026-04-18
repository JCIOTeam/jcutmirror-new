// 烟雾测试：确认 React 19 渲染 + StrictMode + MUI 双调用不报错
import { Button, Chip } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';

import { lightTheme } from '../../theme/theme';

describe('React 19 smoke test', () => {
  it('renders MUI components without StrictMode double-invoke errors', () => {
    render(
      <StrictMode>
        <ThemeProvider theme={lightTheme}>
          <Button variant="contained" data-testid="b">
            Click me
          </Button>
          <Chip label="hello" />
        </ThemeProvider>
      </StrictMode>
    );
    expect(screen.getByTestId('b')).toHaveTextContent('Click me');
  });

  it('exposes the React 19 use() API on the React namespace', async () => {
    const React = await import('react');
    expect(typeof (React as unknown as { use?: unknown }).use).toBe('function');
  });
});

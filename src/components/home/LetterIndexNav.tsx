import { useRef, useCallback } from 'react';
import type React from 'react';
import { Box } from '@mui/material';

interface LetterIndexNavProps {
  letters: string[];
  ariaLabel: string;
}

const LetterIndexNav: React.FC<LetterIndexNavProps> = ({ letters, ariaLabel }) => {
  const navRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = Array.from(navRef.current?.querySelectorAll<HTMLAnchorElement>('[data-letter-btn]') ?? []);
    const idx = buttons.indexOf(document.activeElement as HTMLAnchorElement);
    if (idx === -1) return;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (idx + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (idx - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = buttons.length - 1;
    } else return;
    buttons.forEach((b, i) => {
      b.tabIndex = i === next ? 0 : -1;
    });
    buttons[next].focus();
  }, []);

  return (
    <Box
      ref={navRef}
      component="nav"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        mb: 2,
      }}
    >
      {letters.map((letter, i) => (
        <Box
          key={letter}
          component="a"
          href={`#group-${letter}`}
          data-letter-btn
          tabIndex={i === 0 ? 0 : -1}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            textDecoration: 'none',
            color: 'text.secondary',
            fontSize: '0.8rem',
            fontWeight: 600,
            '&:hover, &:focus': { bgcolor: 'action.hover', color: 'primary.main' },
          }}
        >
          {letter}
        </Box>
      ))}
    </Box>
  );
};

export default LetterIndexNav;

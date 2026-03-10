// src/components/common/SearchBar.tsx
// 搜索框组件 - 实时过滤镜像

import {
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useMirrorSearchStore } from '../../stores/mirrorStore';

interface SearchBarProps {
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

/**
 * 实时搜索框 - 过滤镜像列表
 */
const SearchBar: React.FC<SearchBarProps> = ({ fullWidth = false, size = 'small' }) => {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery } = useMirrorSearchStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <TextField
      value={searchQuery}
      onChange={handleChange}
      placeholder={t('search.placeholder')}
      fullWidth={fullWidth}
      size={size}
      variant="outlined"
      autoComplete="off"
      inputProps={{
        'aria-label': t('search.placeholder'),
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                edge="end"
                aria-label="清除搜索"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
      sx={{
        minWidth: { sm: 280 },
        '& .MuiOutlinedInput-root': {
          bgcolor: 'background.paper',
        },
      }}
    />
  );
};

export default SearchBar;

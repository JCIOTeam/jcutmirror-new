// src/components/status/GrafanaPanel.tsx
// Grafana 系统指标面板 —— 从 StatusPage 抽出
// 仅在 /grafana/ 可达时由父组件渲染；依赖 i18n 的 t 和当前主题模式

import { BarChart as GrafanaIcon, OpenInNew as OpenInNewIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ThemeMode } from '../../types';

interface GrafanaPanelProps {
  themeMode: ThemeMode;
}

const GrafanaPanel: React.FC<GrafanaPanelProps> = ({ themeMode }) => {
  const { t } = useTranslation();

  const panels = [
    { title: t('status.cpuUsage'), panelId: 1 },
    { title: t('status.memUsage'), panelId: 2 },
    { title: t('status.networkBandwidth'), panelId: 3 },
    { title: t('status.diskSpace'), panelId: 4 },
    { title: t('status.nginxRequests'), panelId: 5 },
    { title: t('status.activeConnections'), panelId: 6 },
  ];

  return (
    <Box sx={{ mt: 4 }}>
      <Accordion
        defaultExpanded={false}
        sx={{
          borderRadius: '12px !important',
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1.5, borderRadius: 'inherit' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GrafanaIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('status.serverMetrics')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('status.serverMetricsSub')}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', mr: 1 }}>
              <Tooltip title={t('status.openGrafana')}>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  component="a"
                  href="/grafana/d/jcut-mirror-system"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ borderRadius: 6, fontSize: '0.75rem' }}
                >
                  Grafana
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0 }}>
          <Divider />

          {/* 嵌入面板网格 */}
          <Grid container sx={{ p: 2 }} spacing={2}>
            {panels.map(({ title, panelId }) => (
              <Grid key={panelId} size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {title}
                    </Typography>
                    <Link
                      href={`/grafana/d/jcut-mirror-system?viewPanel=${panelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      color="primary"
                      underline="hover"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                    >
                      {t('common.fullscreen')}
                      <OpenInNewIcon sx={{ fontSize: 11 }} />
                    </Link>
                  </Box>
                  <Box
                    component="iframe"
                    src={`/grafana/d-solo/jcut-mirror-system?orgId=1&panelId=${panelId}&from=now-1h&to=now&theme=${themeMode}&kiosk`}
                    sx={{ display: 'block', width: '100%', height: 220, border: 'none' }}
                    title={title}
                    loading="lazy"
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* 系统负载全宽面板 */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {t('status.systemLoad')}
                </Typography>
                <Link
                  href="/grafana/d/jcut-mirror-system?viewPanel=7"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="caption"
                  color="primary"
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                >
                  {t('common.fullscreen')}
                  <OpenInNewIcon sx={{ fontSize: 11 }} />
                </Link>
              </Box>
              <Box
                component="iframe"
                src={`/grafana/d-solo/jcut-mirror-system?orgId=1&panelId=7&from=now-1h&to=now&theme=${themeMode}&kiosk`}
                sx={{ display: 'block', width: '100%', height: 200, border: 'none' }}
                title={t('status.systemLoad')}
                loading="lazy"
              />
            </Paper>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default GrafanaPanel;

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const app = express();

const ORIGINAL_API_URL = 'http://127.0.0.1:12345/jobs';
const LOCAL_JSON_FILE = 'local_data.json';
const PORT = 7000;
const HOST = '127.0.0.1';

const statusMappings = {
  'success': 'succeeded',
  'pre-syncing': 'cached',
};

let cachedData = null;
let lastUpdatedTime = null;

async function readLocalJsonFile(filePath) {
  try {
    const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
    if (fileExists) {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      return {};
    }
  } catch (error) {
    console.error(`Error reading local JSON file: ${filePath} - invalid JSON format.`);
    return {};
  }
}

function convertJson(originalJson, localJson) {
  return originalJson.map(item => {
    const itemName = item.name.toLowerCase();
    const newItem = {
      id: item.name,
      url: `/${item.name}/`,
      name: {
        zh: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        en: item.name.charAt(0).toUpperCase() + item.name.slice(1)
      },
      desc: {
        zh: `${item.name.charAt(0).toUpperCase() + item.name.slice(1)} 镜像`,
        en: `Mirror of ${item.name.charAt(0).toUpperCase() + item.name.slice(1)}`
      },
      helpUrl: `/docs/${item.name}`,
      upstream: item.upstream,
      size: item.size || '1G',
      status: statusMappings[item.status] || item.status,
      lastUpdated: String(item.last_update_ts || ''),
      nextScheduled: String(item.next_schedule_ts || ''),
      lastSuccess: String(item.last_ended_ts || ''),
      type: 'none',
      files: []
    };

    const localItem = localJson[item.name];
    if (localItem) {
      Object.assign(newItem, localItem);
    }
    
    return newItem;
  });
}

async function fetchOriginalData() {
  try {
    const response = await fetch(ORIGINAL_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const originalJson = await response.json();
    const localJson = await readLocalJsonFile(LOCAL_JSON_FILE);
    
    const convertedJson = convertJson(originalJson, localJson);
    
    cachedData = convertedJson;
    lastUpdatedTime = Date.now();
    
    return convertedJson;
  } catch (error) {
    console.error('Failed to fetch original data:', error);
    throw error;
  }
}

function isDataExpired() {
  if (!lastUpdatedTime) {
    return true;
  }
  
  const currentTime = Date.now();
  const elapsedTime = currentTime - lastUpdatedTime;
  const expirationTime = 30 * 1000;
  
  return elapsedTime > expirationTime;
}

// 判断是否是内网 IP
function isPrivateIP(ip) {
  const parts = ip.split('.');
  return (parts[0] === '10') || 
         (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || 
         (parts[0] === '192' && parts[1] === '168');
}

// 判断是否是 IPv6 地址
function isIPv6(ip) {
  return ip.includes(':');
}

async function updateCachePeriodically() {
  try {
    await fetchOriginalData();
    console.log(`[${new Date().toISOString()}] Cache updated successfully.`);
  } catch (error) {
    console.error('Failed to update cache:', error);
  }
}

updateCachePeriodically();
setInterval(updateCachePeriodically, 5 * 60 * 1000);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/mirrors/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    if (isDataExpired()) {
      await fetchOriginalData();
      console.log(`  Cache expired, fetching data from the original API.`);
    } else {
      console.log(`  Using cached data.`);
    }
    
    const mirrorItem = cachedData.find(item => item.id.toLowerCase() === name.toLowerCase());

    if (mirrorItem) {
      res.json(mirrorItem);
    } else {
      res.status(404).send('Not found');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/mirrors', async (req, res) => {
  try {
    if (isDataExpired()) {
      await fetchOriginalData();
      console.log(`  Cache expired, fetching data from the original API.`);
    } else {
      console.log(`  Using cached data.`);
    }
    
    res.json(cachedData);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/is_campus_network', (req, res) => {
  const clientIP = req.ip;

  if (isIPv6(clientIP)) {
    res.send('6');
  } else if (isPrivateIP(clientIP)) {
    res.send('1');
  } else {
    res.send('0');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

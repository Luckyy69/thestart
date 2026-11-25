const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => document.title === 'done');
  await (await p.$('#t')).screenshot({ path: process.argv[3] }); await b.close(); })();

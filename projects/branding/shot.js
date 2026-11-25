const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2560, height: 2300 } });
  await p.goto('file://' + process.argv[2]); await p.waitForFunction(() => document.title === 'done');
  await (await p.$('#logo')).screenshot({ path: 'bean_stories_logo.png' });
  await (await p.$('#banner')).screenshot({ path: 'bean_stories_banner.png' });
  await b.close();
})();

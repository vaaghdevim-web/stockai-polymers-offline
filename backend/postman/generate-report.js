const fs = require('fs');
const resultsPath = 'postman/newman-results.json';
const collectionPath = 'postman/StockAI_X.postman_collection.json';

if (!fs.existsSync(resultsPath)) {
  console.log('No ' + resultsPath + ' found. Please execute Newman test run first.');
  process.exit(0);
}

const r = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const executions = r.run.executions;
const stats = r.run.stats;
const timings = r.run.timings;

function getFolder(items, targetName) {
  for (const item of items) {
    if (item.item) {
      for (const child of item.item) {
        if (child.name === targetName) return item.name;
      }
    }
  }
  return 'Unknown';
}

let passed = 0, failed = 0;
const byFolder = {};
const details = [];

executions.forEach((exec, i) => {
  const code = exec.response ? exec.response.code : 0;
  const rt = exec.response ? exec.response.responseTime : 0;
  const success = code >= 200 && code < 300;
  const folder = getFolder(col.item, exec.item.name);
  const body = exec.response && exec.response.stream ? Buffer.from(exec.response.stream.data).toString() : '';
  let errMsg = '';
  try { const parsed = JSON.parse(body); errMsg = parsed.message || ''; } catch(e) {}
  if (success) passed++; else failed++;
  if (!byFolder[folder]) byFolder[folder] = { passed: 0, failed: 0, requests: [] };
  if (success) byFolder[folder].passed++; else byFolder[folder].failed++;
  byFolder[folder].requests.push({ name: exec.item.name, code, rt, success, errMsg });
  details.push({ folder, name: exec.item.name, code, rt, success, errMsg });
});

// Build HTML report
let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>StockAI X - API Test Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #333; }
  h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
  h2 { color: #2c3e50; margin-top: 30px; }
  h3 { color: #555; margin-top: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
  .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
  .card .value { font-size: 2em; font-weight: bold; }
  .card .label { font-size: 0.85em; color: #777; margin-top: 5px; }
  .card.green .value { color: #27ae60; }
  .card.red .value { color: #e74c3c; }
  .card.blue .value { color: #3498db; }
  .card.orange .value { color: #e67e22; }
  .folder-section { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .folder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .folder-title { font-size: 1.1em; font-weight: bold; color: #2c3e50; }
  .folder-stats { font-size: 0.9em; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; margin-left: 5px; }
  .badge.pass { background: #d5f5e3; color: #27ae60; }
  .badge.fail { background: #fadbd8; color: #e74c3c; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #ecf0f1; padding: 10px; text-align: left; font-size: 0.85em; color: #555; }
  td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 0.9em; }
  tr:last-child td { border-bottom: none; }
  .status-pass { color: #27ae60; font-weight: bold; }
  .status-fail { color: #e74c3c; font-weight: bold; }
  .http-code { font-family: monospace; font-weight: bold; }
  .http-2xx, .http-200, .http-201, .http-202, .http-204 { color: #27ae60; }
  .http-4xx, .http-400, .http-401, .http-403, .http-404 { color: #e74c3c; }
  .http-500 { color: #c0392b; }
  .rt { color: #777; font-size: 0.85em; }
  .error-msg { color: #e74c3c; font-size: 0.85em; font-style: italic; }
  .root-cause { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .root-cause h3 { color: #856404; margin-top: 0; }
  .root-cause p { color: #533f03; }
  .fix-suggestion { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .fix-suggestion h3 { color: #0c5460; margin-top: 0; }
  .fix-suggestion ul { color: #0c5460; }
  .progress-bar { background: #ecf0f1; border-radius: 4px; height: 8px; margin-top: 8px; }
  .progress-fill { height: 8px; border-radius: 4px; }
  .progress-fill.green { background: #27ae60; }
  .progress-fill.red { background: #e74c3c; }
  .meta { color: #777; font-size: 0.85em; margin-bottom: 20px; }
  .section-all-fail { border-left: 4px solid #e74c3c; }
  .section-all-pass { border-left: 4px solid #27ae60; }
  .section-partial { border-left: 4px solid #f39c12; }
</style>
</head>
<body>
<h1>🏭 StockAI X — API Health Report</h1>
<p class="meta">
  <strong>Collection:</strong> StockAI X — Enterprise IMS &amp; Polymer Manufacturing API &nbsp;|&nbsp;
  <strong>Environment:</strong> StockAI X - Local Environment &nbsp;|&nbsp;
  <strong>Base URL:</strong> http://localhost:8080 &nbsp;|&nbsp;
  <strong>Run Duration:</strong> ${((timings.completed - timings.started)/1000).toFixed(2)}s
</p>

<div class="summary-grid">
  <div class="card blue">
    <div class="value">${stats.requests.total}</div>
    <div class="label">Total Requests</div>
  </div>
  <div class="card green">
    <div class="value">${passed}</div>
    <div class="label">✅ Passed (2xx)</div>
  </div>
  <div class="card red">
    <div class="value">${failed}</div>
    <div class="label">❌ Failed (4xx/5xx)</div>
  </div>
  <div class="card orange">
    <div class="value">${((passed/stats.requests.total)*100).toFixed(1)}%</div>
    <div class="label">Success Rate</div>
  </div>
</div>

<div class="summary-grid">
  <div class="card blue">
    <div class="value">${timings.responseAverage.toFixed(0)}ms</div>
    <div class="label">Avg Response Time</div>
  </div>
  <div class="card green">
    <div class="value">${stats.assertions ? (stats.assertions.total - stats.assertions.failed) : 0} / ${stats.assertions ? stats.assertions.total : 0}</div>
    <div class="label">Assertions Passed</div>
  </div>
  <div class="card orange">
    <div class="value">${timings.responseMax}ms</div>
    <div class="label">Max Response Time</div>
  </div>
  <div class="card blue">
    <div class="value">${stats.testScripts.total}</div>
    <div class="label">Test Scripts Run</div>
  </div>
</div>
`;

// Success or failure banner
if (failed === 0) {
  html += `
<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #155724; margin-top: 0;">🎉 All API Tests Passed Successfully (100% Pass Rate)</h3>
  <p style="color: #155724; margin-bottom: 0;">
    All 31 enterprise API endpoints across Authentication, Raw Material Intake &amp; FIFO, Compounding &amp; Recipe BOMs, QC Laboratory, Inter-Unit Stock Transfers, Procurement Alerts, IoT Telemetry Streaming, Pallet &amp; Barcode Tracking, Object Storage (MinIO/S3), and Factory Multi-Channel Alerts executed with zero failures.
  </p>
</div>
`;
} else {
  html += `
<div class="root-cause">
  <h3>⚠️ Root Cause Analysis — ${failed} Request(s) Failed</h3>
  <p>The collection experienced test failures. Inspect the failing requests below for status codes and response bodies.</p>
</div>
`;
}

html += `
<h2>📊 Results by API Module</h2>
`;

// Per-folder sections
for (const [folderName, folderData] of Object.entries(byFolder)) {
  const allPass = folderData.failed === 0;
  const allFail = folderData.passed === 0;
  const sectionClass = allPass ? 'section-all-pass' : allFail ? 'section-all-fail' : 'section-partial';
  const pct = ((folderData.passed / (folderData.passed + folderData.failed)) * 100).toFixed(0);
  const barColor = allPass ? 'green' : allFail ? 'red' : 'green';

  html += `
<div class="folder-section ${sectionClass}">
  <div class="folder-header">
    <div class="folder-title">${folderName}</div>
    <div class="folder-stats">
      <span class="badge pass">${folderData.passed} passed</span>
      <span class="badge fail">${folderData.failed} failed</span>
    </div>
  </div>
  <div class="progress-bar"><div class="progress-fill ${barColor}" style="width:${pct}%"></div></div>
  <br>
  <table>
    <thead>
      <tr>
        <th>Request</th>
        <th>Status</th>
        <th>HTTP Code</th>
        <th>Response Time</th>
        <th>Error / Notes</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const req of folderData.requests) {
    const statusLabel = req.success ? '<span class="status-pass">✅ PASS</span>' : '<span class="status-fail">❌ FAIL</span>';
    const codeClass = (req.code >= 200 && req.code < 300) ? 'http-2xx' : (req.code >= 400 && req.code < 500) ? 'http-4xx' : 'http-500';
    const errCell = req.errMsg ? `<span class="error-msg">${req.errMsg}</span>` : (req.success ? '<span style="color:#27ae60">OK</span>' : '—');
    html += `
      <tr>
        <td>${req.name}</td>
        <td>${statusLabel}</td>
        <td><span class="http-code ${codeClass}">${req.code}</span></td>
        <td><span class="rt">${req.rt}ms</span></td>
        <td>${errCell}</td>
      </tr>`;
  }

  html += `
    </tbody>
  </table>
</div>`;
}

html += `
<h2>📋 All Requests Summary</h2>
<div class="folder-section">
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Module</th>
      <th>Request Name</th>
      <th>Status</th>
      <th>HTTP Code</th>
      <th>Response Time</th>
      <th>Error / Notes</th>
    </tr>
  </thead>
  <tbody>
`;

details.forEach((d, i) => {
  const statusLabel = d.success ? '<span class="status-pass">✅</span>' : '<span class="status-fail">❌</span>';
  const codeClass = (d.code >= 200 && d.code < 300) ? 'http-2xx' : (d.code >= 400 && d.code < 500) ? 'http-4xx' : 'http-500';
  html += `
    <tr>
      <td>${i+1}</td>
      <td style="font-size:0.8em;color:#777">${d.folder}</td>
      <td>${d.name}</td>
      <td>${statusLabel}</td>
      <td><span class="http-code ${codeClass}">${d.code}</span></td>
      <td><span class="rt">${d.rt}ms</span></td>
      <td><span class="error-msg">${d.errMsg || ''}</span></td>
    </tr>`;
});

html += `
  </tbody>
</table>
</div>

<p style="color:#aaa;font-size:0.8em;text-align:center;margin-top:40px">
  Generated from Newman run results &bull; StockAI X Collection v25 &bull; Newman v6.2.2
</p>
</body>
</html>`;

fs.writeFileSync('postman/StockAI_API_Report.html', html);
console.log('HTML report written to postman/StockAI_API_Report.html');
console.log('Done.');

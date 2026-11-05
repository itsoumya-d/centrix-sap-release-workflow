export function dashboardPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Centrix · SAP Release Workflow</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
    :root {
      --cx-font-heading: 'Open Sans', sans-serif;
      --cx-font-body: 'Open Sans', sans-serif;
      --cx-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --cx-bg: #F7F7F7;
      --cx-surface: #FFFFFF;
      --cx-ink: #2A2A2A;
      --cx-yellow: #FCAF17;
      --cx-blue: #5472D2;
      --cx-radius: 4px;
      --cx-space: 8px;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--cx-bg); color: var(--cx-ink); font-family: var(--cx-font-body); }
    header { background: var(--cx-surface); border-bottom: 4px solid var(--cx-yellow); padding: calc(var(--cx-space) * 4) calc(var(--cx-space) * 4) calc(var(--cx-space) * 3); }
    .wrap { max-width: 1120px; margin: 0 auto; }
    .eyebrow { margin: 0 0 var(--cx-space); color: var(--cx-blue); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0 0 var(--cx-space); font-family: var(--cx-font-heading); font-size: clamp(30px, 5vw, 46px); line-height: 1.05; letter-spacing: -0.02em; }
    header p { margin: 0; max-width: 700px; color: #5f6368; line-height: 1.65; }
    main { max-width: 1120px; margin: 0 auto; padding: calc(var(--cx-space) * 3) calc(var(--cx-space) * 4); }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: calc(var(--cx-space) * 2); }
    .card { background: var(--cx-surface); border: 1px solid #e3e3e3; border-radius: var(--cx-radius); padding: calc(var(--cx-space) * 2); }
    .label { margin: 0 0 6px; color: #70757a; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .value { margin: 0; font-family: var(--cx-font-heading); font-size: 27px; font-weight: 800; letter-spacing: -0.02em; }
    .panels { display: grid; grid-template-columns: 1.5fr 1fr; gap: calc(var(--cx-space) * 2); margin-top: calc(var(--cx-space) * 2); }
    .panel { background: var(--cx-surface); border: 1px solid #e3e3e3; border-radius: var(--cx-radius); padding: calc(var(--cx-space) * 2); }
    .panel h2 { margin: 0 0 var(--cx-space); font-family: var(--cx-font-heading); font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; color: #70757a; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 6px 4px; border-bottom: 1px solid #e3e3e3; }
    td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
    td.amount { text-align: right; font-family: var(--cx-font-mono); }
    .chip { display: inline-block; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
    .chip.released { background: #E7F6EC; color: #1E7A3C; }
    .chip.partially_released { background: #FFF4E0; color: #8A5A00; }
    .chip.blocked { background: #FDE8EB; color: #B42318; }
    .chip.draft { background: #EEEEEE; color: #5f6368; }
    .release { display: flex; gap: 6px; flex-wrap: wrap; margin-top: var(--cx-space); }
    .release button { font: inherit; font-size: 11px; font-weight: 700; border: 0; border-radius: 999px; padding: 6px 10px; background: var(--cx-blue); color: #fff; cursor: pointer; }
    .blocker { color: #B42318; font-size: 12px; margin-top: var(--cx-space); }
    .status { margin-top: var(--cx-space); font-size: 12px; color: #70757a; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } .panels { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<header>
  <div class="wrap">
    <p class="eyebrow">Centrix · SAP S/4HANA release strategy</p>
    <h1>Purchase Order Release Workflow</h1>
    <p>Amount thresholds, required release codes, approver assignment, budget checks and tax-inclusive totals for an SAP purchase-order approval.</p>
  </div>
</header>
<main>
  <section class="kpis">
    <article class="card"><p class="label">Orders</p><p class="value" id="orders">—</p></article>
    <article class="card"><p class="label">Released</p><p class="value" id="released">—</p></article>
    <article class="card"><p class="label">Partially released</p><p class="value" id="partial">—</p></article>
    <article class="card"><p class="label">Blocked</p><p class="value" id="blocked">—</p></article>
  </section>

  <section class="panels">
    <article class="panel">
      <h2>Purchase orders</h2>
      <table>
        <thead><tr><th>PO</th><th>Supplier</th><th>Total</th><th>Required</th><th>Status</th></tr></thead>
        <tbody id="rows"><tr><td colspan="5">Loading…</td></tr></tbody>
      </table>
      <p class="status" id="status">Loading release workflow…</p>
    </article>
    <article class="panel">
      <h2>Release actions</h2>
      <div id="actions">Select an order to release.</div>
    </article>
  </section>
</main>
<script>
  const money = (value, currency) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(value);
  let orders = [];
  async function load() {
    orders = await fetch('/api/orders').then((r) => r.json());
    const counts = { released: 0, partially_released: 0, blocked: 0 };
    for (const order of orders) if (counts[order.status] !== undefined) counts[order.status]++;
    document.getElementById('orders').textContent = orders.length;
    document.getElementById('released').textContent = counts.released;
    document.getElementById('partial').textContent = counts.partially_released;
    document.getElementById('blocked').textContent = counts.blocked;
    document.getElementById('rows').innerHTML = orders.map((order) =>
      '<tr><td>' + order.id.slice(0, 12) + '</td><td>' + order.supplier + '</td><td class="amount">' + money(order.totalAmount, order.currency) + '</td><td>' + order.requiredCodes.join(', ') + '</td><td><span class="chip ' + order.status + '">' + order.status.replace('_', ' ') + '</span></td></tr>'
    ).join('');
    document.getElementById('actions').innerHTML = orders.map((order) => {
      const remaining = order.requiredCodes.filter((code) => !order.releases.some((release) => release.code === code));
      return '<div style="margin-bottom:14px"><strong>' + order.supplier + '</strong><div class="status">' + money(order.totalAmount, order.currency) + ' · ' + order.status.replace('_', ' ') + '</div>' +
        (order.status === 'blocked' ? '<div class="blocker">Budget shortfall: ' + money(order.budgetAvailable, order.currency) + ' available</div>' : '') +
        (remaining.length && order.status !== 'blocked' ? '<div class="release">' + remaining.map((code) => '<button data-id="' + order.id + '" data-code="' + code + '">Release ' + code + '</button>').join('') + '</div>' : '') + '</div>';
    }).join('');
    document.querySelectorAll('button[data-code]').forEach((button) => button.addEventListener('click', async () => {
      await fetch('/api/orders/' + button.dataset.id + '/release', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: button.dataset.code, approver: 'release.manager' }) });
      await load();
    }));
    document.getElementById('status').textContent = orders.length + ' orders loaded. Release codes are assigned by amount threshold.';
  }
  load().catch((error) => { document.getElementById('status').textContent = 'API offline: ' + error.message; });
</script>
</body>
</html>`;
}

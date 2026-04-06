let stormRows = [];
let stormSearch = [];
let siteRows = [];
let siteSearch = [];

const STORM_STATUS_ORDER = ['NEW', 'MISMATCH', 'UNCHANGED', 'REMOVED'];

function normalize(value) {
  return String(value ?? '').toLowerCase();
}

function buildStormSearch(rows) {
  return rows.map((row) =>
    [row.plaId, row.baseLocation, row.remarks, row.nmsName]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase())
      .join(' ')
  );
}

function buildSiteSearch(rows) {
  return rows.map((row) =>
    [row.alert, row.name, row.dn, row.pla, row.li, row.sn]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase())
      .join(' ')
  );
}

function queryStorm(term, filterStatus) {
  const normalizedTerm = normalize(term).trim();
  const indices = [];

  for (let i = 0; i < stormRows.length; i += 1) {
    const row = stormRows[i];
    if (filterStatus !== 'ALL' && row.matchStatus !== filterStatus) continue;
    if (normalizedTerm && !stormSearch[i].includes(normalizedTerm)) continue;
    indices.push(i);
  }

  indices.sort((ai, bi) => {
    const a = stormRows[ai];
    const b = stormRows[bi];
    const orderA = STORM_STATUS_ORDER.indexOf(a.matchStatus);
    const orderB = STORM_STATUS_ORDER.indexOf(b.matchStatus);
    if (orderA !== orderB) return orderA - orderB;

    const baseA = a.baseLocation || '';
    const baseB = b.baseLocation || '';
    const baseCompare = baseA.localeCompare(baseB, undefined, { numeric: true, sensitivity: 'base' });
    if (baseCompare === 0) return (a.nmsName || '').localeCompare(b.nmsName || '');
    return baseCompare;
  });

  return indices;
}

function querySite(term) {
  const normalizedTerm = normalize(term).trim();
  if (!normalizedTerm) {
    return siteRows.map((_, index) => index);
  }

  const indices = [];
  for (let i = 0; i < siteRows.length; i += 1) {
    if (siteSearch[i].includes(normalizedTerm)) indices.push(i);
  }
  return indices;
}

self.onmessage = (event) => {
  try {
    const { type, rows, term, filterStatus, requestId } = event.data || {};

    if (type === 'INIT_STORM') {
      stormRows = Array.isArray(rows) ? rows : [];
      stormSearch = buildStormSearch(stormRows);
      return;
    }

    if (type === 'QUERY_STORM') {
      const indices = queryStorm(term, filterStatus);
      self.postMessage({ type: 'RESULT_STORM', requestId, indices });
      return;
    }

    if (type === 'INIT_SITE') {
      siteRows = Array.isArray(rows) ? rows : [];
      siteSearch = buildSiteSearch(siteRows);
      return;
    }

    if (type === 'QUERY_SITE') {
      const indices = querySite(term);
      self.postMessage({ type: 'RESULT_SITE', requestId, indices });
    }
  } catch (error) {
    self.postMessage({
      type: 'WORKER_ERROR',
      requestId: event?.data?.requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};


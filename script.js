/* ══════════════════════════════════════════
   CREDWISE KIDS — script.js
   All application logic

   DATA MODEL
   records[year][month][day] = {
     pocketMoney, relatives, work,
     snacks, recharge, trips,
     savPocket, savRelatives,
     isWeekend
   }
══════════════════════════════════════════ */

/* ── Global State ── */
let records    = {};
let activeYear = new Date().getFullYear();
let prevScore  = null;
let curScore   = null;
let txnFilter  = 'all';

/* ── Modal state ── */
let mMonth = 0, mDay = 1;

/* ── Constants ── */
const MNAMES = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const MSHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DNAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOW    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const LVLS = [
  { min:0,   icon:'🥚', name:'Newbie',        desc:'Just starting your financial journey.' },
  { min:400, icon:'🐣', name:'Learner',        desc:'Building awareness about money habits.' },
  { min:500, icon:'🐥', name:'Saver Seed',     desc:'Saving occasionally — keep it up!' },
  { min:600, icon:'🌱', name:'Money Sprout',   desc:'Good control over spending & savings.' },
  { min:700, icon:'🌿', name:'Finance Star',   desc:'Excellent discipline — most adults can\'t match this!' },
  { min:800, icon:'🏆', name:'Credit Legend',  desc:'Elite financial behavior. You\'re a role model!' },
];

/* ══════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════ */

/** Returns number of days in a given month (1-indexed month via JS Date) */
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

/** Returns 0-6 day-of-week for the 1st of a month */
function firstDOW(y, m)    { return new Date(y, m, 1).getDay(); }

/** Returns true if year is a leap year */
function isLeap(y)          { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

/** Returns 365 or 366 */
function daysInYear(y)      { return isLeap(y) ? 366 : 365; }

/** Returns 0-6 day-of-week for a given date */
function dow(y, m, d)       { return new Date(y, m, d).getDay(); }

/** Returns true if Saturday or Sunday */
function isWeekend(y, m, d) { const w = dow(y, m, d); return w === 0 || w === 6; }

/** Returns true if date is today or in the past */
function isPastOrToday(y, m, d) { return new Date(y, m, d) <= new Date(); }

/** Format number in Indian locale */
function fmt(n)  { return Math.round(n).toLocaleString('en-IN'); }

/** Convert 0-1 value to percentage string */
function pct(v)  { return Math.round(v * 100) + '%'; }

/* ── Record CRUD ── */
function getRec(y, m, d)        { return records[y]?.[m]?.[d] || null; }
function setRec(y, m, d, data)  {
  if (!records[y])       records[y] = {};
  if (!records[y][m])    records[y][m] = {};
  records[y][m][d] = data;
}
function delRec(y, m, d) { if (records[y]?.[m]?.[d]) delete records[y][m][d]; }

/* ── Aggregate all records for a given year ── */
function aggregateYear(y) {
  let inc = 0, exp = 0, sav = 0, logged = 0, savDays = 0, weDays = 0, overDays = 0;
  const yr = records[y] || {};
  for (let m = 0; m < 12; m++) {
    const mo = yr[m] || {};
    for (const d in mo) {
      const r = mo[d];
      const dayInc = (r.pocketMoney || 0) + (r.relatives || 0) + (r.work || 0);
      const dayExp = (r.snacks || 0) + (r.recharge || 0) + (r.trips || 0);
      const daySav = (r.savPocket || 0) + (r.savRelatives || 0);
      inc += dayInc; exp += dayExp; sav += daySav; logged++;
      if (daySav > 0) savDays++;
      if (r.isWeekend) weDays++;
      if (dayExp > dayInc && dayInc > 0) overDays++;
    }
  }
  return { inc, exp, sav, logged, savDays, weDays, overDays };
}

/* ── Determine visual state of a day cell ── */
function dayState(r) {
  if (!r) return null;
  const inc = (r.pocketMoney || 0) + (r.relatives || 0) + (r.work || 0);
  const exp = (r.snacks || 0) + (r.recharge || 0) + (r.trips || 0);
  const sav = (r.savPocket || 0) + (r.savRelatives || 0);
  if (r.isWeekend) return 'we-log';
  if (sav > 0 && exp <= inc) return 's-good';
  if (exp > inc && inc > 0)  return 's-poor';
  if (inc === 0 && exp === 0 && sav === 0) return 's-zero';
  return 's-avg';
}

/* ── Score color based on value ── */
function scoreColor(s) {
  if (s >= 700) return '#10b981';
  if (s >= 500) return '#f59e0b';
  return '#ef4444';
}

/* ── Score label based on value ── */
function scoreLabel(s) {
  if (s >= 800) return 'Elite 🌟';
  if (s >= 700) return 'Excellent 🥇';
  if (s >= 600) return 'Good 👍';
  if (s >= 500) return 'Average 😐';
  if (s >= 400) return 'Below Avg ⚠️';
  return 'Poor 📉';
}

/* ── Get current level based on score ── */
function getLevel(s) {
  let l = LVLS[0];
  LVLS.forEach(x => { if (s >= x.min) l = x; });
  return l;
}

/* ══════════════════════════════════════════
   YEAR NAVIGATION
══════════════════════════════════════════ */
function chgYear(delta) {
  activeYear += delta;
  document.getElementById('yrVal').textContent  = activeYear;
  document.getElementById('yrVal2').textContent = activeYear;
  renderCalendar();
  updateStats();
  renderHistory();
  renderAnalysis();
}

/* ══════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════ */
function switchTab(name) {
  ['cal', 'history', 'analysis', 'calculator'].forEach(n => {
    document.getElementById('tab-' + n).classList.toggle('active', n === name);
    document.getElementById('tp-'  + n).classList.toggle('show',   n === name);
  });
  if (name === 'history')    renderHistory();
  if (name === 'analysis')   renderAnalysis();
  if (name === 'calculator') initCalcTab();
}

/* ══════════════════════════════════════════
   CALENDAR RENDER
══════════════════════════════════════════ */
function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  grid.innerHTML = '';
  const today = new Date();
  const ty = today.getFullYear(), tm = today.getMonth(), td = today.getDate();

  for (let m = 0; m < 12; m++) {
    const days = daysInMonth(activeYear, m);
    const fdow = firstDOW(activeYear, m);
    const isCur = (activeYear === ty && m === tm);

    /* Monthly aggregates for chips */
    let mInc = 0, mExp = 0, mSav = 0, mLogd = 0, mOver = 0, mWe = 0;
    for (let d = 1; d <= days; d++) {
      const r = getRec(activeYear, m, d);
      if (r) {
        mInc += (r.pocketMoney || 0) + (r.relatives || 0) + (r.work || 0);
        mExp += (r.snacks || 0) + (r.recharge || 0) + (r.trips || 0);
        mSav += (r.savPocket || 0) + (r.savRelatives || 0);
        mLogd++;
        if (mExp > mInc && mInc > 0) mOver++;
        if (r.isWeekend) mWe++;
      }
    }

    /* Month card element */
    const card = document.createElement('div');
    card.className = 'm-card' + (isCur ? ' cur-month' : '');
    card.innerHTML = `
      <div class="m-head">${MNAMES[m]}<span class="m-days-ct">${days} days</span></div>
      <div class="m-logged">${mLogd} / ${days} logged</div>
    `;

    /* Day-of-week header row */
    const dowRow = document.createElement('div');
    dowRow.className = 'dow-row';
    DOW.forEach((dl, i) => {
      const s = document.createElement('span');
      s.textContent = dl;
      if (i === 0 || i === 6) s.className = 'we-label';
      dowRow.appendChild(s);
    });
    card.appendChild(dowRow);

    /* Days grid */
    const dg = document.createElement('div');
    dg.className = 'days-g';

    /* Empty filler cells before first day */
    for (let e = 0; e < fdow; e++) {
      const em = document.createElement('div');
      em.className = 'dc empty';
      dg.appendChild(em);
    }

    /* Individual day cells */
    for (let d = 1; d <= days; d++) {
      const cell  = document.createElement('div');
      const rec   = getRec(activeYear, m, d);
      const past  = isPastOrToday(activeYear, m, d);
      const isTo  = (activeYear === ty && m === tm && d === td);
      const we    = isWeekend(activeYear, m, d);
      const state = dayState(rec);

      let cls = 'dc';
      if (state) cls += ' ' + state;
      else if (we) cls += ' weekend';
      if (isTo) cls += ' today';
      if (!past && !isTo) cls += ' future';

      cell.className  = cls;
      cell.textContent = d;

      /* Tooltip */
      if (rec) {
        const inc = (rec.pocketMoney || 0) + (rec.relatives || 0) + (rec.work || 0);
        const exp = (rec.snacks || 0) + (rec.recharge || 0) + (rec.trips || 0);
        const sav = (rec.savPocket || 0) + (rec.savRelatives || 0);
        cell.title = `${DNAMES[dow(activeYear, m, d)]} ${MSHORT[m]} ${d}\nIncome: ₹${fmt(inc)} | Expenses: ₹${fmt(exp)} | Saved: ₹${fmt(sav)}`;
      } else if (we) {
        cell.title = `${DNAMES[dow(activeYear, m, d)]} — Weekend (Pocket Money excluded)`;
      }

      /* Click handler for past & today */
      if (past || isTo) cell.addEventListener('click', () => openModal(m, d));

      /* Savings dot indicator */
      if (rec && ((rec.savPocket || 0) + (rec.savRelatives || 0)) > 0) {
        const dot = document.createElement('div');
        dot.className = 'day-dot';
        cell.appendChild(dot);
      }

      dg.appendChild(cell);
    }

    card.appendChild(dg);

    /* Summary chips below the month */
    if (mLogd > 0) {
      const chips = document.createElement('div');
      chips.className = 'm-chips';
      chips.innerHTML = `
        <span class="chip g">₹${fmt(mSav)} saved</span>
        <span class="chip a">₹${fmt(mExp)} spent</span>
        ${mOver > 0 ? `<span class="chip r">${mOver} over</span>` : ''}
        ${mWe   > 0 ? `<span class="chip o">${mWe} wknd</span>`  : ''}
      `;
      card.appendChild(chips);
    }

    grid.appendChild(card);
  }
}

/* ══════════════════════════════════════════
   MODAL — Day Entry
══════════════════════════════════════════ */
function openModal(m, d) {
  mMonth = m; mDay = d;
  const we      = isWeekend(activeYear, m, d);
  const dayName = DNAMES[dow(activeYear, m, d)];

  document.getElementById('modalTitle').textContent   = `📅 ${MNAMES[m]} ${d}`;
  document.getElementById('modalDateLbl').textContent = `${dayName} · ${activeYear} · Month has ${daysInMonth(activeYear, m)} days`;

  /* Weekend: disable pocket money field */
  const pocketInput = document.getElementById('mPocket');
  const weBanner    = document.getElementById('weekendBanner');
  if (we) {
    weBanner.classList.remove('hidden');
    pocketInput.disabled     = true;
    pocketInput.placeholder  = 'Not allowed on weekends';
    pocketInput.value        = '';
  } else {
    weBanner.classList.add('hidden');
    pocketInput.disabled     = false;
    pocketInput.placeholder  = 'Pocket money (weekdays)';
  }

  /* Pre-fill from existing record */
  const r = getRec(activeYear, m, d);
  document.getElementById('mPocket').value       = (!we && r) ? r.pocketMoney   || '' : '';
  document.getElementById('mRelatives').value    = r ? r.relatives    || '' : '';
  document.getElementById('mWork').value         = r ? r.work         || '' : '';
  document.getElementById('mSnacks').value       = r ? r.snacks       || '' : '';
  document.getElementById('mRecharge').value     = r ? r.recharge     || '' : '';
  document.getElementById('mTrips').value        = r ? r.trips        || '' : '';
  document.getElementById('mSavPocket').value    = r ? r.savPocket    || '' : '';
  document.getElementById('mSavRelatives').value = r ? r.savRelatives || '' : '';

  updatePreview();
  document.getElementById('modalOv').classList.add('open');
}

function closeModal() { document.getElementById('modalOv').classList.remove('open'); }

function ovClick(e) {
  if (e.target === document.getElementById('modalOv')) closeModal();
}

/* ── Live preview inside modal ── */
function updatePreview() {
  const we   = isWeekend(activeYear, mMonth, mDay);
  const pm   = parseFloat(document.getElementById('mPocket').value)       || 0;
  const rel  = parseFloat(document.getElementById('mRelatives').value)    || 0;
  const work = parseFloat(document.getElementById('mWork').value)         || 0;
  const snk  = parseFloat(document.getElementById('mSnacks').value)       || 0;
  const rch  = parseFloat(document.getElementById('mRecharge').value)     || 0;
  const trp  = parseFloat(document.getElementById('mTrips').value)        || 0;
  const sp   = parseFloat(document.getElementById('mSavPocket').value)    || 0;
  const sr   = parseFloat(document.getElementById('mSavRelatives').value) || 0;

  const inc = pm + rel + work;
  const exp = snk + rch + trp;
  const sav = sp + sr;
  const net = inc - exp - sav;

  if (inc === 0 && exp === 0 && sav === 0) {
    document.getElementById('dayPrev').innerHTML = 'Enter amounts above to preview.';
    return;
  }

  let status = '', color = 'var(--muted)';
  if (sav > 0 && exp <= inc) { status = '✅ Healthy day! Savings recorded.'; color = '#10b981'; }
  else if (exp > inc && inc > 0) { status = '⚠️ Overspending detected!'; color = '#ef4444'; }
  else { status = '😐 Balanced — try saving something.'; color = '#f59e0b'; }

  document.getElementById('dayPrev').innerHTML = `
    <strong>Income:</strong> ₹${fmt(inc)} &nbsp; <strong>Expenses:</strong> ₹${fmt(exp)} &nbsp; <strong>Saved:</strong> ₹${fmt(sav)}<br>
    ${we ? '<span style="color:#f97316;font-size:.75rem;">🏖 Weekend — pocket money not counted</span><br>' : ''}
    <strong>Net:</strong> ₹${fmt(net)}
    <div class="dp-status" style="color:${color}">${status}</div>
  `;
}

/* Wire live preview to all modal inputs */
['mPocket','mRelatives','mWork','mSnacks','mRecharge','mTrips','mSavPocket','mSavRelatives'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});

/* ── Save a day's record ── */
function saveDay() {
  const we = isWeekend(activeYear, mMonth, mDay);
  setRec(activeYear, mMonth, mDay, {
    pocketMoney:  we ? 0 : (parseFloat(document.getElementById('mPocket').value)       || 0),
    relatives:    parseFloat(document.getElementById('mRelatives').value)    || 0,
    work:         parseFloat(document.getElementById('mWork').value)         || 0,
    snacks:       parseFloat(document.getElementById('mSnacks').value)       || 0,
    recharge:     parseFloat(document.getElementById('mRecharge').value)     || 0,
    trips:        parseFloat(document.getElementById('mTrips').value)        || 0,
    savPocket:    parseFloat(document.getElementById('mSavPocket').value)    || 0,
    savRelatives: parseFloat(document.getElementById('mSavRelatives').value) || 0,
    isWeekend:    we,
  });
  closeModal();
  persistRecords();   /* ← auto-save to localStorage */
  refreshAll();
  showToast(`✅ ${MSHORT[mMonth]} ${mDay} saved! Score updated.`);
}

/* ── Clear a day's record ── */
function clearDay() {
  delRec(activeYear, mMonth, mDay);
  closeModal();
  persistRecords();   /* ← auto-save to localStorage */
  refreshAll();
  showToast(`🗑 ${MSHORT[mMonth]} ${mDay} cleared.`);
}

/* ══════════════════════════════════════════
   REFRESH ALL PANELS
   Called automatically after every save/clear
══════════════════════════════════════════ */
function refreshAll() {
  renderCalendar();
  updateStats();
  
  /* Load cached score instead of live compute */
  loadCachedScore();

  /* Re-render visible tab content */
  if (document.getElementById('tp-history').classList.contains('show'))  renderHistory();
  if (document.getElementById('tp-analysis').classList.contains('show')) renderAnalysis();
}

/* ══════════════════════════════════════════
   STATS BAR UPDATE
══════════════════════════════════════════ */
function updateStats() {
  const ag = aggregateYear(activeYear);
  document.getElementById('stLogged').textContent   = ag.logged;
  document.getElementById('stIncome').textContent   = '₹' + fmt(ag.inc);
  document.getElementById('stExpenses').textContent = '₹' + fmt(ag.exp);
  document.getElementById('stSavings').textContent  = '₹' + fmt(ag.sav);
  document.getElementById('stSavDays').textContent  = ag.savDays;
  document.getElementById('stWeDays').textContent   = ag.weDays;
  document.getElementById('stOverDays').textContent = ag.overDays;
}

/* ══════════════════════════════════════════
   SCORE DISPLAY logic
══════════════════════════════════════════ */
function renderScoreFromData(ag, S, C, D, score, cachedPrev) {
  const color = scoreColor(score);
  const label = scoreLabel(score);

  prevScore = cachedPrev !== undefined ? cachedPrev : curScore;
  curScore  = score;


  /* Show score panel */
  document.getElementById('scorePh').classList.add('hidden');
  const out = document.getElementById('scoreOut');
  out.classList.remove('hidden');
  out.style.display = 'flex';

  /* Gauge animation */
  drawGauge(score, color);
  const numEl = document.getElementById('gNum');
  numEl.style.color = color;
  countUp(numEl, score);
  const lblEl = document.getElementById('gLbl');
  lblEl.textContent = label;
  lblEl.style.color  = color;

  /* Range bar thumb */
  const p = Math.max(0, Math.min(1, (score - 300) / 600));
  document.getElementById('rThumb').style.left = (p * 100) + '%';

  /* Breakdown bars */
  animBar('bSav', S, 100); document.getElementById('nSav').textContent = pct(S);
  animBar('bCtl', C, 200); document.getElementById('nCtl').textContent = pct(C);
  animBar('bDsc', D, 300); document.getElementById('nDsc').textContent = pct(D);

  /* Badges */
  setBadge('bdg-saver', S > 0.05);
  setBadge('bdg-ctrl',  C > 0.5);
  setBadge('bdg-disc',  D >= 0.7);
  setBadge('bdg-elite', score >= 750);
  setBadge('bdg-full',  ag.logged >= daysInYear(activeYear));

  /* Info label below score */
  document.getElementById('scoreInfoLbl').innerHTML =
    `Based on <strong style="color:var(--text)">${ag.logged}</strong> logged days out of <strong style="color:var(--text)">${daysInYear(activeYear)}</strong>` +
    `<br>Savings rate: <strong style="color:var(--good)">${pct(S)}</strong>`;

  /* Before / After comparison */
  document.getElementById('curNum').textContent = score;
  document.getElementById('curNum').style.color = color;
  document.getElementById('curSt').textContent  = label;
  document.getElementById('curSt').style.color  = color;
  if (prevScore !== null) {
    document.getElementById('prevNum').textContent = prevScore;
    document.getElementById('prevNum').style.color = scoreColor(prevScore);
    document.getElementById('prevSt').textContent  = scoreLabel(prevScore);
    document.getElementById('prevSt').style.color  = scoreColor(prevScore);
    const diff = score - prevScore;
    const dEl  = document.getElementById('cDelta');
    dEl.textContent = (diff >= 0 ? '+' : '') + diff;
    dEl.className   = 'c-delta ' + (diff > 0 ? 'up' : diff < 0 ? 'dn' : 'eq');
  } else {
    document.getElementById('prevNum').textContent = '—';
    document.getElementById('prevSt').textContent  = 'First entry 🎯';
    document.getElementById('cDelta').textContent  = 'NEW';
    document.getElementById('cDelta').className    = 'c-delta eq';
  }

  /* Level */
  const lv = getLevel(score);
  document.getElementById('lvlIcon').textContent = lv.icon;
  document.getElementById('lvlName').textContent = lv.name;
  document.getElementById('lvlDesc').textContent = lv.desc;
  document.getElementById('xpLbl').textContent   = `${score} / 900 XP`;
  setTimeout(() => {
    document.getElementById('xpFill').style.width = Math.min(score / 900, 1) * 100 + '%';
  }, 200);

  /* Smart suggestions */
  buildSuggestions(ag, S, C, D, score);
}

/* ══════════════════════════════════════════
   TRANSACTION HISTORY
══════════════════════════════════════════ */
function renderHistory() {
  document.getElementById('yrVal2').textContent = activeYear;
  const rows = [];
  const yr = records[activeYear] || {};

  for (let m = 0; m < 12; m++) {
    const mo = yr[m] || {};
    for (const d in mo) {
      const r   = mo[d];
      const inc = (r.pocketMoney || 0) + (r.relatives || 0) + (r.work || 0);
      const exp = (r.snacks || 0) + (r.recharge || 0) + (r.trips || 0);
      const sav = (r.savPocket || 0) + (r.savRelatives || 0);
      const net = inc - exp - sav;
      const we  = r.isWeekend;
      const state = sav > 0 && exp <= inc ? 'good'
                  : exp > inc && inc > 0  ? 'poor'
                  : we                    ? 'we'
                  :                         'avg';
      rows.push({ m, d: parseInt(d), inc, exp, sav, net, we, state, r });
    }
  }

  /* Sort latest first */
  rows.sort((a, b) => b.m - a.m || b.d - a.d);

  /* Apply filter */
  const filtered = txnFilter === 'all'  ? rows
                 : txnFilter === 'good' ? rows.filter(r => r.state === 'good')
                 : txnFilter === 'poor' ? rows.filter(r => r.state === 'poor')
                 :                        rows.filter(r => r.we);

  document.getElementById('txnCount').textContent = `${filtered.length} entries`;

  const tbody = document.getElementById('txnBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="txn-empty">No transactions match the selected filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr class="tr-${row.state}">
      <td>
        <div class="txn-date">${MNAMES[row.m]} ${row.d}, ${activeYear}</div>
        <div class="txn-day">${DNAMES[dow(activeYear, row.m, row.d)]}</div>
      </td>
      <td>
        ${row.we
          ? '<span class="txn-badge we">🏖 Weekend</span>'
          : '<span class="txn-badge wd">📅 Weekday</span>'}
      </td>
      <td><span class="txn-val pos">₹${fmt(row.inc)}</span></td>
      <td><span class="txn-val ${row.exp > row.inc && row.inc > 0 ? 'neg' : ''}">₹${fmt(row.exp)}</span></td>
      <td><span class="txn-val ${row.sav > 0 ? 'pos' : 'zero'}">₹${fmt(row.sav)}</span></td>
      <td><span class="txn-val ${row.net >= 0 ? 'pos' : 'neg'}">₹${fmt(row.net)}</span></td>
      <td>${row.state === 'good' ? '<span class="txn-badge wd">✅ Saved</span>'
         : row.state === 'poor'  ? '<span class="txn-badge poor">⚠️ Overspent</span>'
         : row.state === 'we'    ? '<span class="txn-badge we">🏖 Weekend</span>'
         :                         '<span class="txn-badge avg">😐 Neutral</span>'}</td>
    </tr>
  `).join('');
}

/* ── Filter transactions ── */
function filterTxn(f) {
  txnFilter = f;
  document.querySelectorAll('.txn-filter').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  renderHistory();
}

/* ══════════════════════════════════════════
   MONTHLY ANALYSIS
══════════════════════════════════════════ */
function renderAnalysis() {
  const grid  = document.getElementById('analysisGrid');
  grid.innerHTML = '';
  const today = new Date();
  const ty    = today.getFullYear(), tm = today.getMonth();

  for (let m = 0; m < 12; m++) {
    const days = daysInMonth(activeYear, m);
    let mInc = 0, mExp = 0, mSav = 0, logged = 0, savDays = 0, overDays = 0, weDays = 0;
    const yr = records[activeYear] || {};

    for (let d = 1; d <= days; d++) {
      const r = (yr[m] || {})[d];
      if (r) {
        const inc = (r.pocketMoney || 0) + (r.relatives || 0) + (r.work || 0);
        const exp = (r.snacks || 0) + (r.recharge || 0) + (r.trips || 0);
        const sav = (r.savPocket || 0) + (r.savRelatives || 0);
        mInc += inc; mExp += exp; mSav += sav; logged++;
        if (sav > 0)           savDays++;
        if (exp > inc && inc > 0) overDays++;
        if (r.isWeekend)       weDays++;
      }
    }

    /* Count weekdays in this month */
    let wdCount = 0;
    for (let d = 1; d <= days; d++) { if (!isWeekend(activeYear, m, d)) wdCount++; }

    const savRate = mInc > 0 ? (mSav / mInc) : 0;
    const expRate = mInc > 0 ? (mExp / mInc) : 0;
    const S = Math.min(savRate, 1);
    const C = Math.max(1 - expRate, 0);
    const D = logged > 0 ? savDays / logged : 0;
    const mScore = Math.round(300 + 600 * (0.4 * S + 0.4 * C + 0.2 * D));
    const color  = logged > 0 ? scoreColor(mScore) : 'var(--muted)';
    const isCur  = (activeYear === ty && m === tm);

    const card = document.createElement('div');
    card.className = 'an-card' + (isCur ? ' cur' : '');

    card.innerHTML = `
      <div class="an-month-head">
        <span class="an-month-name">${MNAMES[m]}</span>
        ${logged > 0
          ? `<span class="an-score-chip" style="color:${color};border-color:${color};background:color-mix(in srgb,${color} 12%,transparent)">${mScore}</span>`
          : `<span class="an-score-chip" style="color:var(--muted);border-color:var(--border)">—</span>`}
      </div>
      ${logged > 0 ? `
        <div class="an-stats">
          <div class="an-stat">
            <div class="an-stat-lbl">📅 Logged</div>
            <div class="an-stat-val sv-b">${logged} / ${days}</div>
          </div>
          <div class="an-stat">
            <div class="an-stat-lbl">🏖 Wknds</div>
            <div class="an-stat-val sv-o">${weDays}</div>
          </div>
          <div class="an-stat">
            <div class="an-stat-lbl">💰 Income</div>
            <div class="an-stat-val sv-g">₹${fmt(mInc)}</div>
          </div>
          <div class="an-stat">
            <div class="an-stat-lbl">💸 Expenses</div>
            <div class="an-stat-val sv-a">₹${fmt(mExp)}</div>
          </div>
          <div class="an-stat">
            <div class="an-stat-lbl">🏦 Savings</div>
            <div class="an-stat-val sv-g">₹${fmt(mSav)}</div>
          </div>
          <div class="an-stat">
            <div class="an-stat-lbl">⚠️ Overspend</div>
            <div class="an-stat-val sv-r">${overDays} days</div>
          </div>
        </div>
        <div class="an-bar-wrap">
          <div class="an-bar-lbl"><span>Savings Rate</span><span>${pct(S)}</span></div>
          <div class="an-bar-track"><div class="an-bar-fill" style="width:${S*100}%;background:var(--good)"></div></div>
        </div>
        <div class="an-bar-wrap" style="margin-top:5px;">
          <div class="an-bar-lbl"><span>Expense Rate</span><span>${pct(Math.min(expRate,1))}</span></div>
          <div class="an-bar-track">
            <div class="an-bar-fill" style="width:${Math.min(expRate,1)*100}%;background:${expRate>0.7?'var(--poor)':expRate>0.5?'var(--avg)':'var(--accent)'}"></div>
          </div>
        </div>
        <div class="an-days-info">📅 ${wdCount} weekdays + 🏖 ${days - wdCount} weekends</div>
      ` : `
        <div class="an-empty">
          No data logged for ${MNAMES[m]}<br>
          <span style="font-size:.68rem;">${days} days · ${wdCount} weekdays · ${days - wdCount} weekends</span>
        </div>
      `}
    `;

    grid.appendChild(card);
  }
}

/* ══════════════════════════════════════════
   SMART SUGGESTIONS
══════════════════════════════════════════ */
function buildSuggestions(ag, S, C, D, score) {
  const tips = [];

  if (S < 0.1)
    tips.push({ icon:'🏦', text:`Save at least 10% of income. That's ₹${fmt(ag.inc * 0.1)} for this year — start with ₹${fmt((ag.inc * 0.1) / (ag.logged || 1))} per day.` });
  else if (S >= 0.35)
    tips.push({ icon:'🥳', text:`Amazing! Saving ${pct(S)} of income. You're outperforming most adults!` });

  if (C < 0.3)
    tips.push({ icon:'💸', text:`Expenses are very high (${pct(1-C)} of income). Try reducing daily snacks or cutting one category.` });
  else if (C > 0.6)
    tips.push({ icon:'✅', text:`Great control — only ${pct(1-C)} of income goes to expenses. Keep it consistent!` });

  if (D < 0.4)
    tips.push({ icon:'📅', text:`Only ${pct(D)} of days had savings. Try saving even ₹5 every weekday — it adds up fast!` });
  else if (D >= 0.8)
    tips.push({ icon:'🏅', text:`${pct(D)} of days included savings — excellent consistency! This is what top scorers do.` });

  if (ag.weDays > 0)
    tips.push({ icon:'🏖', text:`You logged ${ag.weDays} weekend days. Relatives/work income still counts — log occasional income too!` });

  if (score >= 700)
    tips.push({ icon:'🚀', text:`Elite score! Consider a savings goal of ₹${fmt(ag.inc * 0.5)} or learn about recurring deposits.` });
  else if (score < 450)
    tips.push({ icon:'💡', text:`Save ₹10 every weekday. Over 200 school days that's ₹2,000 saved — and a much better score!` });

  tips.push({ icon:'📊', text:`More data = more accuracy. You've logged ${ag.logged} of ${daysInYear(activeYear)} days this year.` });

  const list = document.getElementById('sugList');
  list.innerHTML = '';
  tips.slice(0, 4).forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'sug-item';
    el.style.animationDelay = (i * 80) + 'ms';
    el.innerHTML = `<span class="sug-icon">${t.icon}</span><span>${t.text}</span>`;
    list.appendChild(el);
  });
}

/* ══════════════════════════════════════════
   CANVAS GAUGE DRAWING
══════════════════════════════════════════ */
function drawGauge(score, color) {
  const canvas = document.getElementById('gaugeC');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H, r = 90;

  /* Background arc */
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.stroke();

  /* Coloured fill arc with glow */
  ctx.save();
  ctx.shadowBlur  = 16;
  ctx.shadowColor = color;
  const fp  = (score - 300) / 600;
  const end = Math.PI * (1 + fp);
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0,    '#ef4444');
  grad.addColorStop(0.33, '#f59e0b');
  grad.addColorStop(0.66, '#10b981');
  grad.addColorStop(1,    '#38bdf8');
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, end, false);
  ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.strokeStyle = grad;
  ctx.stroke();
  ctx.restore();

  /* Needle dot at score position */
  const angle = Math.PI * (1 + fp);
  ctx.beginPath();
  ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 8, 0, Math.PI * 2);
  ctx.fillStyle  = '#fff';
  ctx.shadowBlur = 12; ctx.shadowColor = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  /* Tick marks */
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + Math.PI * i / 12;
    ctx.beginPath();
    ctx.moveTo(cx + (r - 12) * Math.cos(a), cy + (r - 12) * Math.sin(a));
    ctx.lineTo(cx + (r +  2) * Math.cos(a), cy + (r +  2) * Math.sin(a));
    ctx.stroke();
  }
}

/* ══════════════════════════════════════════
   ANIMATION HELPERS
══════════════════════════════════════════ */

/** Smooth count-up animation for the score number */
function countUp(el, target, dur = 1200) {
  const start = parseInt(el.textContent) || 300;
  const range = target - start;
  const ts0   = performance.now();
  function step(ts) {
    const p = Math.min((ts - ts0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 4); /* ease-out quart */
    el.textContent = Math.round(start + range * e);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

/** Animate a bar fill to the given proportion */
function animBar(id, val, delay = 0) {
  setTimeout(() => {
    document.getElementById(id).style.width = (val * 100) + '%';
  }, delay);
}

/** Toggle earned state on a badge element */
function setBadge(id, earned) {
  const el = document.getElementById(id);
  if (earned && !el.classList.contains('earned')) el.classList.add('earned');
  else if (!earned) el.classList.remove('earned');
}

/** Show a toast notification */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════
   DATA PERSISTENCE — per user via localStorage
══════════════════════════════════════════ */
let _session = null;

/** Save current records object to localStorage under the logged-in user */
function persistRecords() {
  if (_session) cwSaveRecords(_session.username, records);
}


/* ══════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════ */
function toggleTheme() {
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';
  theme = theme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('xj_theme', theme);
  
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

/* ══════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* ─ Initialise Theme Toggle Button ─ */
  const currTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const tBtn = document.getElementById('themeToggle');
  if (tBtn) tBtn.textContent = currTheme === 'dark' ? '☀️' : '🌙';

  /* ─ Auth guard: redirect to login if no session ─ */
  _session = cwGetSession();
  if (!_session) { window.location.replace('login.html'); return; }

  /* ─ Populate nav user chip ─ */
  document.getElementById('navAv').textContent   = _session.avatar || '🎓';
  document.getElementById('navName').textContent = _session.name;
  document.getElementById('navAge').textContent  = `Age ${_session.age} · Member`;

  /* ─ Load THIS user's saved records from localStorage ─ */
  records = cwLoadRecords(_session.username);

  /* ─ Render all panels ─ */
  document.getElementById('yrVal').textContent  = activeYear;
  document.getElementById('yrVal2').textContent = activeYear;
  renderCalendar();
  updateStats();
  loadCachedScore();
  renderAnalysis();

  showToast(`👋 Welcome back, ${_session.name}!`);
});

/* Close modal on Escape key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ══════════════════════════════════════════
   MONTHLY SCORE REFRESH & CIBIL MODAL LOGIC
══════════════════════════════════════════ */
let cachedScoreData = null;
let cibilInterval = null;

// Developer Override for Hackathon Demos
window.hackathonDemoMode = false;

function loadCachedScore() {
  if (!_session) return;
  try {
    const raw = localStorage.getItem('xj_cached_score_' + _session.username);
    if (raw) cachedScoreData = JSON.parse(raw);
  } catch(e) { cachedScoreData = null; }
  
  if (cachedScoreData) {
    renderScoreFromData(
      cachedScoreData.ag, 
      cachedScoreData.S, 
      cachedScoreData.C, 
      cachedScoreData.D, 
      cachedScoreData.score, 
      cachedScoreData.prevScore
    );
  }
}

function calculateNewScoreData() {
  const ag = aggregateYear(activeYear);
  if (ag.logged === 0) return null;

  const S = ag.inc > 0 ? Math.min(ag.sav / ag.inc, 1) : 0;
  const C = ag.inc > 0 ? Math.max(1 - ag.exp / ag.inc, 0) : 0;
  const D = ag.logged > 0 ? ag.savDays / ag.logged : 0;
  const score = Math.round(300 + 600 * (0.4 * S + 0.4 * C + 0.2 * D));
  
  return { ag, S, C, D, score, timestamp: Date.now() };
}

function checkRefreshScore() {
  if (!_session) return;
  
  const now = new Date();
  // Check if today is the 1st of the month OR if hackathonDemoMode is active
  if (now.getDate() === 1 || window.hackathonDemoMode) {
    // Perform Refresh
    const newData = calculateNewScoreData();
    if (!newData) {
      showToast('⚠️ No records to calculate score.');
      return;
    }
    
    // Maintain history logic
    newData.prevScore = cachedScoreData ? cachedScoreData.score : undefined;
    cachedScoreData = newData;
    
    localStorage.setItem('xj_cached_score_' + _session.username, JSON.stringify(cachedScoreData));
    
    renderScoreFromData(newData.ag, newData.S, newData.C, newData.D, newData.score, newData.prevScore);
    showToast('✅ Credit Score Refreshed Successfully!');
  } else {
    // Open Countdown Modal
    openCibilModal();
  }
}

function openCibilModal() {
  const modal = document.getElementById('cibilModalOv');
  if (!modal) return;
  modal.classList.add('open');
  
  // Set Last Updated Date
  const updSpan = document.getElementById('cibilLastUpd');
  if (cachedScoreData && cachedScoreData.timestamp) {
    const d = new Date(cachedScoreData.timestamp);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    updSpan.textContent = `${("0"+d.getDate()).slice(-2)} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  } else {
    updSpan.textContent = '--';
  }
  
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth() + 1;
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear++;
  }
  const monthsStr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('cibilNextUpd').textContent = `1 ${monthsStr[targetMonth]} ${targetYear}`;
}

function closeCibilModal() {
  const modal = document.getElementById('cibilModalOv');
  if (modal) modal.classList.remove('open');
}

function closeCibilModalOv(e) {
  if (e.target.id === 'cibilModalOv') closeCibilModal();
}

// No demo bypass functions remain by user request.

/* ══════════════════════════════════════════
   SCORE CALCULATOR — Helper: draw mini gauge
══════════════════════════════════════════ */
function drawMiniGauge(canvasId, score, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H, r = 84;

  /* Track */
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.stroke();

  /* Fill + glow */
  ctx.save();
  ctx.shadowBlur = 14; ctx.shadowColor = color;
  const fp  = Math.max(0, Math.min(1, (score - 300) / 600));
  const end = Math.PI * (1 + fp);
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0,    '#ef4444');
  grad.addColorStop(0.33, '#f59e0b');
  grad.addColorStop(0.66, '#10b981');
  grad.addColorStop(1,    '#38bdf8');
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, end, false);
  ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = grad;
  ctx.stroke();
  ctx.restore();

  /* Needle dot */
  const angle = Math.PI * (1 + fp);
  ctx.beginPath();
  ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 7, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 10; ctx.shadowColor = color;
  ctx.fill(); ctx.shadowBlur = 0;
}

/* ══════════════════════════════════════════
   SCORE CALCULATOR — Initialise dropdowns
══════════════════════════════════════════ */
function initCalcTab() {
  /* Populate month dropdowns */
  ['dailyMonth', 'monthlyMonth'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 0) return; /* already populated */
    MNAMES.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = name;
      sel.appendChild(opt);
    });
    /* Default to current month */
    sel.value = new Date().getMonth();
  });

  /* Wire dailyMonth → rebuild day dropdown */
  const dm = document.getElementById('dailyMonth');
  dm.addEventListener('change', populateDailyDays);
  populateDailyDays();
}

function populateDailyDays() {
  const m   = parseInt(document.getElementById('dailyMonth').value);
  const sel = document.getElementById('dailyDay');
  const prev = parseInt(sel.value) || 1;
  sel.innerHTML = '';
  const days = daysInMonth(activeYear, m);
  for (let d = 1; d <= days; d++) {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  }
  /* Try to restore previous day value */
  sel.value = Math.min(prev, days);
}

/* ══════════════════════════════════════════
   DAILY CREDIT SCORE CALCULATOR
   Score = based solely on ONE day's record.
   Formula mirrors the yearly one but for 1 day:
     S = sav / inc  (savings ratio)
     C = 1 - exp/inc (expense control)
     H = 1 if has savings, 0 otherwise (habit flag)
   score = 300 + 600 * (0.4S + 0.4C + 0.2H)
══════════════════════════════════════════ */
function calcDailyScore() {
  const m   = parseInt(document.getElementById('dailyMonth').value);
  const d   = parseInt(document.getElementById('dailyDay').value);
  const rec = getRec(activeYear, m, d);

  const resultEl = document.getElementById('dailyResult');
  const emptyEl  = document.getElementById('dailyEmpty');

  if (!rec) {
    /* No data logged for that day */
    resultEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    emptyEl.innerHTML = `
      <div class="calc-empty-icon">❌</div>
      <div><strong>${MNAMES[m]} ${d}</strong> has no data.<br>
      Click that day on the Calendar tab to log it first.</div>`;
    showToast(`⚠️ No data for ${MNAMES[m]} ${d}.`);
    return;
  }

  const inc = (rec.pocketMoney || 0) + (rec.relatives || 0) + (rec.work || 0);
  const exp = (rec.snacks     || 0) + (rec.recharge  || 0) + (rec.trips || 0);
  const sav = (rec.savPocket  || 0) + (rec.savRelatives || 0);
  const we  =  rec.isWeekend;

  const S = inc > 0 ? Math.min(sav / inc, 1) : 0;
  const C = inc > 0 ? Math.max(1 - exp / inc, 0) : (exp === 0 ? 1 : 0);
  const H = sav > 0 ? 1 : 0;
  const score = Math.round(300 + 600 * (0.4 * S + 0.4 * C + 0.2 * H));
  const color = scoreColor(score);
  const label = scoreLabel(score);

  /* Show result, hide empty */
  emptyEl.classList.add('hidden');
  resultEl.classList.remove('hidden');

  /* Draw mini gauge */
  drawMiniGauge('dailyGauge', score, color);

  /* Score number */
  const numEl = document.getElementById('dailyScoreNum');
  numEl.style.color = color;
  countUp(numEl, score, 900);
  const lblEl = document.getElementById('dailyScoreLbl');
  lblEl.textContent = label; lblEl.style.color = color;

  /* Breakdown bars */
  setTimeout(() => { document.getElementById('dBSav').style.width = (S * 100) + '%'; }, 100);
  setTimeout(() => { document.getElementById('dBCtl').style.width = (C * 100) + '%'; }, 200);
  setTimeout(() => { document.getElementById('dBHbt').style.width = (H * 100) + '%'; }, 300);
  document.getElementById('dNSav').textContent = pct(S);
  document.getElementById('dNCtl').textContent = pct(C);
  document.getElementById('dNHbt').textContent = H === 1 ? '✓' : '✗';
  document.getElementById('dNHbt').style.color = H === 1 ? 'var(--good)' : 'var(--poor)';

  /* Status info box */
  const dayName = DNAMES[dow(activeYear, m, d)];
  let statusTxt = '', statusColor = 'var(--muted)';
  if (sav > 0 && exp <= inc) { statusTxt = '✅ Saved today! Great habit.';         statusColor = 'var(--good)'; }
  else if (exp > inc && inc > 0) { statusTxt = '⚠️ Overspent today.';             statusColor = 'var(--poor)'; }
  else if (we) { statusTxt = '🏖️ Weekend day — pocket money excluded.';           statusColor = 'var(--weekend)'; }
  else { statusTxt = '😐 Balanced day — try saving something next time.';          statusColor = 'var(--avg)'; }

  document.getElementById('dailyInfoBox').innerHTML = `
    <strong>${dayName}, ${MNAMES[m]} ${d}, ${activeYear}</strong><br>
    💰 Income: <strong>₹${fmt(inc)}</strong> &nbsp;
    💸 Expenses: <strong>₹${fmt(exp)}</strong> &nbsp;
    🏦 Saved: <strong>₹${fmt(sav)}</strong>
    ${we ? '<br><span style="color:var(--weekend);font-size:.73rem;">🏖️ Weekend — pocket money not counted</span>' : ''}
    <div class="ci-status" style="color:${statusColor}">${statusTxt}</div>
  `;

  showToast(`📅 ${MNAMES[m]} ${d} → Score: ${score}`);
}

/* ══════════════════════════════════════════
   MONTHLY CREDIT SCORE CALCULATOR
   Score = aggregate of ALL logged days in month.
   Uses same formula as yearly sidebar:
     S = totalSav / totalInc
     C = 1 - totalExp / totalInc
     D = savDays / logged
   score = 300 + 600 * (0.4S + 0.4C + 0.2D)
══════════════════════════════════════════ */
function calcMonthlyScore() {
  const m    = parseInt(document.getElementById('monthlyMonth').value);
  const days = daysInMonth(activeYear, m);

  const resultEl = document.getElementById('monthlyResult');
  const emptyEl  = document.getElementById('monthlyEmpty');

  /* Aggregate all logged days in the month */
  let mInc = 0, mExp = 0, mSav = 0;
  let logged = 0, savDays = 0, overDays = 0, weDays = 0;
  const dailBreakdown = []; /* per-day rows for the tally */

  for (let d = 1; d <= days; d++) {
    const rec = getRec(activeYear, m, d);
    if (!rec) continue;
    const inc = (rec.pocketMoney || 0) + (rec.relatives || 0) + (rec.work || 0);
    const exp = (rec.snacks     || 0) + (rec.recharge  || 0) + (rec.trips || 0);
    const sav = (rec.savPocket  || 0) + (rec.savRelatives || 0);
    mInc += inc; mExp += exp; mSav += sav; logged++;
    if (sav > 0) savDays++;
    if (exp > inc && inc > 0) overDays++;
    if (rec.isWeekend) weDays++;
    dailBreakdown.push({ d, inc, exp, sav, we: rec.isWeekend });
  }

  if (logged === 0) {
    resultEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    emptyEl.innerHTML = `
      <div class="calc-empty-icon">❌</div>
      <div><strong>${MNAMES[m]}</strong> has no logged days.<br>
      Go to Calendar and log some days first!</div>`;
    showToast(`⚠️ No data for ${MNAMES[m]}.`);
    return;
  }

  const S = mInc > 0 ? Math.min(mSav / mInc, 1) : 0;
  const C = mInc > 0 ? Math.max(1 - mExp / mInc, 0) : 0;
  const D = logged  > 0 ? savDays / logged : 0;
  const score = Math.round(300 + 600 * (0.4 * S + 0.4 * C + 0.2 * D));
  const color = scoreColor(score);
  const label = scoreLabel(score);

  /* Show result */
  emptyEl.classList.add('hidden');
  resultEl.classList.remove('hidden');

  /* Mini gauge */
  drawMiniGauge('monthlyGauge', score, color);

  const numEl = document.getElementById('monthlyScoreNum');
  numEl.style.color = color;
  countUp(numEl, score, 900);
  const lblEl = document.getElementById('monthlyScoreLbl');
  lblEl.textContent = label; lblEl.style.color = color;

  /* Breakdown bars */
  setTimeout(() => { document.getElementById('mBSav').style.width = (S * 100) + '%'; }, 100);
  setTimeout(() => { document.getElementById('mBCtl').style.width = (C * 100) + '%'; }, 200);
  setTimeout(() => { document.getElementById('mBDsc').style.width = (D * 100) + '%'; }, 300);
  document.getElementById('mNSav').textContent = pct(S);
  document.getElementById('mNCtl').textContent = pct(C);
  document.getElementById('mNDsc').textContent = pct(D);

  /* Day tally pills */
  const tally = document.getElementById('monthlyTally');
  tally.innerHTML = `
    <span class="cm-pill b">📅 ${logged}/${days} days logged</span>
    <span class="cm-pill g">🏦 ₹${fmt(mSav)} saved</span>
    <span class="cm-pill a">💸 ₹${fmt(mExp)} spent</span>
    <span class="cm-pill p">💰 ₹${fmt(mInc)} income</span>
    ${savDays  > 0 ? `<span class="cm-pill g">✅ ${savDays} saving days</span>`    : ''}
    ${overDays > 0 ? `<span class="cm-pill r">⚠️ ${overDays} overspent</span>`     : ''}
    ${weDays   > 0 ? `<span class="cm-pill o">🏖️ ${weDays} weekends</span>`       : ''}
  `;

  /* Info box */
  let advice = '';
  if (score >= 700)      advice = '🚀 Excellent month! Keep this pace.';
  else if (score >= 500) advice = '👍 Good effort — try to save more consistently.';
  else                   advice = '💡 Focus on reducing expenses and saving daily.';

  document.getElementById('monthlyInfoBox').innerHTML = `
    <strong>${MNAMES[m]} ${activeYear}</strong> — ${days} total days<br>
    Savings rate: <strong style="color:var(--good)">${pct(S)}</strong> &nbsp;
    Expense rate: <strong style="color:var(--avg)">${pct(Math.min(mInc > 0 ? mExp/mInc : 0, 1))}</strong> &nbsp;
    Discipline: <strong style="color:var(--purple)">${pct(D)}</strong>
    <div class="ci-status" style="color:${color}">${advice}</div>
  `;

  showToast(`🗓 ${MNAMES[m]} → Monthly Score: ${score}`);
}

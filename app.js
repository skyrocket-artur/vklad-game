/* Налог на вклад · экраны */
(function () {
  'use strict';
  const CONFIG = {
    channelUrl: 'https://t.me/YunusovArtur',
    botUrl: 'https://t.me/YunusovArtur_bot?start=vklad',
    nextUrl: 'https://t.me/YunusovArtur_bot?start=ipoteka',
    skyUrl: 'https://t.me/YunusovArtur_bot?start=skyrocket_nalog',
    shareUrl: 'https://skyrocket-artur.github.io/vklad-game/',
    shareText: 'Посчитай, сколько налога придёт за проценты по вкладам. Игра-калькулятор за 3 минуты:'
  };
  const S = { year: 2025, sum: 2000000, rate: 18, rateTouched: false, months: 12, cap: false, other: 0, infl: 6.3, salary: 1200000, score: 0 };
  const app = document.getElementById('app');
  const prog = document.getElementById('prog');
  const tg = window.Telegram && window.Telegram.WebApp;

  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  const rub = n => fmt(n) + ' ₽';
  const pct = (n, d = 1) => (n * 100).toFixed(d).replace('.', ',') + '%';
  const short = n => n >= 1e6 ? String(+(n / 1e6).toFixed(2)).replace('.', ',') + ' млн ₽' : rub(n);
  const o = () => ({ year: S.year, sum: S.sum, rate: S.rate, months: S.months, capitalize: S.cap, otherInv: S.other });

  function openUrl(u) {
    if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(u)) tg.openTelegramLink(u);
    else window.open(u, '_blank', 'noopener');
  }
  function go(name) { location.hash = name; }
  function setProg(i) { prog.style.width = (i / 6 * 100) + '%'; }
  function screen(html, step) {
    setProg(step);
    app.innerHTML = '<section class="screen">' + html + '</section>';
    window.scrollTo(0, 0);
  }
  function kicker(t) { return `<div class="kicker"><i></i>${t}</div>`; }

  function slider(id, label, min, max, step, val, show) {
    return `<div class="field"><label for="${id}">${label}<output id="${id}_o">${show(val)}</output></label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  }
  function bindSlider(id, key, show, after) {
    const el = document.getElementById(id), out = document.getElementById(id + '_o');
    el.addEventListener('input', () => { S[key] = +el.value; out.textContent = show(S[key]); after && after(); });
  }
  function seg(id, items, cur) {
    return `<div class="seg" id="${id}">` + items.map(([v, t]) =>
      `<button type="button" data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${t}</button>`).join('') + '</div>';
  }
  function bindSeg(id, key, cast, after) {
    document.getElementById(id).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      S[key] = cast(b.dataset.v);
      [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b));
      after && after();
    });
  }

  /* ---------- 0. Старт ---------- */
  function intro() {
    screen(`${kicker('Игра-калькулятор · 3 минуты')}
      <h1>Налог на вклад: заплатишь ли ты?</h1>
      <p class="lead">Проценты по вкладам облагаются налогом. Банк его не удерживает: ФНС пришлёт уведомление, а платить нужно самому до 1 декабря.</p>
      <div class="steps">
        <div><em>1</em><span><b>Посчитаешь налог</b> за 2025 или 2026 год, с прогрессивной ставкой 13% и 15%</span></div>
        <div><em>2</em><span><b>Увидишь реальную доходность</b> вклада после налога и инфляции</span></div>
        <div><em>3</em><span><b>Проверишь страховку</b>: все ли деньги вернут, если у банка отзовут лицензию</span></div>
        <div><em>4</em><span><b>Узнаешь, сколько вернуть через ИИС</b> по твоей ставке НДФЛ</span></div>
        <div><em>5</em><span><b>Пройдёшь тест на 5 мифов</b> о налоге на вклады</span></div>
      </div>
      <div class="btns"><button class="btn" id="go">Посчитать мой налог</button></div>
      <div class="author"><img src="../ipoteka-game/img/author.jpg" alt=""><div><b>Артур Юнусов</b><br>трейдер и инвестор, 8 лет на рынке. Сделал эту игру, чтобы налог не стал сюрпризом.</div></div>`, 0);
    document.getElementById('go').onclick = () => go('tax');
  }

  /* ---------- 1. Налог ---------- */
  function tax() {
    screen(`${kicker('Шаг 1 из 5 · налог')}
      <h2>Сколько у тебя на вкладах?</h2>
      <div class="field"><label>За какой год считаем</label>${seg('yr', [[2025, '2025 · платим сейчас'], [2026, '2026 · следующий']], S.year)}</div>
      ${slider('sum', 'Сумма на всех вкладах и накопительных счетах', 100000, 30000000, 100000, S.sum, short)}
      ${slider('rate', 'Средняя ставка за год', 5, 25, 0.5, S.rate, v => String(v).replace('.', ',') + '%')}
      ${slider('months', 'Сколько месяцев деньги лежали в году', 1, 12, 1, S.months, v => v + ' мес')}
      <div id="res"></div>
      <h3 style="margin-top:20px">Уточнить расчёт</h3>
      <div class="field"><label>Капитализация процентов</label>${seg('cap', [['0', 'Нет'], ['1', 'Ежемесячная']], S.cap ? '1' : '0')}</div>
      <div class="field"><label for="other">Другие инвестдоходы за год: купоны, дивиденды, продажа бумаг, ₽. Вместе с процентами сверх 2,4 млн они облагаются по 15%</label>
        <input class="num" id="other" inputmode="numeric" value="${S.other ? fmt(S.other) : ''}" placeholder="0"></div>
      <div class="btns"><button class="btn" id="next">Дальше: реальная доходность</button></div>`, 1);
    const draw = () => {
      const t = M.depositTax(o());
      const total = Math.max(t.income, 1);
      const freeW = Math.min(t.income, t.limit) / total * 100;
      const t15 = t.at15, t13 = t.taxable - t15;
      document.getElementById('res').innerHTML = `
        <div class="card ${t.tax > 0 ? 'red' : 'green'}">
          <div class="small">${t.tax > 0 ? 'Налог за ' + S.year + ' год' : 'Налога за ' + S.year + ' год нет'}</div>
          <div class="big ${t.tax > 0 ? 'red' : 'green'}">${rub(t.tax)}</div>
          <div class="bar"><i class="free" style="width:${freeW}%"></i><i class="t13" style="width:${t13 / total * 100}%"></i><i class="t15" style="width:${t15 / total * 100}%"></i></div>
          <div class="legend"><span><i style="background:var(--up)"></i>без налога</span><span><i style="background:var(--gold)"></i>13%</span><span><i style="background:var(--down)"></i>15%</span></div>
          <div class="rows" style="margin-top:10px">
            <div><span>Проценты за год</span><b>${rub(t.income)}</b></div>
            <div><span>Без налога (1 млн × ${M.YEARS[S.year].keyMax}%)</span><b>${rub(t.limit)}</b></div>
            <div><span>Облагается</span><b>${rub(t.taxable)}</b></div>
            ${t15 > 0 ? `<div><span>Из них по 15% (сверх 2,4 млн инвестдоходов)</span><b>${rub(t15)}</b></div>` : ''}
            <div><span>Заплатить до</span><b>${t.due}</b></div>
          </div>
        </div>
        <p class="small">При ставке ${String(S.rate).replace('.', ',')}% налог появляется, когда на вкладах больше <b>${short(t.breakEven)}</b>. ${t.note}</p>`;
    };
    bindSeg('yr', 'year', Number, () => {
      if (!S.rateTouched) { S.rate = S.year === 2025 ? 18 : 14; const r = document.getElementById('rate'); r.value = S.rate; document.getElementById('rate_o').textContent = String(S.rate).replace('.', ',') + '%'; }
      draw();
    });
    bindSeg('cap', 'cap', v => v === '1', draw);
    bindSlider('sum', 'sum', short, draw);
    bindSlider('rate', 'rate', v => String(v).replace('.', ',') + '%', () => { S.rateTouched = true; draw(); });
    bindSlider('months', 'months', v => v + ' мес', draw);
    const other = document.getElementById('other');
    other.addEventListener('input', () => {
      const v = +other.value.replace(/\D/g, '') || 0; S.other = v;
      other.value = v ? fmt(v) : ''; draw();
    });
    draw();
    document.getElementById('next').onclick = () => go('real');
  }

  /* ---------- 2. Реальная доходность ---------- */
  function real() {
    screen(`${kicker('Шаг 2 из 5 · доходность')}
      <h2>Сколько вклад приносит на самом деле</h2>
      <p>Ставка в рекламе банка — до налога и до инфляции. Посмотрим, что останется.</p>
      ${slider('infl', 'Инфляция за год', 3, 12, 0.1, S.infl, v => String(v).replace('.', ',') + '%')}
      <p class="small">Годовая инфляция в начале сентября 2026 — 6,3%, прогноз ЦБ на конец года — 6–7%.</p>
      <div id="res"></div>
      <div class="btns"><button class="btn" id="next">Дальше: страховка вклада</button></div>`, 2);
    const draw = () => {
      const r = M.realYield(o(), S.infl);
      const t = M.depositTax(o());
      const inc = Math.max(t.income, 1);
      const infShare = Math.min(r.inflLoss, t.income - t.tax);
      document.getElementById('res').innerHTML = `
        <div class="card">
          <div class="rows">
            <div><span>Ставка банка</span><b>${pct(r.nominal)}</b></div>
            <div><span>После налога</span><b>${pct(r.afterTax)}</b></div>
            <div><span>После налога и инфляции</span><b class="${r.real >= 0 ? 'green' : 'red'}">${pct(r.real)}</b></div>
          </div>
          <div class="bar"><i class="tax" style="width:${t.tax / inc * 100}%"></i><i class="inf" style="width:${Math.max(0, infShare) / inc * 100}%"></i><i class="net" style="width:${Math.max(0, r.realRub) / inc * 100}%"></i></div>
          <div class="legend"><span><i style="background:var(--down)"></i>налог ${rub(t.tax)}</span><span><i style="background:#8E7FE6"></i>съела инфляция ${rub(r.inflLoss)}</span><span><i style="background:var(--up)"></i>реально заработал ${rub(Math.max(0, r.realRub))}</span></div>
        </div>
        <p>${r.real > 0.03 ? 'Вклад обгоняет инфляцию: для подушки безопасности это хороший вариант. Для капитала на 5+ лет этого мало, а при снижении ключевой разница будет таять.' : r.real > 0 ? 'Вклад едва обгоняет инфляцию: деньги сохраняются, но почти не растут.' : 'Вклад проигрывает инфляции: покупательная способность денег падает.'}</p>`;
    };
    bindSlider('infl', 'infl', v => String(v).replace('.', ',') + '%', draw);
    draw();
    document.getElementById('next').onclick = () => go('asv');
  }

  /* ---------- 3. Страховка АСВ ---------- */
  function asv() {
    const ins = M.insurance(S.sum);
    const per = S.sum / ins.banks;
    const oneBank = S.sum > M.ASV_LIMIT;
    screen(`${kicker('Шаг 3 из 5 · страховка')}
      <h2>Если у банка отзовут лицензию</h2>
      <p>Агентство по страхованию вкладов вернёт <b>до 1,4 млн ₽</b> на одного человека в одном банке, вместе с процентами.</p>
      <div class="card ${oneBank ? 'red' : 'green'}">
        <div class="small">Твои ${short(S.sum)} в одном банке</div>
        <div class="big ${oneBank ? 'red' : 'green'}">${oneBank ? 'без защиты ' + short(ins.uninsured) : 'всё застраховано'}</div>
      </div>
      ${oneBank ? `<h3>Чтобы застраховать всё, нужно ${ins.banks} ${ins.banks < 5 ? 'банка' : 'банков'}</h3>
        <div class="banks">${Array.from({ length: ins.banks }, (_, i) => `<div><span class="small">Банк ${i + 1}</span><b>${short(per)}</b></div>`).join('')}</div>
        <p class="small">Помни: проценты тоже входят в 1,4 млн. Оставляй запас примерно 10% под начисления. Лимит на налог при этом один на все банки: разнос по банкам налог не уменьшает.</p>` :
        `<p class="small">Если сумма вырастет больше 1,4 млн вместе с процентами, раздели её между банками. Налог от этого не изменится: необлагаемый лимит один на все банки.</p>`}
      <div class="btns"><button class="btn" id="next">Дальше: вернуть налог через ИИС</button></div>`, 3);
    document.getElementById('next').onclick = () => go('iis');
  }

  /* ---------- 4. ИИС и прогрессивная шкала ---------- */
  function iis() {
    screen(`${kicker('Шаг 4 из 5 · вычет')}
      <h2>Налог можно вернуть через ИИС</h2>
      <p>С 2025 года зарплата облагается по прогрессивной шкале: 13–22%. Вычет по ИИС возвращает НДФЛ по твоей ставке, до 400 000 ₽ взносов в год.</p>
      ${slider('salary', 'Твой официальный доход за год', 300000, 30000000, 100000, S.salary, short)}
      <div id="res"></div>
      <p class="small">Нужен ИИС-3, открытый с 2024 года, и официальный доход с уплаченным НДФЛ. Деньги на ИИС-3 нужно держать минимум 5 лет. Вычет за 2026 год можно получить, если внести деньги до 31 декабря.</p>
      <div class="btns"><button class="btn" id="next">Дальше: тест на 5 мифов</button></div>`, 4);
    const draw = () => {
      const r = M.iis(M.IIS_MAX, S.salary);
      const rows = M.SALARY_SCALE.map((s, i) => {
        const from = i ? M.SALARY_SCALE[i - 1].upTo : 0;
        const label = s.upTo === Infinity ? 'больше 50 млн ₽' : (from ? short(from) + ' – ' : 'до ') + short(s.upTo);
        return `<div class="${s.rate === r.rate ? 'hit' : ''}"><span>${label}</span><b>${s.rate}%</b></div>`;
      }).join('');
      const vTax = M.depositTax(o()).tax;
      document.getElementById('res').innerHTML = `
        <div class="scale">${rows}</div>
        <div class="card gold">
          <div class="small">Внесёшь 400 000 ₽ на ИИС — вернёшь</div>
          <div class="big">${rub(r.refund)}</div>
          <p class="small" style="margin:0">Твоя ставка НДФЛ: ${r.rate}%.${vTax > 0 ? ` ${r.refund >= vTax ? 'Это больше, чем налог на вклады' : 'Это ' + Math.round(r.refund / vTax * 100) + '% от налога на вклады'} (${rub(vTax)}).` : ''}</p>
        </div>
        <p class="small">Проценты по вкладам облагаются не по этой шкале, а по шкале инвестдоходов: 13% до 2,4 млн и 15% сверху.</p>`;
    };
    bindSlider('salary', 'salary', short, draw);
    draw();
    document.getElementById('next').onclick = () => go('quiz');
  }

  /* ---------- 5. Мифы ---------- */
  const MYTHS = [
    { q: 'Налог берут со всей суммы вклада', a: false, e: 'Только с процентов, и только с той части, что больше лимита: 210 000 ₽ за 2025 год, около 160 000 ₽ за 2026.' },
    { q: 'Если вклады в разных банках, лимит у каждого банка свой', a: false, e: 'Лимит один на человека. ФНС складывает проценты из всех банков.' },
    { q: 'Банк сам удержит налог, мне ничего делать не нужно', a: false, e: 'Банк только передаёт данные в ФНС. Уведомление придёт в личный кабинет или Госуслуги, заплатить нужно до 1 декабря.' },
    { q: 'Проценты по вкладу облагаются по шкале до 22%, как большие зарплаты', a: false, e: 'Нет, для процентов действует шкала инвестдоходов: 13% до 2,4 млн и 15% сверху.' },
    { q: 'Проценты по счёту до востребования со ставкой не выше 1% налогом не облагаются', a: true, e: 'Верно: такие проценты и проценты по эскроу-счетам в расчёт не берут.' }
  ];
  function quiz(i = 0) {
    if (i === 0) S.score = 0;
    const m = MYTHS[i];
    screen(`${kicker('Шаг 5 из 5 · мифы · ' + (i + 1) + ' из ' + MYTHS.length)}
      <h2>Правда или миф?</h2>
      <div class="card"><h3 style="margin:0">«${m.q}»</h3></div>
      <div class="quiz"><button class="opt" data-v="1">Правда</button><button class="opt" data-v="0">Миф</button></div>
      <div id="exp"></div>`, 5);
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const ans = b.dataset.v === '1', right = ans === m.a;
      if (right) S.score++;
      app.querySelectorAll('.opt').forEach(x => { x.disabled = true; if ((x.dataset.v === '1') === m.a) x.classList.add('right'); });
      if (!right) b.classList.add('wrong');
      document.getElementById('exp').innerHTML = `<p><b class="${right ? 'green' : 'red'}">${right ? 'Верно.' : 'Не совсем.'}</b> ${m.e}</p>
        <div class="btns"><button class="btn" id="next">${i + 1 < MYTHS.length ? 'Следующий' : 'Мой итог'}</button></div>`;
      document.getElementById('next').onclick = () => i + 1 < MYTHS.length ? quiz(i + 1) : go('final');
    });
  }

  /* ---------- Итог ---------- */
  function final() {
    const t = M.depositTax(o()), r = M.realYield(o(), S.infl), ins = M.insurance(S.sum), v = M.iis(M.IIS_MAX, S.salary);
    const plan = [];
    if (t.tax > 0) plan.push(`Отложи <b>${rub(t.tax)}</b> на налог за ${S.year} год, заплатить до ${t.due}.`);
    else plan.push(`Налога за ${S.year} год нет: проценты укладываются в лимит ${rub(t.limit)}.`);
    if (ins.banks > 1) plan.push(`Раздели деньги между <b>${ins.banks} банками</b>, по 1,4 млн максимум в каждом вместе с процентами.`);
    if (r.real < 0.03) plan.push('Подушку на 3–6 месяцев оставь на вкладе, а капитал на 5+ лет вкладывай туда, где доходность выше инфляции: облигации, акции.');
    plan.push(`Открой ИИС-3 до 31 декабря и верни до <b>${rub(v.refund)}</b> НДФЛ.`);
    screen(`${kicker('Итог')}
      <h2>Твой план по вкладам</h2>
      <div class="card gold"><div class="rows">
        <div><span>Налог на проценты</span><b>${rub(t.tax)}</b></div>
        <div><span>Реальная доходность</span><b class="${r.real >= 0 ? 'green' : 'red'}">${pct(r.real)}</b></div>
        <div><span>Нужно банков для страховки</span><b>${ins.banks}</b></div>
        <div><span>Можно вернуть через ИИС</span><b>${rub(v.refund)}</b></div>
        <div><span>Тест на мифы</span><b>${S.score} из ${MYTHS.length}</b></div>
      </div></div>
      <div class="steps">${plan.map((p, i) => `<div><em>${i + 1}</em><span>${p}</span></div>`).join('')}</div>
      <p>В Telegram-канале я каждый день разбираю рынок и пишу, куда двигаются ставки по вкладам и облигациям. Подпишись, чтобы не пропустить следующее решение ЦБ.</p>
      <div class="card gold"><p><b>🎮 Следующий уровень (3 из 7) — игра «Ипотека без иллюзий»</b><br>Проживи 30 лет ипотеки за 15 минут: реальная переплата, скрытые платежи и что выгоднее — ипотека или аренда с инвестициями.</p></div>
      <div class="btns">
        <button class="btn" id="next">Играть в «Ипотеку без иллюзий» 🎮</button>
        <button class="btn tg-btn" id="sky">Узнать про закрытый канал 🔒</button>
        <button class="btn ghost" id="ch">Подписаться на канал</button>
        <button class="btn ghost" id="bot">Чек-лист «Выгоднее вклада?»</button>
        <button class="btn ghost" id="share">Отправить другу, у кого вклады</button>
        <button class="btn ghost" id="again">Пересчитать</button>
      </div>`, 6);
    document.getElementById('next').onclick = () => openUrl(CONFIG.nextUrl);
    document.getElementById('sky').onclick = () => openUrl(CONFIG.skyUrl);
    document.getElementById('ch').onclick = () => openUrl(CONFIG.channelUrl);
    document.getElementById('bot').onclick = () => openUrl(CONFIG.botUrl);
    document.getElementById('share').onclick = () => {
      if (navigator.share) navigator.share({ title: 'Налог на вклад', text: CONFIG.shareText, url: CONFIG.shareUrl }).catch(() => {});
      else openUrl('https://t.me/share/url?url=' + encodeURIComponent(CONFIG.shareUrl) + '&text=' + encodeURIComponent(CONFIG.shareText));
    };
    document.getElementById('again').onclick = () => go('tax');
  }

  const ROUTES = { tax, real, asv, iis, quiz: () => quiz(0), final };
  function route() { (ROUTES[location.hash.slice(1)] || intro)(); }
  window.addEventListener('hashchange', route);
  document.getElementById('logo').onclick = e => { e.preventDefault(); history.pushState('', '', location.pathname); intro(); };
  if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }
  route();
})();

(() => {
  const { metadata, records } = window.FUNNEL_DATA;
  const app = document.getElementById('app');
  const periodSelect = document.getElementById('periodSelect');
  const searchInput = document.getElementById('searchInput');
  const tabs = [...document.querySelectorAll('.tab')];
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip'; document.body.appendChild(tooltip);
  let currentTab = 'resumen';
  let currentPeriod = metadata.defaultPeriod;
  let searchTerm = '';

  const colors = { orange:'#ff5a00', dark:'#1c1c1c', grey:'#a6a6a6', eminent:'#333333', plus:'#9a9a9a', move:'#ff5a00', other:'#d5d5d5', noData:'#ebe9e6' };
  const fmt = n => n == null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits:0 }).format(n);
  const fmt1 = n => n == null ? '—' : new Intl.NumberFormat('es-AR', { minimumFractionDigits:1, maximumFractionDigits:1 }).format(n);
  const pct = n => n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('es-AR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
  const periodLabel = p => `${String(p).slice(0,4)}-${String(p).slice(4,6)}`;
  const getRecord = p => records.find(r => r.periodo === Number(p));
  const validRecords = records.filter(r => r.periodo >= 202501);
  const comparableRecords = records.filter(r => r.periodo >= metadata.comparableFrom && !r.es_mes_parcial);

  [...records].reverse().forEach(r => {
    const o = document.createElement('option'); o.value = r.periodo; o.textContent = periodLabel(r.periodo) + (r.es_mes_parcial ? ' · parcial' : r.es_g_plus ? ' · G+' : ''); periodSelect.appendChild(o);
  });
  periodSelect.value = currentPeriod;

  const showTooltip = (evt, html) => { tooltip.innerHTML = html; tooltip.style.left = `${evt.clientX}px`; tooltip.style.top = `${evt.clientY}px`; tooltip.style.opacity = 1; };
  const hideTooltip = () => tooltip.style.opacity = 0;

  function kpi(label, value, foot, cls='orange') { return `<article class="kpi-card ${cls}" data-search="${label} ${foot}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`; }
  function sectionHead(eyebrow, title, desc, note='') { return `<header class="section-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${desc}</p></div>${note?`<span class="period-note">${note}</span>`:''}</header>`; }

  function svgLineChart(series, labels, height=260) {
    const width=760, pad={l:55,r:18,t:20,b:38};
    const all=series.flatMap(s=>s.values).filter(Number.isFinite); const max=Math.max(...all,1); const min=0;
    const x=i=>pad.l+i*((width-pad.l-pad.r)/Math.max(labels.length-1,1)); const y=v=>pad.t+(max-v)*(height-pad.t-pad.b)/(max-min || 1);
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img">`;
    for(let i=0;i<5;i++){const yy=pad.t+i*(height-pad.t-pad.b)/4; const val=max*(1-i/4); svg+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${width-pad.r}" y2="${yy}"/><text class="axis-label" x="${pad.l-8}" y="${yy+3}" text-anchor="end">${compact(val)}</text>`;}
    labels.forEach((lab,i)=>{if(i%Math.ceil(labels.length/7)===0||i===labels.length-1)svg+=`<text class="axis-label" x="${x(i)}" y="${height-10}" text-anchor="middle">${String(lab).slice(2,4)}/${String(lab).slice(4,6)}</text>`;});
    series.forEach(s=>{const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' '); svg+=`<polyline fill="none" stroke="${s.color}" stroke-width="${s.width||3}" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>`; s.values.forEach((v,i)=>svg+=`<circle class="chart-point" data-label="${s.name}" data-period="${labels[i]}" data-value="${v}" cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}" stroke="white" stroke-width="2"/>`);});
    return svg+'</svg>';
  }

  function stackedBars(data, keys, height=280) {
    const width=820,pad={l:48,r:18,t:20,b:42}; const max=Math.max(...data.map(r=>keys.reduce((s,k)=>s+(r[k.key]||0),0)),1); const band=(width-pad.l-pad.r)/data.length; const bw=Math.min(27,band*.62); let svg=`<svg viewBox="0 0 ${width} ${height}">`;
    for(let i=0;i<5;i++){const yy=pad.t+i*(height-pad.t-pad.b)/4;svg+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${width-pad.r}" y2="${yy}"/>`;}
    data.forEach((r,i)=>{let bottom=height-pad.b; keys.forEach(k=>{const h=(r[k.key]||0)*(height-pad.t-pad.b)/max; bottom-=h; svg+=`<rect class="chart-rect" data-label="${k.label}" data-period="${r.periodo}" data-value="${r[k.key]||0}" x="${pad.l+i*band+(band-bw)/2}" y="${bottom}" width="${bw}" height="${Math.max(h,0)}" rx="3" fill="${k.color}"/>`;}); if(i%Math.ceil(data.length/7)===0||i===data.length-1)svg+=`<text class="axis-label" x="${pad.l+i*band+band/2}" y="${height-14}" text-anchor="middle">${String(r.periodo).slice(2,4)}/${String(r.periodo).slice(4,6)}</text>`;});
    return svg+'</svg>';
  }

  function compact(n){return Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1}).format(n)}
  function legend(items){return `<div class="legend">${items.map(i=>`<span style="--legend-color:${i.color}">${i.label}</span>`).join('')}</div>`}
  function attachChartEvents(){document.querySelectorAll('.chart-point,.chart-rect').forEach(el=>{el.addEventListener('mousemove',e=>showTooltip(e,`${el.dataset.label}<br><strong>${periodLabel(el.dataset.period)}</strong> · ${fmt(Number(el.dataset.value))}`));el.addEventListener('mouseleave',hideTooltip);});}

  function offerCard(title, badge, badgeClass, values){
    const total=Object.values(values).reduce((a,b)=>a+b,0); const items=[['EMINENT',values.eminent,colors.eminent],['PLUS',values.plus,colors.plus],['MOVE',values.move,colors.move],['OTROS',values.other,colors.other],['SIN DATO',values.noData,colors.noData]];
    return `<article class="offer-card"><div class="offer-head"><strong>${title}</strong><span class="origin-badge ${badgeClass}">${badge}</span></div><div class="mix-bar">${items.map(([n,v,c])=>`<div class="mix-segment" title="${n}" style="width:${total?v/total*100:0}%;background:${c}"></div>`).join('')}</div><div class="offer-list">${items.filter(([,v])=>v>0).map(([n,v,c])=>`<div class="offer-row"><i class="offer-dot" style="background:${c}"></i><span>${n}</span><b>${fmt(v)} · ${pct(total?v/total:0)}</b></div>`).join('')||'<span class="panel-subtitle">Sin oferta disponible para el período.</span>'}</div></article>`;
  }

  function renderResumen(){
    const r=getRecord(currentPeriod); const isG=r.es_g_plus; const note=isG?'Período extraordinario G+':r.es_mes_parcial?'Mes parcial · oferta pendiente':`Período ${periodLabel(r.periodo)}`;
    app.innerHTML=sectionHead('Resumen ejecutivo','Cómo entra y se convierte el cliente','Una vista curada del recorrido normal por Experian, las altas manuales y la incorporación extraordinaria G+.',note)+`
      <div class="kpi-grid">
        ${kpi('Personas evaluadas',fmt(r.personas_solicitantes_totales),'Party_ID únicos en Experian.','dark')}
        ${kpi('Leads no clientes',fmt(r.leads_no_clientes_experian),'Personas marcadas N.','orange')}
        ${kpi('Altas por Experian',fmt(r.altas_pgd_con_viaje_experian),`${pct(r.conversion_lead_a_alta_experian)} de los leads N.`, 'orange')}
        ${kpi('Altas manuales',fmt(r.altas_manuales),'Sin match Experian M0/M1, excluye G+.','grey')}
        ${kpi('Altas G+',fmt(r.altas_g_plus),'Incorporación extraordinaria HBC.','gplus')}
        ${kpi('Intentos N por lead',fmt1(r.intentos_n_por_lead),'Proxy de fricción con la data actual.','dark')}
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-title-row"><div><h2>Funnel del viaje Experian</h2><div class="panel-subtitle">Personas, leads N y altas PGD correlacionadas por Party_ID.</div></div></div>${funnel(r)}</section>
        <section class="panel"><div class="panel-title-row"><div><h2>Altas PGD por origen</h2><div class="panel-subtitle">Tendencia comparable desde julio 2025.</div></div>${legend([{label:'Experian',color:colors.orange},{label:'Manual',color:colors.grey},{label:'G+',color:colors.dark}])}</div><div class="chart">${stackedBars(records.filter(x=>x.periodo>=202505),[{key:'altas_pgd_con_viaje_experian',label:'Experian',color:colors.orange},{key:'altas_manuales',label:'Manual',color:colors.grey},{key:'altas_g_plus',label:'G+',color:colors.dark}])}</div></section>
      </div>
      <div class="grid-3">
        ${offerCard('Oferta de altas Experian','Experian','',{eminent:r.viaje_eminent,plus:r.viaje_plus,move:r.viaje_move,other:r.viaje_otros,noData:r.viaje_sin_dato})}
        ${offerCard('Oferta de altas manuales','Manual','manual',{eminent:r.es_g_plus?0:r.sin_viaje_eminent,plus:r.es_g_plus?0:r.sin_viaje_plus,move:r.es_g_plus?0:r.sin_viaje_move,other:r.es_g_plus?0:r.sin_viaje_otros,noData:r.es_g_plus?0:r.sin_viaje_sin_dato})}
        ${offerCard('Oferta de altas G+','G+','gplus',{eminent:r.es_g_plus?r.sin_viaje_eminent:0,plus:r.es_g_plus?r.sin_viaje_plus:0,move:r.es_g_plus?r.sin_viaje_move:0,other:r.es_g_plus?r.sin_viaje_otros:0,noData:r.es_g_plus?r.sin_viaje_sin_dato:0})}
      </div>
      <div class="insight-grid">
        <article class="insight alert"><strong>Quiebre de cobertura</strong><p>La participación de Experian salta desde julio 2025. Los meses previos no deberían compararse sin aclarar el cambio de cobertura o proceso.</p></article>
        <article class="insight dark"><strong>G+ · junio 2025</strong><p>${fmt(getRecord(202506).altas_g_plus)} altas extraordinarias se separan del flujo manual ordinario para que el evento HBC no distorsione la tendencia.</p></article>
        <article class="insight"><strong>Oferta dominante</strong><p>En ${periodLabel(r.periodo)}, MOVE representa ${pct(r.altas_pgd_con_viaje_experian?r.viaje_move/r.altas_pgd_con_viaje_experian:0)} de las altas por Experian.</p></article>
      </div>`;
    attachChartEvents();
  }

  function funnel(r){const vals=[['Personas evaluadas',r.personas_solicitantes_totales,colors.dark],['Leads no clientes',r.leads_no_clientes_experian,colors.grey],['Altas por Experian',r.altas_pgd_con_viaje_experian,colors.orange]]; const max=Math.max(...vals.map(v=>v[1]),1);return `<div class="funnel-bars">${vals.map((v,i)=>`<div class="funnel-row"><div><div class="funnel-label">${v[0]}</div>${i?`<div class="funnel-rate">${pct(v[1]/vals[i-1][1])} del paso anterior</div>`:''}</div><div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(v[1]/max*100,1)}%;background:${v[2]}"></div></div><div class="funnel-value">${fmt(v[1])}</div></div>`).join('')}</div>`}

  function renderFunnel(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Funnel Experian','Del lead no cliente al alta','Sigue a la persona por Party_ID. La conversión se reconoce cuando aparece en PGD en M0 o M1.',`Conversión ${pct(r.conversion_lead_a_alta_experian)}`)+`
    <div class="metric-strip">
      <div class="metric-mini"><span>Solicitudes Experian</span><strong>${fmt(r.solicitudes_experian_totales)}</strong><small>Evaluaciones deduplicadas.</small></div>
      <div class="metric-mini"><span>Leads N</span><strong>${fmt(r.leads_no_clientes_experian)}</strong><small>Una persona por período.</small></div>
      <div class="metric-mini"><span>Altas M0</span><strong>${fmt(r.altas_pgd_viaje_m0)}</strong><small>${pct(r.participacion_m0)} de las conversiones.</small></div>
      <div class="metric-mini"><span>Altas M1</span><strong>${fmt(r.altas_pgd_viaje_m1)}</strong><small>${pct(r.participacion_m1)} de las conversiones.</small></div>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-title-row"><div><h2>Leads y altas por Experian</h2><div class="panel-subtitle">Evolución mensual en escala de personas.</div></div>${legend([{label:'Leads N',color:colors.dark},{label:'Altas Experian',color:colors.orange}])}</div><div class="chart">${svgLineChart([{name:'Leads N',values:validRecords.map(x=>x.leads_no_clientes_experian),color:colors.dark,width:2},{name:'Altas Experian',values:validRecords.map(x=>x.altas_pgd_con_viaje_experian),color:colors.orange,width:3}],validRecords.map(x=>x.periodo))}</div></section>
      <section class="panel"><div class="panel-title-row"><div><h2>Momento de conversión</h2><div class="panel-subtitle">M0: mismo mes. M1: mes siguiente.</div></div>${legend([{label:'M0',color:colors.orange},{label:'M1',color:colors.grey}])}</div><div class="chart">${stackedBars(validRecords,[{key:'altas_pgd_viaje_m0',label:'M0',color:colors.orange},{key:'altas_pgd_viaje_m1',label:'M1',color:colors.grey}])}</div></section>
    </div>${funnelTable()}`;attachChartEvents();}

  function funnelTable(){return `<section class="panel"><div class="panel-title-row"><div><h2>Detalle mensual</h2><div class="panel-subtitle">El indicador de intentos es un proxy hasta incorporar la fecha exacta previa al alta.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>Personas</th><th>Leads N</th><th>Solicitudes N</th><th>Intentos/lead</th><th>Altas M0</th><th>Altas M1</th><th>Altas Experian</th><th>Conversión</th></tr></thead><tbody>${validRecords.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}${r.es_mes_parcial?'<span class="row-tag partial">Parcial</span>':''}</td><td>${fmt(r.personas_solicitantes_totales)}</td><td>${fmt(r.leads_no_clientes_experian)}</td><td>${fmt(r.solicitudes_experian_n)}</td><td>${fmt1(r.intentos_n_por_lead)}</td><td>${fmt(r.altas_pgd_viaje_m0)}</td><td>${fmt(r.altas_pgd_viaje_m1)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${pct(r.conversion_lead_a_alta_experian)}</td></tr>`).join('')}</tbody></table></div></section>`}

  function renderAltas(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Altas y oferta','Qué origen explica las altas PGD','Separa el flujo normal por Experian, las altas manuales y el evento extraordinario G+.',`PGD total ${fmt(r.altas_pgd_totales)}`)+`
    <div class="kpi-grid">
      ${kpi('PGD total',fmt(r.altas_pgd_totales),'Universo de altas nuevas.','dark')}
      ${kpi('Experian',fmt(r.altas_pgd_con_viaje_experian),pct(r.tasa_altas_pgd_con_viaje)+' del total.','orange')}
      ${kpi('Manual',fmt(r.altas_manuales),r.es_g_plus?'El residual del mes se asigna a G+.':pct(r.altas_pgd_totales?r.altas_manuales/r.altas_pgd_totales:0)+' del total.','grey')}
      ${kpi('G+',fmt(r.altas_g_plus),'Evento HBC, junio 2025.','gplus')}
      ${kpi('MOVE Experian',fmt(r.viaje_move),pct(r.altas_pgd_con_viaje_experian?r.viaje_move/r.altas_pgd_con_viaje_experian:0)+' del origen.','orange')}
      ${kpi('EMINENT manual',fmt(r.es_g_plus?0:r.sin_viaje_eminent),r.es_g_plus?'No aplica en el mes G+.':pct(r.altas_manuales?r.sin_viaje_eminent/r.altas_manuales:0)+' del origen.','grey')}
    </div>
    <div class="grid-2"><section class="panel"><div class="panel-title-row"><div><h2>Composición mensual de PGD</h2><div class="panel-subtitle">G+ se muestra separado para no inflar el canal manual.</div></div>${legend([{label:'Experian',color:colors.orange},{label:'Manual',color:colors.grey},{label:'G+',color:colors.dark}])}</div><div class="chart">${stackedBars(validRecords,[{key:'altas_pgd_con_viaje_experian',label:'Experian',color:colors.orange},{key:'altas_manuales',label:'Manual',color:colors.grey},{key:'altas_g_plus',label:'G+',color:colors.dark}])}</div></section>
    <section class="panel"><div class="panel-title-row"><div><h2>Mix comercial del período</h2><div class="panel-subtitle">Comparación de oferta adquirida por origen.</div></div></div><div class="offer-list-large">${offerCard('Altas por Experian','Experian','',{eminent:r.viaje_eminent,plus:r.viaje_plus,move:r.viaje_move,other:r.viaje_otros,noData:r.viaje_sin_dato})}<div style="height:10px"></div>${offerCard(r.es_g_plus?'Altas G+':'Altas manuales',r.es_g_plus?'G+':'Manual',r.es_g_plus?'gplus':'manual',{eminent:r.sin_viaje_eminent,plus:r.sin_viaje_plus,move:r.sin_viaje_move,other:r.sin_viaje_otros,noData:r.sin_viaje_sin_dato})}</div></section></div>
    ${originTable()}`;attachChartEvents();}

  function originTable(){return `<section class="panel"><div class="panel-title-row"><div><h2>Detalle de origen y oferta</h2><div class="panel-subtitle">Los valores de oferta manual de junio 2025 se reclasifican como G+.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>PGD total</th><th>Experian</th><th>Manual</th><th>G+</th><th>Exp. EMINENT</th><th>Exp. PLUS</th><th>Exp. MOVE</th><th>Manual/G+ EMINENT</th><th>Manual/G+ PLUS</th><th>Manual/G+ MOVE</th></tr></thead><tbody>${validRecords.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}</td><td>${fmt(r.altas_pgd_totales)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${fmt(r.altas_manuales)}</td><td>${fmt(r.altas_g_plus)}</td><td>${fmt(r.viaje_eminent)}</td><td>${fmt(r.viaje_plus)}</td><td>${fmt(r.viaje_move)}</td><td>${fmt(r.sin_viaje_eminent)}</td><td>${fmt(r.sin_viaje_plus)}</td><td>${fmt(r.sin_viaje_move)}</td></tr>`).join('')}</tbody></table></div></section>`}

  function renderFriccion(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Intentos y fricción','Cuánto insiste una persona antes del alta','Con la data mensual actual mostramos proxies. La medición exacta requiere contar evaluaciones N anteriores a la fecha real de alta.',`Proxy ${fmt1(r.intentos_n_por_lead)} intentos N/lead`)+`
    <div class="metric-strip">
      <div class="metric-mini"><span>Evaluaciones por persona</span><strong>${fmt1(r.solicitudes_por_persona)}</strong><small>Todas las solicitudes / personas solicitantes.</small></div>
      <div class="metric-mini"><span>Intentos N por lead</span><strong>${fmt1(r.intentos_n_por_lead)}</strong><small>Solicitudes N / leads N.</small></div>
      <div class="metric-mini"><span>Conversión lead → alta</span><strong>${pct(r.conversion_lead_a_alta_experian)}</strong><small>Alta PGD M0/M1 por Party_ID.</small></div>
      <div class="metric-mini"><span>Conversión en M0</span><strong>${pct(r.participacion_m0)}</strong><small>Parte que se da de alta en el mismo mes.</small></div>
    </div>
    <div class="grid-2"><section class="panel"><div class="panel-title-row"><div><h2>Intensidad de intentos</h2><div class="panel-subtitle">Evolución de solicitudes N por lead N.</div></div>${legend([{label:'Intentos N por lead',color:colors.orange}])}</div><div class="chart">${svgLineChart([{name:'Intentos N por lead',values:validRecords.map(x=>x.intentos_n_por_lead),color:colors.orange,width:3}],validRecords.map(x=>x.periodo))}</div></section>
    <section class="panel"><div class="panel-title-row"><div><h2>Qué falta para la métrica exacta</h2><div class="panel-subtitle">La pregunta correcta es cuántas evaluaciones N ocurrieron antes de la fecha de alta del mismo Party_ID.</div></div></div><div class="funnel-bars"><div class="insight"><strong>1. Fecha del alta</strong><p>Resumir solicitud_canal_arbol_unif a una fila por solicitud_id.</p></div><div class="insight"><strong>2. Intentos previos</strong><p>Contar Exp_Experian_ID N con fecha menor o igual al alta.</p></div><div class="insight"><strong>3. Distribución</strong><p>Mediana, P75, P90 y porcentaje con 1, 2, 3 o 4+ intentos.</p></div></div></section></div>
    <div class="callout"><strong>La web ya está preparada para recibir la métrica exacta.</strong><p>El proyecto incluye <a href="sql/intentos_exactos_antes_alta.sql" download>la query base de intentos antes del alta</a>. Hasta correrla, el tablero etiqueta el dato actual como proxy, en vez de maquillarlo con precisión imaginaria.</p></div>`;attachChartEvents();}

  function renderDatos(){const filtered=records.filter(r=>!searchTerm||JSON.stringify(r).toLowerCase().includes(searchTerm));app.innerHTML=sectionHead('Base navegable','Datos mensuales completos','Descargá JSON o CSV, buscá valores y usá esta tabla como control del dashboard.',`${filtered.length} períodos`)+`<div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>Solicitudes</th><th>Personas</th><th>Leads N</th><th>Solicitudes N</th><th>PGD total</th><th>Experian</th><th>Manual</th><th>G+</th><th>M0</th><th>M1</th><th>Exp EMINENT</th><th>Exp PLUS</th><th>Exp MOVE</th><th>Manual/G+ EMINENT</th><th>Manual/G+ PLUS</th><th>Manual/G+ MOVE</th><th>% Experian</th></tr></thead><tbody>${filtered.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}${r.es_mes_parcial?'<span class="row-tag partial">Parcial</span>':''}</td><td>${fmt(r.solicitudes_experian_totales)}</td><td>${fmt(r.personas_solicitantes_totales)}</td><td>${fmt(r.leads_no_clientes_experian)}</td><td>${fmt(r.solicitudes_experian_n)}</td><td>${fmt(r.altas_pgd_totales)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${fmt(r.altas_manuales)}</td><td>${fmt(r.altas_g_plus)}</td><td>${fmt(r.altas_pgd_viaje_m0)}</td><td>${fmt(r.altas_pgd_viaje_m1)}</td><td>${fmt(r.viaje_eminent)}</td><td>${fmt(r.viaje_plus)}</td><td>${fmt(r.viaje_move)}</td><td>${fmt(r.sin_viaje_eminent)}</td><td>${fmt(r.sin_viaje_plus)}</td><td>${fmt(r.sin_viaje_move)}</td><td>${pct(r.tasa_altas_pgd_con_viaje)}</td></tr>`).join('')||'<tr><td colspan="18"><div class="empty-state">No encontré datos con esa búsqueda. Una tragedia moderada, solucionable borrando el filtro.</div></td></tr>'}</tbody></table></div>`;}

  function render(){if(currentTab==='resumen')renderResumen();else if(currentTab==='funnel')renderFunnel();else if(currentTab==='altas')renderAltas();else if(currentTab==='friccion')renderFriccion();else renderDatos(); applySearchHighlight();}
  function applySearchHighlight(){if(!searchTerm)return;document.querySelectorAll('[data-search]').forEach(el=>{el.style.display=el.dataset.search.toLowerCase().includes(searchTerm)?'':'none';});}

  tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');currentTab=t.dataset.tab;render();}));
  periodSelect.addEventListener('change',()=>{currentPeriod=Number(periodSelect.value);render();});
  searchInput.addEventListener('input',()=>{searchTerm=searchInput.value.trim().toLowerCase(); if(searchTerm&&currentTab!=='datos'){tabs.forEach(x=>x.classList.toggle('active',x.dataset.tab==='datos'));currentTab='datos';} render();});

  const dialog=document.getElementById('definitionsDialog');document.getElementById('definitionsButton').addEventListener('click',()=>dialog.showModal());
  document.getElementById('definitionsContent').innerHTML=Object.entries(metadata.definitions).map(([k,v])=>`<div class="definition-item"><strong>${({altaExperian:'Alta a través de Experian',altaManual:'Alta manual',gPlus:'G+',intentosProxy:'Intentos actuales'})[k]||k}</strong><p>${v}</p></div>`).join('')+`<div class="definition-item"><strong>Período comparable</strong><p>La lectura principal comienza en julio 2025. Junio 2025 se separa como G+ y julio 2026 se marca como parcial.</p></div>`;
  render();
})();

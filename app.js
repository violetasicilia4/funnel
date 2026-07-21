(() => {
  const { metadata, records } = window.FUNNEL_DATA;
  const app = document.getElementById('app');
  const periodSelect = document.getElementById('periodSelect');
  const tabs = [...document.querySelectorAll('.tab')];
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip'; document.body.appendChild(tooltip);
  let currentTab = 'resumen';
  let currentPeriod = metadata.defaultPeriod;

  const colors = { orange:'#ff5a00', dark:'#1c1c1c', grey:'#a6a6a6', eminent:'#333333', plus:'#9a9a9a', move:'#ff5a00', other:'#d5d5d5', noData:'#ebe9e6' };
  const fmt = n => n == null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits:0 }).format(n);
  const fmt1 = n => n == null ? '—' : new Intl.NumberFormat('es-AR', { minimumFractionDigits:1, maximumFractionDigits:1 }).format(n);
  const pct = n => n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('es-AR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
  const periodLabel = p => `${String(p).slice(0,4)}-${String(p).slice(4,6)}`;
  const normalizeRecord = record => {
    const valueOrNull = value => Number.isFinite(value) ? value : null;
    const altasPgd = valueOrNull(record.altas_pgd_experian) ?? valueOrNull(record.altas_pgd_viaje_m0);
    const leads = valueOrNull(record.leads_no_clientes_experian);
    return {
      ...record,
      solicitudes_aprobadas: valueOrNull(record.solicitudes_aprobadas),
      solicitudes_rechazadas: valueOrNull(record.solicitudes_rechazadas),
      tasa_aprobacion: valueOrNull(record.tasa_aprobacion),
      tasa_rechazo: valueOrNull(record.tasa_rechazo),
      altas_pgd_experian: altasPgd,
      mau_30_dias: valueOrNull(record.mau_30_dias),
      mau_60_dias: valueOrNull(record.mau_60_dias),
      tasa_mau_30: valueOrNull(record.tasa_mau_30),
      tasa_mau_60: valueOrNull(record.tasa_mau_60),
      conversion_a_cliente: altasPgd != null && leads ? altasPgd / leads : null
    };
  };
  const getRecord = p => normalizeRecord(records.find(r => r.periodo === Number(p)));
  const validRecords = records.filter(r => r.periodo >= 202501);
  const comparableRecords = records.filter(r => r.periodo >= metadata.comparableFrom && !r.es_mes_parcial);

  [...records].reverse().forEach(r => {
    const o = document.createElement('option'); o.value = r.periodo; o.textContent = periodLabel(r.periodo) + (r.es_mes_parcial ? ' · parcial' : r.es_g_plus ? ' · G+' : ''); periodSelect.appendChild(o);
  });
  periodSelect.value = currentPeriod;

  const showTooltip = (evt, html) => { tooltip.innerHTML = html; tooltip.style.left = `${evt.clientX}px`; tooltip.style.top = `${evt.clientY}px`; tooltip.style.opacity = 1; };
  const hideTooltip = () => tooltip.style.opacity = 0;

  function kpi(label, value, foot, cls='orange') { return `<article class="kpi-card ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`; }
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

  function dominantOffer(r){
    const offers=[['MOVE',r.viaje_move],['PLUS',r.viaje_plus],['EMINENT',r.viaje_eminent]].filter(([,value])=>Number.isFinite(value));
    if(!offers.length || offers.every(([,value])=>value===0)) return null;
    return offers.reduce((current,offer)=>offer[1]>current[1]?offer:current);
  }

  function pendingIntegration(text='Fuente pendiente de integrar'){return `<div class="pending-integration">${text}</div>`;}

  function journeyStage(label, value, detail, status='real', extra=''){
    const isPending=status==='pending';
    return `<article class="journey-stage ${status}"><div class="journey-stage-label">${label}</div><strong>${isPending?'Pendiente':fmt(value)}</strong><small>${isPending?'Fuente pendiente de integrar':detail}</small>${extra}</article>`;
  }

  function commercialOfferStage(r){
    const offers=[['MOVE',r.viaje_move,colors.move],['PLUS',r.viaje_plus,colors.plus],['EMINENT',r.viaje_eminent,colors.eminent]];
    const total=offers.reduce((sum,[,value])=>sum+(value||0),0);
    return `<article class="journey-stage real offer-stage"><div class="journey-stage-label">Oferta comercial</div><strong>Altas PGD</strong><small>Distribución dentro de las altas PGD.</small><div class="journey-offers">${offers.map(([label,value,color])=>`<div><i style="background:${color}"></i><span>${label}</span><b>${fmt(value)} · ${pct(total?value/total:null)}</b></div>`).join('')}</div></article>`;
  }

  function mauStage(r){
    const available=r.mau_30_dias != null||r.mau_60_dias != null;
    if(!available)return journeyStage('Activación MAU',null,'','pending','<div class="mau-pending"><span>Activación a 30 días</span><span>Activación a 60 días</span><em>Se incorporará activación a 30 y 60 días.</em></div>');
    return `<article class="journey-stage real"><div class="journey-stage-label">Activación MAU</div><strong>Disponible</strong><small>Activación posterior al alta.</small><div class="mau-pending"><span>Activación a 30 días · ${fmt(r.mau_30_dias)}</span><span>Activación a 60 días · ${fmt(r.mau_60_dias)}</span></div></article>`;
  }

  function integrationChart(title, pendingText, series){
    const data=validRecords.map(normalizeRecord);
    const available=data.some(record=>series.some(item=>record[item.key] != null));
    if(!available)return `<section class="panel pending-chart"><h2>${title}</h2>${pendingIntegration(pendingText)}</section>`;
    return `<section class="panel"><div class="panel-title-row"><div><h2>${title}</h2><div class="panel-subtitle">Evolución mensual en escala de personas.</div></div>${legend(series.map(item=>({label:item.label,color:item.color})))}</div><div class="chart">${stackedBars(data,series)}</div></section>`;
  }

  function funnel(r){const vals=[['Evaluaciones Experian',r.solicitudes_experian_totales,colors.dark],['Leads no clientes',r.leads_no_clientes_experian,colors.grey],['Altas PGD',r.altas_pgd_experian,colors.orange]];const max=Math.max(...vals.map(([,value])=>value||0),1);return `<div class="funnel-bars">${vals.map((value,index)=>`<div class="funnel-row"><div><div class="funnel-label">${value[0]}</div>${index?`<div class="funnel-rate">${pct(value[1]/vals[index-1][1])} del paso anterior</div>`:''}</div><div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(value[1]/max*100,1)}%;background:${value[2]}"></div></div><div class="funnel-value">${fmt(value[1])}</div></div>`).join('')}</div>`}

  function renderResumen(){
    const r=getRecord(currentPeriod); const isG=r.es_g_plus; const note=isG?'Período extraordinario G+':r.es_mes_parcial?'Mes parcial · oferta pendiente':`Período ${periodLabel(r.periodo)}`;
    const dominant=dominantOffer(r);
    app.innerHTML=sectionHead('Resumen ejecutivo','Cómo entra y se convierte el cliente','Una vista curada del recorrido normal por Experian, las altas manuales y la incorporación extraordinaria G+.',note)+`
      <div class="kpi-grid">
        ${kpi('Evaluaciones Experian',fmt(r.solicitudes_experian_totales),'Total de evaluaciones realizadas.','dark')}
        ${kpi('Leads no clientes',fmt(r.leads_no_clientes_experian),'Personas identificadas como no clientes.','orange')}
        ${kpi('Altas PGD',fmt(r.altas_pgd_experian),'Altas del mismo período.','orange')}
        ${kpi('Conversión a cliente',pct(r.conversion_a_cliente),'Altas PGD sobre leads no clientes.','dark')}
        ${kpi('Oferta dominante',dominant?dominant[0]:'Pendiente',dominant?`${fmt(dominant[1])} altas PGD.`:'Sin oferta disponible para el período.','orange')}
        ${kpi('Activación MAU','Pendiente','Fuente pendiente de integrar.','grey')}
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-title-row"><div><h2>Funnel del viaje Experian</h2><div class="panel-subtitle">Personas, leads no clientes y altas a través de Experian.</div></div></div>${funnel(r)}</section>
        <section class="panel"><div class="panel-title-row"><div><h2>Altas por origen</h2><div class="panel-subtitle">Tendencia desde julio 2025.</div></div>${legend([{label:'A través de Experian',color:colors.orange},{label:'Manuales',color:colors.grey},{label:'G+',color:colors.dark}])}</div><div class="chart">${stackedBars(records.filter(x=>x.periodo>=202505),[{key:'altas_pgd_con_viaje_experian',label:'Altas a través de Experian',color:colors.orange},{key:'altas_manuales',label:'Altas manuales',color:colors.grey},{key:'altas_g_plus',label:'Altas G+',color:colors.dark}])}</div></section>
      </div>
      <div class="offer-grid">
        ${offerCard('Oferta comercial de altas a través de Experian','Experian','',{eminent:r.viaje_eminent,plus:r.viaje_plus,move:r.viaje_move,other:r.viaje_otros,noData:r.viaje_sin_dato})}
        ${offerCard('Oferta comercial de altas manuales','Manual','manual',{eminent:r.es_g_plus?0:r.sin_viaje_eminent,plus:r.es_g_plus?0:r.sin_viaje_plus,move:r.es_g_plus?0:r.sin_viaje_move,other:r.es_g_plus?0:r.sin_viaje_otros,noData:r.es_g_plus?0:r.sin_viaje_sin_dato})}
      </div>`;
    attachChartEvents();
  }

  function renderFunnel(){const r=getRecord(currentPeriod); const approvedAvailable=r.solicitudes_aprobadas != null; const rejectedAvailable=r.solicitudes_rechazadas != null; app.innerHTML=sectionHead('Funnel Experian','Del interés a la activación','Seguimiento del recorrido desde la evaluación inicial hasta el uso posterior al alta.',`Conversión a cliente ${pct(r.conversion_a_cliente)}`)+`
    <section class="journey-panel"><div class="journey-flow">
      ${journeyStage('Evaluaciones Experian',r.solicitudes_experian_totales,'Total de evaluaciones realizadas.')}
      ${journeyStage('Leads no clientes',r.leads_no_clientes_experian,'Personas no clientes por período.')}
      ${journeyStage('Solicitudes aprobadas',r.solicitudes_aprobadas,r.tasa_aprobacion != null?`${pct(r.tasa_aprobacion)} de las solicitudes.`:'Dato integrado.',approvedAvailable?'real':'pending')}
      ${journeyStage('Solicitudes rechazadas',r.solicitudes_rechazadas,r.tasa_rechazo != null?`${pct(r.tasa_rechazo)} de las solicitudes.`:'Dato integrado.',rejectedAvailable?'real':'pending')}
      ${journeyStage('Altas PGD',r.altas_pgd_experian,`${pct(r.conversion_a_cliente)} de los leads no clientes.`)}
      ${commercialOfferStage(r)}
      ${mauStage(r)}
    </div></section>
    <div class="grid-2">
      <section class="panel"><div class="panel-title-row"><div><h2>Leads no clientes y Altas PGD</h2><div class="panel-subtitle">Evolución mensual en escala de personas.</div></div>${legend([{label:'Leads no clientes',color:colors.dark},{label:'Altas PGD',color:colors.orange}])}</div><div class="chart">${svgLineChart([{name:'Leads no clientes',values:validRecords.map(x=>x.leads_no_clientes_experian),color:colors.dark,width:2},{name:'Altas PGD',values:validRecords.map(x=>normalizeRecord(x).altas_pgd_experian),color:colors.orange,width:3}],validRecords.map(x=>x.periodo))}</div></section>
      ${integrationChart('Solicitudes aprobadas y rechazadas','Datos pendientes de integración',[{key:'solicitudes_aprobadas',label:'Solicitudes aprobadas',color:colors.orange},{key:'solicitudes_rechazadas',label:'Solicitudes rechazadas',color:colors.grey}])}
    </div>
    ${integrationChart('Activación MAU','Datos pendientes de integración para activación a 30 y 60 días.',[{key:'mau_30_dias',label:'Activación a 30 días',color:colors.orange},{key:'mau_60_dias',label:'Activación a 60 días',color:colors.grey}])}`;attachChartEvents();}

  function renderAltas(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Altas y oferta comercial','De dónde provienen las altas','Separa las altas a través de Experian, las altas manuales y el evento extraordinario G+.',`Altas totales ${fmt(r.altas_pgd_totales)}`)+`
    <div class="kpi-grid">
      ${kpi('Altas totales',fmt(r.altas_pgd_totales),'Universo de altas nuevas.','dark')}
      ${kpi('Altas a través de Experian',fmt(r.altas_pgd_con_viaje_experian),pct(r.tasa_altas_pgd_con_viaje)+' del total.','orange')}
      ${kpi('Altas manuales',fmt(r.altas_manuales),r.es_g_plus?'El residual se asigna a G+.':pct(r.altas_pgd_totales?r.altas_manuales/r.altas_pgd_totales:0)+' del total.','grey')}
      ${kpi('MOVE Experian',fmt(r.viaje_move),pct(r.altas_pgd_con_viaje_experian?r.viaje_move/r.altas_pgd_con_viaje_experian:0)+' del origen.','orange')}
      ${kpi('Altas manuales EMINENT',fmt(r.es_g_plus?0:r.sin_viaje_eminent),r.es_g_plus?'No aplica para G+.':pct(r.altas_manuales?r.sin_viaje_eminent/r.altas_manuales:0)+' del origen.','grey')}
    </div>
    <div class="grid-2"><section class="panel"><div class="panel-title-row"><div><h2>Composición mensual de altas</h2><div class="panel-subtitle">G+ se muestra separado de las altas manuales.</div></div>${legend([{label:'A través de Experian',color:colors.orange},{label:'Manuales',color:colors.grey},{label:'G+',color:colors.dark}])}</div><div class="chart">${stackedBars(validRecords,[{key:'altas_pgd_con_viaje_experian',label:'Altas a través de Experian',color:colors.orange},{key:'altas_manuales',label:'Altas manuales',color:colors.grey},{key:'altas_g_plus',label:'Altas G+',color:colors.dark}])}</div></section>
    <section class="panel"><div class="panel-title-row"><div><h2>Oferta comercial adquirida</h2><div class="panel-subtitle">Comparación de la oferta adquirida por origen.</div></div></div><div class="offer-list-large">${offerCard('Altas a través de Experian','Experian','',{eminent:r.viaje_eminent,plus:r.viaje_plus,move:r.viaje_move,other:r.viaje_otros,noData:r.viaje_sin_dato})}<div style="height:10px"></div>${offerCard(r.es_g_plus?'Altas G+':'Altas manuales',r.es_g_plus?'G+':'Manual',r.es_g_plus?'gplus':'manual',{eminent:r.sin_viaje_eminent,plus:r.sin_viaje_plus,move:r.sin_viaje_move,other:r.sin_viaje_otros,noData:r.sin_viaje_sin_dato})}</div></section></div>
    ${originTable()}`;attachChartEvents();}

  function originTable(){return `<section class="panel"><div class="panel-title-row"><div><h2>Detalle de origen y oferta comercial</h2><div class="panel-subtitle">Las altas G+ se muestran por separado.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>Altas totales</th><th>Altas a través de Experian</th><th>Altas manuales</th><th>Altas G+</th><th>Experian EMINENT</th><th>Experian PLUS</th><th>Experian MOVE</th><th>Altas manuales/G+ EMINENT</th><th>Altas manuales/G+ PLUS</th><th>Altas manuales/G+ MOVE</th></tr></thead><tbody>${validRecords.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}</td><td>${fmt(r.altas_pgd_totales)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${fmt(r.altas_manuales)}</td><td>${fmt(r.altas_g_plus)}</td><td>${fmt(r.viaje_eminent)}</td><td>${fmt(r.viaje_plus)}</td><td>${fmt(r.viaje_move)}</td><td>${fmt(r.sin_viaje_eminent)}</td><td>${fmt(r.sin_viaje_plus)}</td><td>${fmt(r.sin_viaje_move)}</td></tr>`).join('')}</tbody></table></div></section>`}

  function renderFriccion(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Intentos antes del alta','Cuántas evaluaciones realiza una persona antes de convertirse en cliente','La vista resume las evaluaciones previas a la conversión a cliente.',`${fmt1(r.intentos_n_por_lead)} intentos antes del alta`)+`
    <div class="metric-strip">
      <div class="metric-mini"><span>Evaluaciones por persona</span><strong>${fmt1(r.solicitudes_por_persona)}</strong><small>Todas las solicitudes / personas solicitantes.</small></div>
      <div class="metric-mini"><span>Intentos antes del alta</span><strong>${fmt1(r.intentos_n_por_lead)}</strong><small>Solicitudes por lead no cliente.</small></div>
      <div class="metric-mini"><span>Conversión a cliente</span><strong>${pct(r.conversion_lead_a_alta_experian)}</strong><small>Altas a través de Experian.</small></div>
      <div class="metric-mini"><span>Altas principales</span><strong>${pct(r.participacion_m0)}</strong><small>Participación dentro de las altas a través de Experian.</small></div>
    </div>
    <div class="grid-2"><section class="panel"><div class="panel-title-row"><div><h2>Intentos antes del alta</h2><div class="panel-subtitle">Evolución de solicitudes por lead no cliente.</div></div>${legend([{label:'Intentos antes del alta',color:colors.orange}])}</div><div class="chart">${svgLineChart([{name:'Intentos antes del alta',values:validRecords.map(x=>x.intentos_n_por_lead),color:colors.orange,width:3}],validRecords.map(x=>x.periodo))}</div></section>
    <section class="panel"><div class="panel-title-row"><div><h2>Detalle de intentos antes del alta</h2><div class="panel-subtitle">Una vista más detallada requiere información adicional sobre el recorrido del cliente.</div></div></div><div class="funnel-bars"><div class="insight"><strong>1. Registro de altas</strong><p>Identificar cada alta del período.</p></div><div class="insight"><strong>2. Intentos previos</strong><p>Contar las evaluaciones realizadas antes del alta.</p></div><div class="insight"><strong>3. Distribución</strong><p>Mediana, P75, P90 y porcentaje con 1, 2, 3 o 4+ intentos.</p></div></div></section></div>
    `;attachChartEvents();}

  function renderDatos(){app.innerHTML=sectionHead('Base navegable','Datos mensuales completos','Usá esta tabla como control del dashboard.',`${records.length} períodos`)+`<div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>Solicitudes</th><th>Personas</th><th>Leads no clientes</th><th>Solicitudes por lead no cliente</th><th>Altas totales</th><th>Altas a través de Experian</th><th>Altas manuales</th><th>Altas G+</th><th>Altas principales</th><th>Altas adicionales</th><th>Experian EMINENT</th><th>Experian PLUS</th><th>Experian MOVE</th><th>Altas manuales/G+ EMINENT</th><th>Altas manuales/G+ PLUS</th><th>Altas manuales/G+ MOVE</th><th>% a través de Experian</th></tr></thead><tbody>${records.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}${r.es_mes_parcial?'<span class="row-tag partial">Parcial</span>':''}</td><td>${fmt(r.solicitudes_experian_totales)}</td><td>${fmt(r.personas_solicitantes_totales)}</td><td>${fmt(r.leads_no_clientes_experian)}</td><td>${fmt(r.solicitudes_experian_n)}</td><td>${fmt(r.altas_pgd_totales)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${fmt(r.altas_manuales)}</td><td>${fmt(r.altas_g_plus)}</td><td>${fmt(r.altas_pgd_viaje_m0)}</td><td>${fmt(r.altas_pgd_viaje_m1)}</td><td>${fmt(r.viaje_eminent)}</td><td>${fmt(r.viaje_plus)}</td><td>${fmt(r.viaje_move)}</td><td>${fmt(r.sin_viaje_eminent)}</td><td>${fmt(r.sin_viaje_plus)}</td><td>${fmt(r.sin_viaje_move)}</td><td>${pct(r.tasa_altas_pgd_con_viaje)}</td></tr>`).join('')}</tbody></table></div>`;}

  function render(){if(currentTab==='resumen')renderResumen();else if(currentTab==='funnel')renderFunnel();else if(currentTab==='altas')renderAltas();else if(currentTab==='friccion')renderFriccion();else renderDatos();}

  tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');currentTab=t.dataset.tab;render();}));
  periodSelect.addEventListener('change',()=>{currentPeriod=Number(periodSelect.value);render();});

  render();
})();

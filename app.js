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
  const getRecord = p => records.find(r => r.periodo === Number(p));
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

  function renderResumen(){
    const r=getRecord(currentPeriod); const isG=r.es_g_plus; const note=isG?'Período extraordinario G+':r.es_mes_parcial?'Mes parcial · oferta pendiente':`Período ${periodLabel(r.periodo)}`;
    app.innerHTML=sectionHead('Resumen ejecutivo','Cómo entra y se convierte el cliente','Una vista curada del recorrido normal por Experian, las altas manuales y la incorporación extraordinaria G+.',note)+`
      <div class="kpi-grid">
        ${kpi('Personas evaluadas',fmt(r.personas_solicitantes_totales),'Personas evaluadas en Experian.','dark')}
        ${kpi('Leads no clientes',fmt(r.leads_no_clientes_experian),'Personas identificadas como no clientes.','orange')}
        ${kpi('Altas a través de Experian',fmt(r.altas_pgd_con_viaje_experian),`${pct(r.conversion_lead_a_alta_experian)} de los leads no clientes.`, 'orange')}
        ${kpi('Altas manuales',fmt(r.altas_manuales),'Sin match Experian.','grey')}
        ${kpi('Altas G+',fmt(r.altas_g_plus),'Incorporación extraordinaria HBC.','gplus')}
        ${kpi('Intentos antes del alta',fmt1(r.intentos_n_por_lead),'Promedio de solicitudes por lead no cliente.','dark')}
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-title-row"><div><h2>Funnel del viaje Experian</h2><div class="panel-subtitle">Personas, leads no clientes y altas a través de Experian.</div></div></div>${funnel(r)}</section>
        <section class="panel"><div class="panel-title-row"><div><h2>Altas por origen</h2><div class="panel-subtitle">Tendencia desde julio 2025.</div></div>${legend([{label:'A través de Experian',color:colors.orange},{label:'Manuales',color:colors.grey},{label:'G+',color:colors.dark}])}</div><div class="chart">${stackedBars(records.filter(x=>x.periodo>=202505),[{key:'altas_pgd_con_viaje_experian',label:'Altas a través de Experian',color:colors.orange},{key:'altas_manuales',label:'Altas manuales',color:colors.grey},{key:'altas_g_plus',label:'Altas G+',color:colors.dark}])}</div></section>
      </div>
      <div class="grid-3">
        ${offerCard('Oferta comercial de altas a través de Experian','Experian','',{eminent:r.viaje_eminent,plus:r.viaje_plus,move:r.viaje_move,other:r.viaje_otros,noData:r.viaje_sin_dato})}
        ${offerCard('Oferta comercial de altas manuales','Manual','manual',{eminent:r.es_g_plus?0:r.sin_viaje_eminent,plus:r.es_g_plus?0:r.sin_viaje_plus,move:r.es_g_plus?0:r.sin_viaje_move,other:r.es_g_plus?0:r.sin_viaje_otros,noData:r.es_g_plus?0:r.sin_viaje_sin_dato})}
        ${offerCard('Oferta comercial de altas G+','G+','gplus',{eminent:r.es_g_plus?r.sin_viaje_eminent:0,plus:r.es_g_plus?r.sin_viaje_plus:0,move:r.es_g_plus?r.sin_viaje_move:0,other:r.es_g_plus?r.sin_viaje_otros:0,noData:r.es_g_plus?r.sin_viaje_sin_dato:0})}
      </div>`;
    attachChartEvents();
  }

  function funnel(r){const vals=[['Personas evaluadas',r.personas_solicitantes_totales,colors.dark],['Leads no clientes',r.leads_no_clientes_experian,colors.grey],['Altas a través de Experian',r.altas_pgd_con_viaje_experian,colors.orange]]; const max=Math.max(...vals.map(v=>v[1]),1);return `<div class="funnel-bars">${vals.map((v,i)=>`<div class="funnel-row"><div><div class="funnel-label">${v[0]}</div>${i?`<div class="funnel-rate">${pct(v[1]/vals[i-1][1])} del paso anterior</div>`:''}</div><div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(v[1]/max*100,1)}%;background:${v[2]}"></div></div><div class="funnel-value">${fmt(v[1])}</div></div>`).join('')}</div>`}

  function renderFunnel(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Funnel Experian','Del lead no cliente a la conversión','Seguimiento del recorrido desde el interés hasta la conversión a cliente.',`Conversión a cliente ${pct(r.conversion_lead_a_alta_experian)}`)+`
    <div class="metric-strip">
      <div class="metric-mini"><span>Evaluaciones en Experian</span><strong>${fmt(r.solicitudes_experian_totales)}</strong><small>Total de evaluaciones realizadas.</small></div>
      <div class="metric-mini"><span>Leads no clientes</span><strong>${fmt(r.leads_no_clientes_experian)}</strong><small>Personas no clientes por período.</small></div>
      <div class="metric-mini"><span>Altas a través de Experian</span><strong>${fmt(r.altas_pgd_viaje_m0)}</strong><small>${pct(r.participacion_m0)} de las conversiones.</small></div>
      <div class="metric-mini"><span>Altas adicionales a través de Experian</span><strong>${fmt(r.altas_pgd_viaje_m1)}</strong><small>${pct(r.participacion_m1)} de las conversiones.</small></div>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-title-row"><div><h2>Leads no clientes y altas</h2><div class="panel-subtitle">Evolución mensual en escala de personas.</div></div>${legend([{label:'Leads no clientes',color:colors.dark},{label:'Altas a través de Experian',color:colors.orange}])}</div><div class="chart">${svgLineChart([{name:'Leads no clientes',values:validRecords.map(x=>x.leads_no_clientes_experian),color:colors.dark,width:2},{name:'Altas a través de Experian',values:validRecords.map(x=>x.altas_pgd_con_viaje_experian),color:colors.orange,width:3}],validRecords.map(x=>x.periodo))}</div></section>
      <section class="panel"><div class="panel-title-row"><div><h2>Conversión a cliente</h2><div class="panel-subtitle">Distribución de las altas a través de Experian.</div></div>${legend([{label:'Altas principales',color:colors.orange},{label:'Altas adicionales',color:colors.grey}])}</div><div class="chart">${stackedBars(validRecords,[{key:'altas_pgd_viaje_m0',label:'Altas principales',color:colors.orange},{key:'altas_pgd_viaje_m1',label:'Altas adicionales',color:colors.grey}])}</div></section>
    </div>${funnelTable()}`;attachChartEvents();}

  function funnelTable(){return `<section class="panel"><div class="panel-title-row"><div><h2>Detalle mensual</h2><div class="panel-subtitle">El indicador muestra solicitudes por lead no cliente antes del alta.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Período</th><th>Personas</th><th>Leads no clientes</th><th>Solicitudes por lead no cliente</th><th>Intentos antes del alta</th><th>Altas principales</th><th>Altas adicionales</th><th>Altas a través de Experian</th><th>Conversión a cliente</th></tr></thead><tbody>${validRecords.map(r=>`<tr><td>${periodLabel(r.periodo)}${r.es_g_plus?'<span class="row-tag">G+</span>':''}${r.es_mes_parcial?'<span class="row-tag partial">Parcial</span>':''}</td><td>${fmt(r.personas_solicitantes_totales)}</td><td>${fmt(r.leads_no_clientes_experian)}</td><td>${fmt(r.solicitudes_experian_n)}</td><td>${fmt1(r.intentos_n_por_lead)}</td><td>${fmt(r.altas_pgd_viaje_m0)}</td><td>${fmt(r.altas_pgd_viaje_m1)}</td><td>${fmt(r.altas_pgd_con_viaje_experian)}</td><td>${pct(r.conversion_lead_a_alta_experian)}</td></tr>`).join('')}</tbody></table></div></section>`}

  function renderAltas(){const r=getRecord(currentPeriod); app.innerHTML=sectionHead('Altas y oferta comercial','De dónde provienen las altas','Separa las altas a través de Experian, las altas manuales y el evento extraordinario G+.',`Altas totales ${fmt(r.altas_pgd_totales)}`)+`
    <div class="kpi-grid">
      ${kpi('Altas totales',fmt(r.altas_pgd_totales),'Universo de altas nuevas.','dark')}
      ${kpi('Altas a través de Experian',fmt(r.altas_pgd_con_viaje_experian),pct(r.tasa_altas_pgd_con_viaje)+' del total.','orange')}
      ${kpi('Altas manuales',fmt(r.altas_manuales),r.es_g_plus?'El residual se asigna a G+.':pct(r.altas_pgd_totales?r.altas_manuales/r.altas_pgd_totales:0)+' del total.','grey')}
      ${kpi('Altas G+',fmt(r.altas_g_plus),'Evento HBC, junio 2025.','gplus')}
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

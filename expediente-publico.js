(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const formatGrade = value => Number.isFinite(value) ? `${value.toFixed(2)} / 10` : 'S/R';

  function decodeBase64Url(token) {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return bytes;
  }

  async function readSnapshot() {
    const fragment = location.hash.slice(1);
    const match = fragment.match(/^evalpro=([zj][A-Za-z0-9_-]+)$/);
    if (!match) throw new Error('Este enlace no incluye un expediente. Solicita al docente el QR correspondiente.');
    const token = match[1];
    const bytes = decodeBase64Url(token.slice(1));
    let json;
    if (token[0] === 'z') {
      if (!('DecompressionStream' in window)) throw new Error('Este navegador no puede leer el enlace comprimido. Ábrelo en una versión reciente de Chrome, Safari o Edge.');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      json = await new Response(stream).text();
    } else {
      json = new TextDecoder().decode(bytes);
    }
    const data = JSON.parse(json);
    if (data?.version !== 1 || !data.student?.name || !Array.isArray(data.subjects)) throw new Error('El contenido del enlace no tiene un formato de expediente válido.');
    return data;
  }

  function renderSummary(data) {
    const box = $('publicSummary');
    const stats = [
      [formatGrade(data.average), 'Promedio general'],
      [data.subjects.length, data.subjects.length === 1 ? 'Materia inscrita' : 'Materias inscritas'],
      [data.subjects.reduce((sum, subject) => sum + subject.partials.reduce((partialSum, partial) => partialSum + partial.records.length, 0), 0), 'Actividades registradas']
    ];
    for (const [value, label] of stats) {
      const tile = el('div', 'summary-tile');
      tile.append(el('b', '', value), el('span', '', label));
      box.append(tile);
    }
  }

  function renderPartial(partial) {
    const card = el('article', 'partial-card');
    const heading = el('div', 'partial-heading');
    heading.append(el('h4', '', partial.name));
    const grade = el('b', Number.isFinite(partial.grade) ? '' : 'is-pending', formatGrade(partial.grade));
    heading.append(grade);
    card.append(heading);
    const registered = partial.params.filter(param => Number.isFinite(param.grade));
    const configuredWeight = partial.params.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
    const registeredWeight = registered.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
    card.append(el('p', 'partial-coverage', configuredWeight ? `${registeredWeight.toFixed(1)}% de ${configuredWeight.toFixed(1)}% del parcial registrado` : 'Sin parámetros configurados'));
    const params = el('ul', 'parameter-list');
    partial.params.forEach(param => {
      const row = el('li');
      row.append(el('span', '', `${param.name} · ${Number(param.weight).toFixed(0)}%`));
      row.append(el('b', Number.isFinite(param.grade) ? '' : 'is-pending', formatGrade(param.grade)));
      params.append(row);
    });
    if (!partial.params.length) params.append(el('li', 'is-pending', 'Sin parámetros en este parcial'));
    card.append(params);
    return card;
  }

  function renderHistory(partials) {
    const records = partials.flatMap(partial => partial.records.map(record => ({ ...record, partial: partial.name })))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const block = el('div', 'history-block');
    block.append(el('h4', '', 'Actividades registradas'));
    if (!records.length) {
      block.append(el('div', 'no-data', 'Todavía no hay actividades registradas.'));
      return block;
    }
    const wrap = el('div', 'history-wrap');
    const table = el('table', 'history-table');
    const head = el('thead');
    const headerRow = el('tr');
    ['Actividad', 'Parámetro', 'Parcial', 'Fecha', 'Calificación', 'Tareas'].forEach(label => headerRow.append(el('th', '', label)));
    head.append(headerRow);
    const body = el('tbody');
    records.forEach(record => {
      const row = el('tr');
      [record.title, record.parameter, record.partial, record.date || '—', formatGrade(record.grade), record.tasks || '—'].forEach(value => row.append(el('td', '', value)));
      body.append(row);
    });
    table.append(head, body);
    wrap.append(table);
    block.append(wrap);
    return block;
  }

  function renderSubject(subject) {
    const card = el('article', 'subject-card');
    const heading = el('div', 'subject-header');
    heading.append(el('h3', '', subject.name));
    const final = el('div', 'subject-final');
    final.append(el('b', '', formatGrade(subject.finalGrade)), el('span', '', 'Calificación final'));
    heading.append(final);
    card.append(heading);
    const partialGrid = el('div', 'partial-grid');
    subject.partials.forEach(partial => partialGrid.append(renderPartial(partial)));
    if (subject.partials.length) card.append(partialGrid);
    else card.append(el('div', 'no-data', 'Aún no hay parciales configurados.'));
    card.append(renderHistory(subject.partials));
    return card;
  }

  async function init() {
    try {
      const data = await readSnapshot();
      $('publicStudentName').textContent = data.student.name;
      $('publicStudentMeta').textContent = 'Consulta de calificaciones e historial académico';
      $('publicGeneratedAt').textContent = `Copia generada: ${new Date(data.generatedAt).toLocaleString('es-MX')}`;
      renderSummary(data);
      const subjects = $('publicSubjects');
      if (data.subjects.length) data.subjects.forEach(subject => subjects.append(renderSubject(subject)));
      else subjects.append(el('div', 'no-data', 'Este alumno aún no está inscrito en una materia.'));
      $('publicLoading').hidden = true;
      $('publicStudentView').hidden = false;
      $('publicPrintButton').hidden = false;
      document.title = `Expediente de ${data.student.name} · EvalPro`;
    } catch (error) {
      $('publicLoading').hidden = true;
      $('publicErrorText').textContent = error.message || 'El enlace está dañado o incompleto.';
      $('publicError').hidden = false;
    }
  }

  init();
})();

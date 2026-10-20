// Respaldo portable de los datos locales de EvalPro.
let profileSubjectBarChart = null;
let profileEnrollmentPieChart = null;
const BACKUP_KEYS = {
  roster: 'evalpro-roster-v1',
  subjects: 'evalpro-subjects-v1',
  partials: 'evalpro-partials-v1',
  bookParams: 'evalpro-book-params-v1',
  examParams: 'evalpro-exam-params-v1',
  examSettings: 'evalpro-exam-settings-v1',
  examSubjectConfigs: 'evalpro-exam-subject-configs-v1',
  examStudents: 'evalpro-exam-students-v1',
  teacherProfile: 'evalpro-teacher-profile-v1',
  theme: 'evalpro-theme'
};
const BACKUP_HISTORY_KEY = 'evalpro-backup-history-v1';
const BACKUP_HISTORY_LIMIT = 8;

function readBackupData() {
  const data = {};
  for (const [field, key] of Object.entries(BACKUP_KEYS)) {
    const raw = localStorage.getItem(key);
    data[field] = raw === null ? null : field === 'theme' ? raw : JSON.parse(raw);
  }
  data.roster ??= [];
  data.subjects ??= [];
  data.partials ??= [];
  data.bookParams ??= defaultBookParams.map(param => ({ ...param }));
  data.examParams ??= defaultParams.map(param => ({ ...param }));
  data.examSettings ??= { materia: 'Física', pct: 30 };
  data.examSubjectConfigs ??= {};
  data.examStudents ??= [];
  data.teacherProfile ??= { name: '' };
  data.theme = data.theme === 'dark' ? 'dark' : 'light';
  return data;
}

function renderTeacherWelcome() {
  const message = document.getElementById('profileWelcomeMessage');
  const input = document.getElementById('teacherNameInput');
  const title = document.getElementById('teacherNameTitle');
  if (!message) return;
  let profile = { name: '' };
  try {
    profile = JSON.parse(localStorage.getItem(BACKUP_KEYS.teacherProfile) || '{"name":""}') || profile;
  } catch { /* Usa el saludo genérico si el perfil guardado está dañado. */ }
  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  if (input && input !== document.activeElement && input.value !== name) input.value = name;
  if (title) title.textContent = name || 'Mi perfil';
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 19 ? 'afternoon' : 'evening';
  const phrases = {
    morning: ['Que tengas una mañana llena de buenos avances.', '¡Que hoy tus clases estén llenas de grandes ideas!', 'Comienza el día viendo cómo avanzan tus grupos.'],
    afternoon: ['Espero que tu tarde vaya muy bien. Aquí está el avance de tus grupos.', '¡Ánimo con tus clases de hoy! Tus grupos te esperan.', 'Revisa cómo van tus materias y continúa con buen ritmo.'],
    evening: ['Cierra el día revisando el progreso de tus grupos.', '¡Buenas noches! Tus registros quedan listos para cuando los necesites.', 'Un vistazo a tus materias para terminar bien el día.']
  };
  const day = Math.floor(Date.now() / 86400000);
  const phrase = phrases[period][day % phrases[period].length];
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  message.textContent = `${greeting}${name ? `, ${name}` : ''}. ${phrase}`;
}

function printProfile() {
  const profileTab = document.querySelector('.folder-tab[data-tab="profile"]');
  if (profileTab && !profileTab.classList.contains('active')) switchTab(profileTab);
  const body = document.body;
  const expandedDetails = [...document.querySelectorAll('#panel-profile details')].map(item => ({ item, open: item.open }));
  expandedDetails.forEach(({ item }) => { item.open = true; });
  body.classList.add('printing-profile');
  const cleanup = () => {
    body.classList.remove('printing-profile');
    expandedDetails.forEach(({ item, open }) => { item.open = open; });
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 2000);
}

window.toggleTeacherSettings = function () {
  const settings = document.getElementById('teacherProfileSettings');
  const toggle = document.getElementById('teacherSettingsToggle');
  if (!settings || !toggle) return;
  settings.hidden = !settings.hidden;
  toggle.setAttribute('aria-expanded', String(!settings.hidden));
  if (!settings.hidden) document.getElementById('teacherNameInput')?.focus({ preventScroll: true });
};

document.getElementById('teacherProfileForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('teacherNameInput');
  const name = input?.value.trim() || '';
  try {
    localStorage.setItem(BACKUP_KEYS.teacherProfile, JSON.stringify({ name }));
    renderTeacherWelcome();
    const settings = document.getElementById('teacherProfileSettings');
    const toggle = document.getElementById('teacherSettingsToggle');
    if (settings) settings.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
    toast(name ? 'Nombre de docente guardado.' : 'Se quitó el nombre de docente.');
  } catch (error) {
    console.error('No se pudo guardar el perfil docente:', error);
    toast('No se pudo guardar el nombre. Revisa el espacio del navegador.');
  }
});

function buildBackupEnvelope(data = readBackupData(), exportedAt = new Date().toISOString()) {
  return { app: 'EvalPro', schemaVersion: 1, exportedAt, data };
}

function downloadBackupEnvelope(backup, filename) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readBackupHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function storeBackupHistorySnapshot(sourceData, savedAt = new Date().toISOString()) {
  const data = JSON.parse(JSON.stringify(sourceData));
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dateTag = savedAt.replace(/[:.]/g, '-').slice(0, 19);
  const snapshot = { id, savedAt, filename: `evalpro-respaldo-${dateTag}.json`, studentCount: data.roster.length, subjectCount: data.subjects.length, data };
  const current = readBackupHistory();
  for (let limit = Math.min(BACKUP_HISTORY_LIMIT, current.length + 1); limit >= 1; limit--) {
    try {
      localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify([snapshot, ...current].slice(0, limit)));
      return snapshot;
    } catch (error) {
      if (error?.name !== 'QuotaExceededError') throw error;
    }
  }
  return null;
}

function saveBackupSnapshot() {
  try {
    const savedAt = new Date().toISOString();
    const data = JSON.parse(JSON.stringify(readBackupData()));
    const backup = buildBackupEnvelope(data, savedAt);
    const snapshot = storeBackupHistorySnapshot(data, savedAt);

    // The downloaded JSON remains a portable backup even if local browser storage is full.
    downloadBackupEnvelope(backup, snapshot?.filename || `evalpro-respaldo-${savedAt.slice(0, 19).replace(/[:.]/g, '-')}.json`);
    renderBackupHistory();
    const status = document.getElementById('profileLastSaved');
    if (status) status.textContent = `Último guardado: ${new Date(savedAt).toLocaleString('es-MX')}`;
    toast(snapshot
      ? 'Datos guardados en el historial y descargados como archivo JSON.'
      : 'Se descargó el respaldo; libera espacio del navegador para guardarlo en el historial.');
  } catch (error) {
    console.error('No se pudo guardar el respaldo:', error);
    toast('No se pudo crear el respaldo. Revisa el almacenamiento del navegador.');
  }
}

function exportBackup() {
  try {
    const backup = buildBackupEnvelope();
    downloadBackupEnvelope(backup, `evalpro-respaldo-${new Date().toISOString().slice(0, 10)}.json`);
    toast('Respaldo descargado en formato JSON.');
  } catch (error) {
    console.error('No se pudo exportar el respaldo:', error);
    toast('No se pudo crear el respaldo. Revisa los datos guardados.');
  }
}

function renderBackupHistory() {
  const list = document.getElementById('backupHistory');
  if (!list) return;
  const history = readBackupHistory();
  const count = document.getElementById('backupHistoryCount');
  if (count) count.textContent = `${history.length} ${history.length === 1 ? 'copia' : 'copias'}`;
  const latest = history[0];
  const status = document.getElementById('profileLastSaved');
  if (status && latest?.savedAt) status.textContent = `Último guardado: ${new Date(latest.savedAt).toLocaleString('es-MX')}`;
  if (!history.length) {
    list.innerHTML = '<div class="backup-history-empty">Aún no hay respaldos. Pulsa <b>Guardar datos</b> para crear el primero.</div>';
    return;
  }
  list.innerHTML = history.map(snapshot => {
    const time = new Date(snapshot.savedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    return `<article class="backup-history-item"><span class="backup-history-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h10V3M7 21v-7h10v7"/></svg></span><div class="backup-history-meta"><b>${esc(time)}</b><small>${Number(snapshot.studentCount) || 0} alumnos · ${Number(snapshot.subjectCount) || 0} materias · JSON</small></div><div class="backup-history-actions"><button type="button" class="btn btn-sm" onclick="downloadSavedBackup('${esc(snapshot.id)}')">Descargar</button><button type="button" class="btn btn-sm btn-primary" onclick="restoreSavedBackup('${esc(snapshot.id)}')">Restaurar</button></div></article>`;
  }).join('');
}

function downloadSavedBackup(id) {
  const snapshot = readBackupHistory().find(item => item.id === id);
  if (!snapshot) return toast('No se encontró esa copia guardada.');
  downloadBackupEnvelope(buildBackupEnvelope(snapshot.data, snapshot.savedAt), snapshot.filename || `evalpro-respaldo-${id}.json`);
  toast('Copia descargada.');
}

function restoreBackupData(data) {
  const current = readBackupData();
  const incoming = {
    ...current,
    ...data,
    roster: data.roster ?? [],
    subjects: data.subjects ?? [],
    partials: data.partials ?? [],
    bookParams: data.bookParams ?? current.bookParams,
    examParams: data.examParams ?? current.examParams,
    examSettings: data.examSettings ?? current.examSettings,
    examSubjectConfigs: data.examSubjectConfigs ?? {},
    examStudents: data.examStudents ?? [],
    theme: data.theme === 'dark' ? 'dark' : 'light'
  };
  const previous = Object.fromEntries(Object.values(BACKUP_KEYS).map(key => [key, localStorage.getItem(key)]));
  try {
    for (const [field, key] of Object.entries(BACKUP_KEYS)) {
      const value = incoming[field];
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, field === 'theme' ? value : JSON.stringify(value));
    }
  } catch (error) {
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    throw error;
  }
}

function restoreSavedBackup(id) {
  const snapshot = readBackupHistory().find(item => item.id === id);
  if (!snapshot) return toast('No se encontró esa copia guardada.');
  const accepted = confirm(`Se restaurará la copia del ${new Date(snapshot.savedAt).toLocaleString('es-MX')} con ${snapshot.studentCount} alumno(s) y ${snapshot.subjectCount} materia(s). Los datos actuales serán reemplazados. ¿Continuar?`);
  if (!accepted) return;
  try {
    validateBackup(buildBackupEnvelope(snapshot.data, snapshot.savedAt));
    storeBackupHistorySnapshot(readBackupData());
    restoreBackupData(snapshot.data);
    toast('Copia restaurada. Actualizando EvalPro…');
    window.setTimeout(() => location.reload(), 350);
  } catch (error) {
    console.error('No se pudo restaurar la copia:', error);
    toast(error.message || 'No se pudo restaurar esa copia.');
  }
}

function validateBackup(backup) {
  if (!backup || backup.app !== 'EvalPro' || !backup.data || typeof backup.data !== 'object') {
    throw new Error('El archivo no parece ser un respaldo de EvalPro.');
  }
  if (backup.schemaVersion !== 1) throw new Error('La versión de este respaldo no es compatible.');
  const data = backup.data;
  for (const field of ['roster', 'subjects', 'partials', 'bookParams', 'examParams', 'examStudents']) {
    if (data[field] !== undefined && !Array.isArray(data[field])) {
      throw new Error(`El campo “${field}” del respaldo tiene un formato inválido.`);
    }
  }
  if (data.examSubjectConfigs !== undefined && (!data.examSubjectConfigs || typeof data.examSubjectConfigs !== 'object' || Array.isArray(data.examSubjectConfigs))) {
    throw new Error('La configuración de exámenes por materia tiene un formato inválido.');
  }
  if (data.roster?.some(student => !student || typeof student.name !== 'string' || !Array.isArray(student.records ?? []))) {
    throw new Error('La lista de alumnos del respaldo está dañada.');
  }
  if (data.subjects?.some(subject => !subject || typeof subject.name !== 'string')) {
    throw new Error('La lista de materias del respaldo está dañada.');
  }
  if (data.theme !== undefined && !['light', 'dark'].includes(data.theme)) {
    throw new Error('El tema visual del respaldo no es válido.');
  }
  if (data.teacherProfile !== undefined && (!data.teacherProfile || typeof data.teacherProfile !== 'object' || Array.isArray(data.teacherProfile) || typeof data.teacherProfile.name !== 'string')) {
    throw new Error('El perfil docente del respaldo tiene un formato inválido.');
  }
  return data;
}

function drawProfileSubjectCharts(subjectMetrics, enrolledPairs) {
  const barCanvas = document.getElementById('profileSubjectBarChart');
  const pieCanvas = document.getElementById('profileEnrollmentPieChart');
  if (!barCanvas || !pieCanvas) return;
  profileSubjectBarChart?.destroy();
  profileEnrollmentPieChart?.destroy();
  profileSubjectBarChart = profileEnrollmentPieChart = null;
  const hasGrades = subjectMetrics.some(item => Number.isFinite(item.average));
  const hasEnrollments = enrolledPairs.length > 0;
  const barEmpty = document.getElementById('profileSubjectChartEmpty');
  const pieEmpty = document.getElementById('profileEnrollmentChartEmpty');
  barCanvas.hidden = !hasGrades;
  pieCanvas.hidden = !hasEnrollments;
  if (barEmpty) barEmpty.hidden = hasGrades;
  if (pieEmpty) pieEmpty.hidden = hasEnrollments;
  if (!window.Chart) return;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim() || '#25475b';
  const surface = css.getPropertyValue('--surface').trim() || '#fff';
  const colorForSubject = { purple: '#8757b1', yellow: '#d3a91d', orange: '#df7a32', green: '#258652', gray: '#748092', red: '#c84c57' };
  if (hasGrades) {
    profileSubjectBarChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: subjectMetrics.map(item => item.subject.name),
        datasets: [{
          label: 'Promedio / 10',
          data: subjectMetrics.map(item => Number.isFinite(item.average) ? Number(item.average.toFixed(2)) : null),
          backgroundColor: subjectMetrics.map(item => colorForSubject[item.subject.themeColor] || css.getPropertyValue('--primary').trim() || '#1685b2'),
          borderRadius: 5,
          maxBarThickness: 48
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${context.parsed.y.toFixed(2)} / 10` } } },
        scales: {
          y: { beginAtZero: true, max: 10, ticks: { color: ink, stepSize: 2 }, grid: { color: `${ink}18` } },
          x: { ticks: { color: ink, maxRotation: 35, minRotation: 0, autoSkip: true }, grid: { display: false } }
        }
      }
    });
  }
  if (hasEnrollments) {
    const approved = enrolledPairs.filter(item => Number.isFinite(item.grade) && item.grade >= 6).length;
    const failed = enrolledPairs.filter(item => Number.isFinite(item.grade) && item.grade < 6).length;
    const pending = enrolledPairs.length - approved - failed;
    profileEnrollmentPieChart = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Aprobados', 'Reprobados', 'Sin registro'],
        datasets: [{ data: [approved, failed, pending], backgroundColor: ['#25a66a', '#d65360', '#e0b33b'], borderColor: surface, borderWidth: 3, hoverOffset: 5 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: ink, padding: 14, usePointStyle: true, pointStyle: 'circle' } } }
      }
    });
  }
}

function renderProfile() {
  renderTeacherWelcome();
  const statsBox = document.getElementById('profileStats');
  if (!statsBox) return;
  const enrolledPairs = subjects.flatMap(subject => roster
    .filter(student => (subject.studentIds || []).includes(student.id))
    .map(student => ({ subject, student, grade: subjectFinalGrade(student, subject) })));
  const gradedPairs = enrolledPairs.filter(item => Number.isFinite(item.grade));
  const approvedPairs = gradedPairs.filter(item => item.grade >= 6).length;
  const failedPairs = gradedPairs.filter(item => item.grade < 6).length;
  const pendingPairs = enrolledPairs.length - gradedPairs.length;
  const overallAverage = gradedPairs.length ? gradedPairs.reduce((sum, item) => sum + item.grade, 0) / gradedPairs.length : null;
  const allRecords = roster.flatMap(student => student.records || []).filter(record => !record.taskRemoved);
  const taskRecords = allRecords.filter(record => Number(record.tasksTotal) > 0);
  const taskTotals = taskRecords.reduce((totals, record) => ({ delivered: totals.delivered + (Number(record.tasksDelivered) || 0), total: totals.total + Number(record.tasksTotal) }), { delivered: 0, total: 0 });
  const averageDisplay = overallAverage === null ? '—' : `${overallAverage.toFixed(2)} / 10`;
  statsBox.innerHTML = [
    ['Materias', subjects.length, 'Grupos activos'],
    ['Alumnos', roster.length, 'Expedientes registrados'],
    ['Aprobados', approvedPairs, 'Inscripciones con 6 o más'],
    ['Reprobados', failedPairs, 'Inscripciones con menos de 6'],
    ['Promedio grupal', averageDisplay, `${gradedPairs.length} calificaciones finales`],
    ['Tareas entregadas', taskTotals.total ? `${taskTotals.delivered} / ${taskTotals.total}` : '—', `${taskRecords.length} actividades con conteo`],
    ['Evaluaciones', allRecords.length, 'Registros en expedientes'],
    ['Pendientes', pendingPairs, 'Inscripciones sin calificación final']
  ].map(([label, value, hint], index) => `<article class="profile-stat-tile profile-stat-tone-${index % 4}"><span>${esc(label)}</span><b>${value}</b><small>${esc(hint)}</small></article>`).join('');

  const subjectMetrics = subjects.map(subject => {
    const members = roster.filter(student => (subject.studentIds || []).includes(student.id));
    const graded = members.map(student => ({ student, grade: subjectFinalGrade(student, subject) })).filter(item => Number.isFinite(item.grade));
    const average = graded.length ? graded.reduce((sum, item) => sum + item.grade, 0) / graded.length : null;
    const passed = graded.filter(item => item.grade >= 6).length;
    const taskDefinitions = academicPartials.flatMap(part => getPartParams(part, subject.id)
      .filter(param => normalizeName(param.name || '').includes('tarea'))
      .map(param => `${part.id}::${param.id}`));
    const taskRows = members.flatMap(student => (student.records || []).filter(record => !record.taskRemoved && record.subjectId === subject.id
      && (taskDefinitions.includes(`${record.partialId}::${record.categoryId}`)
        || normalizeName(record.categoryName || '').includes('tarea')
        || Number(record.tasksTotal) > 0)));
    const taskDone = taskRows.reduce((sum, record) => sum + (Number(record.tasksDelivered) || 0), 0);
    const taskTotal = taskRows.reduce((sum, record) => sum + (Number(record.tasksTotal) || 0), 0);
    const categoryCount = word => {
      const definitions = academicPartials.flatMap(part => getPartParams(part, subject.id)
        .filter(param => normalizeName(param.name || '').includes(word))
        .map(param => `${part.id}::${param.id}`));
      return members.reduce((sum, student) => sum + (student.records || []).filter(record => !record.taskRemoved && record.subjectId === subject.id
        && definitions.includes(`${record.partialId}::${record.categoryId}`)).length, 0);
    };
    return { subject, members, average, passed, failed: graded.length - passed, pending: members.length - graded.length, taskRows, taskDone, taskTotal, works: categoryCount('trabaj'), participation: categoryCount('particip'), exams: students.filter(result => result.subjectId === subject.id).length };
  });

  const subjectBox = document.getElementById('profileSubjects');
  if (subjectBox) subjectBox.innerHTML = subjectMetrics.length ? subjectMetrics.map(({ subject, members, average, passed, failed, pending }) => {
    const percent = average === null ? 0 : Math.min(100, Math.max(0, average * 10));
    const partialHeaders = academicPartials.map(part => `<th scope="col">${esc(part.name)}</th>`).join('');
    const rosterRows = members.length ? members.map(student => {
      const grades = academicPartials.map(part => {
        const grade = partialGrade(student, subject.id, part)?.grade;
        return `<td class="${grade === undefined ? 'profile-grade-pending' : grade >= 6 ? 'profile-grade-pass' : 'profile-grade-fail'}">${Number.isFinite(grade) ? grade.toFixed(2) : 'S/R'}</td>`;
      }).join('');
      const finalGrade = subjectFinalGrade(student, subject);
      return `<tr><th scope="row">${esc(student.name)}</th>${grades}<td class="${finalGrade === null ? 'profile-grade-pending' : finalGrade >= 6 ? 'profile-grade-pass' : 'profile-grade-fail'}"><b>${finalGrade === null ? 'S/R' : finalGrade.toFixed(2)}</b></td></tr>`;
    }).join('') : `<tr><td class="profile-roster-empty" colspan="${academicPartials.length + 2}">Aún no hay alumnos inscritos en esta materia.</td></tr>`;
    return `<article class="profile-subject-card"><div class="profile-subject-heading"><h4>${esc(subject.name)}</h4><span>${members.length} ${members.length === 1 ? 'alumno' : 'alumnos'}</span></div><div class="profile-subject-grade"><b>${average === null ? 'S/R' : average.toFixed(2)}</b><span>promedio / 10</span></div><div class="profile-progress"><span style="width:${percent}%"></span></div><div class="profile-subject-foot"><span class="is-approved">${passed} aprobados</span><span class="is-failed">${failed} reprobados</span><span>${pending} S/R</span></div><details class="profile-roster-details"><summary>Ver alumnos y calificaciones</summary><div class="profile-roster-scroll"><table class="profile-roster-table"><thead><tr><th scope="col">Alumno</th>${partialHeaders}<th scope="col">Final</th></tr></thead><tbody>${rosterRows}</tbody></table></div></details><button class="btn btn-primary profile-roster-link" type="button" onclick="openSubjectRoster('${esc(subject.id)}')">Abrir alumnos registrados</button></article>`;
  }).join('') : '<div class="profile-empty">Aún no has creado materias.</div>';
  drawProfileSubjectCharts(subjectMetrics, enrolledPairs);

  const taskBox = document.getElementById('profileTasks');
  if (taskBox) taskBox.innerHTML = subjectMetrics.length ? subjectMetrics.map(({ subject, members, taskRows, taskDone, taskTotal, works, participation, exams }) => {
    const progress = taskTotal ? Math.min(100, taskDone / taskTotal * 100) : 0;
    return `<article class="profile-task-card"><div class="profile-subject-heading"><h4>${esc(subject.name)}</h4><span>${members.length} alumnos</span></div><div class="profile-task-total"><b>${taskTotal ? `${taskDone} / ${taskTotal}` : 'S/R'}</b><span>tareas entregadas · ${taskRows.length} registro(s)</span></div><div class="profile-progress task-progress"><span style="width:${progress}%"></span></div><div class="profile-activity-chips"><span>Trabajos <b>${works}</b></span><span>Participación <b>${participation}</b></span><span>Exámenes <b>${exams}</b></span></div></article>`;
  }).join('') : '<div class="profile-empty">Tus datos de tareas aparecerán al crear una materia.</div>';

  const partialBox = document.getElementById('profilePartials');
  if (partialBox) partialBox.innerHTML = academicPartials.length ? academicPartials.map(part => {
    const grades = enrolledPairs.map(({ subject, student }) => partialGrade(student, subject.id, part)).filter(Boolean);
    const average = grades.length ? grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length : null;
    const configured = grades.reduce((sum, grade) => sum + (Number(grade.configuredWeight) || 0), 0);
    const registered = grades.reduce((sum, grade) => sum + (Number(grade.registeredWeight) || 0), 0);
    const coverage = configured ? Math.min(100, registered / configured * 100) : 0;
    return `<article class="profile-partial-card"><div class="profile-subject-heading"><h4>${esc(part.name)}</h4><span>${grades.length} calificados</span></div><b class="profile-partial-average">${average === null ? 'S/R' : `${average.toFixed(2)} / 10`}</b><div class="profile-progress"><span style="width:${coverage}%"></span></div><small>${coverage.toFixed(0)}% del peso configurado con registros</small></article>`;
  }).join('') : '<div class="profile-empty">Aún no hay parciales configurados.</div>';
  renderBackupHistory();
}

function openSubjectRoster(subjectId) {
  const subject = subjects.find(item => String(item.id) === String(subjectId));
  if (!subject) return;
  const registerTab = document.querySelector('.folder-tab[data-tab="register"]');
  if (registerTab && typeof switchTab === 'function') switchTab(registerTab);
  if (typeof selectSubject === 'function') selectSubject(subject.id);
  document.getElementById('rosterCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function importBackupFile(file) {
  try {
    const backup = JSON.parse(await file.text());
    const imported = validateBackup(backup);
    const current = readBackupData();
    const incoming = {
      ...current,
      ...imported,
      roster: imported.roster ?? [],
      subjects: imported.subjects ?? [],
      partials: imported.partials ?? [],
      bookParams: imported.bookParams ?? current.bookParams,
      examParams: imported.examParams ?? current.examParams,
      examSettings: imported.examSettings ?? current.examSettings,
      examSubjectConfigs: imported.examSubjectConfigs ?? {},
      examStudents: imported.examStudents ?? [],
      theme: imported.theme === 'dark' ? 'dark' : 'light'
    };
    const accepted = confirm(
      `Se cargarán ${incoming.roster.length} alumno(s) y ${incoming.subjects.length} materia(s). ` +
      'Esto reemplazará los datos que están guardados en este navegador. ¿Continuar?'
    );
    if (!accepted) return;

    storeBackupHistorySnapshot(current);

    // Respalda el estado previo en memoria y revierte la escritura si el navegador rechaza algún dato.
    const previous = Object.fromEntries(Object.values(BACKUP_KEYS).map(key => [key, localStorage.getItem(key)]));
    try {
      for (const [field, key] of Object.entries(BACKUP_KEYS)) {
        const value = incoming[field];
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, field === 'theme' ? value : JSON.stringify(value));
      }
    } catch (error) {
      for (const [key, value] of Object.entries(previous)) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      throw error;
    }
    toast('Datos cargados. Actualizando EvalPro…');
    window.setTimeout(() => location.reload(), 350);
  } catch (error) {
    console.error('No se pudo cargar el respaldo:', error);
    toast(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : (error.message || 'No se pudo cargar el respaldo.'));
  }
}

document.getElementById('backupFileInput')?.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (file) importBackupFile(file);
  event.target.value = '';
});
renderProfile();
window.setInterval(renderTeacherWelcome, 60 * 1000);

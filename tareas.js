// Registro grupal de tareas; cada tarea queda como una calificación individual
// dentro del parámetro configurado para la materia y el parcial seleccionados.
function renderTaskManager() {
  const subjectSelect = $('taskManagerSubject');
  const partialSelect = $('taskManagerPartial');
  const parameterSelect = $('taskManagerParameter');
  const rosterBox = $('taskManagerRoster');
  if (!subjectSelect || !partialSelect || !parameterSelect || !rosterBox) return;

  const previousSubject = subjectSelect.value;
  const subjectId = subjects.some(subject => subject.id === previousSubject)
    ? previousSubject
    : subjects.some(subject => subject.id === selectedSubjectId) ? selectedSubjectId : (subjects[0]?.id || '');
  subjectSelect.innerHTML = subjects.length
    ? subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join('')
    : '<option value="">Crea una materia primero</option>';
  subjectSelect.value = subjectId;

  const previousPartial = partialSelect.value;
  const partialId = academicPartials.some(part => part.id === previousPartial) ? previousPartial : (academicPartials[0]?.id || '');
  partialSelect.innerHTML = academicPartials.length
    ? academicPartials.map(part => `<option value="${esc(part.id)}">${esc(part.name)}</option>`).join('')
    : '<option value="">Crea un parcial primero</option>';
  partialSelect.value = partialId;

  const part = academicPartials.find(item => item.id === partialId);
  const taskParams = part && subjectId
    ? getPartParams(part, subjectId).filter(isTaskManagerParam)
    : [];
  const previousParam = parameterSelect.value;
  parameterSelect.innerHTML = taskParams.length
    ? taskParams.map(param => `<option value="${esc(param.id)}">${esc(param.name)}</option>`).join('')
    : '<option value="">Crea Tareas, Cuaderno o Trabajos</option>';
  parameterSelect.value = taskParams.some(param => param.id === previousParam) ? previousParam : (taskParams[0]?.id || '');

  const param = taskParams.find(item => item.id === parameterSelect.value);
  const weightInfo = $('taskManagerWeightInfo');
  if (!subjects.length || !academicPartials.length) {
    rosterBox.innerHTML = '<div class="empty">Primero crea una materia y al menos un parcial.</div>';
  } else if (!param) {
    rosterBox.innerHTML = '<div class="empty">Todavía no hay un parámetro disponible. Puedes crearlo aquí con “Crear parámetro” o abrir la configuración de materia y parcial.</div>';
  } else {
    const members = roster.filter(student => (subjects.find(subject => subject.id === subjectId)?.studentIds || []).includes(student.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const retained = new Map([...rosterBox.querySelectorAll('[data-task-student]')].map(row => [row.dataset.taskStudent, {
      delivered: row.querySelector('.task-complete-input')?.checked,
      note: row.querySelector('.task-observation-input')?.value
    }]));
    rosterBox.innerHTML = members.length ? `<div class="task-roster-head"><span>Alumno</span><span>Entregó esta tarea</span><span>Observaciones</span></div>${members.map(student => {
      const saved = retained.get(String(student.id));
      return `<div class="task-roster-row" data-task-student="${esc(student.id)}"><span class="task-roster-name"><span class="avatar ${selectGenderClass(student.gender)}">${avatarEmoji(student.gender)}</span><b>${esc(student.name)}</b></span><label class="task-complete-toggle"><input class="task-complete-input" type="checkbox" ${saved?.delivered ? 'checked' : ''} aria-label="${saved?.delivered ? 'Entregó' : 'No entregó'} la tarea ${esc(titleTextForTask())} ${esc(student.name)}"><span class="task-checkmark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg></span><span class="task-complete-label">Entregó</span></label><div class="field"><label class="visually-hidden" for="task-note-${esc(student.id)}">Observaciones de ${esc(student.name)}</label><input id="task-note-${esc(student.id)}" class="task-observation-input" placeholder="Observación opcional" value="${esc(saved?.note ?? '')}" aria-label="Observaciones de ${esc(student.name)}"></div></div>`;
    }).join('')}` : '<div class="empty">No hay alumnos inscritos en esta materia.</div>';
    if ($('taskManagerSummary')) $('taskManagerSummary').textContent = `${members.length} alumno(s) inscritos · ${taskBatchesFor(subjectId, partialId, param.id).length} actividades acumuladas. Cada nueva actividad cuenta como una unidad del promedio.`;
  }

  if (weightInfo) {
    weightInfo.innerHTML = param
      ? `<b>${esc(param.name)}</b> · vale ${Number(param.weight || 0).toFixed(1)}% del parcial. El promedio se calcula con las actividades agregadas; una actividad sin entregar cuenta como 0.`
      : 'Puedes usar los parámetros Tareas, Cuaderno o Trabajos.';
  }
  const historyTitle = $('taskManagerHistoryTitle');
  if (historyTitle) historyTitle.textContent = param ? `${param.name} registrados` : 'Actividades registradas';
  renderTaskManagerHistory();
  renderTaskParameterCount();
}

function isTaskManagerParam(param) {
  const name = normalizeName(param?.name || '');
  return name.includes('tarea') || name.includes('cuaderno') || name.includes('trabaj');
}

function toggleTaskParameterCreator() {
  const creator = $('taskParameterCreator');
  if (!creator) return;
  creator.hidden = !creator.hidden;
  if (!creator.hidden) creator.querySelector('select')?.focus();
}

function openTaskParameterConfig() {
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const tab = document.querySelector('.folder-tab[data-tab="book"]');
  if (tab && !tab.classList.contains('active')) switchTab(tab);
  if (subjectId && $('configSubject')) selectConfigSubject(subjectId);
  if (partialId && $('partialSelector')) selectPartial(partialId);
  $('bookConfig')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function createTaskAssessmentParam() {
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const subject = subjects.find(item => item.id === subjectId);
  const part = academicPartials.find(item => item.id === partialId);
  const name = $('taskNewCategory')?.value || 'Tareas';
  const weight = Number($('taskNewWeight')?.value);
  if (!subject || !part) return toast('Selecciona una materia y un parcial antes de crear el parámetro.');
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) return toast('El porcentaje debe estar entre 0 y 100.');
  const params = getPartParams(part, subject.id);
  if (params.some(param => normalizeName(param.name) === normalizeName(name))) {
    $('taskManagerParameter').value = params.find(param => normalizeName(param.name) === normalizeName(name))?.id || '';
    $('taskParameterCreator').hidden = true;
    renderTaskManager();
    return toast(`El parámetro ${name} ya existe para esta materia y parcial.`);
  }
  const currentTotal = params.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
  if (currentTotal + weight > 100.001) return toast(`Con ese valor la ponderación llegaría a ${(currentTotal + weight).toFixed(1)}%. Reduce otros parámetros o crea este parámetro con 0% y ajusta los pesos en configuración.`);
  const created = { id: makeId(), name, weight, max: 10 };
  params.push(created);
  part.subjectParams[subject.id] = params;
  writeStore('evalpro-partials-v1', academicPartials);
  writeStore('evalpro-book-params-v1', params);
  if (currentPartial()?.id === part.id && selectedConfigSubjectId === subject.id) {
    bookParams = params;
    renderBookParams();
  }
  $('taskParameterCreator').hidden = true;
  renderTaskManager();
  $('taskManagerParameter').value = created.id;
  renderTaskManager();
  renderRoster();
  toast(`Parámetro ${name} creado para ${subject.name} · ${part.name}.`);
}

function titleTextForTask() { return $('taskManagerTitle')?.value.trim() || 'nueva'; }

function taskBatchesFor(subjectId, partialId, categoryId) {
  const batches = new Map();
  for (const student of roster) for (const record of student.records || []) {
    if (record.subjectId !== subjectId || record.partialId !== partialId || record.categoryId !== categoryId) continue;
    const key = record.taskBatchId || `legacy:${record.title || ''}:${record.date || ''}`;
    if (!batches.has(key)) batches.set(key, { id: key, record, records: [] });
    batches.get(key).records.push({ student, record });
  }
  return [...batches.values()].sort((a, b) => (Number(a.record.taskCreatedAt) || Date.parse(a.record.date) || 0) - (Number(b.record.taskCreatedAt) || Date.parse(b.record.date) || 0) || String(a.record.title || '').localeCompare(String(b.record.title || '')));
}

function renderTaskManagerHistory() {
  const history = $('taskManagerHistory');
  if (!history) return;
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const categoryId = $('taskManagerParameter')?.value;
  const batches = taskBatchesFor(subjectId, partialId, categoryId);
  const members = roster.filter(student => (subjects.find(subject => subject.id === subjectId)?.studentIds || []).includes(student.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  history.innerHTML = members.length ? `<div class="task-history-table-wrap"><table class="task-history-table"><thead><tr><th>Alumno</th>${batches.map((batch, index) => `<th title="${esc(batch.record.date || '')}"><span class="task-history-column-head"><span>${esc(batch.record.title || 'Tarea')}</span>${index === batches.length - 1 ? `<button type="button" class="task-delete-icon task-delete-column" title="Eliminar la última actividad de todo el grupo" aria-label="Eliminar la última actividad ${esc(batch.record.title || '')} de todos los alumnos" onclick="deleteTaskBatch('${esc(batch.id)}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m3 4v5m6-5v5"/></svg></button>` : ''}</span><small>${esc(batch.record.date || '')}</small></th>`).join('')}<th>Promedio</th></tr></thead><tbody>${members.map(student => {
    const cells = batches.map(batch => {
      const entry = batch.records.find(item => item.student.id === student.id)?.record;
      return `<td class="${entry && Number(entry.tasksDelivered) > 0 ? 'task-history-done' : 'task-history-missing'}" title="${entry ? esc(entry.note || '') : 'Sin registro'}">${entry ? `${Number(entry.tasksDelivered) || 0}/${Number(entry.tasksTotal) || 1}` : 'S/R'}</td>`;
    }).join('');
    const param = academicPartials.find(part => part.id === partialId) && getPartParams(academicPartials.find(part => part.id === partialId), subjectId).find(item => item.id === categoryId);
    const grade = param ? categoryGrade(student, subjectId, academicPartials.find(part => part.id === partialId), param) : null;
    const studentHasTasks = batches.some(batch => batch.records.some(item => item.student.id === student.id));
    const rowAction = studentHasTasks ? `<button type="button" class="task-delete-icon" title="Eliminar la última actividad de ${esc(student.name)}" aria-label="Eliminar la última actividad registrada de ${esc(student.name)}" onclick="deleteLatestStudentTask('${esc(student.id)}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m3 4v5m6-5v5"/></svg></button>` : '';
    return `<tr><th scope="row"><span class="task-history-student"><b>${esc(student.name)}</b>${rowAction}</span></th>${cells}<td class="task-history-average">${grade === null ? 'S/R' : `${grade.toFixed(2)} / 10`}</td></tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty">No hay alumnos inscritos en esta materia.</div>';
}

function deleteLatestStudentTask(studentId) {
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const categoryId = $('taskManagerParameter')?.value;
  const student = roster.find(item => String(item.id) === String(studentId));
  const latestBatch = taskBatchesFor(subjectId, partialId, categoryId).at(-1);
  const entry = latestBatch?.records.find(item => String(item.student.id) === String(studentId));
  if (!student || !entry) return toast('Este alumno no tiene una actividad que se pueda quitar.');
  if (!confirm(`¿Eliminar “${entry.record.title}” del registro de ${student.name}? Las demás tareas del alumno se conservarán.`)) return;
  student.records = (student.records || []).filter(record => record.id !== entry.record.id);
  writeStore('evalpro-roster-v1', roster);
  renderTaskManager();
  renderRoster();
  toast(`Se quitó “${entry.record.title}” del registro de ${student.name}.`);
}

function deleteTaskBatch(batchId) {
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const categoryId = $('taskManagerParameter')?.value;
  const batch = taskBatchesFor(subjectId, partialId, categoryId).find(item => String(item.id) === String(batchId));
  if (!batch) return toast('No se encontró esa columna de actividad.');
  const title = batch.record.title || 'Actividad';
  if (!confirm(`¿Eliminar “${title}” de todos los alumnos de esta materia y parcial? Se borrará toda la columna y sus calificaciones.`)) return;
  const recordIds = new Set(batch.records.map(item => `${item.student.id}::${item.record.id}`));
  for (const student of roster) student.records = (student.records || []).filter(record => !recordIds.has(`${student.id}::${record.id}`));
  writeStore('evalpro-roster-v1', roster);
  renderTaskManager();
  renderRoster();
  toast(`Se eliminó “${title}” de todos los alumnos.`);
}

function renderTaskParameterCount() {
  const box = $('taskParameterCount');
  if (!box) return;
  const subjectId = $('recordSubject')?.value;
  const partialId = $('recordPartial')?.value;
  const categoryId = $('recordCategory')?.value;
  const subject = subjects.find(item => item.id === subjectId);
  const part = academicPartials.find(item => item.id === partialId);
  const param = part && subject ? getPartParams(part, subject.id).find(item => item.id === categoryId) : null;
  const isManagedParam = isTaskManagerParam(param);
  box.hidden = !isManagedParam;
  if (!isManagedParam) return;
  const batches = taskBatchesFor(subjectId, partialId, categoryId);
  const student = roster.find(item => item.id === $('recordStudent')?.value);
  const grade = student ? categoryGrade(student, subjectId, part, param) : null;
  box.innerHTML = `<strong>Configuración de ${esc(param.name)}</strong><span>${batches.length} actividad(es) registradas en <b>${esc(subject?.name || 'esta materia')}</b> · <b>${esc(part?.name || 'este parcial')}</b>. El total se determina automáticamente al agregarlas.</span>${student ? `<small>${grade === null ? 'Este alumno aún no tiene actividades registradas.' : `Promedio acumulado: ${grade.toFixed(2)} / 10.`}</small>` : '<small>Selecciona un alumno para ver su promedio acumulado.</small>'}`;
}

function saveGroupTask() {
  const subjectId = $('taskManagerSubject')?.value;
  const partialId = $('taskManagerPartial')?.value;
  const subject = subjects.find(item => item.id === subjectId);
  const part = academicPartials.find(item => item.id === partialId);
  const param = subject && part ? getPartParams(part, subject.id).find(item => item.id === $('taskManagerParameter')?.value) : null;
  const title = $('taskManagerTitle')?.value.trim();
  const date = $('taskManagerDate')?.value || today();
  if (!subject || !part) return toast('Selecciona una materia y un parcial.');
  if (!param || !isTaskManagerParam(param)) return toast('Selecciona un parámetro de Tareas, Cuaderno o Trabajos.');
  if (!title) return toast('Escribe el nombre de la actividad.');
  const members = roster.filter(student => (subject.studentIds || []).includes(student.id));
  if (!members.length) return toast('Esta materia todavía no tiene alumnos inscritos.');

  const batchId = makeId();
  for (const student of members) {
    const row = $('taskManagerRoster').querySelector(`[data-task-student="${CSS.escape(String(student.id))}"]`);
    if (!row?.querySelector('.task-complete-input')) return toast(`No se encontró el estado de la tarea para ${student.name}.`);
  }

  const records = [];
  for (const student of members) {
    const row = $('taskManagerRoster').querySelector(`[data-task-student="${CSS.escape(String(student.id))}"]`);
    const delivered = row.querySelector('.task-complete-input').checked ? 1 : 0;
    const total = 1;
    const note = row.querySelector('.task-observation-input').value.trim();
    student.records = student.records || [];
    student.records.push({
      id: makeId(), taskBatchId: batchId, taskCreatedAt: Date.now(), partialId: part.id, subjectId: subject.id,
      subjectName: subject.name, categoryId: param.id, categoryName: param.name,
      title, date, score: delivered / total * 10, max: 10,
      tasksDelivered: delivered, tasksTotal: total, note
    });
    records.push(student.records[student.records.length - 1]);
  }
  writeStore('evalpro-roster-v1', roster);
  $('taskManagerTitle').value = '';
  renderTaskManager();
  renderRoster();
  toast(`“${title}” guardada para ${records.length} alumnos. El promedio del parámetro se actualizó.`);
}

document.addEventListener('DOMContentLoaded', () => {
  const date = $('taskManagerDate');
  if (date && !date.value) date.value = today();
  renderTaskManager();
});

// Integra el examen y las actividades del cuaderno en una sola ponderación por materia y parcial.
var examConfigPartialId = '';
function renderNewStudentSubjectOptions() {
  const select = $('newStudentSubject');
  if (!select) return;
  const previous = select.value;
  select.innerHTML = subjects.length
    ? '<option value="">Selecciona una materia</option>' + subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join('')
    : '<option value="">Crea una materia primero en Cuaderno</option>';
  if (subjects.some(subject => subject.id === previous)) select.value = previous;
  else if (subjects.some(subject => subject.id === selectedSubjectId)) select.value = selectedSubjectId;
}

function registerStudentToSubject() {
  const name = $('newStudentName').value.trim();
  const subject = subjects.find(item => item.id === $('newStudentSubject').value);
  const feedback = $('newStudentFeedback');
  if (!name) { if (feedback) feedback.textContent = 'Escribe el nombre completo del alumno.'; toast('Escribe el nombre del alumno.'); $('newStudentName').focus(); return; }
  if (!subject) { if (feedback) feedback.textContent = 'Selecciona una materia para asignar al alumno.'; toast('Selecciona una materia.'); $('newStudentSubject').focus(); return; }

  const existing = roster.find(student => normalizeName(student.name) === normalizeName(name));
  const pupil = getOrCreateStudent(name, registrationGender);
  const alreadyEnrolled = (subject.studentIds || []).includes(pupil.id);
  if (!alreadyEnrolled) {
    subject.studentIds = [...(subject.studentIds || []), pupil.id];
    writeStore('evalpro-subjects-v1', subjects);
  }
  writeStore('evalpro-roster-v1', roster);
  renderSubjects();
  renderNewStudentSubjectOptions();
  $('newStudentSubject').value = subject.id;
  renderRoster();
  renderStudentOptions();
  renderExamStudentControls();
  $('newStudentName').value = '';
  registrationGender = 'neutral';
  const avatar = $('newStudentAvatar');
  if (avatar) { avatar.className = 'avatar avatar-picker avatar-neutral'; avatar.textContent = avatarEmoji(registrationGender); }
  const message = alreadyEnrolled
    ? `${pupil.name} ya estaba inscrito en ${subject.name}.`
    : `${existing ? 'Alumno existente agregado' : 'Alumno registrado'}: ${pupil.name} · ${subject.name}.`;
  if (feedback) feedback.textContent = message;
  toast(message);
}

function examConfigKey(subjectId = examConfigSubjectId, partialId = examConfigPartialId) {
  return subjectId && partialId ? `${subjectId}::${partialId}` : '';
}

function examConfigFor(subjectId, partialId) {
  const key = examConfigKey(subjectId, partialId);
  return examConfigs[key] || examConfigs[subjectId] || null;
}

function persistExamConfigForSubject() {
  const key = examConfigKey();
  if (!key || !subjects.some(subject => subject.id === examConfigSubjectId)) return;
  const pct = Number($('pesoExamen')?.value);
  const activityParamId = examConfigs[key]?.activityParamId;
  examConfigs[key] = {
    subjectId: examConfigSubjectId,
    partialId: examConfigPartialId,
    params: params.map(param => ({ ...param })),
    pct: Number.isFinite(pct) ? pct : 30,
    ...(activityParamId ? { activityParamId } : {})
  };
  writeStore('evalpro-exam-subject-configs-v1', examConfigs);
}

function renderExamStudentControls() {
  const configSubject = $('examConfigSubject');
  const configPartial = $('examConfigPartial');
  const entrySubject = $('examSubject');
  const entryPartial = $('examPartial');
  if (!configSubject || !configPartial || !entrySubject || !entryPartial) return;

  const subjectId = subjects.some(subject => subject.id === examConfigSubjectId)
    ? examConfigSubjectId
    : (subjects.some(subject => subject.id === selectedConfigSubjectId)
      ? selectedConfigSubjectId
      : (subjects.some(subject => subject.id === selectedSubjectId) ? selectedSubjectId : subjects[0]?.id || ''));
  const partialId = academicPartials.some(part => part.id === examConfigPartialId)
    ? examConfigPartialId
    : (academicPartials.some(part => part.id === selectedPartialId) ? selectedPartialId : academicPartials[0]?.id || '');

  const subjectOptions = subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join('');
  const partialOptions = academicPartials.map(part => `<option value="${esc(part.id)}">${esc(part.name)}</option>`).join('');
  configSubject.innerHTML = subjectOptions || '<option value="">Crea una materia en Cuaderno</option>';
  entrySubject.innerHTML = subjectOptions || '<option value="">Crea una materia primero</option>';
  configPartial.innerHTML = partialOptions || '<option value="">Crea un parcial</option>';
  entryPartial.innerHTML = partialOptions || '<option value="">Crea un parcial</option>';

  if (subjectId && partialId) {
    configSubject.value = subjectId;
    entrySubject.value = subjectId;
    configPartial.value = partialId;
    entryPartial.value = partialId;
    if (examConfigSubjectId !== subjectId || examConfigPartialId !== partialId) {
      loadExamConfigForSubject(subjectId, partialId);
    }
  } else {
    examConfigSubjectId = '';
    examConfigPartialId = '';
    renderExamStudentOptions();
  }
  const existing = $('examStudentMode').value === 'existing';
  $('examNewStudentField').hidden = existing;
  $('examExistingStudentField').hidden = !existing;
}

function loadExamConfigForSubject(subjectId, partialId = examConfigPartialId || selectedPartialId) {
  const subject = subjects.find(item => item.id === subjectId);
  const part = academicPartials.find(item => item.id === partialId);
  if (!subject || !part) return;
  persistExamConfigForSubject();
  examConfigSubjectId = subjectId;
  examConfigPartialId = partialId;
  const compoundKey = examConfigKey(subjectId, partialId);
  const legacyConfig = !examConfigs[compoundKey] ? examConfigs[subjectId] : null;
  const saved = examConfigs[compoundKey] || legacyConfig;
  if (legacyConfig) {
    examConfigs[compoundKey] = { ...legacyConfig, subjectId, partialId, params: legacyConfig.params.map(param => ({ ...param })) };
    delete examConfigs[subjectId];
  }
  if (saved && Array.isArray(saved.params) && saved.params.length) {
    params = saved.params.map(param => ({ ...param }));
    $('pesoExamen').value = saved.pct ?? 30;
  } else if (legacyExamSeed && !legacyExamSeedUsed) {
    params = legacyExamSeed.params.map(param => ({ ...param }));
    $('pesoExamen').value = legacyExamSeed.pct;
    legacyExamSeedUsed = true;
  } else {
    params = defaultParams.map(param => ({ ...param }));
    $('pesoExamen').value = 30;
  }
  $('examConfigSubject').value = subjectId;
  $('examSubject').value = subjectId;
  $('examConfigPartial').value = partialId;
  $('examPartial').value = partialId;
  renderParams();
  renderExamStudentOptions();
  loadExistingExamStudent();
  persistExamConfigForSubject();
  renderAll();
  refreshBookWeightSummary();
}

function selectExamConfigSubject(subjectId) {
  if (!subjects.some(subject => subject.id === subjectId)) {
    toast('Primero crea o selecciona una materia.');
    return;
  }
  persistExamConfigForSubject();
  selectedConfigSubjectId = subjectId;
  if ($('configSubject')) $('configSubject').value = subjectId;
  bookParams = getPartParams(currentPartial(), subjectId);
  loadExamConfigForSubject(subjectId, examConfigPartialId || selectedPartialId || academicPartials[0]?.id);
  renderBookParams();
  renderRoster();
}

function selectExamConfigPartial(partialId) {
  if (!academicPartials.some(part => part.id === partialId)) return;
  persistExamConfigForSubject();
  selectedPartialId = partialId;
  bookParams = getPartParams(currentPartial(), selectedConfigSubjectId || examConfigSubjectId);
  if ($('partialSelector')) $('partialSelector').value = partialId;
  loadExamConfigForSubject(examConfigSubjectId || selectedConfigSubjectId || subjects[0]?.id, partialId);
  renderBookParams();
  renderCategoryOptions();
  renderRoster();
}

function selectPartial(partialId) {
  if (!academicPartials.some(part => part.id === partialId)) return;
  selectExamConfigPartial(partialId);
}

function selectConfigSubject(subjectId) {
  selectedConfigSubjectId = subjectId || '';
  if ($('configSubject')) $('configSubject').value = selectedConfigSubjectId;
  bookParams = getPartParams(currentPartial(), selectedConfigSubjectId || '__general__');
  renderBookParams();
  renderRecordSubjects();
  refreshRecordParameterInfo();
  if (subjects.some(subject => subject.id === selectedConfigSubjectId)) {
    selectExamConfigSubject(selectedConfigSubjectId);
  } else {
    refreshBookWeightSummary();
    renderRoster();
  }
}

function createPartial() {
  const name = $('newPartialName').value.trim();
  if (!name) return toast('Escribe el nombre del parcial.');
  if (academicPartials.some(part => normalizeName(part.name) === normalizeName(name))) return toast('Ya existe un parcial con ese nombre.');
  const subjectId = selectedConfigSubjectId || examConfigSubjectId || '__general__';
  const paramsCopy = getPartParams(currentPartial(), subjectId).map(param => ({ ...param, id: makeId() }));
  const part = { id: makeId(), name, params: paramsCopy, subjectParams: { [subjectId]: paramsCopy } };
  academicPartials.push(part);
  selectedPartialId = part.id;
  bookParams = paramsCopy;
  $('newPartialName').value = '';
  persistPartials();
  renderPartialSelectors();
  renderBookParams();
  renderCategoryOptions();
  examConfigPartialId = part.id;
  if (subjects.some(subject => subject.id === examConfigSubjectId || subject.id === selectedConfigSubjectId)) {
    loadExamConfigForSubject(examConfigSubjectId || selectedConfigSubjectId, part.id);
  } else {
    renderExamStudentControls();
  }
  renderRoster();
  toast(`${name} creado. Configura los pesos de examen y actividades hasta sumar 100%.`);
}

function getExamWeight(subjectId, partialId) {
  const configured = examParameterFor(subjectId, partialId);
  if (configured) return Number(configured.weight) || 0;
  const config = examConfigFor(subjectId, partialId);
  if (config) return Number(config.pct) || 0;
  const previousResult = students.find(result => result.subjectId === subjectId && result.partialId === partialId);
  return Number(previousResult?.examPct) || 0;
}

function isExamParameter(param) {
  const name = normalizeName(param?.name || '');
  return name === 'exam' || name === 'examen' || name.startsWith('examenes');
}

function examParameterFor(subjectId, partialId) {
  const part = academicPartials.find(item => item.id === partialId);
  const configured = getPartParams(part, subjectId);
  const config = examConfigFor(subjectId, partialId);
  let match = configured.find(param => param.id === config?.activityParamId);
  if (!match) match = configured.find(isExamParameter);
  if (match && config) config.activityParamId = match.id;
  return match || null;
}

function syncConfiguredExamParameter() {
  if (!examConfigSubjectId || !examConfigPartialId) return;
  const param = examParameterFor(examConfigSubjectId, examConfigPartialId);
  if (!param) return;
  const pct = Number($('pesoExamen')?.value);
  if (Number.isFinite(pct)) param.weight = pct;
  if (currentPartial()?.id === examConfigPartialId && (selectedConfigSubjectId || '__general__') === examConfigSubjectId) {
    const current = bookParams.find(item => item.id === param.id);
    if (current) current.weight = param.weight;
  }
  persistPartials();
}

function combinedPartialParams(part, subjectId) {
  if (!part || !subjectId || subjectId === '__general__') return getPartParams(part, subjectId || '__general__').map(param => ({ ...param, kind: 'activity' }));
  const configured = getPartParams(part, subjectId);
  const examParam = examParameterFor(subjectId, part.id);
  const examPct = getExamWeight(subjectId, part.id);
  const hasExamData = students.some(result => result.subjectId === subjectId && result.partialId === part.id);
  const exam = !examParam && (examPct > 0 || hasExamData)
    ? [{ id: '__exam__', name: 'Examen', weight: examPct, max: 10, kind: 'exam' }]
    : [];
  return [...exam, ...configured.map(param => ({ ...param, kind: param.id === examParam?.id ? 'exam' : 'activity' }))];
}

function combinedWeightTotal(part, subjectId) {
  return combinedPartialParams(part, subjectId).reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
}

function refreshBookWeightSummary() {
  const hint = $('bookWeightHint');
  if (!hint || !currentPartial()) return;
  const part = currentPartial();
  const subjectId = selectedConfigSubjectId || '__general__';
  const parameters = combinedPartialParams(part, subjectId);
  const total = parameters.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
  const exam = parameters.find(param => param.kind === 'exam');
  const activityPct = parameters.filter(param => param.kind !== 'exam').reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
  const subjectName = subjects.find(subject => subject.id === subjectId)?.name || 'General';
  const summary = `${part.name} · ${subjectName} · ${exam ? `${exam.name} ${Number(exam.weight || 0).toFixed(1)}% + ` : ''}actividades ${activityPct.toFixed(1)}% = ${total.toFixed(1)}%`;
  hint.textContent = total > 100.001
    ? `${summary} — EXCEDE EL 100%. Reduce una o más ponderaciones.`
    : Math.abs(total - 100) < 0.001 ? `${summary} — configuración completa.` : `${summary} — faltan ${(100 - total).toFixed(1)}% para llegar al 100%.`;
  hint.classList.toggle('invalid', Math.abs(total - 100) > 0.001);
  hint.classList.toggle('overweight', total > 100.001);
}

function showBookWeights() {
  const config = examConfigFor(selectedConfigSubjectId, currentPartial()?.id);
  const selected = bookParams.find(param => param.id === config?.activityParamId) || bookParams.find(isExamParameter);
  if (selected && selectedConfigSubjectId && examConfigPartialId === currentPartial()?.id && examConfigSubjectId === selectedConfigSubjectId) {
    if (config) config.activityParamId = selected.id;
    $('pesoExamen').value = selected.weight;
    persistExamConfigForSubject();
  }
  refreshBookWeightSummary();
  renderRoster();
}

function saveBookParams() {
  const part = currentPartial();
  const subjectId = selectedConfigSubjectId || '__general__';
  const activityTotal = bookParams.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
  const total = combinedWeightTotal(part, subjectId);
  if (!bookParams.length || bookParams.some(param => !param.name.trim() || Number(param.weight) < 0 || Number(param.max) <= 0)) {
    toast('Revisa los nombres, pesos y puntajes máximos de las actividades.');
    return;
  }
  if (Math.abs(total - 100) > 0.001) {
    toast(total > 100 ? `La ponderación suma ${total.toFixed(1)}% y no puede superar 100%. Reduce uno o más parámetros.` : `La ponderación suma ${total.toFixed(1)}%; faltan ${(100 - total).toFixed(1)}% para llegar a 100%.`);
    return;
  }
  part.subjectParams = part.subjectParams || {};
  part.subjectParams[subjectId] = bookParams.map(param => ({ ...param }));
  persistPartials();
  renderBookParams();
  refreshBookWeightSummary();
  renderRoster();
  if (selectedStudentId) openFile(selectedStudentId);
  toast(`Ponderaciones de ${part.name} para ${subjects.find(subject => subject.id === subjectId)?.name || 'General'} guardadas`);
}

function applyConfig() {
  const subject = subjects.find(item => item.id === examConfigSubjectId);
  const part = academicPartials.find(item => item.id === examConfigPartialId);
  const total = params.reduce((sum, param) => sum + (Number(param.weight) || 0), 0);
  const pct = Number($('pesoExamen').value);
  if (!subject || !part) return toast('Selecciona una materia y un parcial para configurar el examen.');
  if (!params.length || params.some(param => !param.name.trim() || Number(param.max) <= 0 || Number(param.weight) < 0) || Math.abs(total - 100) > 0.001) {
    return toast('Los componentes internos del examen deben tener nombre, puntaje máximo y sumar 100%.');
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast('El examen debe pesar entre 0 y 100% del parcial.');
  persistExamConfigForSubject();
  writeStore('evalpro-exam-params-v1', params);
  writeStore('evalpro-exam-settings-v1', { subjectId: subject.id, partialId: part.id, materia: subject.name, parcial: part.name, pct });
  students = students.map(result => result.subjectId === subjectId && result.partialId === part.id
    ? { ...result, examPct: pct, contribution: (Number(result.exam) || 0) * pct / 100 }
    : result);
  writeStore('evalpro-exam-students-v1', students);
  showWeights();
  renderScoreInputs(true);
  refreshBookWeightSummary();
  renderAll();
  renderRoster();
  toast(`Examen de ${subject.name} · ${part.name} guardado. Ajusta las actividades hasta completar 100%.`);
}

function loadExistingExamStudent() {
  if ($('examStudentMode').value !== 'existing') return;
  const studentId = $('existingExamStudent').value;
  const subjectId = $('examSubject').value || examConfigSubjectId;
  const partialId = $('examPartial').value || examConfigPartialId;
  const result = students.find(item => item.studentId === studentId && item.subjectId === subjectId && item.partialId === partialId);
  const previousParams = result?.paramsSnapshot || [];
  document.querySelectorAll('[data-score]').forEach((input, index) => {
    const oldIndex = previousParams.length ? previousParams.findIndex(param => normalizeName(param.name) === normalizeName(params[index].name)) : index;
    input.value = result && oldIndex >= 0 ? (result.scores?.[oldIndex] ?? '') : '';
  });
  calculateExamGrade();
  if (!result) $('gradePreview').textContent = 'Este alumno aún no tiene calificación de examen en este parcial.';
}

function addStudent() {
  const mode = $('examStudentMode').value;
  const subject = subjects.find(item => item.id === ($('examSubject').value || examConfigSubjectId));
  const part = academicPartials.find(item => item.id === ($('examPartial').value || examConfigPartialId));
  const name = mode === 'existing'
    ? (roster.find(student => student.id === $('existingExamStudent').value)?.name || '')
    : $('studentName').value.trim();
  const exam = Number($('studentWeight').value);
  if (!subject || !part) return toast('Selecciona la materia y el parcial que vas a calificar.');
  if (Math.abs(combinedWeightTotal(part, subject.id) - 100) > 0.001) {
    return toast('Antes de registrar, configura examen y actividades para que sumen 100% en este parcial.');
  }
  if (!name) return toast(mode === 'existing' ? 'Selecciona un alumno inscrito en esta materia.' : 'Ingresa el nombre del alumno.');
  if (!Number.isFinite(exam) || exam < 0 || exam > 10) return toast('Completa los puntajes del examen para calcular una nota de 0 a 10.');
  const scores = [];
  for (let index = 0; index < params.length; index++) {
    const value = Number(document.querySelector(`[data-score="${index}"]`)?.value);
    if (!Number.isFinite(value) || value < 0 || value > Number(params[index].max)) {
      return toast(`Revisa ${params[index].name}; debe estar entre 0 y ${params[index].max}.`);
    }
    scores.push(value);
  }
  const pupil = mode === 'existing' ? roster.find(student => student.id === $('existingExamStudent').value) : getOrCreateStudent(name);
  if (!pupil) return toast('No se encontró al alumno seleccionado.');
  subject.studentIds = subject.studentIds || [];
  if (!subject.studentIds.includes(pupil.id)) subject.studentIds.push(pupil.id);
  const pct = Number($('pesoExamen').value) || 0;
  const result = {
    name: pupil.name, studentId: pupil.id, subjectId: subject.id, subjectName: subject.name,
    partialId: part.id, exam, examPct: pct, contribution: exam * pct / 100,
    scores, paramsSnapshot: params.map(param => ({ ...param }))
  };
  const resultIndex = students.findIndex(item => item.studentId === pupil.id && item.subjectId === subject.id && item.partialId === part.id);
  if (resultIndex >= 0) students[resultIndex] = result;
  else students.push(result);

  pupil.records = pupil.records || [];
  const recordIndex = pupil.records.findIndex(item => item.categoryId === '__exam__' && item.subjectId === subject.id && item.partialId === part.id);
  const record = {
    id: recordIndex >= 0 ? pupil.records[recordIndex].id : makeId(), subjectId: subject.id, subjectName: subject.name,
    partialId: part.id, categoryId: '__exam__', categoryName: 'Examen', title: 'Examen parcial',
    date: today(), score: exam, max: 10, note: 'Calificación calculada con los componentes configurados para este parcial.'
  };
  if (recordIndex >= 0) pupil.records[recordIndex] = record;
  else pupil.records.push(record);
  writeStore('evalpro-exam-students-v1', students);
  writeStore('evalpro-roster-v1', roster);
  writeStore('evalpro-subjects-v1', subjects);
  persistExamConfigForSubject();
  $('studentName').value = '';
  $('studentWeight').value = '';
  document.querySelectorAll('[data-score]').forEach(input => { input.value = ''; });
  renderRoster();
  renderAll();
  toast(`${mode === 'existing' ? 'Calificación actualizada' : 'Calificación guardada'} para ${pupil.name} · ${subject.name} · ${part.name}`);
}

function examResultFor(studentId, subjectId, partialId) {
  return students.find(result => result.studentId === studentId && result.subjectId === subjectId && result.partialId === partialId)
    || students.find(result => result.studentId === studentId && result.subjectId === subjectId && !result.partialId && academicPartials[0]?.id === partialId)
    || null;
}

function migrateExamResults() {
  let resultsChanged = false;
  let rosterChanged = false;
  students.forEach(result => {
    if (!result.subjectId) {
      const match = subjects.find(subject => normalizeName(subject.name) === normalizeName(result.subjectName || ''));
      if (match) { result.subjectId = match.id; resultsChanged = true; }
    }
    if (!result.partialId && academicPartials[0]) { result.partialId = academicPartials[0].id; resultsChanged = true; }
    if (result.subjectId && result.partialId && !Number.isFinite(Number(result.examPct))) {
      const pct = Number(result.contribution) && Number(result.exam) ? Number(result.contribution) * 100 / Number(result.exam) : Number(savedExamSettings?.pct ?? 30);
      result.examPct = pct;
      resultsChanged = true;
    }
    if (result.subjectId && result.partialId && !Array.isArray(result.paramsSnapshot)) {
      const saved = examConfigFor(result.subjectId, result.partialId);
      result.paramsSnapshot = (saved?.params || params).map(param => ({ ...param }));
      resultsChanged = true;
    }
    const pupil = roster.find(student => student.id === result.studentId);
    if (!pupil || !result.subjectId || !result.partialId) return;
    pupil.records = pupil.records || [];
    let record = pupil.records.find(item => item.subjectId === result.subjectId && item.partialId === result.partialId && (item.categoryId === '__exam__' || (item.categoryId === 'examenes' && normalizeName(item.title || '') === normalizeName(result.subjectName || ''))));
    if (!record) {
      record = { id: makeId() };
      pupil.records.push(record);
      rosterChanged = true;
    }
    if (record.categoryId !== '__exam__' || record.score !== result.exam || record.max !== 10 || record.subjectName !== result.subjectName) rosterChanged = true;
    Object.assign(record, { subjectId: result.subjectId, subjectName: result.subjectName, partialId: result.partialId, categoryId: '__exam__', categoryName: 'Examen', title: 'Examen parcial', score: Number(result.exam), max: 10 });
  });
  if (resultsChanged) writeStore('evalpro-exam-students-v1', students);
  if (rosterChanged) writeStore('evalpro-roster-v1', roster);
}

function categoryGrade(pupil, subjectId, part, param) {
  if (param.kind === 'exam' || param.id === '__exam__') {
    const result = examResultFor(pupil.id, subjectId, part?.id);
    return result ? Number(result.exam) : null;
  }
  const records = (pupil.records || []).filter(record => record.partialId === part?.id
    && record.categoryId === param.id
    && (record.subjectId === subjectId || (!record.subjectId && subjectId === '__general__'))
    && Number(record.max) > 0);
  return records.length
    ? records.reduce((sum, record) => sum + (Number(record.score) / Number(record.max)) * 10, 0) / records.length
    : null;
}

function rosterGradeStatus(grade) {
  if (!Number.isFinite(grade)) return '';
  if (grade >= 9.995) return 'grade-status-perfect';
  if (grade >= 7.5) return 'grade-status-good';
  if (grade >= 5) return 'grade-status-warning';
  return 'grade-status-low';
}

function renderRecordStudentSuggestions(query = $('recordStudentSearch')?.value || '') {
  const box = $('recordStudentSearchResults');
  const select = $('recordStudent');
  if (!box || !select) return;
  const normalized = normalizeName(query.trim());
  if (!normalized) { box.hidden = true; box.innerHTML = ''; return; }
  const matches = [...select.options].filter(option => option.value && normalizeName(option.textContent).includes(normalized)).slice(0, 8);
  box.hidden = false;
  box.innerHTML = matches.length
    ? matches.map(option => {
      const pupil = roster.find(student => student.id === option.value);
      return `<button type="button" class="record-student-suggestion" onclick="selectRecordStudent('${esc(option.value)}')"><span class="avatar ${selectGenderClass(pupil?.gender)}">${avatarEmoji(pupil?.gender)}</span><span>${esc(option.textContent)}</span></button>`;
    }).join('')
    : '<div class="record-student-no-match">No hay alumnos que coincidan con la búsqueda.</div>';
}

function selectRecordStudent(studentId) {
  const select = $('recordStudent');
  const option = [...select.options].find(item => item.value === studentId);
  if (!option) return;
  select.value = studentId;
  $('recordStudentSearch').value = option.textContent;
  $('recordStudentSearchResults').hidden = true;
  refreshRecordSubjects();
  if (typeof renderTaskParameterCount === 'function') renderTaskParameterCount();
}

function syncRecordStudentSearch(studentId) {
  const select = $('recordStudent');
  const option = [...(select?.options || [])].find(item => item.value === studentId);
  if (option && $('recordStudentSearch')) $('recordStudentSearch').value = option.textContent;
  if ($('recordStudentSearchResults')) $('recordStudentSearchResults').hidden = true;
}

function printRoster() {
  const card = $('rosterCard');
  if (!card || !card.querySelector('.grades-roster-table')) {
    toast('No hay una tabla de alumnos para imprimir.');
    return;
  }
  document.body.classList.add('printing-roster');
  const clean = () => {
    document.body.classList.remove('printing-roster');
    window.removeEventListener('afterprint', clean);
  };
  window.addEventListener('afterprint', clean, { once: true });
  window.print();
  setTimeout(clean, 1500);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function encodeStudentSnapshot(snapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  if ('CompressionStream' in window) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return `z${bytesToBase64Url(compressed)}`;
  }
  return `j${bytesToBase64Url(bytes)}`;
}

function buildStudentSnapshot(pupil) {
  const memberships = subjects.filter(subject => (subject.studentIds || []).includes(pupil.id));
  const subjectSnapshots = memberships.map(subject => ({
    name: subject.name,
    finalGrade: subjectFinalGrade(pupil, subject),
    partials: academicPartials.map(part => {
      const params = combinedPartialParams(part, subject.id).map(param => {
        const grade = categoryGrade(pupil, subject.id, part, param);
        return { name: param.name, weight: Number(param.weight) || 0, grade };
      });
      const grade = partialGrade(pupil, subject.id, part);
      const records = (pupil.records || [])
        .filter(record => !record.taskRemoved && record.subjectId === subject.id && record.partialId === part.id)
        .map(record => {
          const param = combinedPartialParams(part, subject.id).find(item => item.id === record.categoryId);
          const maximum = Number(record.max) || Number(param?.weight) || 10;
          const numeric = Number(record.score);
          const normalizedGrade = Number.isFinite(numeric) && maximum > 0 ? numeric / maximum * 10 : null;
          return {
            title: record.title || param?.name || record.categoryName || 'Actividad',
            parameter: param?.name || record.categoryName || 'Evaluación',
            date: record.date || '',
            grade: normalizedGrade,
            tasks: record.tasksTotal == null ? '' : `${Number(record.tasksDelivered) || 0}/${Number(record.tasksTotal) || 0}`
          };
        });
      return { name: part.name, grade: grade?.grade ?? null, params, records };
    })
  }));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    student: { name: pupil.name },
    average: studentAverage(pupil),
    subjects: subjectSnapshots
  };
}

async function generateStudentQR() {
  const pupil = roster.find(student => student.id === selectedStudentId);
  const dialog = $('studentQrDialog');
  const qrBox = $('studentQrCode');
  const link = $('studentQrLink');
  if (!pupil || !dialog || !qrBox || !link) return;
  if (!window.QRCode) {
    toast('No se pudo cargar el generador QR. Revisa tu conexión e inténtalo de nuevo.');
    return;
  }
  try {
    const snapshot = buildStudentSnapshot(pupil);
    const token = await encodeStudentSnapshot(snapshot);
    const shareUrl = new URL('expediente-publico.html', window.location.href);
    shareUrl.hash = `evalpro=${token}`;
    qrBox.replaceChildren();
    link.value = shareUrl.href;
    $('studentQrTitle').textContent = `Expediente · ${pupil.name}`;
    $('studentQrDescription').textContent = `Vista informativa creada el ${new Date(snapshot.generatedAt).toLocaleDateString('es-MX')}.`;
    new QRCode(qrBox, { text: shareUrl.href, width: 280, height: 280, correctLevel: QRCode.CorrectLevel.L });
    if (!dialog.open) dialog.showModal();
  } catch (error) {
    console.error('No se pudo generar el QR del expediente:', error);
    toast('No se pudo generar este QR. El expediente puede contener demasiados datos.');
  }
}

function closeStudentQR() {
  $('studentQrDialog')?.close();
}

async function copyStudentQRLink() {
  const link = $('studentQrLink');
  if (!link?.value) return;
  try {
    await navigator.clipboard.writeText(link.value);
    toast('Enlace del expediente copiado.');
  } catch {
    link.focus();
    link.select();
    document.execCommand('copy');
    toast('Enlace del expediente copiado.');
  }
}

function downloadStudentQR() {
  const qr = $('studentQrCode');
  const image = qr?.querySelector('img');
  const canvas = qr?.querySelector('canvas');
  const dataUrl = image?.src || canvas?.toDataURL('image/png');
  if (!dataUrl) return toast('Primero genera el QR del expediente.');
  const name = roster.find(student => student.id === selectedStudentId)?.name || 'alumno';
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `QR-expediente-${name.trim().replace(/[^\p{L}\p{N}-]+/gu, '-')}.png`;
  anchor.click();
}

function partialGrade(pupil, subjectId, part) {
  const parameters = combinedPartialParams(part, subjectId);
  const graded = parameters.map(param => ({ param, grade: categoryGrade(pupil, subjectId, part, param) }))
    .filter(item => item.grade !== null && Number(item.param.weight) > 0);
  const registeredWeight = graded.reduce((sum, item) => sum + Number(item.param.weight), 0);
  return registeredWeight
    ? { grade: graded.reduce((sum, item) => sum + item.grade * Number(item.param.weight), 0) / registeredWeight, registeredWeight, configuredWeight: parameters.reduce((sum, param) => sum + Number(param.weight || 0), 0) }
    : null;
}

function subjectFinalGrade(pupil, subject) {
  const grades = academicPartials.map(part => partialGrade(pupil, subject.id, part)?.grade).filter(Number.isFinite);
  return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}

function studentAverage(pupil) {
  const joined = subjects.filter(subject => (subject.studentIds || []).includes(pupil.id));
  const groups = joined.length ? joined : [{ id: '__general__' }];
  const grades = groups.flatMap(subject => academicPartials.map(part => partialGrade(pupil, subject.id, part)?.grade).filter(Number.isFinite));
  return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}

function removeStudentById(studentId, subjectId, partialId = examConfigPartialId) {
  const index = students.findIndex(result => result.studentId === studentId && result.subjectId === subjectId && result.partialId === partialId);
  if (index < 0) return;
  students.splice(index, 1);
  const pupil = roster.find(student => student.id === studentId);
  if (pupil) pupil.records = (pupil.records || []).filter(record => !(record.categoryId === '__exam__' && record.subjectId === subjectId && record.partialId === partialId));
  writeStore('evalpro-exam-students-v1', students);
  writeStore('evalpro-roster-v1', roster);
  renderAll();
  renderRoster();
}

function renderAll() {
  const subject = subjects.find(item => item.id === examConfigSubjectId);
  const part = academicPartials.find(item => item.id === examConfigPartialId);
  const visible = students.filter(result => subject && part && result.subjectId === subject.id && result.partialId === part.id);
  const dashboard = $('dashboard');
  dashboard.hidden = !visible.length;
  if (!visible.length) {
    if (barChart) { barChart.destroy(); barChart = null; }
    if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
    return;
  }
  const average = visible.reduce((sum, result) => sum + Number(result.exam || 0), 0) / visible.length;
  const highest = Math.max(...visible.map(result => Number(result.exam) || 0));
  const passed = visible.filter(result => Number(result.exam) >= 6).length;
  const pct = Number(visible[0].examPct ?? getExamWeight(subject.id, part.id)) || 0;
  $('stats').innerHTML = `<div class="stat"><strong>${average.toFixed(2)}</strong><span>Promedio del examen /10</span></div><div class="stat"><strong>${highest.toFixed(2)}</strong><span>Calificación más alta</span></div><div class="stat"><strong>${passed}/${visible.length}</strong><span>Aprobados (≥6)</span></div><div class="stat"><strong>${(average * pct / 100).toFixed(2)} / ${(pct / 10).toFixed(2)}</strong><span>Aporte al parcial (${pct.toFixed(1)}%)</span></div>`;
  $('rows').innerHTML = visible.map((result, index) => {
    const components = result.paramsSnapshot || params;
    return `<tr><td>${index + 1}</td><td><b>${esc(result.name)}</b></td><td>${esc(subject.name)}</td><td>${esc(part.name)}</td><td><span class="badge">${Number(result.exam).toFixed(2)} / 10</span></td><td><b>${Number(result.contribution).toFixed(2)} / ${(Number(result.examPct) / 10).toFixed(2)}</b></td><td>${components.map((param, i) => `${esc(param.name)}: ${result.scores?.[i] ?? 'S/R'}/${param.max}`).join(' · ')}</td><td class="no-print"><button class="btn btn-danger" onclick="removeStudentById('${esc(result.studentId)}','${esc(result.subjectId)}','${esc(result.partialId)}')">Quitar de tabla</button></td></tr>`;
  }).join('');
  if (!window.Chart) return;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim();
  const primary = css.getPropertyValue('--primary').trim();
  if (barChart) barChart.destroy();
  barChart = new Chart($('barChart'), { type: 'bar', data: { labels: visible.map(result => result.name), datasets: [{ data: visible.map(result => result.exam), backgroundColor: primary, borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 10, ticks: { color: ink } }, x: { ticks: { color: ink } } } } });
  if (doughnutChart) doughnutChart.destroy();
  const averages = params.map((param, index) => visible.reduce((sum, result) => sum + (Number(result.scores?.[index]) / Number(param.max) * 100 || 0), 0) / visible.length);
  doughnutChart = new Chart($('doughnutChart'), { type: 'doughnut', data: { labels: params.map(param => param.name), datasets: [{ data: averages, backgroundColor: ['#7598b8', '#91ad9f', '#d1a47d', '#a8bfd4', '#c4d4e2', '#b8c3d1'], borderColor: css.getPropertyValue('--surface').trim(), borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: ink } } } } });
}

function rosterViewPart() {
  if (rosterGradeView === 'overall') return null;
  if (rosterGradeView === 'final') return academicPartials.find(part => normalizeName(part.name) === 'final') || academicPartials[3] || null;
  const index = { p1: 0, p2: 1, p3: 2 }[rosterGradeView] ?? 0;
  return academicPartials[index] || null;
}

function rosterActionButton(action, pupil) {
  const controls = {
    open: { label: `Abrir expediente de ${pupil.name}`, handler: 'openFile', icon: '<path d="M3.5 7.5h6l1.8 1.8h9.2v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M3.5 9.3h17"/><circle cx="12" cy="13.2" r="1.6"/><path d="M8.9 17a3.3 3.3 0 0 1 6.2 0"/>' },
    edit: { label: `Editar nombre de ${pupil.name}`, handler: 'editStudentName', icon: '<path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/><path d="m13.5 5.5 5 5L11 18l-5 1 1-5z"/><path d="m16.8 7.2 2-2a1.4 1.4 0 0 1 2 2l-2 2"/>' },
    delete: { label: `Borrar alumno ${pupil.name}`, handler: 'removeRosterStudent', icon: '<path d="M4 7h16"/><path d="M10 11v6m4-6v6"/><path d="m6 7 1 13h10l1-13M9 7V4h6v3"/><path d="M3 7h18"/>' },
    'remove-subject': { label: 'Quitar de materia', handler: 'removeFromSubject', icon: '<path d="M3.5 7.5h6l1.8 1.8h9.2v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M3.5 9.3h17"/><path d="M15 12l-5 5m0-5 5 5"/>' }
  }[action];
  return `<button type="button" class="roster-action-icon roster-action-${action}" onclick="${controls.handler}('${esc(pupil.id)}')" title="${esc(controls.label)}" aria-label="${esc(controls.label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${controls.icon}</svg></button>`;
}

function renderRosterSearchResults() {
  const box = $('rosterStudentResults');
  if (!box) return;
  const query = normalizeName($('rosterStudentSearch')?.value || '');
  if (!query) {
    box.innerHTML = '<div class="empty roster-search-empty">Escribe un nombre para localizar a un alumno guardado.</div>';
    return;
  }
  const subject = subjects.find(item => item.id === selectedSubjectId);
  const matches = roster.filter(pupil => normalizeName(pupil.name).includes(query)).slice(0, 12);
  if (!matches.length) {
    box.innerHTML = '<div class="empty roster-search-empty">No hay alumnos registrados con ese nombre.</div>';
    return;
  }
  box.innerHTML = matches.map(pupil => {
    const isMember = !!subject && (subject.studentIds || []).includes(pupil.id);
    const status = isMember ? `<span class="roster-lookup-status is-enrolled">Inscrito en ${esc(subject.name)}</span>`
      : subject ? `<span class="roster-lookup-status is-available">Disponible para agregar</span>`
        : '<span class="roster-lookup-status">Selecciona una materia para agregar</span>';
    const add = subject && !isMember
      ? `<button type="button" class="btn btn-green btn-sm" onclick="addExistingStudentToSubject('${esc(pupil.id)}')"><span aria-hidden="true">＋</span> Agregar a materia</button>`
      : '';
    return `<article class="roster-lookup-result"><span class="avatar ${selectGenderClass(pupil.gender)}">${avatarEmoji(pupil.gender)}</span><div class="roster-lookup-person"><b>${esc(pupil.name)}</b>${status}</div><div class="roster-lookup-actions"><button type="button" class="btn btn-sm roster-open-file" onclick="openFile('${esc(pupil.id)}')">Abrir expediente</button>${add}</div></article>`;
  }).join('');
}

function addExistingStudentToSubject(studentId) {
  const subject = subjects.find(item => item.id === selectedSubjectId);
  const pupil = roster.find(item => item.id === studentId);
  if (!subject) return toast('Selecciona la materia activa a la que quieres agregar al alumno.');
  if (!pupil) return toast('No se encontró ese alumno en el registro.');
  subject.studentIds = subject.studentIds || [];
  if (subject.studentIds.includes(pupil.id)) return toast(`${pupil.name} ya pertenece a ${subject.name}.`);
  subject.studentIds.push(pupil.id);
  writeStore('evalpro-subjects-v1', subjects);
  renderSubjects();
  renderSubjectMemberOptions();
  renderRoster();
  toast(`${pupil.name} agregado a ${subject.name}.`);
}

function renderRoster() {
  const list = $('rosterList');
  if (!list) return;
  const select = $('rosterGradeView');
  if (select) { select.value = rosterGradeView || select.value || 'p1'; rosterGradeView = select.value || 'p1'; }
  const part = rosterViewPart();
  const groups = selectedSubjectId
    ? subjects.filter(subject => String(subject.id) === String(selectedSubjectId))
    : subjects;
  const tables = groups.map(subject => {
    const enrolledIds = new Set((subject.studentIds || []).map(String));
    const enrolledPupils = roster.filter(pupil => enrolledIds.has(String(pupil.id)));
    const pupils = typeof sortRosterTable === 'function'
      ? sortRosterTable(enrolledPupils)
      : enrolledPupils.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!pupils.length) return '';
    const parameters = part ? combinedPartialParams(part, subject.id) : [];
    const weightTotal = part ? parameters.reduce((sum, param) => sum + Number(param.weight || 0), 0) : 0;
    const headers = part ? parameters.map(param => `<th>${esc(param.name)}<small class="grade-weight">${Number(param.weight || 0).toFixed(1)}%</small></th>`).join('') : '';
    const rows = pupils.map(pupil => {
      const details = part ? partialGrade(pupil, subject.id, part) : null;
      const cells = part ? parameters.map(param => {
        const grade = categoryGrade(pupil, subject.id, part, param);
        const contribution = grade === null ? null : Number(param.weight || 0) * grade / 10;
        const status = grade === null ? 'no-record' : `grade-cell ${rosterGradeStatus(grade)}`;
        const title = grade === null ? '' : ` title="Aporte ponderado a la calificación del parcial: ${contribution.toFixed(2)} de 10" data-contribution="${contribution.toFixed(2)}"`;
        return `<td class="${status}"${title}>${grade === null ? 'S/R' : `${grade.toFixed(2)} / 10<small class="grade-performance">${contribution.toFixed(2)} / 10</small>`}</td>`;
      }).join('') : '';
      const finalGrade = part ? details?.grade ?? null : subjectFinalGrade(pupil, subject);
      const coverage = part ? `${(details?.registeredWeight || 0).toFixed(1)}% / ${weightTotal.toFixed(1)}% registrado` : 'Promedio de parciales disponibles';
      return `<tr><td><b>${esc(pupil.name)}</b></td><td><button type="button" class="avatar avatar-click ${selectGenderClass(pupil.gender)}" onclick="updateGender('${esc(pupil.id)}')" aria-label="Avatar de ${esc(pupil.name)}">${avatarEmoji(pupil.gender)}</button></td>${cells}<td class="${finalGrade === null ? 'no-record' : ''}">${finalGrade === null ? 'S/R' : `${finalGrade.toFixed(2)} / 10`}<small class="grade-coverage">${coverage}</small></td><td class="roster-expediente-cell">${rosterActionButton('open', pupil)}</td><td class="roster-actions">${selectedSubjectId ? rosterActionButton('remove-subject', pupil) : ''}${rosterActionButton('edit', pupil)}${rosterActionButton('delete', pupil)}</td></tr>`;
    }).join('');
    const weightLabel = part ? `Ponderación del parcial: ${parameters.map(param => `${param.name} ${Number(param.weight || 0)}%`).join(' + ') || 'Sin parámetros'} = ${weightTotal.toFixed(1)}%` : 'Calificación final del curso';
    return `<section class="subject-grade-group"><h4>${esc(subject.name)} · ${part ? esc(part.name) : 'Calificación final'}</h4><p class="param-hint">${weightLabel}</p><div class="table-wrap roster-table"><table class="grades-roster-table"><thead><tr><th>Alumno</th><th>Avatar</th>${headers}<th>${part ? 'Calificación del parcial' : 'Calificación final'}</th><th>Expediente</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }).filter(Boolean).join('');
  const generalPupils = groups.length ? [] : roster;
  const general = generalPupils.length
    ? `<section class="subject-grade-group"><h4>General</h4><p class="empty">Asigna alumnos a una materia para mostrar sus parámetros y calificaciones por parcial.</p></section>`
    : '';
  list.innerHTML = tables || general || `<div class="empty">${roster.length ? 'No hay alumnos inscritos en esta materia que coincidan con los filtros.' : 'Todavía no hay alumnos registrados.'}</div>`;
  renderStudentOptions();
  renderSubjectMemberOptions();
  renderExamStudentControls();
  renderRosterSearchResults();
  updateFilterSummary();
  if (typeof renderProfile === 'function') renderProfile();
  if (typeof renderTaskManager === 'function') renderTaskManager();
}

function renderFileEvaluations(pupil, memberships) {
  const target = $('fileEvaluation');
  if (!target) return;
  if (!memberships.length) {
    target.innerHTML = '<div class="empty">Este alumno no está inscrito en una materia. Asígnalo a una para ver sus parámetros y calificaciones.</div>';
    return;
  }
  target.innerHTML = memberships.map(subject => {
    const partials = academicPartials.map(part => {
      const parameters = combinedPartialParams(part, subject.id);
      const details = partialGrade(pupil, subject.id, part);
      const rows = parameters.map(param => {
        const grade = categoryGrade(pupil, subject.id, part, param);
        const isExam = param.kind === 'exam' || param.id === '__exam__';
        const records = isExam
          ? (pupil.records || []).filter(record => record.subjectId === subject.id && record.partialId === part.id && record.categoryId === '__exam__')
          : (pupil.records || []).filter(record => !record.taskRemoved && record.subjectId === subject.id && record.partialId === part.id && record.categoryId === param.id);
        const latest = [...records].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
        const value = grade === null ? '<span class="file-evaluation-sr">S/R</span>' : `<span class="file-evaluation-grade">${grade.toFixed(2)} / 10</span>`;
        const icon = kind => kind === 'edit'
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5 4 4M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/></svg>'
          : kind === 'add'
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h8l4 4V20H5V3.5h2Z"/><path d="M14 3.5V8h5M8.5 14l2.2 2.2 4.8-5"/></svg>';
        const editButton = isExam
          ? `<button type="button" class="btn btn-sm btn-file-evaluation file-action-${grade === null ? 'register' : 'edit'}" aria-label="${grade === null ? 'Registrar examen' : 'Editar examen'} de ${esc(param.name)}" title="${grade === null ? 'Registrar examen' : 'Editar examen'}" onclick="openParameterEvaluation('${esc(pupil.id)}','${esc(subject.id)}','${esc(part.id)}','${esc(param.id)}')">${icon(grade === null ? 'register' : 'edit')}</button>`
          : latest
            ? `<div class="file-evaluation-actions"><button type="button" class="btn btn-sm btn-file-evaluation file-action-edit" aria-label="Editar registro de ${esc(param.name)}" title="Editar registro" onclick="openParameterEvaluation('${esc(pupil.id)}','${esc(subject.id)}','${esc(part.id)}','${esc(param.id)}','${esc(latest.id)}')">${icon('edit')}</button><button type="button" class="btn btn-sm btn-file-evaluation-secondary file-action-add" aria-label="Agregar otra calificación de ${esc(param.name)}" title="Agregar calificación" onclick="openParameterEvaluation('${esc(pupil.id)}','${esc(subject.id)}','${esc(part.id)}','${esc(param.id)}')">${icon('add')}</button></div>`
            : `<button type="button" class="btn btn-sm btn-file-evaluation file-action-register" aria-label="Registrar calificación de ${esc(param.name)}" title="Registrar calificación" onclick="openParameterEvaluation('${esc(pupil.id)}','${esc(subject.id)}','${esc(part.id)}','${esc(param.id)}')">${icon('register')}</button>`;
        return `<article class="file-evaluation-row"><div class="file-evaluation-param">${categorySvg(param.id, param.name)}<span><b>${esc(param.name)}</b><small>Ponderación: ${Number(param.weight || 0).toFixed(1)}%${records.length ? ` · ${records.length} registro(s)` : ''}</small></span></div><div class="file-evaluation-value">${value}</div><div class="file-evaluation-action no-print">${editButton}</div></article>`;
      }).join('');
      const registeredCount = parameters.filter(param => categoryGrade(pupil, subject.id, part, param) !== null).length;
      return `<section class="file-evaluation-partial"><header><h5>${esc(part.name)}</h5><span>${details ? `${details.grade.toFixed(2)} / 10` : 'S/R'} · ${registeredCount}/${parameters.length} parámetros con registro</span></header><div class="file-evaluation-rows">${rows || '<p class="empty">Este parcial aún no tiene parámetros configurados.</p>'}</div></section>`;
    }).join('');
    return `<section class="file-evaluation-subject"><h4>${esc(subject.name)}</h4>${partials}</section>`;
  }).join('');
}

function switchStudentFileTab(tab) {
  const showGrades = tab === 'grades';
  const overview = $('filePanelOverview');
  const grades = $('filePanelGrades');
  const overviewButton = $('fileTabOverview');
  const gradesButton = $('fileTabGrades');
  if (!overview || !grades || !overviewButton || !gradesButton) return;
  overview.hidden = showGrades;
  grades.hidden = !showGrades;
  overviewButton.classList.toggle('active', !showGrades);
  gradesButton.classList.toggle('active', showGrades);
  overviewButton.setAttribute('aria-selected', String(!showGrades));
  gradesButton.setAttribute('aria-selected', String(showGrades));
}

function openParameterEvaluation(studentId, subjectId, partialId, paramId, recordId = '') {
  const subject = subjects.find(item => item.id === subjectId);
  const part = academicPartials.find(item => item.id === partialId);
  const pupil = roster.find(item => item.id === studentId);
  const param = subject && part ? combinedPartialParams(part, subject.id).find(item => item.id === paramId) : null;
  if (!subject || !part || !pupil || !param) return toast('No se encontró la materia, parcial o parámetro seleccionado.');
  if (param.kind === 'exam' || param.id === '__exam__') {
    const examTab = document.querySelector('.folder-tab[data-tab="exam"]');
    if (examTab && !examTab.classList.contains('active')) switchTab(examTab);
    $('examStudentMode').value = 'existing';
    setExamStudentMode('existing');
    selectExamConfigSubject(subject.id);
    selectExamConfigPartial(part.id);
    $('examSubject').value = subject.id;
    $('examPartial').value = part.id;
    renderExamStudentOptions();
    $('existingExamStudent').value = studentId;
    loadExistingExamStudent();
    requestAnimationFrame(() => document.querySelector('.student-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return;
  }

  if (recordId) return editRecord(studentId, recordId);
  const activityTab = document.querySelector('.folder-tab[data-tab="activity"]');
  if (activityTab && !activityTab.classList.contains('active')) switchTab(activityTab);
  selectedStudentId = studentId;
  selectedPartialId = part.id;
  renderPartialSelectors();
  const studentSelect = $('recordStudent');
  if (![...studentSelect.options].some(option => option.value === studentId)) studentSelect.add(new Option(pupil.name, studentId));
  studentSelect.value = studentId;
  syncRecordStudentSearch(studentId);
  renderRecordSubjects(subject.id);
  selectRecordPartial(part.id);
  $('recordCategory').value = param.id;
  clearRecordForm();
  $('recordTitle').value = `${param.name} · ${part.name}`;
  updateCategoryIcon();
  syncTaskEntry();
  refreshRecordParameterInfo();
  requestAnimationFrame(() => document.querySelector('.activity-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function openFile(id) {
  const pupil = roster.find(student => student.id === id);
  if (!pupil) return;
  const recordsTab = document.querySelector('.folder-tab[data-tab="records"]');
  if (recordsTab && !recordsTab.classList.contains('active')) switchTab(recordsTab);
  selectedStudentId = id;
  $('studentFile').hidden = false;
  switchStudentFileTab('overview');
  expandCollapsibleTarget($('studentFile'));
  $('fileAvatar').className = `avatar avatar-large ${selectGenderClass(pupil.gender)}`;
  $('fileAvatar').textContent = avatarEmoji(pupil.gender);
  $('fileName').textContent = `Expediente · ${pupil.name}`;
  const memberships = subjects.filter(subject => (subject.studentIds || []).includes(id));
  const average = studentAverage(pupil);
  $('fileSummary').textContent = `${(pupil.records || []).length} registros · Promedio general: ${average === null ? 'Sin calificaciones' : `${average.toFixed(2)} / 10`}`;
  $('fileStats').innerHTML = memberships.flatMap(subject => academicPartials.map(part => {
    const details = partialGrade(pupil, subject.id, part);
    const weights = combinedPartialParams(part, subject.id).reduce((sum, param) => sum + Number(param.weight || 0), 0);
    return `<div class="stat partial-stat"><strong>${details ? details.grade.toFixed(2) : 'S/R'}</strong><span>${esc(subject.name)} · ${esc(part.name)} · ${details ? `${details.registeredWeight.toFixed(1)}% de ${weights.toFixed(1)}% evaluado` : 'Sin registros'}</span></div>`;
  })).join('');
  renderFileEvaluations(pupil, memberships);
  const historyGroups = memberships.map(subject => {
    const records = (pupil.records || []).filter(record => !record.taskRemoved && record.subjectId === subject.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (!records.length) return '';
    const entries = records.map(record => {
      const part = academicPartials.find(item => item.id === record.partialId);
      const isExam = record.categoryId === '__exam__';
      const param = isExam ? (part && combinedPartialParams(part, subject.id).find(item => item.kind === 'exam') || { name: 'Examen' }) : part && getPartParams(part, subject.id).find(item => item.id === record.categoryId);
      const icon = categorySvg(record.categoryId, param?.name || record.categoryName || '');
      const scoreText = record.scoreUnit === 'partial-percent' ? `${Number(record.score).toFixed(2)}% del parcial` : `${Number(record.score).toFixed(2)} / ${Number(record.max).toFixed(2)}`;
      const actions = isExam ? '' : `<div class="record-actions no-print"><button class="btn btn-sm" onclick="editRecord('${esc(pupil.id)}','${esc(record.id)}')">Editar</button><button class="btn btn-danger btn-sm" onclick="deleteRecord('${esc(pupil.id)}','${esc(record.id)}')">Quitar</button></div>`;
      return `<article class="record-item"><div class="record-main"><span class="record-type">${icon}${esc(subject.name)} · ${esc(param?.name || record.categoryName || 'Registro')} · ${esc(part?.name || 'Sin parcial')}</span><b>${esc(record.title)}</b><small>${esc(record.date || 'Sin fecha')}${record.tasksTotal != null ? ` · Tareas: ${record.tasksDelivered}/${record.tasksTotal}` : ''}${record.note ? ` · ${esc(record.note)}` : ''}</small></div><strong class="record-score">${scoreText}</strong>${actions}</article>`;
    }).join('');
    return `<section class="history-subject"><h4>${esc(subject.name)}</h4><div class="record-list">${entries}</div></section>`;
  }).join('');
  $('recordList').innerHTML = historyGroups || '<div class="empty">Aún no hay actividades en las materias asignadas.</div>';
  $('recordStudent').value = id;
  syncRecordStudentSearch(id);
  renderRecordSubjects();
  requestAnimationFrame(() => $('studentFile').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function expandCollapsibleTarget(target, externalButton = null) {
  if (!target) return;
  target.classList.remove('is-collapsed');
  const button = target.querySelector('.collapse-toggle') || externalButton;
  if (!button) return;
  button.setAttribute('aria-expanded', 'true');
  const label = button.querySelector('.collapse-label');
  if (label) label.textContent = 'Minimizar';
}

function editRecord(studentId, recordId) {
  const pupil = roster.find(student => student.id === studentId);
  const record = pupil?.records.find(item => item.id === recordId);
  if (!pupil || !record) return;

  const activityTab = document.querySelector('.folder-tab[data-tab="activity"]');
  if (activityTab && !activityTab.classList.contains('active')) switchTab(activityTab);
  expandCollapsibleTarget(document.querySelector('.activity-layout'), document.querySelector('.section-bar .collapse-toggle'));

  editingRecordId = record.id;
  selectedStudentId = pupil.id;
  selectedPartialId = academicPartials.some(part => part.id === record.partialId)
    ? record.partialId
    : academicPartials[0]?.id;
  renderPartialSelectors();

  const studentSelect = $('recordStudent');
  if (![...studentSelect.options].some(option => option.value === pupil.id)) {
    studentSelect.add(new Option(pupil.name, pupil.id));
  }
  studentSelect.value = pupil.id;
  syncRecordStudentSearch(pupil.id);
  renderRecordSubjects(record.subjectId);
  $('recordPartial').value = selectedPartialId;
  const param = recordParams(currentPartial(), record.subjectId).find(item => item.id === record.categoryId);
  $('recordCategory').value = record.categoryId;
  bookParams = recordParams(currentPartial(), record.subjectId);
  renderCategoryOptions();
  $('recordCategory').value = record.categoryId;
  $('recordTitle').value = record.title || '';
  $('recordDate').value = record.date || today();
  const contribution = record.scoreUnit === 'partial-percent'
    ? Number(record.score)
    : Number(record.score) / Number(record.max || 10) * (Number(param?.weight) || 0);
  $('recordScore').value = Number.isFinite(contribution) ? contribution.toFixed(2) : '';
  $('recordMax').value = Number(param?.weight) || 0;
  $('recordNote').value = record.note || '';
  $('tasksDelivered').value = record.tasksDelivered ?? '';
  $('tasksTotal').value = record.tasksTotal ?? '';
  $('saveRecordButton').textContent = 'Guardar cambios';
  $('cancelRecordButton').hidden = false;
  updateCategoryIcon();
  syncTaskEntry();
  refreshRecordParameterInfo();
  requestAnimationFrame(() => document.querySelector('.section-bar').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function removeStudentById(studentId, subjectId, partialId = examConfigPartialId) {
  const index = students.findIndex(result => result.studentId === studentId && result.subjectId === subjectId && result.partialId === partialId);
  if (index < 0) return;
  students.splice(index, 1);
  const pupil = roster.find(student => student.id === studentId);
  if (pupil) pupil.records = (pupil.records || []).filter(record => !(record.categoryId === '__exam__' && record.subjectId === subjectId && record.partialId === partialId));
  writeStore('evalpro-exam-students-v1', students);
  writeStore('evalpro-roster-v1', roster);
  renderAll();
  renderRoster();
}

function removeRosterStudent(studentId) {
  if (!confirm('¿Estás seguro de eliminar al alumno y su expediente?')) return;
  roster = roster.filter(student => student.id !== studentId);
  subjects.forEach(subject => { subject.studentIds = (subject.studentIds || []).filter(id => id !== studentId); });
  students = students.filter(result => result.studentId !== studentId);
  writeStore('evalpro-roster-v1', roster);
  writeStore('evalpro-subjects-v1', subjects);
  writeStore('evalpro-exam-students-v1', students);
  renderSubjects();
  renderRoster();
  renderAll();
}

function createSubject() {
  const name = $('newSubjectName').value.trim();
  if (!name) return toast('Escribe el nombre de la materia.');
  if (subjects.some(subject => normalizeName(subject.name) === normalizeName(name))) return toast('Ya existe una materia con ese nombre.');
  const subject = { id: makeId(), name, studentIds: [], themeColor: '' };
  subjects.push(subject);
  writeStore('evalpro-subjects-v1', subjects);
  selectedSubjectId = subject.id;
  selectedConfigSubjectId = subject.id;
  syncSubjectThemeColorPicker(subject.id);
  applySubjectTheme(subject.id);
  $('newSubjectName').value = '';
  renderSubjects();
  renderConfigSubjects();
  renderBookParams();
  examConfigSubjectId = subject.id;
  examConfigPartialId = selectedPartialId || academicPartials[0]?.id || '';
  renderExamStudentControls();
  loadExamConfigForSubject(subject.id, examConfigPartialId);
  renderRoster();
  toast(`Materia ${name} creada`);
  alert(`Se guardó la materia ${name}. Ahora puedes elegir su color en “Color de la materia activa”.`);
}

renderExamStudentControls();
migrateExamResults();
renderAll();
renderRoster();

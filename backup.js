// Respaldo portable de los datos locales de EvalPro.
const BACKUP_KEYS = {
  roster: 'evalpro-roster-v1',
  subjects: 'evalpro-subjects-v1',
  partials: 'evalpro-partials-v1',
  bookParams: 'evalpro-book-params-v1',
  examParams: 'evalpro-exam-params-v1',
  examSettings: 'evalpro-exam-settings-v1',
  examStudents: 'evalpro-exam-students-v1',
  theme: 'evalpro-theme'
};

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
  data.examStudents ??= [];
  data.theme = data.theme === 'dark' ? 'dark' : 'light';
  return data;
}

function exportBackup() {
  try {
    const backup = {
      app: 'EvalPro',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: readBackupData()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evalpro-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Respaldo descargado en formato JSON.');
  } catch (error) {
    console.error('No se pudo exportar el respaldo:', error);
    toast('No se pudo crear el respaldo. Revisa los datos guardados.');
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
  if (data.roster?.some(student => !student || typeof student.name !== 'string' || !Array.isArray(student.records ?? []))) {
    throw new Error('La lista de alumnos del respaldo está dañada.');
  }
  if (data.subjects?.some(subject => !subject || typeof subject.name !== 'string')) {
    throw new Error('La lista de materias del respaldo está dañada.');
  }
  if (data.theme !== undefined && !['light', 'dark'].includes(data.theme)) {
    throw new Error('El tema visual del respaldo no es válido.');
  }
  return data;
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
      examStudents: imported.examStudents ?? [],
      theme: imported.theme === 'dark' ? 'dark' : 'light'
    };
    const accepted = confirm(
      `Se cargarán ${incoming.roster.length} alumno(s) y ${incoming.subjects.length} materia(s). ` +
      'Esto reemplazará los datos que están guardados en este navegador. ¿Continuar?'
    );
    if (!accepted) return;

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

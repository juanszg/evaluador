(() => {
    const actions = {
        student: { tab: 'register', target: '#newStudentName', message: 'Abre “Registrar alumnos”. Escribe el nombre, elige el avatar y la materia; al guardar, el alumno queda inscrito y se abre su expediente.' },
        subject: { tab: 'book', target: '#newSubjectName', message: 'En “Cuaderno y seguimiento”, escribe el nombre en “Crear materia” y guarda. Después podrás asignarle alumnos y configurar sus parciales.' },
        grade: { message: '¿Qué tipo de calificación quieres registrar?', choices: [{ label: 'Examen', action: 'exam-grade' }, { label: 'Actividad individual', action: 'activity-grade' }, { label: 'Tareas grupales', action: 'group-tasks' }] },
        'exam-grade': { tab: 'exam', target: '#examStudentMode', message: 'En “Examen”, elige si vas a registrar un alumno nuevo o calificar a uno existente. Selecciona materia y parcial; captura los aciertos o puntajes y guarda.' },
        'activity-grade': { tab: 'activity', target: '#recordStudentSearch', message: 'En “Registro de actividad”, busca al alumno inscrito, selecciona materia, parcial y parámetro. Captura su calificación y guarda el registro.' },
        'edit-student': { tab: 'register', target: '#rosterCard', focus: '#rosterSubject', message: 'En “Registrar alumnos”, filtra la materia y localiza al alumno en la lista. Usa el icono de edición para corregir su nombre; el expediente permite editar o agregar calificaciones.' },
        'view-subject': { tab: 'book', target: '#bookConfig', focus: '#activeSubject', message: 'Ve a “Cuaderno y seguimiento” y selecciona la materia. Ahí puedes ver el grupo, sus tareas y la configuración de evaluación por parcial.' },
        'group-tasks': { tab: 'book', target: '#taskManager', focus: '#taskManagerSubject', message: 'En “Cuaderno y seguimiento”, abre “Registro grupal”. Selecciona materia, parcial y parámetro; agrega la tarea y registra la entrega del grupo.' },
        file: { tab: 'records', target: '#globalSearch', message: 'En “Expedientes”, escribe el nombre en el buscador. Selecciona el resultado para abrir su historial y calificaciones por materia.' },
        backup: { tab: 'profile', target: '.profile-panel-backups', focus: '.profile-save-button', message: 'En “Mi perfil” puedes crear una copia con “Guardar datos”. Para llevarla a otro navegador, usa “Exportar”; para recuperarla, “Cargar” y selecciona el archivo JSON.' },
        roster: { tab: 'register', target: '#rosterCard', focus: '#rosterSubject', message: 'La lista está en “Registrar alumnos”. Elige una materia para ver su grupo, filtra u ordena los alumnos y usa los controles de cada fila para abrir o editar su expediente.' },
        config: { tab: 'book', target: '#bookConfig', focus: '#configSubject', message: 'En “Cuaderno y seguimiento”, abre “Parámetros por materia y parcial”. Elige la materia y el parcial, ajusta los porcentajes y aplica la configuración.' },
        help: { message: 'Puedo guiarte para crear alumnos o materias, registrar calificaciones, administrar tareas, revisar expedientes y guardar tus datos. También puedes escribir tu duda con tus propias palabras.' }
    };

    const panel = () => document.getElementById('helpGuidePanel');
    const messages = () => document.getElementById('helpGuideMessages');
    const input = () => document.getElementById('helpGuideInput');

    window.toggleHelpGuide = function (force) {
        const box = panel();
        if (!box) return;
        const open = typeof force === 'boolean' ? force : box.hidden;
        box.hidden = !open;
        document.getElementById('helpGuideToggle')?.setAttribute('aria-expanded', String(open));
        if (open) input()?.focus({ preventScroll: true });
    };

    function addMessage(text, who = 'assistant', choices = []) {
        const log = messages();
        if (!log) return;
        const bubble = document.createElement('div');
        bubble.className = `help-guide-message is-${who}`;
        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);
        log.appendChild(bubble);
        if (choices.length) {
            const group = document.createElement('div');
            group.className = 'help-guide-quick-actions help-guide-followups';
            choices.forEach(choice => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.guideAction = choice.action;
                button.textContent = choice.label;
                group.appendChild(button);
            });
            log.appendChild(group);
        }
        while (log.children.length > 28) log.removeChild(log.children[0]);
        log.scrollTop = log.scrollHeight;
    }

    function navigate(action) {
        const item = actions[action];
        if (!item) return;
        if (item.tab) {
            const tab = document.querySelector(`.folder-tab[data-tab="${item.tab}"]`);
            if (tab) tab.click();
        }
        window.toggleHelpGuide(false);
        if (!item.target) {
            addMessage(item.message, 'assistant', item.choices || []);
            window.toggleHelpGuide(true);
            return;
        }
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const target = document.querySelector(item.target);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const focusTarget = document.querySelector(item.focus || item.target);
                if (focusTarget && typeof focusTarget.focus === 'function') {
                    window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 350);
                }
            }
            if (typeof window.toast === 'function') window.toast(item.message);
        }));
    }

    function normalize(text) {
        return text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function answerQuestion(raw) {
        const text = normalize(raw);
        if (!text) return;
        if (/\b(editar|corregir|cambiar nombre|apellido)\b/.test(text)) return navigate('edit-student');
        if (/\b(expediente|buscar alumno|historial)\b/.test(text)) return navigate('file');
        if (/\b(guardar|respaldo|backup|exportar|cargar datos|importar)\b/.test(text)) return navigate('backup');
        if (/\b(tarea|tareas|cuaderno|trabajo grupal|participacion grupal)\b/.test(text)) return navigate('group-tasks');
        if (/\b(parametro|porcentaje|peso|configuracion|parcial)\b/.test(text)) return navigate('config');
        if (/\b(calificacion|nota|actividad|registro)\b/.test(text)) {
            addMessage('¿Vas a capturar una calificación de examen o de otro parámetro?', 'assistant', [
                { label: 'Examen', action: 'exam-grade' },
                { label: 'Actividad individual', action: 'activity-grade' },
                { label: 'Tareas grupales', action: 'group-tasks' }
            ]);
            return;
        }
        if (/\b(examen|aciertos|puntaje)\b/.test(text)) return navigate('exam-grade');
        if (/\b(ver|consultar|abrir|revisar)\b/.test(text) && /\b(materia|asignatura)\b/.test(text)) return navigate('view-subject');
        if (/\b(crear|nueva|nuevo|agregar)\b/.test(text) && /\b(materia|asignatura|grupo)\b/.test(text)) return navigate('subject');
        if (/\b(aprobados|reprobados|promedio|lista|tabla|alumnos registrados)\b/.test(text)) return navigate('roster');
        if (/\b(crear|registrar|agregar|ingresar|nuevo|nueva)\b/.test(text) && /\b(alumno|alumna|estudiante)\b/.test(text)) return navigate('student');
        if (/\b(sr|sin registro|pendiente)\b/.test(text)) {
            addMessage('S/R significa “sin registro”: todavía no hay una calificación guardada para ese parámetro. Puedes capturarla desde Registro de actividad o desde la pestaña Calificaciones del expediente.', 'assistant', [
                { label: 'Registrar actividad', action: 'activity-grade' },
                { label: 'Buscar expediente', action: 'file' }
            ]);
            return;
        }
        if (/\b(oscuro|claro|tema|colores)\b/.test(text)) {
            addMessage('El icono de tema está en la parte superior, junto a los controles de exportación. Púlsalo para alternar entre modo claro y oscuro.');
            return;
        }
        addMessage('No identifiqué esa acción. Prueba con “crear alumno”, “crear materia”, “registrar examen”, “editar alumno”, “tareas”, “expediente” o “guardar datos”.', 'assistant', [
            { label: 'Ver opciones', action: 'help' }
        ]);
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-guide-action]');
        if (button) navigate(button.dataset.guideAction);
    });

    document.getElementById('helpGuideForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const value = input()?.value.trim();
        if (!value) return;
        addMessage(value, 'user');
        input().value = '';
        answerQuestion(value);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && panel() && !panel().hidden) window.toggleHelpGuide(false);
    });
})();

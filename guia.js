(() => {
    const actions = {
        student: { tab: 'register', target: '#newStudentName', message: 'Abre “Registrar alumnos”. Escribe el nombre, elige el avatar y la materia; al guardar, el alumno queda inscrito y se abre su expediente.' },
        subject: { tab: 'book', target: '#newSubjectName', message: 'En “Cuaderno y seguimiento”, escribe el nombre en “Crear materia” y guarda. Después podrás asignarle alumnos y configurar sus parciales.' },
        grade: { message: '¿Qué tipo de calificación quieres registrar?', choices: [{ label: 'Examen', action: 'exam-grade' }, { label: 'Actividad individual', action: 'activity-grade' }, { label: 'Tareas grupales', action: 'group-tasks' }] },
        'exam-grade': { tab: 'exam', target: '#examStudentMode', message: 'En “Examen”, elige si vas a registrar un alumno nuevo o calificar a uno existente. Selecciona materia y parcial; captura los aciertos o puntajes y guarda.' },
        'activity-grade': { tab: 'activity', target: '#recordStudentSearch', message: 'En “Registro de actividad”, busca al alumno inscrito, selecciona materia, parcial y parámetro. Captura su calificación y guarda el registro.' },
        'edit-student': { tab: 'register', target: '#rosterCard', focus: '#rosterSubject', message: 'En “Registrar alumnos”, filtra la materia y localiza al alumno en la lista. Usa el icono de edición para corregir su nombre; el expediente permite editar o agregar calificaciones.' },
        'view-subject': { message: '¿Qué quieres hacer?', choices: [{ label: 'Ver la tabla', action: 'view-subject-table' }, { label: 'Configurar parámetros', action: 'view-subject-config' }] },
        'group-tasks': { tab: 'book', target: '#taskManager', focus: '#taskManagerSubject', message: 'En “Cuaderno y seguimiento”, abre “Registro grupal”. Selecciona materia, parcial y parámetro; agrega la tarea y registra la entrega del grupo.' },
        file: { tab: 'records', target: '#globalSearch', message: 'En “Expedientes”, escribe el nombre en el buscador. Selecciona el resultado para abrir su historial y calificaciones por materia.' },
        backup: { tab: 'profile', target: '.profile-panel-backups', focus: '.profile-save-button', message: 'En “Mi perfil” puedes crear una copia con “Guardar datos”. Para llevarla a otro navegador, usa “Exportar”; para recuperarla, “Cargar” y selecciona el archivo JSON.' },
        profile: { tab: 'profile', target: '#panel-profile', message: 'Este es tu resumen docente: materias, inscripciones, promedios, tareas y avance de los parciales.' },
        roster: { tab: 'register', target: '#rosterCard', focus: '#rosterSubject', message: 'La lista está en “Registrar alumnos”. Elige una materia para ver su grupo, filtra u ordena los alumnos y usa los controles de cada fila para abrir o editar su expediente.' },
        config: { tab: 'book', target: '#bookConfig', focus: '#configSubject', message: 'En “Cuaderno y seguimiento”, abre “Parámetros por materia y parcial”. Elige la materia y el parcial, ajusta los porcentajes y aplica la configuración.' },
        help: { message: 'Puedo guiarte para crear alumnos o materias, registrar calificaciones, administrar tareas, revisar expedientes y guardar tus datos. También puedes escribir tu duda con tus propias palabras.' }
    };

    const panel = () => document.getElementById('helpGuidePanel');
    const messages = () => document.getElementById('helpGuideMessages');
    const input = () => document.getElementById('helpGuideInput');
    const guidedSubjectChoices = new Map();
    let guidedChoiceCounter = 0;

    function addGuidedChoice(label, route) {
        const action = `guided-subject-${++guidedChoiceCounter}`;
        guidedSubjectChoices.set(action, route);
        return { label, action };
    }

    function askForSubject(intent) {
        if (!Array.isArray(subjects) || !subjects.length) {
            addMessage('Todavía no hay materias guardadas. Crea una materia y después podrás consultarla aquí.', 'assistant', [
                { label: 'Crear materia', action: 'subject' }
            ]);
            return;
        }
        addMessage('¿Qué materia quieres ver?', 'assistant', subjects.map(subject => addGuidedChoice(subject.name, { stage: 'subject', subjectId: subject.id, intent })));
    }

    function askForPartial(subjectId, intent) {
        const subject = subjects.find(item => String(item.id) === String(subjectId));
        if (!subject) return addMessage('No encontré esa materia. Vuelve a elegirla para continuar.');
        const partials = Array.isArray(academicPartials) ? academicPartials : [];
        if (partials.length <= 1) {
            openSubjectRoute(subject, partials[0] || null, intent);
            return;
        }
        addMessage(`¿Qué parcial de ${subject.name} quieres consultar?`, 'assistant', partials.map(part => addGuidedChoice(part.name, { stage: 'partial', subjectId: subject.id, partialId: part.id, intent })));
    }

    function openSubjectRoute(subject, part, intent) {
        const isConfig = intent === 'config';
        const tabName = isConfig ? 'book' : 'register';
        const targetSelector = isConfig ? '#bookConfig' : '#rosterCard';
        const tab = document.querySelector(`.folder-tab[data-tab="${tabName}"]`);
        if (tab) tab.click();
        if (isConfig) {
            const subjectSelect = document.getElementById('configSubject');
            if (subjectSelect) subjectSelect.value = subject.id;
            if (typeof selectConfigSubject === 'function') selectConfigSubject(subject.id);
            if (part && typeof selectPartial === 'function') selectPartial(part.id);
        } else {
            if (typeof selectSubject === 'function') selectSubject(subject.id);
            const index = part ? academicPartials.findIndex(item => String(item.id) === String(part.id)) : 0;
            const view = part && normalize(part.name) === 'final' ? 'final' : (['p1', 'p2', 'p3'][index] || (index === 3 ? 'final' : 'overall'));
            const gradeView = document.getElementById('rosterGradeView');
            if (gradeView) gradeView.value = view;
            if (typeof selectRosterGradeView === 'function') selectRosterGradeView(view);
        }
        window.toggleHelpGuide(false);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const target = document.querySelector(targetSelector);
            if (target) {
                target.classList.remove('guide-route-target');
                void target.offsetWidth;
                target.classList.add('guide-route-target');
                window.setTimeout(() => target.classList.remove('guide-route-target'), 1500);
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (typeof window.toast === 'function') window.toast(isConfig
                ? `Parámetros de ${subject.name}${part ? ` · ${part.name}` : ''}`
                : `Tabla de ${subject.name}${part ? ` · ${part.name}` : ''}`);
        }));
    }

    function scrollGuideToLatest() {
        requestAnimationFrame(() => {
            const log = messages();
            if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
        });
    }

    function resetGuideConversation() {
        const log = messages();
        if (!log) return;
        guidedSubjectChoices.clear();
        guidedChoiceCounter = 0;
        log.innerHTML = `
            <div class="help-guide-message is-assistant"><p>¡Hola! Puedo llevarte a la sección que necesitas o resolver dudas comunes.</p></div>
            <div class="help-guide-message is-assistant"><p>¿Qué deseas hacer?</p></div>
            <div class="help-guide-quick-actions">
                <button type="button" data-guide-action="student">Crear alumno</button>
                <button type="button" data-guide-action="subject">Crear materia</button>
                <button type="button" data-guide-action="grade">Agregar calificación</button>
                <button type="button" data-guide-action="edit-student">Editar alumno</button>
                <button type="button" data-guide-action="view-subject">Ver materia</button>
                <button type="button" data-guide-action="group-tasks">Registrar tareas grupales</button>
                <button type="button" data-guide-action="file">Buscar expediente</button>
                <button type="button" data-guide-action="backup">Guardar o cargar datos</button>
            </div>`;
        const field = input();
        if (field) field.value = '';
        log.scrollTop = 0;
    }

    window.toggleHelpGuide = function (force) {
        const box = panel();
        if (!box) return;
        const open = typeof force === 'boolean' ? force : box.hidden;
        if (open && box.hidden) resetGuideConversation();
        box.hidden = !open;
        document.getElementById('helpGuideToggle')?.setAttribute('aria-expanded', String(open));
    };

    function addMessage(text, who = 'assistant', choices = []) {
        const log = messages();
        if (!log) return;
        const bubble = document.createElement('div');
        bubble.className = `help-guide-message is-${who}`;
        const p = document.createElement('p');
        const animated = who === 'assistant' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (who === 'assistant') {
            const visualText = document.createElement('span');
            visualText.className = 'help-guide-typing-text';
            visualText.setAttribute('aria-hidden', 'true');
            const accessibleText = document.createElement('span');
            accessibleText.className = 'help-guide-sr-only';
            accessibleText.textContent = text;
            p.append(visualText, accessibleText);
            if (animated) bubble.classList.add('is-typing');
        } else {
            p.textContent = text;
        }
        bubble.appendChild(p);
        log.appendChild(bubble);
        const appendChoices = () => {
            if (!choices.length || !bubble.isConnected) return;
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
        };
        while (log.children.length > 28) log.removeChild(log.children[0]);
        if (animated) {
            const visualText = bubble.querySelector('.help-guide-typing-text');
            const chars = [...text];
            let position = 0;
            const typeNext = () => {
                if (!bubble.isConnected) return;
                position += 1;
                visualText.textContent = chars.slice(0, position).join('');
                if (position % 3 === 0 || position >= chars.length) log.scrollTop = log.scrollHeight;
                if (position < chars.length) {
                    const char = chars[position - 1];
                    const pause = /[.!?¿,:;]/.test(char) ? 78 : 16;
                    window.setTimeout(typeNext, pause);
                } else {
                    bubble.classList.remove('is-typing');
                    appendChoices();
                    if (!panel()?.hidden) scrollGuideToLatest();
                }
            };
            if (!chars.length) {
                bubble.classList.remove('is-typing');
                appendChoices();
            } else {
                window.setTimeout(typeNext, 110);
            }
        } else {
            if (who === 'assistant') bubble.querySelector('.help-guide-typing-text').textContent = text;
            appendChoices();
            if (!panel()?.hidden) scrollGuideToLatest();
        }
    }

    function navigate(action) {
        if (action === 'print-profile') {
            if (panel()?.hidden) window.toggleHelpGuide(false);
            const tab = document.querySelector('.folder-tab[data-tab="profile"]');
            if (tab) tab.click();
            window.toggleHelpGuide(false);
            window.setTimeout(() => window.printProfile?.(), 150);
            return;
        }
        if (action === 'view-subject-table' || action === 'view-subject-config') {
            askForSubject(action === 'view-subject-config' ? 'config' : 'table');
            return;
        }
        const guidedRoute = guidedSubjectChoices.get(action);
        if (guidedRoute) {
            guidedSubjectChoices.delete(action);
            if (guidedRoute.stage === 'subject') {
                askForPartial(guidedRoute.subjectId, guidedRoute.intent);
            } else {
                const subject = subjects.find(item => String(item.id) === String(guidedRoute.subjectId));
                const part = academicPartials.find(item => String(item.id) === String(guidedRoute.partialId));
                if (subject) openSubjectRoute(subject, part || null, guidedRoute.intent);
            }
            return;
        }
        const item = actions[action];
        if (!item) return;
        if (!item.tab && !item.target) {
            if (panel()?.hidden) window.toggleHelpGuide(true);
            addMessage(item.message, 'assistant', item.choices || []);
            scrollGuideToLatest();
            return;
        }
        if (item.tab) {
            document.getElementById(`panel-${item.tab}`)?.classList.add('guide-nav-static');
            const tab = document.querySelector(`.folder-tab[data-tab="${item.tab}"]`);
            if (tab) tab.click();
        }
        window.toggleHelpGuide(false);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const target = document.querySelector(item.target);
            if (target) {
                const targetSection = target.closest('.card, .profile-panel');
                if (targetSection) {
                    targetSection.classList.remove('guide-route-target');
                    void targetSection.offsetWidth;
                    targetSection.classList.add('guide-route-target');
                    window.setTimeout(() => targetSection.classList.remove('guide-route-target'), 1500);
                }
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
        const has = pattern => pattern.test(text);
        if (has(/\b(hola|buenos dias|buenas tardes|buenas noches|que tal)\b/)) {
            addMessage('¡Hola! Puedo ayudarte a organizar materias y alumnos, capturar calificaciones, revisar expedientes, imprimir el resumen o guardar tus datos. ¿Qué necesitas hacer?', 'assistant', [
                { label: 'Crear alumno', action: 'student' }, { label: 'Registrar calificación', action: 'grade' },
                { label: 'Ver una materia', action: 'view-subject' }, { label: 'Imprimir resumen', action: 'print-profile' }
            ]);
            return;
        }
        if (has(/\b(imprimir|imprime|impresion|pdf)\b/) && has(/\b(perfil|resumen|estadisticas|dashboard|reporte)\b/)) return navigate('print-profile');
        if (has(/\b(sr|sin registro|pendiente|no tiene calificacion)\b/)) {
            addMessage('S/R significa “sin registro”: aún no hay una calificación guardada para ese parámetro. Puedes capturarla en Registro de actividad o desde la pestaña Calificaciones del expediente.', 'assistant', [
                { label: 'Registrar actividad', action: 'activity-grade' }, { label: 'Buscar expediente', action: 'file' }
            ]);
            return;
        }
        if (has(/\b(editar|edita|corregir|corregirle|cambiar nombre|apellido|modificar alumno)\b/)) return navigate('edit-student');
        if (has(/\b(expediente|buscar alumno|buscar estudiante|historial|ficha del alumno)\b/)) return navigate('file');
        if (has(/\b(guardar|respaldo|backup|exportar|cargar datos|importar|recuperar datos|no perder mis datos)\b/)) return navigate('backup');
        if (has(/\b(tarea|tareas|cuaderno|trabajo grupal|participacion grupal|entregas)\b/) && has(/\b(registrar|capturar|agregar|editar|revisar|ver|llevar|control|tarea|tareas|cuaderno)\b/)) return navigate('group-tasks');
        if (has(/\b(parametro|porcentaje|peso|configuracion|configurar|ponderacion)\b/) && has(/\b(materia|parcial|evaluacion|calificacion|parametro|porcentaje|peso|configuracion|configurar)\b/)) return navigate('config');
        if (has(/\b(examen|aciertos|puntaje|respuestas correctas)\b/)) return navigate('exam-grade');
        if (has(/\b(como se aprueba|calificacion minima|nota minima|cuanto necesito para aprobar)\b/)) {
            addMessage('La aplicación considera aprobada una calificación final de 6.00 o más sobre 10. Puedes ver aprobados, reprobados y alumnos sin registro en la tabla de Alumnos registrados.', 'assistant', [
                { label: 'Ver alumnos registrados', action: 'roster' }, { label: 'Ver resumen', action: 'profile' }
            ]);
            return;
        }
        if (has(/\b(calificacion|calificaciones|nota|notas|actividad|registro)\b/)) {
            addMessage('¿Vas a capturar una calificación de examen o de otro parámetro?', 'assistant', [
                { label: 'Examen', action: 'exam-grade' },
                { label: 'Actividad individual', action: 'activity-grade' },
                { label: 'Tareas grupales', action: 'group-tasks' }
            ]);
            return;
        }
        if (has(/\b(ver|consultar|abrir|revisar|mostrar|enseñar)\b/) && has(/\b(materia|asignatura|grupo)\b/)) return navigate('view-subject');
        if (has(/\b(crear|nueva|nuevo|agregar|dar de alta)\b/) && has(/\b(materia|asignatura|grupo)\b/)) return navigate('subject');
        if (has(/\b(aprobados|reprobados|promedio|lista|tabla|alumnos registrados|grupo|inscritos)\b/)) return navigate('roster');
        if (has(/\b(crear|registrar|agregar|ingresar|inscribir|dar de alta|nuevo|nueva)\b/) && has(/\b(alumno|alumna|estudiante|estudiantes)\b/)) return navigate('student');
        if (has(/\b(resumen|estadisticas|dashboard|perfil docente|mi perfil)\b/)) return navigate('profile');
        if (has(/\b(oscuro|claro|tema|colores|apariencia)\b/)) {
            addMessage('El icono de tema está en la parte superior, junto a los controles de exportación. Púlsalo para alternar entre modo claro y oscuro.');
            return;
        }
        if (has(/\b(que puedes hacer|como funciona|ayuda|opciones|no entiendo|no se como)\b/)) return navigate('help');
        addMessage('Puedo ayudarte con alumnos, materias, notas, parciales, tareas, expedientes, estadísticas o copias de seguridad. Prueba a decirlo con otras palabras o elige una opción:', 'assistant', [
            { label: 'Crear alumno', action: 'student' }, { label: 'Crear materia', action: 'subject' },
            { label: 'Agregar calificación', action: 'grade' }, { label: 'Ver una materia', action: 'view-subject' },
            { label: 'Buscar expediente', action: 'file' }, { label: 'Guardar datos', action: 'backup' }
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

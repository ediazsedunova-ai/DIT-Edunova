// -----------------------------------------------------------------------------
// CONFIGURACIÓN PRINCIPAL - ¡IMPORTANTE!
// -----------------------------------------------------------------------------
// Pega la URL de tu Google Apps Script implementado aquí.
const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbwuuJERNMU7ZrCrftQIzxn_dlIe4lzXh-SiseYAQzlwCWf6m9OUZ4fxlxe3Ubx0jGW7Hw/exec';
// -----------------------------------------------------------------------------

// Global application state
let appData = {};
let currentUser = null;
let participantProgress = {};
let controlUnificado = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing DIT System...');
    showSpinner(true);
    await loadDataFromGoogleSheet();
    showSpinner(false);

    if (googleAppScriptUrl.includes('PEGAR_AQUÍ')) {
        showModal('Error de Configuración', 'La aplicación no está conectada. Por favor, edita el archivo `app.js` y añade la URL de tu Google Apps Script.');
        return;
    }

    setupEventListeners();
    showSection('loginSection');
});

async function loadDataFromGoogleSheet() {
    try {
        const response = await fetch(googleAppScriptUrl);
        if (!response.ok) throw new Error(`Error de red: ${response.status}.`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(`Error en Apps Script: ${data.message}`);
        appData = data;
        console.log('✅ Data loaded successfully:', appData);
        initializeSystemData();
    } catch (error) {
        console.error('❌ Failed to load data:', error);
        showModal('Error Crítico de Carga', `No se pudieron cargar los datos desde Google Sheets.<br><br><b>Mensaje del Servidor:</b><br><i>${error.message}</i><br><br><b>Posibles Soluciones:</b><br>1. Verifica que la URL en <code>app.js</code> es correcta.<br>2. Revisa que todas las pestañas en tu Google Sheet tengan el nombre exacto pedido en las instrucciones.<br>3. Asegúrate de haber implementado el script para que "Cualquier usuario" tenga acceso.`);
    }
}

function initializeSystemData() {
    buildControlUnificado();
    initializeAllProgress();
    const whatsappBtn = document.getElementById('whatsappGroupBtn');
    if (whatsappBtn && appData.configuracion.whatsapp_group_link) {
        whatsappBtn.href = appData.configuracion.whatsapp_group_link;
    }
}

function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registroForm')?.addEventListener('submit', handleRegistro);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('backToLogin')?.addEventListener('click', () => showSection('loginSection'));
    document.getElementById('adminBtn')?.addEventListener('click', () => requestAccess('admin'));
    document.getElementById('backToLoginAdmin')?.addEventListener('click', handleLogout);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportProgressToCsv);
    setupModalControls();
}

function showSection(sectionName) {
    ['loginSection', 'registroSection', 'certificationSteps', 'adminPanel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById('whatsappGroupBtn').style.display = (sectionName === 'certificationSteps' || sectionName === 'adminPanel') ? 'inline-flex' : 'none';
    const target = document.getElementById(sectionName);
    if (target) target.style.display = 'block';
}

function handleLogin(e) { 
    e.preventDefault(); 
    const dni = document.getElementById('dniInput').value.trim();
    if (!/^\d{8}$/.test(dni)) {
        showError('loginError', 'DNI inválido. Debe contener 8 dígitos.');
        return;
    }
    const participant = controlUnificado.find(u => u.dni && u.dni.toString() === dni);
    if (participant) {
        currentUser = participant;
        updateCertificationSteps();
        showSection('certificationSteps');
        document.getElementById('loginError').style.display = 'none';
    } else {
        showRegistroForm(dni);
    }
}

function showRegistroForm(dni) {
    document.getElementById('regDni').value = dni;
    const optionsContainer = document.getElementById('certificateOptionsContainer');
    optionsContainer.innerHTML = appData.configuracion.opciones_certificado.map(opt => `
        <label class="option-card">
            <input type="radio" name="tipoCertificado" value="${opt.id}" ${opt.id === 'digital' ? 'checked' : ''}>
            <div class="option-content">
                <h5>${opt.nombre}</h5>
                <p><strong>Costo:</strong> ${opt.costo}</p>
                <p>${opt.desc}</p>
            </div>
        </label>
    `).join('');
    showSection('registroSection');
}

async function handleRegistro(e) {
    e.preventDefault();
    const registerButton = e.target.querySelector('button[type="submit"]');
    setButtonLoading(registerButton, true, 'Registrando...');

    const formData = {
        dni: document.getElementById('regDni').value,
        nombres: document.getElementById('regNombres').value,
        apellidos: document.getElementById('regApellidos').value,
        celular: document.getElementById('regCelular').value,
        email: document.getElementById('regEmail').value,
        residencia: document.getElementById('regResidencia').value,
        certificado: document.querySelector('input[name="tipoCertificado"]:checked').value,
        fecha_registro: new Date().toISOString().split('T')[0]
    };

    const response = await postDataToGoogleSheet('registerUser', formData);
    
    if (response.status === 'success') {
        const newUser = { ...formData, nombre_completo: `${formData.nombres} ${formData.apellidos}`, dni: formData.dni.toString() };
        appData.nuevos_registros.push(newUser);
        controlUnificado.push(newUser);
        participantProgress[newUser.dni] = response.newProgress;
        currentUser = newUser;
        
        setButtonLoading(registerButton, false, 'Completar Registro');
        showModal('Registro Exitoso', `¡Bienvenido(a) ${formData.nombres}!<br>Tu registro ha sido completado.`, () => {
             updateCertificationSteps();
             showSection('certificationSteps');
        });
    } else {
        setButtonLoading(registerButton, false, 'Completar Registro');
        showModal('Error de Registro', response.message);
    }
}


function requestAccess(type) {
    const passwordModal = document.getElementById('passwordModal');
    document.getElementById('passwordTitle').textContent = `Acceso de ${type === 'admin' ? 'Administrador' : 'Editor'}`;
    const passwordInput = document.getElementById('passwordInput');
    passwordInput.value = '';
    document.getElementById('passwordError').style.display = 'none';
    passwordModal.classList.remove('hidden');
    passwordInput.focus();
    
    const form = document.getElementById('passwordForm');
    const submitBtn = document.getElementById('passwordSubmit');
    
    const submitHandler = (e) => {
      e.preventDefault();
      const password = passwordInput.value;
      const correctPassword = appData.configuracion.credenciales[`${type}_password`];
      if (password === correctPassword) {
          passwordModal.classList.add('hidden');
          showAdminPanel();
      } else {
          document.getElementById('passwordError').style.display = 'block';
      }
    };

    form.onsubmit = submitHandler;
    submitBtn.onclick = submitHandler;
    document.getElementById('passwordCancel').onclick = () => passwordModal.classList.add('hidden');
    document.getElementById('closePasswordModal').onclick = () => passwordModal.classList.add('hidden');

}

function showAdminPanel() {
    const approvedCount = controlUnificado.filter(p => participantProgress[p.dni]?.eval_aprobado).length;
    const certificatesGenerated = controlUnificado.filter(p => participantProgress[p.dni]?.certificate_code).length;
    document.getElementById('totalParticipants').textContent = controlUnificado.length;
    document.getElementById('approvedCount').textContent = approvedCount;
    document.getElementById('certificatesGenerated').textContent = certificatesGenerated;

    const tbody = document.querySelector('#progressTable tbody');
    tbody.innerHTML = '';
    controlUnificado.forEach(p => {
        const progress = participantProgress[p.dni] || {};
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>'${p.dni}</td>
            <td>${p.nombre_completo}</td>
            <td>${getStatusBadge(progress.step1_completed)}</td>
            <td>${getStatusBadge(progress.step2_completed)}</td>
            <td>${getStatusBadge(progress.step3_completed)}</td>
            <td>${getStatusBadge(progress.step4_completed)}</td>
            <td>${getStatusBadge(progress.step5_completed)}</td>
        `;
        tbody.appendChild(row);
    });
    showSection('adminPanel');
}

function getStatusBadge(isCompleted) {
    const className = isCompleted ? 'status-completed' : 'status-pending';
    const text = isCompleted ? 'Completado' : 'Pendiente';
    return `<span class="status-badge ${className}">${text}</span>`;
}

function exportProgressToCsv() {
    let csvContent = "data:text/csv;charset=utf-8,DNI,Nombre,Paso1,Paso2,Paso3,Paso4,Paso5,Aprobado,CodigoCertificado\n";
    controlUnificado.forEach(p => {
        const progress = participantProgress[p.dni] || {};
        const row = [
            `'${p.dni}`, `"${p.nombre_completo}"`,
            progress.step1_completed ? 'SI' : 'NO', progress.step2_completed ? 'SI' : 'NO',
            progress.step3_completed ? 'SI' : 'NO', progress.step4_completed ? 'SI' : 'NO',
            progress.step5_completed ? 'SI' : 'NO', progress.eval_aprobado ? 'SI' : 'NO',
            progress.certificate_code || ''
        ].join(',');
        csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "progreso_curso_dit.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateCertificationSteps() {
    if (!currentUser) return;
    updateStudentInfo();
    setupStep('step1', isStepCompleted('step1'), renderStep1Content, validateSession1);
    setupStep('step2', isStepCompleted('step2'), (c) => renderModuleContent(c, 0), null, isStepCompleted('step1'));
    setupStep('step3', isStepCompleted('step3'), renderStep3Content, validateSession2, isStepCompleted('step2'));
    setupStep('step4', isStepCompleted('step4'), (c) => renderModuleContent(c, 1), null, isStepCompleted('step3'));
    setupStep('step5', isStepCompleted('step5'), renderEvaluationContent, submitExam, isStepCompleted('step4'));
    updateCertificateSection();
}

function setupStep(stepId, isCompleted, renderFn, submitFn, isEnabled = true) {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    const h = stepEl.querySelector('.step-header');
    const a = document.getElementById(`${stepId}Actions`);
    const s = document.getElementById(`${stepId}Status`);
    stepEl.className = 'step-item';
    if (isCompleted) {
        stepEl.classList.add('completed');
        s.textContent = '✅ Completado';
        a.style.display = 'none';
        h.onclick = null;
    } else if (isEnabled) {
        stepEl.classList.add('active');
        s.textContent = '🎯 Disponible';
        h.onclick = () => {
            const isVisible = a.style.display === 'block';
            a.style.display = isVisible ? 'none' : 'block';
            if (!isVisible && renderFn) {
                 renderFn(document.getElementById(`${stepId}Content`), submitFn);
            }
        };
    } else {
        stepEl.classList.add('disabled');
        s.textContent = '🔒 Bloqueado';
        a.style.display = 'none';
        h.onclick = null;
    }
}

function renderStep1Content(container, submitFn) {
    container.innerHTML = `<p>Vea la grabación y escriba la palabra clave para validar.</p>
    <a href="${appData.configuracion.enlaces_grabaciones.sesion1}" target="_blank" class="btn btn--secondary">Ver Video Sesión 1</a>
    <form id="session1Form" class="form-group">
        <input id="session1Code" class="form-control" placeholder="Palabra Clave Sesión 1" required style="margin-top:1rem;" maxlength="50">
        <div class="form-actions" style="justify-content: flex-start;"><button type="submit" class="btn btn--primary">Validar</button></div>
    </form>`;
    document.getElementById('session1Form').addEventListener('submit', submitFn);
}
async function validateSession1(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Validando...');
    if (document.getElementById('session1Code').value.trim().toUpperCase() === appData.configuracion.palabras_clave.sesion1.toUpperCase()) {
        await updateUserProgress('step1_completed', true);
    } else {
        showModal('Error', 'Palabra clave incorrecta.');
        setButtonLoading(button, false, 'Validar');
    }
}

function renderModuleContent(container, moduleIndex) {
    const module = appData.modulos[moduleIndex];
    const progress = participantProgress[currentUser.dni];
    container.innerHTML = `
        ${module.temas.map(tema => `
            <div class="topic-item">
                <h5>${tema.titulo}</h5>
                <p>${tema.resumen}</p>
                <a href="${tema.lectura_url}" target="_blank" class="btn btn--secondary btn--sm">Leer artículo completo</a>
                <div class="comment-form form-group">
                    <textarea class="form-control" id="comment_${tema.id}" 
                              placeholder="Escriba su reflexión aquí (mínimo 50 caracteres)..." 
                              maxlength="2000" 
                              oninput="updateCharCounter('comment_${tema.id}', 'counter_${tema.id}')">${progress.comments?.[tema.id] || ''}</textarea>
                    <div id="counter_${tema.id}" class="char-counter"></div>
                </div>
            </div>
        `).join('')}
        <div class="form-actions" style="justify-content: flex-start;">
            <button id="completeModuleBtn_${moduleIndex}" class="btn btn--primary">Guardar y Completar Módulo</button>
        </div>
    `;
    
    module.temas.forEach(tema => updateCharCounter(`comment_${tema.id}`, `counter_${tema.id}`));

    const completeBtn = document.getElementById(`completeModuleBtn_${moduleIndex}`);
    completeBtn.onclick = async () => {
        setButtonLoading(completeBtn, true, 'Guardando...');
        let allValid = true;
        if (!progress.comments) progress.comments = {};
        module.temas.forEach(tema => {
            const comment = document.getElementById(`comment_${tema.id}`).value;
            if (comment.trim().length < 50) {
                allValid = false;
            }
            progress.comments[tema.id] = comment;
        });
        if (allValid) {
            const stepKey = moduleIndex === 0 ? 'step2_completed' : 'step4_completed';
            await updateUserProgress(stepKey, true);
        } else {
            showModal('Incompleto', 'Debe escribir una reflexión de al menos 50 caracteres para cada tema.');
            setButtonLoading(completeBtn, false, 'Guardar y Completar Módulo');
        }
    };
}

function renderStep3Content(container, submitFn) {
     container.innerHTML = `<p>Vea la grabación y escriba la palabra clave para validar.</p>
    <a href="${appData.configuracion.enlaces_grabaciones.sesion2}" target="_blank" class="btn btn--secondary">Ver Video Sesión 2</a>
    <form id="session2Form" class="form-group">
        <input id="session2Code" class="form-control" placeholder="Palabra Clave Sesión 2" required style="margin-top:1rem;" maxlength="50">
        <div class="form-actions" style="justify-content: flex-start;"><button type="submit" class="btn btn--primary">Validar</button></div>
    </form>`;
    document.getElementById('session2Form').addEventListener('submit', submitFn);
}
async function validateSession2(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Validando...');
    if (document.getElementById('session2Code').value.trim().toUpperCase() === appData.configuracion.palabras_clave.sesion2.toUpperCase()) {
        await updateUserProgress('step3_completed', true);
    } else {
        showModal('Error', 'Palabra clave incorrecta.');
        setButtonLoading(button, false, 'Validar');
    }
}

function renderEvaluationContent(container, submitFn) {
    const progress = participantProgress[currentUser.dni];
    
    if (progress.eval_aprobado) {
        container.innerHTML = `<div class="success-message">Ya has completado y aprobado esta evaluación.</div>`;
        return;
    }

    const remaining = appData.configuracion.max_intentos_evaluacion - (progress.eval_intentos || 0);
    const caseAnswers = progress.last_case_answers || {};
    const caseStudy = appData.evaluacion.caso_practico;

    if (remaining <= 0) {
        container.innerHTML = `<div class="error-message">Has agotado todos tus intentos para la evaluación.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="exam-info"><strong>Intentos restantes:</strong> ${remaining}</div>
        <div id="examContainer">
            <form id="examForm">
                <h5>Preguntas de Opción Múltiple</h5>
                ${appData.evaluacion.preguntas.map((q, i) => `
                <div class="question-item" id="q-item-${i}">
                    <p class="question-text">${i + 1}. ${q.texto}</p>
                    <div class="question-options">${q.opciones.map((opt, j) => `
                        <label class="option-item" id="q${i}-opt${j}"><input type="radio" name="q${i}" value="${j}" required><span>${opt}</span></label>
                    `).join('')}</div>
                </div>`).join('')}
                
                <div class="case-study-section">
                    <h5>Caso Práctico: ${caseStudy.titulo}</h5>
                    <div class="case-description">
                        <p><strong>Situación:</strong> ${caseStudy.descripcion}</p>
                    </div>
                    ${caseStudy.preguntas.map((cp, i) => `
                    <div class="form-group">
                        <label class="form-label"><strong>${i + 1}.</strong> ${cp}</label>
                        <textarea name="cp${i}" id="cp${i}" class="form-control" rows="3" required minlength="50" maxlength="2000" oninput="updateCharCounter('cp${i}', 'counter_cp${i}')">${caseAnswers[`cp${i}`] || ''}</textarea>
                        <div id="counter_cp${i}" class="char-counter"></div>
                    </div>`).join('')}
                </div>

                <div class="form-actions"><button type="submit" class="btn btn--primary">Enviar Evaluación</button></div>
            </form>
        </div>
        <div id="examResultContainer" style="display:none;"></div>
        <div id="examResultActions" class="form-actions" style="display:none; justify-content: center; margin-top: 20px;">
            <button id="retryExamBtn" class="btn btn--primary">Reintentar Evaluación</button>
        </div>`;

    caseStudy.preguntas.forEach((_, i) => updateCharCounter(`cp${i}`, `counter_cp${i}`));
    
    document.getElementById('examForm').addEventListener('submit', submitFn);
    document.getElementById('retryExamBtn').addEventListener('click', () => {
         renderEvaluationContent(document.getElementById('step5Content'), submitFn);
    });
}

async function submitExam(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    setButtonLoading(submitButton, true, 'Enviando...');
    
    const formData = new FormData(form);
    const userAnswers = { mc: {}, case: {} };
    let score = 0;
    
    appData.evaluacion.preguntas.forEach((q, i) => {
        const userAnswer = parseInt(formData.get(`q${i}`));
        userAnswers.mc[i] = userAnswer;
        if (userAnswer === q.correcta) score++;
    });
    appData.evaluacion.caso_practico.preguntas.forEach((cp, i) => userAnswers.case[`cp${i}`] = formData.get(`cp${i}`));
    
    const progress = participantProgress[currentUser.dni];
    const newIntentos = (progress.eval_intentos || 0) + 1;
    const passed = score >= appData.configuracion.nota_minima_aprobacion;
    
    const attemptData = { 
        dni: currentUser.dni, 
        timestamp: new Date().toISOString(), 
        score, 
        answers_json: JSON.stringify(userAnswers) 
    };
    const response = await postDataToGoogleSheet('saveExamAttempt', attemptData);

    progress.eval_intentos = newIntentos;
    progress.eval_aprobado = progress.eval_aprobado || passed;
    progress.step5_completed = progress.step5_completed || passed;
    progress.last_case_answers = userAnswers.case;
    if (passed && response.certificate_code) {
        progress.certificate_code = response.certificate_code;
        progress.final_score = score;
    }

    await postDataToGoogleSheet('updateProgress', { dni: currentUser.dni, progressData: progress });
    
    document.getElementById('examContainer').style.display = 'none';
    
    const resultContainer = document.getElementById('examResultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = appData.evaluacion.preguntas.map((q, i) => {
        const isCorrect = userAnswers.mc[i] === q.correcta;
        return `
        <div class="question-item ${isCorrect ? 'correct' : 'incorrect'}">
            <p class="question-text">${i + 1}. ${q.texto}</p>
            <div class="question-options">
            ${q.opciones.map((opt, j) => {
                let className = 'option-item';
                if (j === q.correcta) className += ' correct-answer';
                if (j === userAnswers.mc[i] && !isCorrect) className += ' incorrect';
                return `<div class="${className}"><span>${opt}</span></div>`;
            }).join('')}
            </div>
        </div>`;
    }).join('');

    if (passed) {
        showModal('¡Felicidades!', `¡Has aprobado con ${score}/${appData.evaluacion.preguntas.length}!<br><br><strong>Tu código de certificado es: ${response.certificate_code}</strong><br>Podrás descargarlo en las próximas horas.`, () => {
            updateCertificationSteps();
        });
    } else {
        const remaining = appData.configuracion.max_intentos_evaluacion - newIntentos;
        let message = `Tu puntaje es ${score}/${appData.evaluacion.preguntas.length}. Te quedan ${remaining} intentos.`;
        if (remaining > 0) {
            message += "<br><br><b>Haz clic en el botón 'Reintentar Evaluación' para hacerlo una vez más.</b>";
            document.getElementById('examResultActions').style.display = 'flex';
        } else {
            message += "<br><br><b>Has agotado todos tus intentos.</b>";
        }
        showModal('Intento Registrado', message);
    }
}

async function postDataToGoogleSheet(action, data) {
    try {
        const response = await fetch(googleAppScriptUrl, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({ action, data })
        });
        if (!response.ok) throw new Error('Network response was not ok.');
        return await response.json();
    } catch (error) {
        console.error('Error posting data:', error);
        return { status: 'error', message: error.message };
    }
}
async function updateUserProgress(key, value) {
    if (!currentUser) return;
    if (!participantProgress[currentUser.dni]) {
        participantProgress[currentUser.dni] = createDefaultProgress(currentUser.dni);
    }
    participantProgress[currentUser.dni][key] = value;
    await postDataToGoogleSheet('updateProgress', { dni: currentUser.dni, progressData: participantProgress[currentUser.dni] });
    updateCertificationSteps();
}
function buildControlUnificado() {
    const map = new Map();
    const processList = (list) => {
        if (!Array.isArray(list)) return;
        list.forEach(p => {
            if (p.dni) {
                const dniStr = p.dni.toString();
                if (!map.has(dniStr)) {
                    map.set(dniStr, { ...p, dni: dniStr, nombre_completo: `${p.nombres || ''} ${p.apellidos || ''}`.trim() });
                }
            }
        });
    };
    processList(appData.matriculados);
    processList(appData.nuevos_registros);
    controlUnificado = Array.from(map.values());
}

function initializeAllProgress() {
    controlUnificado.forEach(p => {
        let progressData = createDefaultProgress(p.dni);
        const existingProgressRow = appData.progreso.find(prog => prog.dni?.toString() === p.dni?.toString());
        if (existingProgressRow) {
            if (existingProgressRow.datos_progreso) {
                try {
                    const savedProgress = JSON.parse(existingProgressRow.datos_progreso);
                    progressData = { ...progressData, ...savedProgress };
                } catch (e) { console.warn(`Could not parse progress JSON for DNI ${p.dni}.`); }
            }
            if (existingProgressRow.estado_evaluacion === 'Aprobado') {
                progressData.eval_aprobado = true;
                progressData.step5_completed = true;
            }
            if (existingProgressRow.codigo_certificado) {
                progressData.certificate_code = existingProgressRow.codigo_certificado;
            }
        }
        participantProgress[p.dni] = progressData;
    });
}

function createDefaultProgress(dni) {
    const dniStr = dni.toString();
    const isAsistenteS1 = appData.asistentes_sesion1.some(a => a.dni?.toString() === dniStr);
    const isAsistenteS2 = appData.asistentes_sesion2.some(a => a.dni?.toString() === dniStr);
    return {
        step1_completed: isAsistenteS1, step2_completed: false,
        step3_completed: isAsistenteS2, step4_completed: false,
        step5_completed: false, eval_intentos: 0,
        eval_aprobado: false, comments: {}, final_score: null,
        certificate_code: null, last_case_answers: {}
    };
}

function updateCharCounter(textAreaId, counterId) {
    const textArea = document.getElementById(textAreaId);
    const counter = document.getElementById(counterId);
    if (textArea && counter) {
        const maxLength = textArea.maxLength;
        const currentLength = textArea.value.length;
        counter.textContent = `${currentLength} / ${maxLength} caracteres`;
    }
}
function setButtonLoading(button, isLoading, loadingText = 'Cargando...') {
    if (!button) return;
    if (isLoading) {
        if (!button.originalHTML) button.originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        button.disabled = true;
    } else {
        if (button.originalHTML) button.innerHTML = button.originalHTML;
        button.disabled = false;
    }
}
function isStepCompleted(step) { return participantProgress[currentUser.dni]?.[`${step}_completed`]; }
function handleLogout() { currentUser = null; showSection('loginSection'); }
function updateStudentInfo() { document.getElementById('studentName').textContent = currentUser.nombre_completo; document.getElementById('studentDni').textContent = `DNI: ${currentUser.dni}`; }

function updateCertificateSection() { 
    const section = document.getElementById('certificateSection');
    const progress = participantProgress[currentUser.dni];
    
    if (progress && progress.certificate_code) {
        const config = appData.configuracion;
        const certCode = progress.certificate_code;
        
        const studentData = `\n- Nombre: ${currentUser.nombre_completo}\n- DNI: ${currentUser.dni}\n- Correo: ${currentUser.email || 'No especificado'}`;
        const text = encodeURIComponent(`Hola, deseo solicitar mi certificado físico. Mis datos son:${studentData}\nMi código de certificado es ${certCode}. Adjunto mi comprobante de pago.`);
        const contactNumber = config.whatsapp_contact_number || '51982197128';

        section.innerHTML = `
            <div class="certificate-card">
                <h4><i class="fas fa-certificate"></i> ¡Certificación Completada!</h4>
                <p>Su código de certificado es: <strong>${certCode}</strong></p>
                <p>Su Certificado Digital Gratuito estará disponible para descarga en las próximas horas. Recibirá una notificación por correo y/o WhatsApp.</p>
                <a href="${config.certificate_verification_link || '#'}" target="_blank" class="btn btn--success" style="margin-top: 10px;">
                    <i class="fas fa-check-circle"></i> Verificar Certificado en la Web
                </a>

                <div class="promo-section">
                    <h5>Opcional: Potencie su CV con el <strong>Certificado Físico con Triple Firma</strong></h5>
                    <p>Por una inversión de promoción de <strong>S/${config.cert_fisico_precio || '40.00'}</strong>, asegure su certificado impreso con el respaldo de la Cámara de Comercio de Huánuco y el Colegio de Sociólogos del Perú.</p>
                    <p><strong>¿Cómo solicitarlo?</strong><br>
                    1. Realice el pago vía Yape al <strong>${config.yape_number || '994694751'}</strong> (Edunova Peru Sac).<br>
                    2. Notifique su pago enviando el comprobante por WhatsApp.</p>
                    <a href="https://wa.me/${contactNumber}?text=${text}" target="_blank" class="btn btn--primary" style="margin-top: 10px;">
                        <i class="fab fa-whatsapp"></i> <strong>Solicitar Certificado Físico por WhatsApp</strong>
                    </a>
                </div>
            </div>`;
        section.style.display = 'block'; 
    } else { 
        section.style.display = 'none'; 
    } 
}

function showSpinner(show) { document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none'; }
function setupModalControls() { const m = document.getElementById('messageModal'); document.getElementById('modalConfirm').onclick = () => m.classList.add('hidden'); document.getElementById('closeModal').onclick = () => m.classList.add('hidden'); }
function showError(id, msg) { const e = document.getElementById(id); if (e) { e.querySelector('span').textContent = msg; e.style.display = 'block'; } }
function showModal(title, message, callback) {
    const modal = document.getElementById('messageModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    modal.classList.remove('hidden');
    document.getElementById('modalConfirm').onclick = () => {
        modal.classList.add('hidden');
        if (callback) callback();
    };
}


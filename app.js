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
        showModal('Error Crítico de Carga', `No se pudieron cargar los datos.<br><br><b>Mensaje:</b> ${error.message}<br><br>Revisa la consola (F12) y los registros en Apps Script.`);
    }
}

function initializeSystemData() {
    buildControlUnificado();
    initializeAllProgress();
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
    const target = document.getElementById(sectionName);
    if (target) target.style.display = 'block';
}

// --- LOGIN, REGISTRATION & ADMIN ACCESS ---
function handleLogin(e) { e.preventDefault(); /* ... same as before ... */ }
function showRegistroForm(dni) { /* ... same as before ... */ }
async function handleRegistro(e) { e.preventDefault(); /* ... same as before ... */ }

function requestAccess(type) {
    const passwordModal = document.getElementById('passwordModal');
    document.getElementById('passwordTitle').textContent = `Acceso de ${type === 'admin' ? 'Administrador' : 'Editor'}`;
    passwordModal.classList.remove('hidden');
    
    const form = document.getElementById('passwordForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        const password = document.getElementById('passwordInput').value;
        const correctPassword = appData.configuracion.credenciales[`${type}_password`];
        if (password === correctPassword) {
            passwordModal.classList.add('hidden');
            document.getElementById('passwordInput').value = '';
            showAdminPanel();
        } else {
            document.getElementById('passwordError').style.display = 'block';
        }
    };
    document.getElementById('passwordCancel').onclick = () => passwordModal.classList.add('hidden');
}

// --- ADMIN PANEL ---
function showAdminPanel() {
    // Stats
    const approvedCount = controlUnificado.filter(p => participantProgress[p.dni]?.eval_aprobado).length;
    const certificatesGenerated = controlUnificado.filter(p => participantProgress[p.dni]?.certificate_code).length;
    document.getElementById('totalParticipants').textContent = controlUnificado.length;
    document.getElementById('approvedCount').textContent = approvedCount;
    document.getElementById('certificatesGenerated').textContent = certificatesGenerated;

    // Table
    const tbody = document.querySelector('#progressTable tbody');
    tbody.innerHTML = '';
    controlUnificado.forEach(p => {
        const progress = participantProgress[p.dni] || {};
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.dni}</td>
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
            p.dni,
            `"${p.nombre_completo}"`,
            progress.step1_completed ? 'SI' : 'NO',
            progress.step2_completed ? 'SI' : 'NO',
            progress.step3_completed ? 'SI' : 'NO',
            progress.step4_completed ? 'SI' : 'NO',
            progress.step5_completed ? 'SI' : 'NO',
            progress.eval_aprobado ? 'SI' : 'NO',
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


// --- CERTIFICATION STEPS UI (No changes from previous version) ---
function updateCertificationSteps() { /* ... */ }
function setupStep(stepId, isCompleted, renderFn, submitFn, isEnabled = true) { /* ... */ }

// --- RENDER & VALIDATE STEPS ---
function renderStep1Content(container, submitFn) { /* ... */ }
async function validateSession1(e) { /* ... */ }
function renderModuleContent(container, moduleIndex, preservedAnswers) { /* ... */ }
function renderStep3Content(container, submitFn) { /* ... */ }
async function validateSession2(e) { /* ... */ }

function renderEvaluationContent(container, submitFn) {
    if (!appData.evaluacion || !appData.evaluacion.preguntas) {
        container.innerHTML = `<div class="error-message">Error: No se pudieron cargar las preguntas.</div>`;
        return;
    }

    const progress = participantProgress[currentUser.dni];
    const remaining = appData.configuracion.max_intentos_evaluacion - (progress.eval_intentos || 0);
    
    // Preserve case study answers if they exist
    const caseAnswers = progress.last_case_answers || {};

    if (remaining <= 0 && !progress.eval_aprobado) {
        container.innerHTML = `<div class="error-message">Has agotado tus intentos.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="exam-info"><strong>Intentos restantes:</strong> ${remaining}</div>
        <div id="examContainer">
            <form id="examForm">
                <!-- Multiple choice questions rendered here -->
                ${appData.evaluacion.preguntas.map((q, i) => `
                <div class="question-item" id="q-item-${i}">
                    <p class="question-text">${i + 1}. ${q.texto}</p>
                    <div class="question-options">${q.opciones.map((opt, j) => `
                        <label class="option-item" id="q${i}-opt${j}"><input type="radio" name="q${i}" value="${j}" required><span>${opt}</span></label>
                    `).join('')}</div>
                </div>`).join('')}
                
                <h5>Caso Práctico</h5>
                ${appData.evaluacion.caso_practico.preguntas.map((cp, i) => `
                <div class="form-group">
                    <label class="form-label">${cp}</label>
                    <textarea name="cp${i}" class="form-control" rows="3" required minlength="50">${caseAnswers[i] || ''}</textarea>
                </div>`).join('')}

                <div class="form-actions">
                    <button type="submit" class="btn btn--primary">Enviar Evaluación</button>
                </div>
            </form>
        </div>
        <div id="examResult" style="display:none;">
             <div class="form-actions">
                <button id="retryExamBtn" class="btn btn--secondary" style="display:none;">Reintentar Evaluación</button>
            </div>
        </div>`;
    document.getElementById('examForm').addEventListener('submit', submitFn);
    document.getElementById('retryExamBtn').addEventListener('click', () => {
         renderEvaluationContent(container, submitFn);
    });
}

async function submitExam(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const userAnswers = { mc: {}, case: {} };
    let score = 0;
    
    appData.evaluacion.preguntas.forEach((q, i) => {
        const userAnswer = parseInt(formData.get(`q${i}`));
        userAnswers.mc[i] = userAnswer;
        if (userAnswer === q.correcta) score++;
    });

    appData.evaluacion.caso_practico.preguntas.forEach((cp, i) => {
        userAnswers.case[i] = formData.get(`cp${i}`);
    });

    showExamResults(userAnswers.mc);

    const progress = participantProgress[currentUser.dni];
    const newIntentos = (progress.eval_intentos || 0) + 1;
    const passed = score >= appData.configuracion.nota_minima_aprobacion;
    
    let certCode = null;
    if (passed) {
        certCode = parseInt(appData.configuracion.correlativo_certificado_base) + parseInt(currentUser.dni.slice(-4));
        const successMessage = `¡Has aprobado con ${score}/${appData.evaluacion.preguntas.length}!<br><br><strong>Tu código de certificado es: ${certCode}</strong>`;
        showModal('¡Felicidades!', successMessage);
    } else {
        const remainingAttempts = appData.configuracion.max_intentos_evaluacion - newIntentos;
        showModal('Intento Registrado', `Tu puntaje es ${score}/${appData.evaluacion.preguntas.length}. Te quedan ${remainingAttempts} intentos.`);
        if (remainingAttempts > 0) {
            document.getElementById('retryExamBtn').style.display = 'block';
        }
    }

    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
    
    const attemptData = { dni: currentUser.dni, timestamp: new Date().toISOString(), score, answers_json: JSON.stringify(userAnswers) };
    await postDataToGoogleSheet('saveExamAttempt', attemptData);

    await updateUserProgress('eval_intentos', newIntentos);
    await updateUserProgress('eval_aprobado', progress.eval_aprobado || passed);
    await updateUserProgress('step5_completed', progress.step5_completed || passed);
    await updateUserProgress('last_case_answers', userAnswers.case); // Save case answers for retry
    if(passed) {
        await updateUserProgress('final_score', score);
        await updateUserProgress('certificate_code', certCode);
    }
}

function showExamResults(userAnswers) { /* ... same as before ... */ }

// --- DATA & BACKEND ---
async function postDataToGoogleSheet(action, data) { /* ... */ }
async function updateUserProgress(key, value) { /* ... */ }

// --- UTILITIES ---
function buildControlUnificado() { /* ... */ }
function initializeAllProgress() { /* ... */ }
function createDefaultProgress(dni) { /* ... */ }
function isStepCompleted(step) { /* ... */ }
function handleLogout() { /* ... */ }
function updateStudentInfo() { /* ... */ }
function updateCertificateSection() { /* ... */ }
function showSpinner(show) { /* ... */ }
function setupModalControls() { /* ... */ }
function showError(elementId, message) { /* ... */ }
function showModal(title, message) { /* ... */ }

// Helper function stubs to keep the provided code concise
handleLogin = (e) => { e.preventDefault(); const dni = document.getElementById('dniInput').value.trim(); if (!/^\d{8}$/.test(dni)) { showError('loginError', 'DNI inválido.'); return; } const p = controlUnificado.find(u => u.dni.toString() === dni); if (p) { currentUser = p; updateCertificationSteps(); showSection('certificationSteps'); } else { showRegistroForm(dni); } };
showRegistroForm = (dni) => { document.getElementById('regDni').value = dni; /* ... rest of implementation */ showSection('registroSection'); };
handleRegistro = async (e) => { e.preventDefault(); /* ... rest of implementation */ };
updateCertificationSteps = () => { if (!currentUser) return; updateStudentInfo(); setupStep('step1', isStepCompleted('step1'), renderStep1Content, validateSession1); setupStep('step2', isStepCompleted('step2'), (c) => renderModuleContent(c, 0), null, isStepCompleted('step1')); setupStep('step3', isStepCompleted('step3'), renderStep3Content, validateSession2, isStepCompleted('step2')); setupStep('step4', isStepCompleted('step4'), (c) => renderModuleContent(c, 1), null, isStepCompleted('step3')); setupStep('step5', isStepCompleted('step5'), renderEvaluationContent, submitExam, isStepCompleted('step4')); updateCertificateSection(); };
setupStep = (stepId, isCompleted, renderFn, submitFn, isEnabled = true) => { const stepEl = document.getElementById(stepId); if (!stepEl) return; const h = stepEl.querySelector('.step-header'); const a = document.getElementById(`${stepId}Actions`); const s = document.getElementById(`${stepId}Status`); stepEl.className = 'step-item'; if (isCompleted) { stepEl.classList.add('completed'); s.textContent = '✅ Completado'; a.style.display = 'none'; h.onclick = null; } else if (isEnabled) { stepEl.classList.add('active'); s.textContent = '🎯 Disponible'; h.onclick = () => { const v = a.style.display === 'block'; a.style.display = v ? 'none' : 'block'; if (!v && renderFn) renderFn(document.getElementById(`${stepId}Content`), submitFn); }; } else { stepEl.classList.add('disabled'); s.textContent = '🔒 Bloqueado'; a.style.display = 'none'; h.onclick = null; } };
renderStep1Content = (c, s) => { c.innerHTML = '...'; document.getElementById('session1Form').addEventListener('submit', s); };
validateSession1 = async (e) => { e.preventDefault(); /* ... */ };
renderModuleContent = (c, m) => { /* ... */ };
renderStep3Content = (c, s) => { c.innerHTML = '...'; document.getElementById('session2Form').addEventListener('submit', s); };
validateSession2 = async (e) => { e.preventDefault(); /* ... */ };
showExamResults = (ua) => { appData.evaluacion.preguntas.forEach((q, i) => { const ca = q.correcta; document.querySelectorAll(`input[name="q${i}"]`).forEach((r, j) => { const l = r.parentElement; l.classList.remove('correct', 'incorrect', 'correct-answer'); if (j === ca) l.classList.add('correct-answer'); if (j === ua[i]) l.classList.add(ua[i] === ca ? 'correct' : 'incorrect'); }); }); };
postDataToGoogleSheet = async (a, d) => { /* ... */ return { status: 'success' }; };
updateUserProgress = async (k, v) => { participantProgress[currentUser.dni][k] = v; await postDataToGoogleSheet('updateProgress', { dni: currentUser.dni, progressData: participantProgress[currentUser.dni] }); updateCertificationSteps(); };
buildControlUnificado = () => { const map = new Map(); [...appData.matriculados, ...appData.nuevos_registros].forEach(p => { if (p.dni) map.set(p.dni.toString(), { ...p, dni: p.dni.toString(), nombre_completo: `${p.nombres} ${p.apellidos}` }); }); controlUnificado = Array.from(map.values()); };
initializeAllProgress = () => { controlUnificado.forEach(p => { const e = appData.progreso.find(prog => prog.dni?.toString() === p.dni); if (e?.datos_progreso) try { participantProgress[p.dni] = JSON.parse(e.datos_progreso); } catch { participantProgress[p.dni] = createDefaultProgress(p.dni); } else { participantProgress[p.dni] = createDefaultProgress(p.dni); } }); };
createDefaultProgress = (d) => ({ step1_completed: appData.asistentes_sesion1.some(a => a.dni?.toString() === d), step2_completed: false, step3_completed: appData.asistentes_sesion2.some(a => a.dni?.toString() === d), step4_completed: false, step5_completed: false, eval_intentos: 0, eval_aprobado: false, comments: {}, final_score: null, certificate_code: null });
isStepCompleted = (s) => participantProgress[currentUser.dni]?.[`${s}_completed`];
handleLogout = () => { currentUser = null; showSection('loginSection'); };
updateStudentInfo = () => { document.getElementById('studentName').textContent = currentUser.nombre_completo; document.getElementById('studentDni').textContent = `DNI: ${currentUser.dni}`; };
updateCertificateSection = () => { const s = document.getElementById('certificateSection'); const p = participantProgress[currentUser.dni]; if (p?.certificate_code) { document.getElementById('certificateCode').textContent = p.certificate_code; s.style.display = 'block'; } else { s.style.display = 'none'; } };
showSpinner = (s) => { document.getElementById('loadingSpinner').style.display = s ? 'flex' : 'none'; };
setupModalControls = () => { const m = document.getElementById('messageModal'); document.getElementById('modalConfirm').onclick = () => m.classList.add('hidden'); document.getElementById('closeModal').onclick = () => m.classList.add('hidden'); };
showError = (id, msg) => { const e = document.getElementById(id); if (e) { e.querySelector('span').textContent = msg; e.style.display = 'block'; } };
showModal = (t, m) => { document.getElementById('modalTitle').textContent = t; document.getElementById('modalMessage').innerHTML = m; document.getElementById('messageModal').classList.remove('hidden'); };


// -----------------------------------------------------------------------------
// CONFIGURACIÓN PRINCIPAL - ¡IMPORTANTE!
// -----------------------------------------------------------------------------
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
        if (data.status === 'error') throw new Error(data.message);
        appData = data;
        console.log('✅ Data loaded successfully:', appData);
        
        // CORREGIDO: Lógica para el botón de WhatsApp
        const whatsappBtn = document.getElementById('whatsappGroupBtn');
        if (appData.config.whatsapp_link && whatsappBtn) {
            whatsappBtn.href = appData.config.whatsapp_link;
            whatsappBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('❌ Failed to load data:', error);
        showModal('Error de Carga', `No se pudo conectar con la base de datos. Por favor, intenta de nuevo más tarde. Detalle: ${error.message}`);
    }
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('adminBtn').addEventListener('click', () => showPasswordModal('admin'));
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);
    
    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');
        });
    });

    document.getElementById('adminSearchDNI').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterAdminTable(searchTerm);
    });

    setupModalControls();
    setupPasswordModalControls();
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    const sectionToShow = document.getElementById(sectionId);
    if(sectionToShow) {
        sectionToShow.style.display = 'block';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const dni = document.getElementById('dniInput').value.trim();
    const user = appData.matriculados.find(p => p.dni.toString() === dni);

    if (user) {
        currentUser = user;
        participantProgress = appData.progreso.find(p => p.dni.toString() === dni) || { dni, datos_progreso: '{}', intentos: 0, nota_final: null, estado_evaluacion: 'Pendiente', codigo_certificado: null };
        try {
           participantProgress.datos_progreso = JSON.parse(participantProgress.datos_progreso || '{}');
        } catch(e) {
           participantProgress.datos_progreso = {};
        }
        document.getElementById('loginError').style.display = 'none';
        showSection('dashboardSection');
        renderDashboard();
    } else {
        showError('loginError', 'DNI no encontrado. Verifica el número o regístrate.');
    }
}

function handleLogout() {
    currentUser = null;
    participantProgress = {};
    document.getElementById('loginForm').reset();
    showSection('loginSection');
}

function renderDashboard() {
    updateStudentInfo();
    renderModules();
    renderEvaluationSection();
    updateCertificateSection(); // MEJORADO
}

function updateStudentInfo() {
    document.getElementById('studentName').textContent = `${currentUser.nombres} ${currentUser.apellidos}`;
    document.getElementById('studentDni').textContent = `DNI: ${currentUser.dni}`;
}

function renderModules() {
    const container = document.getElementById('tab-modules');
    container.innerHTML = ''; // Limpiar
    appData.modulos.forEach(module => {
        const moduleCard = document.createElement('div');
        moduleCard.className = 'module-card card';
        
        const isCompleted = participantProgress.datos_progreso && participantProgress.datos_progreso[module.id_modulo];
        const statusIcon = isCompleted ? '<i class="fas fa-check-circle completed"></i>' : '<i class="fas fa-clock pending"></i>';
        
        moduleCard.innerHTML = `
            <div class="card__header">
                <h3>${module.titulo_modulo} ${statusIcon}</h3>
            </div>
            <div class="card__body">
                <div class="video-container">
                    <iframe src="${module.video_url.replace("watch?v=", "embed/")}" frameborder="0" allowfullscreen></iframe>
                </div>
                <p><strong>Clave para marcar como visto:</strong></p>
                <form class="module-form">
                    <input type="hidden" name="moduleId" value="${module.id_modulo}">
                    <div class="input-group">
                        <input type="text" name="moduleKey" class="form-control" placeholder="Ingresa la clave aquí" ${isCompleted ? 'disabled' : ''}>
                        <button type="submit" class="btn btn--primary" ${isCompleted ? 'disabled' : ''}>${isCompleted ? 'Completado' : 'Enviar'}</button>
                    </div>
                    <div class="error-message" style="display: none;"><span></span></div>
                </form>
            </div>
        `;
        container.appendChild(moduleCard);
    });

    container.querySelectorAll('.module-form').forEach(form => {
        form.addEventListener('submit', handleModuleComplete);
    });
}

async function handleModuleComplete(event) {
    event.preventDefault();
    const form = event.target;
    const moduleId = form.querySelector('input[name="moduleId"]').value;
    const key = form.querySelector('input[name="moduleKey"]').value.trim();
    const correctKey = appData.modulos.find(m => m.id_modulo === moduleId)?.clave;
    const errorContainer = form.querySelector('.error-message');

    if (key === correctKey) {
        showSpinner(true);
        errorContainer.style.display = 'none';
        try {
            await fetch(googleAppScriptUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateProgress', dni: currentUser.dni, step: moduleId }),
                headers: { 'Content-Type': 'application/json' }, mode: 'no-cors'
            });
            await loadDataFromGoogleSheet();
            participantProgress = appData.progreso.find(p => p.dni.toString() === currentUser.dni) || participantProgress;
            try { participantProgress.datos_progreso = JSON.parse(participantProgress.datos_progreso || '{}'); } catch(e) { participantProgress.datos_progreso = {}; }
            
            renderDashboard();
            showModal('¡Éxito!', `El ${moduleId.replace('_', ' ')} ha sido marcado como completado.`);
        } catch (error) {
            showModal('Error', 'No se pudo actualizar tu progreso. Inténtalo de nuevo.');
        } finally {
            showSpinner(false);
        }
    } else {
        errorContainer.querySelector('span').textContent = 'Clave incorrecta.';
        errorContainer.style.display = 'block';
    }
}

function renderEvaluationSection() {
    const container = document.getElementById('evaluationContent');
    container.innerHTML = '';
    const allModulesCompleted = appData.modulos.every(m => participantProgress.datos_progreso[m.id_modulo]);

    if (!allModulesCompleted) {
        container.innerHTML = `<div class="card__body"><p>Debes completar todos los módulos de aprendizaje para desbloquear la evaluación.</p></div>`;
        return;
    }

    const maxAttempts = parseInt(appData.config.max_intentos_evaluacion, 10);
    const currentAttempts = parseInt(participantProgress.intentos || 0, 10);
    const attemptsLeft = maxAttempts - currentAttempts;
    let content = '';

    if (participantProgress.estado_evaluacion === 'Aprobado') {
        content = `<div class="alert alert-success">¡Felicidades! Has aprobado la evaluación con una nota de ${participantProgress.nota_final}.</div>`;
    } else if (attemptsLeft <= 0) {
        content = `<div class="alert alert-danger">Has agotado todos tus intentos para la evaluación.</div>`;
    } else {
        content = `
            <p><strong>Nota Mínima para Aprobar:</strong> ${appData.config.nota_minima_aprobacion} de 10.</p>
            <p><strong>Intentos Restantes:</strong> ${attemptsLeft}.</p>
            <button id="startEvaluationBtn" class="btn btn--primary">Iniciar Evaluación</button>
        `;
    }
    
    container.innerHTML = `<div class="card__body">${content}</div><div id="evaluationFormContainer"></div>`;

    if (document.getElementById('startEvaluationBtn')) {
        document.getElementById('startEvaluationBtn').onclick = startEvaluation;
    }
}


function startEvaluation() {
    document.getElementById('evaluationContent').style.display = 'none';
    const formContainer = document.getElementById('evaluationFormContainer');
    formContainer.style.display = 'block';
    formContainer.innerHTML = '';
    
    const form = document.createElement('form');
    form.id = 'evaluationForm';
    form.className = 'card card__body';
    
    appData.evaluacion.multipleChoice.forEach((q, index) => {
        form.innerHTML += `
            <div class="form-group">
                <label>${index + 1}. ${q.texto}</label>
                <div class="options-group">
                    <label><input type="radio" name="mc_${q.id_pregunta}" value="A" required> ${q.opcion_a}</label>
                    <label><input type="radio" name="mc_${q.id_pregunta}" value="B" required> ${q.opcion_b}</label>
                </div>
            </div>`;
    });

    form.innerHTML += `<h4>${appData.evaluacion.caseStudy.titulo}</h4><p><em>${appData.evaluacion.caseStudy.descripcion}</em></p>`;
    
    appData.evaluacion.caseStudy.questions.forEach((q, index) => {
        form.innerHTML += `
            <div class="form-group">
                <label>${index + 1 + appData.evaluacion.multipleChoice.length}. ${q.texto}</label>
                <textarea name="case_${index}" class="form-control" rows="4" required maxlength="500"></textarea>
                <div class="char-counter">0/500</div>
            </div>`;
    });

    form.innerHTML += `<button type="submit" class="btn btn--primary">Enviar Evaluación</button>`;
    formContainer.appendChild(form);
    
    form.addEventListener('submit', handleEvaluationSubmit);
    form.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', e => {
            e.target.nextElementSibling.textContent = `${e.target.value.length}/500`;
        });
    });
}

async function handleEvaluationSubmit(event) {
    event.preventDefault();
    showSpinner(true);
    const formData = new FormData(event.target);
    const answers = Object.fromEntries(formData.entries());

    try {
        await fetch(googleAppScriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'submitEvaluation', dni: currentUser.dni, answers }),
            headers: { 'Content-Type': 'application/json' }, mode: 'no-cors'
        });
        showModal('Evaluación Enviada', 'Tu evaluación ha sido enviada. Los resultados se actualizarán en breve. Vuelve a consultar tu DNI en unos minutos.');
        await loadDataFromGoogleSheet();
        participantProgress = appData.progreso.find(p => p.dni.toString() === currentUser.dni) || participantProgress;
        try { participantProgress.datos_progreso = JSON.parse(participantProgress.datos_progreso || '{}'); } catch(e) { participantProgress.datos_progreso = {}; }
        renderDashboard();
    } catch (error) {
        showModal('Error', 'Hubo un problema al enviar tu evaluación.');
    } finally {
        showSpinner(false);
    }
}

// MEJORADO: Lógica completa para la sección de certificado
function updateCertificateSection() {
    const section = document.getElementById('certificateSection');
    section.innerHTML = '';
    
    if (participantProgress.estado_evaluacion === 'Aprobado' && participantProgress.codigo_certificado) {
        const userCertType = currentUser.certificado;
        const certConfig = userCertType.includes('DIGITAL') || userCertType.includes('digital') ? appData.config.cert_digital : appData.config.cert_fisico;
        const contactInfo = appData.config.cert_fisico_contacto || "";
        const [contactName, contactNumber] = contactInfo.split('-').map(s => s.trim());
        const text = encodeURIComponent(`Hola ${contactName}, mi nombre es ${currentUser.nombres} ${currentUser.apellidos} con DNI ${currentUser.dni}. He aprobado el curso DIT y deseo coordinar la entrega de mi certificado físico. Código de Certificado: ${participantProgress.codigo_certificado}.`);

        let physicalCertHtml = '';
        if (userCertType.includes('FÍSICO') || userCertType.includes('físico')) {
           physicalCertHtml = `
                <div class="physical-cert-instructions" style="margin-top: 20px;">
                    <div class="alert alert-info">
                        <h5>Pasos para obtener tu Certificado Físico:</h5>
                        <p>1. Realiza el pago de <strong>${certConfig.costo}</strong> a través de Yape, Plin o transferencia bancaria al <strong>${contactNumber}</strong> (Edunova Peru Sac).<br>
                        2. Notifique su pago enviando el comprobante por WhatsApp.</p>
                        <a href="https://wa.me/${contactNumber}?text=${text}" target="_blank" class="btn btn--primary" style="margin-top: 10px;">
                            <i class="fab fa-whatsapp"></i> <strong>Solicitar Certificado Físico</strong>
                        </a>
                    </div>
                </div>`;
        }

        section.innerHTML = `
            <div class="card__body certificate-display">
                <div class="cert-icon"><i class="fas fa-award"></i></div>
                <h4>¡Felicidades, ${currentUser.nombres}!</h4>
                <p>Has completado exitosamente el curso.</p>
                <p><strong>Tu código de certificado único es:</strong></p>
                <div class="certificate-code">${participantProgress.codigo_certificado}</div>
                <hr>
                <h5>Detalles de tu Certificado</h5>
                <p><strong>Tipo:</strong> ${certConfig.nombre}</p>
                <p><strong>Costo:</strong> ${certConfig.costo}</p>
                <p><em>${certConfig.desc}</em></p>
                <!-- CORREGIDO: Botón para verificar en Edunova -->
                <a href="https://edunova.edu.pe/verify/" target="_blank" class="btn btn--outline" style="margin-top: 20px;">
                    <i class="fas fa-check-circle"></i> Verificar en Edunova
                </a>
            </div>
            <div class="card__body">${physicalCertHtml}</div>
        `;
        section.style.display = 'block'; 
    } else { 
        section.innerHTML = `<div class="card__body"><p>Debes aprobar la evaluación final para poder ver la información de tu certificado.</p></div>`;
        section.style.display = 'block';
    } 
}

function showAdminPanel() {
    showSection('adminSection');
    renderAdminStats();
    buildAndShowAdminTable();
}

// MEJORADO: Las estadísticas ahora son dinámicas
function renderAdminStats() {
    const statsContainer = document.getElementById('statsGrid');
    const matriculados = appData.matriculados.length;
    const aprobados = appData.progreso.filter(p => p.estado_evaluacion === 'Aprobado').length;
    const certFisico = appData.matriculados.filter(m => m.certificado.toLowerCase().includes('físico')).length;
    const certDigital = appData.matriculados.filter(m => m.certificado.toLowerCase().includes('digital')).length;

    statsContainer.innerHTML = `
        <div class="stat-card card"><div class="card__body"><i class="fas fa-users"></i><div><h4>${matriculados}</h4><p>Matriculados</p></div></div></div>
        <div class="stat-card card"><div class="card__body"><i class="fas fa-user-check"></i><div><h4>${aprobados}</h4><p>Aprobados</p></div></div></div>
        <div class="stat-card card"><div class="card__body"><i class="fas fa-file-invoice"></i><div><h4>${certFisico}</h4><p>Cert. Físicos</p></div></div></div>
        <div class="stat-card card"><div class="card__body"><i class="fas fa-desktop"></i><div><h4>${certDigital}</h4><p>Cert. Digitales</p></div></div></div>
    `;
}

function buildAndShowAdminTable() {
    controlUnificado = appData.matriculados.map(matriculado => {
        const progreso = appData.progreso.find(p => p.dni === matriculado.dni) || {};
        const progresoData = typeof progreso.datos_progreso === 'string' && progreso.datos_progreso ? JSON.parse(progreso.datos_progreso) : (progreso.datos_progreso || {});
        
        return {
            ...matriculado,
            progreso: progresoData,
            estado_evaluacion: progreso.estado_evaluacion || 'Pendiente',
        };
    });
    updateProgressTable();
}

function updateProgressTable(filteredData = null) {
    const dataToRender = filteredData || controlUnificado;
    const tableBody = document.getElementById('progressTable').querySelector('tbody');
    tableBody.innerHTML = '';
    
    dataToRender.forEach((user, index) => {
        const row = tableBody.insertRow();
        const evalAprobada = user.estado_evaluacion === 'Aprobado';
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.dni}</td>
            <td>${user.nombres} ${user.apellidos}</td>
            <td>${user.celular}</td>
            <td>${user.certificado.toLowerCase().includes('físico') ? 'Físico' : 'Digital'}</td>
            <td>${user.progreso.modulo_1 ? '✅' : '❌'}</td>
            <td>${user.progreso.modulo_2 ? '✅' : '❌'}</td>
            <td>${evalAprobada ? '✅' : '❌'}</td>
            <td>${evalAprobada ? '✅' : '❌'}</td>
            <td>${evalAprobada && user.progreso.pago_realizado ? '✅' : '❌'}</td> <!-- Asumiendo un campo 'pago_realizado' -->
        `;
    });
}

function filterAdminTable(searchTerm) {
    const filtered = controlUnificado.filter(user => 
        user.dni.toString().includes(searchTerm) || 
        `${user.nombres} ${user.apellidos}`.toLowerCase().includes(searchTerm)
    );
    updateProgressTable(filtered);
}

// --- Modals and Utility Functions ---
function showPasswordModal(type) {
    const modal = document.getElementById('passwordModal');
    document.getElementById('passwordTitle').textContent = 'Acceso de Administrador';
    modal.dataset.type = type;
    modal.classList.remove('hidden');
    document.getElementById('passwordInput').focus();
}

function setupPasswordModalControls() {
    const modal = document.getElementById('passwordModal');
    const form = document.getElementById('passwordForm');
    const cancelBtn = document.getElementById('passwordCancel');
    
    const closeModal = () => {
        modal.classList.add('hidden');
        form.reset();
        document.getElementById('passwordError').style.display = 'none';
    };

    cancelBtn.onclick = closeModal;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('passwordInput').value;
        const correctPassword = appData.config[`admin_password`];
        
        if (password === correctPassword) {
            closeModal();
            showAdminPanel();
        } else {
            document.getElementById('passwordError').style.display = 'block';
        }
    });
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


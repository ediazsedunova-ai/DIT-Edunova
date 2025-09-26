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
        if (data.status === 'error') throw new Error(data.message);
        appData = data;
        console.log('✅ Data loaded successfully:', appData);
        // Mostrar el botón de WhatsApp si hay un enlace en la configuración
        const whatsappBtn = document.getElementById('whatsappGroupBtn');
        if (appData.config.whatsapp_link && whatsappBtn) {
            // El enlace ahora está en el HTML, solo necesitamos mostrar el botón.
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
    document.getElementById('syncDataBtn').addEventListener('click', async () => {
        showSpinner(true);
        await loadDataFromGoogleSheet();
        updateProgressTable();
        showSpinner(false);
        showModal('Sincronizado', 'Los datos han sido actualizados correctamente.');
    });
    
    // CORREGIDO: Se eliminó el listener del botón "Verificar Certificado" porque ahora es un enlace directo.
    
    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');
        });
    });

    document.getElementById('session1Form').addEventListener('submit', (e) => handleSessionComplete(e, 'sesion1'));
    document.getElementById('session2Form').addEventListener('submit', (e) => handleSessionComplete(e, 'sesion2'));
    
    document.getElementById('adminSearchDNI').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterAdminTable(searchTerm);
    });

    setupModalControls();
    setupPasswordModalControls();
}

function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(section => {
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

        console.log('👤 User logged in:', currentUser, participantProgress);
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
    console.log('Logged out.');
}

function renderDashboard() {
    document.getElementById('welcomeMessage').textContent = `Bienvenido(a), ${currentUser.nombres} ${currentUser.apellidos}`;
    document.getElementById('userDNI').textContent = currentUser.dni;
    
    // URLs de videos
    document.getElementById('video1').src = appData.config.sesion1_video.replace("watch?v=", "embed/");
    document.getElementById('video2').src = appData.config.sesion2_video.replace("watch?v=", "embed/");

    updateProgressSteps();
    updateEvaluationTab();
    updateCertificateTab();
}

function updateProgressSteps() {
    const progress = participantProgress.datos_progreso || {};
    const evalStatus = participantProgress.estado_evaluacion;
    
    updateStep('step1', progress.sesion1);
    updateStep('step2', progress.sesion2);
    
    let evalCompleted = evalStatus === 'Aprobado';
    updateStep('step3', evalCompleted);

    let certGenerated = !!participantProgress.codigo_certificado;
    updateStep('step4', certGenerated);
}

function updateStep(stepId, completed) {
    const step = document.getElementById(stepId);
    const statusBadge = step.querySelector('.status-badge');
    if (completed) {
        step.classList.add('completed');
        statusBadge.textContent = 'Completado';
        statusBadge.className = 'status-badge completed';
    } else {
        step.classList.remove('completed');
        statusBadge.textContent = 'Pendiente';
        statusBadge.className = 'status-badge pending';
    }
}

// Lógica para las demás pestañas (evaluación, certificado, admin, etc.)
// ... (El resto del código JavaScript permanece igual)
function updateEvaluationTab() {
    const progress = participantProgress.datos_progreso || {};
    const evalInfo = document.getElementById('evaluationInfo');
    const evalContent = document.getElementById('evaluationContent');
    const evalFormContainer = document.getElementById('evaluationFormContainer');

    if (progress.sesion1 && progress.sesion2) {
        evalInfo.style.display = 'none';
        evalContent.style.display = 'block';
        
        const maxAttempts = parseInt(appData.config.max_intentos_evaluacion, 10);
        const currentAttempts = parseInt(participantProgress.intentos || 0, 10);
        const attemptsLeft = maxAttempts - currentAttempts;

        document.getElementById('minScore').textContent = appData.config.nota_minima_aprobacion;
        document.getElementById('attemptsLeft').textContent = attemptsLeft;
        
        const evalMsg = document.getElementById('evaluationMessage');
        const startBtn = document.getElementById('startEvaluationBtn');
        evalFormContainer.style.display = 'none';

        if (participantProgress.estado_evaluacion === 'Aprobado') {
            evalMsg.textContent = `¡Felicidades! Has aprobado la evaluación con una nota de ${participantProgress.nota_final}.`;
            evalMsg.className = 'alert alert-success';
            evalMsg.style.display = 'block';
            startBtn.style.display = 'none';
        } else if (attemptsLeft <= 0) {
            evalMsg.textContent = 'Has agotado todos tus intentos para la evaluación.';
            evalMsg.className = 'alert alert-danger';
            evalMsg.style.display = 'block';
            startBtn.style.display = 'none';
        } else {
            evalMsg.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.onclick = startEvaluation;
        }

    } else {
        evalInfo.style.display = 'block';
        evalContent.style.display = 'none';
    }
}

function startEvaluation() {
    document.getElementById('evaluationContent').style.display = 'none';
    const formContainer = document.getElementById('evaluationFormContainer');
    formContainer.style.display = 'block';
    formContainer.innerHTML = ''; // Limpiar
    
    const form = document.createElement('form');
    form.id = 'evaluationForm';
    
    // Preguntas de opción múltiple
    appData.evaluacion.multipleChoice.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'form-group';
        questionDiv.innerHTML = `
            <label>${index + 1}. ${q.texto}</label>
            <div class="options-group">
                <label><input type="radio" name="mc_${q.id_pregunta}" value="A" required> ${q.opcion_a}</label>
                <label><input type="radio" name="mc_${q.id_pregunta}" value="B" required> ${q.opcion_b}</label>
            </div>`;
        form.appendChild(questionDiv);
    });

    // Preguntas de caso
    const caseTitle = document.createElement('h4');
    caseTitle.textContent = appData.evaluacion.caseStudy.titulo;
    form.appendChild(caseTitle);

    const caseDesc = document.createElement('p');
    caseDesc.innerHTML = `<em>${appData.evaluacion.caseStudy.descripcion}</em>`;
    form.appendChild(caseDesc);
    
    appData.evaluacion.caseStudy.questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'form-group';
        questionDiv.innerHTML = `
            <label>${index + 1 + appData.evaluacion.multipleChoice.length}. ${q.texto}</label>
            <textarea name="case_${index}" class="form-control" rows="4" required></textarea>
            <div class="char-counter">0/500</div>
        `;
        form.appendChild(questionDiv);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn--primary';
    submitBtn.textContent = 'Enviar Evaluación';
    form.appendChild(submitBtn);

    formContainer.appendChild(form);
    
    form.addEventListener('submit', handleEvaluationSubmit);
    form.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const counter = e.target.nextElementSibling;
            const length = e.target.value.length;
            counter.textContent = `${length}/500`;
            if (length > 500) {
              counter.style.color = 'var(--color-error)';
              e.target.style.borderColor = 'var(--color-error)';
            } else {
              counter.style.color = 'var(--color-text-secondary)';
              e.target.style.borderColor = '';
            }
        });
    });
}

async function handleEvaluationSubmit(event) {
    event.preventDefault();
    showSpinner(true);

    const formData = new FormData(event.target);
    const answers = {};
    for (let [key, value] of formData.entries()) {
        answers[key] = value;
    }

    try {
        const response = await fetch(googleAppScriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'submitEvaluation',
                dni: currentUser.dni,
                answers: answers
            }),
            headers: { 'Content-Type': 'application/json' },
             mode: 'no-cors' // Para evitar el error de CORS con redirección
        });

        // Como usamos no-cors, no podemos leer la respuesta.
        // La actualización de datos debe hacerse recargando la data o asumiendo éxito.
        showModal('Evaluación Enviada', 'Tu evaluación ha sido enviada para su calificación. Los resultados se actualizarán en breve. Por favor, vuelve a consultar tu DNI en unos minutos.');

        // Recargar datos para reflejar el cambio
        await loadDataFromGoogleSheet();
        // Forzar la actualización del estado del usuario actual
        participantProgress = appData.progreso.find(p => p.dni.toString() === currentUser.dni) || participantProgress;
         try {
           participantProgress.datos_progreso = JSON.parse(participantProgress.datos_progreso || '{}');
        } catch(e) {
           participantProgress.datos_progreso = {};
        }

        renderDashboard();
        
    } catch (error) {
        console.error('Error submitting evaluation:', error);
        showModal('Error', 'Hubo un problema al enviar tu evaluación. Por favor, inténtalo de nuevo.');
    } finally {
        showSpinner(false);
    }
}


async function handleSessionComplete(event, sessionKey) {
    event.preventDefault();
    const inputId = `${sessionKey}Key`;
    const errorId = `${sessionKey}Error`;
    const key = document.getElementById(inputId).value.trim();
    const correctKey = appData.config[`${sessionKey}_clave`];

    if (key === correctKey) {
        showSpinner(true);
        document.getElementById(errorId).style.display = 'none';

        try {
            const response = await fetch(googleAppScriptUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateProgress', dni: currentUser.dni, step: sessionKey }),
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors'
            });

            // Actualizar localmente
            if (!participantProgress.datos_progreso) participantProgress.datos_progreso = {};
            participantProgress.datos_progreso[sessionKey] = true;
            
            // Recargar datos para estar 100% seguros
            await loadDataFromGoogleSheet();
            participantProgress = appData.progreso.find(p => p.dni.toString() === currentUser.dni) || participantProgress;
            try {
               participantProgress.datos_progreso = JSON.parse(participantProgress.datos_progreso || '{}');
            } catch(e) {
               participantProgress.datos_progreso = {};
            }


            renderDashboard();
            showModal('¡Éxito!', `La ${sessionKey === 'sesion1' ? 'Sesión 1' : 'Sesión 2'} ha sido marcada como completada.`);

        } catch (error) {
            console.error(`Error updating ${sessionKey}:`, error);
            showModal('Error', 'No se pudo actualizar tu progreso. Inténtalo de nuevo.');
        } finally {
            showSpinner(false);
        }
    } else {
        showError(errorId, 'Clave incorrecta. Inténtalo de nuevo.');
    }
}

function updateCertificateTab() {
    const certTab = document.querySelector('.tab-link[data-tab="tab-certificado"]');
    const certInfo = document.getElementById('certificateInfo');
    
    if (participantProgress.estado_evaluacion === 'Aprobado' && participantProgress.codigo_certificado) {
        certTab.disabled = false;
        const userCertType = currentUser.certificado;
        const certConfig = userCertType.includes('DIGITAL') ? appData.config.cert_digital : appData.config.cert_fisico;
        const contactInfo = appData.config.cert_fisico_contacto || "";
        const [contactName, contactNumber] = contactInfo.split('-').map(s => s.trim());
        const text = encodeURIComponent(`Hola ${contactName}, mi nombre es ${currentUser.nombres} ${currentUser.apellidos} con DNI ${currentUser.dni}. He aprobado el curso DIT y deseo coordinar la entrega de mi certificado físico. Código de Certificado: ${participantProgress.codigo_certificado}.`);

        certInfo.innerHTML = `
            <div class="certificate-display">
                <div class="cert-icon"><i class="fas fa-award"></i></div>
                <h4>¡Felicidades, ${currentUser.nombres}!</h4>
                <p>Has completado exitosamente el curso de Desarrollo Infantil Temprano.</p>
                <p><strong>Tu código de certificado único es:</strong></p>
                <div class="certificate-code">${participantProgress.codigo_certificado}</div>
                <p><strong>Horas de Certificación:</strong> ${appData.config.horas_certificacion} horas académicas.</p>
                <hr>
                <h5>Detalles de tu Certificado</h5>
                <p><strong>Tipo:</strong> ${certConfig.nombre}</p>
                <p><strong>Costo:</strong> ${certConfig.costo}</p>
                <p><em>${certConfig.desc}</em></p>
            </div>`;

        if (userCertType.includes('FÍSICO')) {
           const physicalCertSection = document.createElement('div');
           physicalCertSection.className = 'physical-cert-instructions';
           physicalCertSection.innerHTML = `
                <div class="alert alert-info">
                    <h5>Pasos para obtener tu Certificado Físico:</h5>
                    <p>1. Realiza el pago de <strong>${certConfig.costo}</strong> a través de Yape, Plin o transferencia bancaria al <strong>${contactNumber}</strong> (Edunova Peru Sac).<br>
                    2. Notifique su pago enviando el comprobante por WhatsApp.</p>
                    <a href="https://wa.me/${contactNumber}?text=${text}" target="_blank" class="btn btn--primary" style="margin-top: 10px;">
                        <i class="fab fa-whatsapp"></i> <strong>Solicitar Certificado Físico por WhatsApp</strong>
                    </a>
                </div>
            `;
           certInfo.appendChild(physicalCertSection);
        }

    } else {
        certTab.disabled = true;
        certInfo.innerHTML = '<p>Debes aprobar la evaluación final para poder ver la información de tu certificado.</p>';
    }
}

function showPasswordModal(type) {
    const modal = document.getElementById('passwordModal');
    const title = document.getElementById('passwordTitle');
    title.textContent = type === 'admin' ? 'Acceso de Administrador' : 'Acceso de Editor';
    modal.dataset.type = type;
    modal.classList.remove('hidden');
    document.getElementById('passwordInput').focus();
}

function setupPasswordModalControls() {
    const modal = document.getElementById('passwordModal');
    const form = document.getElementById('passwordForm');
    const cancelBtn = document.getElementById('passwordCancel');
    const submitBtn = document.getElementById('passwordSubmit');
    const closeBtn = document.getElementById('closePasswordModal');
    
    const closeModal = () => {
        modal.classList.add('hidden');
        form.reset();
        document.getElementById('passwordError').style.display = 'none';
    };

    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    submitBtn.onclick = () => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('passwordInput').value;
        const type = modal.dataset.type;
        const correctPassword = appData.config[`${type}_password`];
        
        if (password === correctPassword) {
            closeModal();
            if (type === 'admin') {
                showSection('adminSection');
                buildAndShowAdminTable();
            }
        } else {
            document.getElementById('passwordError').style.display = 'block';
        }
    });
}

function buildAndShowAdminTable() {
    controlUnificado = appData.matriculados.map(matriculado => {
        const progreso = appData.progreso.find(p => p.dni === matriculado.dni) || {};
        const progresoData = typeof progreso.datos_progreso === 'string' && progreso.datos_progreso ? JSON.parse(progreso.datos_progreso) : (progreso.datos_progreso || {});
        
        const asistS1 = appData.asistentesS1.some(a => a.dni === matriculado.dni);
        const asistS2 = appData.asistentesS2.some(a => a.dni === matriculado.dni);

        return {
            ...matriculado,
            progreso: progresoData,
            estado_evaluacion: progreso.estado_evaluacion || 'Pendiente',
            codigo_certificado: progreso.codigo_certificado,
            asistS1,
            asistS2
        };
    });
    updateProgressTable();
}

function updateProgressTable(filteredData = null) {
    const dataToRender = filteredData || controlUnificado;
    const tableBody = document.getElementById('progressTable').querySelector('tbody');
    tableBody.innerHTML = ''; // Limpiar tabla
    
    dataToRender.forEach((user, index) => {
        const row = tableBody.insertRow();
        const evalAprobada = user.estado_evaluacion === 'Aprobado';
        const certGenerado = !!user.codigo_certificado;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.dni}</td>
            <td>${user.nombres} ${user.apellidos}</td>
            <td>${user.celular}</td>
            <td>${user.certificado.includes('FÍSICO') ? 'Físico' : 'Digital'}</td>
            <td>${user.asistS1 ? '✅' : '❌'}</td>
            <td>${user.asistS2 ? '✅' : '❌'}</td>
            <td>${user.progreso.sesion1 ? '✅' : '❌'}</td>
            <td>${user.progreso.sesion2 ? '✅' : '❌'}</td>
            <td>${evalAprobada ? `✅ (${user.estado_evaluacion})` : '❌'}</td>
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

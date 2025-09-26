// -----------------------------------------------------------------------------
// CONFIGURACIÓN PRINCIPAL - ¡IMPORTANTE!
// -----------------------------------------------------------------------------
// Pega el ID de tu hoja de cálculo aquí. El ID es la parte larga de la URL.
// Ejemplo URL: https://docs.google.com/spreadsheets/d/AQUI_VA_EL_ID/edit
const SPREADSHEET_ID = '12vjbDhpd5qhIsG--VDYM8wZ5vvIBzq-4IYQBIg2K9lc';
// -----------------------------------------------------------------------------


// --- Función Principal de Respuesta a Peticiones GET ---
// Se ejecuta cuando la página web carga los datos iniciales.
function doGet(e) {
  try {
    const data = getInitialData();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error en doGet: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Función Principal de Respuesta a Peticiones POST ---
// Se ejecuta cuando la página web envía datos (registros, progreso, etc.).
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Esperar hasta 30 segundos por el bloqueo para evitar concurrencia.

  try {
    const request = JSON.parse(e.postData.contents);
    let response;

    switch (request.action) {
      case 'registerUser':
        response = registerUser(request.data);
        break;
      case 'updateProgress':
        response = updateProgress(request.data);
        break;
      case 'saveExamAttempt':
        response = saveExamAttempt(request.data);
        break;
      default:
        response = { status: 'error', message: 'Acción no reconocida' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error en doPost: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock(); // Liberar el bloqueo siempre.
  }
}

// --- Lógica de Obtención de Datos (GET) ---

function getInitialData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const getSheetData = (sheetName, parser) => {
    try {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error(`La pestaña "${sheetName}" no fue encontrada.`);
      const jsonData = sheetToJSON(sheet);
      if (!jsonData) throw new Error(`No se pudo convertir la pestaña "${sheetName}" a JSON.`);
      
      if (parser) {
        return parser(jsonData);
      }
      return jsonData;
    } catch (e) {
      Logger.log(`Error procesando la pestaña: ${sheetName}. Detalles: ${e.message}`);
      throw new Error(`Fallo al procesar la pestaña "${sheetName}": ${e.message}`);
    }
  };

  return {
    matriculados: getSheetData('Matriculados'),
    asistentes_sesion1: getSheetData('AsistentesS1'),
    asistentes_sesion2: getSheetData('AsistentesS2'),
    nuevos_registros: getSheetData('NuevosRegistros'),
    progreso: getSheetData('Progreso'),
    modulos: getSheetData('Modulos', parseModules),
    evaluacion: getSheetData('Evaluacion', parseEvaluation),
    configuracion: getSheetData('Configuracion', parseConfig)
  };
}

// --- Lógica de Modificación de Datos (POST) ---

function registerUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('NuevosRegistros');
  
  const allUsers = [...sheetToJSON(ss.getSheetByName('Matriculados')), ...sheetToJSON(sheet)];
  const userExists = allUsers.some(u => u.dni && u.dni.toString() === data.dni.toString());
  
  if (userExists) {
    return { status: 'error', message: 'Este DNI ya ha sido registrado.' };
  }
  
  // SOLUCIÓN DNI '0': Se antepone un apóstrofe para forzar el formato de texto en Sheets.
  const dniAsText = `'${data.dni}`;
  sheet.appendRow([dniAsText, data.nombres, data.apellidos, data.celular, data.email, data.residencia, data.certificado, data.fecha_registro]);
  
  const initialData = getInitialData();
  const isAsistenteS1 = initialData.asistentes_sesion1.some(a => a.dni && a.dni.toString() === data.dni.toString());
  const isAsistenteS2 = initialData.asistentes_sesion2.some(a => a.dni && a.dni.toString() === data.dni.toString());

  const newProgress = {
      step1_completed: isAsistenteS1, step2_completed: false, step3_completed: isAsistenteS2, step4_completed: false, step5_completed: false,
      eval_intentos: 0, eval_aprobado: false, comments: {}, final_score: null, certificate_code: null, last_case_answers: {}
  };
  updateProgress({ dni: data.dni, progressData: newProgress });

  return { status: 'success', message: 'Usuario registrado.', newProgress };
}

function updateProgress(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Progreso');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dniColumnIndex = headers.indexOf('dni');
  const progressColumnIndex = headers.indexOf('datos_progreso');
  
  if (dniColumnIndex === -1 || progressColumnIndex === -1) {
    throw new Error('La hoja "Progreso" debe tener las columnas "dni" y "datos_progreso".');
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let found = false;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][dniColumnIndex] && values[i][dniColumnIndex].toString() === data.dni.toString()) {
      sheet.getRange(i + 1, progressColumnIndex + 1).setValue(JSON.stringify(data.progressData));
      found = true;
      break;
    }
  }
  
  if (!found) {
    const newRow = new Array(headers.length).fill('');
    // SOLUCIÓN DNI '0': Forzar formato de texto al crear la fila de progreso.
    newRow[dniColumnIndex] = `'${data.dni}`;
    newRow[progressColumnIndex] = JSON.stringify(data.progressData);
    sheet.appendRow(newRow);
  }
  
  return { status: 'success', message: 'Progreso actualizado.' };
}

function saveExamAttempt(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('EvaluacionRespuestas');
  const config = parseConfig(sheetToJSON(ss.getSheetByName('Configuracion')));
  
  const isApproved = data.score >= config.nota_minima_aprobacion;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dniColumnIndex = headers.indexOf('dni');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][dniColumnIndex] && values[i][dniColumnIndex].toString() === data.dni.toString()) {
      rowIndex = i + 1;
      break;
    }
  }

  // SOLUCIÓN DNI '0': Forzar formato de texto.
  const newRowData = [`'${data.dni}`, data.timestamp, data.score, isApproved, data.answers_json];
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, newRowData.length).setValues([newRowData]);
  } else {
    sheet.appendRow(newRowData);
  }
  
  let certificateCode = null;
  if (isApproved) {
    certificateCode = generateCertificateCode(ss);
    updateProgressField(ss, data.dni, 'codigo_certificado', certificateCode);
    updateProgressField(ss, data.dni, 'nota_final', data.score);
    updateProgressField(ss, data.dni, 'estado_evaluacion', 'Aprobado');
  } else {
    updateProgressField(ss, data.dni, 'estado_evaluacion', 'Reprobado');
  }

  return { status: 'success', message: 'Intento guardado.', certificate_code: certificateCode };
}

// --- Funciones de Ayuda y Parseo ---

function sheetToJSON(sheet) {
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 1) return [];
  const headers = rows.shift().map(h => h ? h.toString().trim() : '');
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = row[i] !== null && row[i] !== undefined ? row[i].toString() : '';
      }
    });
    return obj;
  });
}

function parseConfig(configData) {
  if (!Array.isArray(configData)) throw new Error("Los datos de configuración no son válidos.");
  const config = { credenciales: {}, palabras_clave: {}, enlaces_grabaciones: {}, opciones_certificado: [] };
  const certDigital = {};
  const certFisico = {};
  configData.forEach(item => {
    if (!item || typeof item.clave !== 'string') return;
    const key = item.clave;
    const value = item.valor;
    if (key.startsWith('cert_digital_')) certDigital[key.replace('cert_digital_', '')] = value;
    else if (key.startsWith('cert_fisico_')) certFisico[key.replace('cert_fisico_', '')] = value;
    else if (key.includes('_password')) config.credenciales[key] = value;
    else if (key.includes('_clave')) config.palabras_clave[key.replace('_clave', '')] = value;
    else if (key.includes('_video')) config.enlaces_grabaciones[key.replace('_video', '')] = value;
    else config[key] = isNaN(value) ? value : Number(value);
  });
  config.opciones_certificado.push(certDigital, certFisico);
  return config;
}

function parseModules(moduleData) {
    if (!Array.isArray(moduleData)) throw new Error("Los datos de módulos no son válidos.");
    const modules = {};
    moduleData.forEach(row => {
        if (!row.id_modulo || !row.titulo_modulo) return;
        if (!modules[row.id_modulo]) {
            modules[row.id_modulo] = { id: row.id_modulo, titulo: row.titulo_modulo, temas: [] };
        }
        if (row.id_tema) {
            modules[row.id_modulo].temas.push({
                id: row.id_tema,
                titulo: row.titulo_tema,
                resumen: row.resumen,
                contenido: row.contenido,
                pregunta: row.pregunta,
                lectura_url: row.lectura_url
            });
        }
    });
    return Object.values(modules);
}

function parseEvaluation(evalData) {
    if (!Array.isArray(evalData)) throw new Error("Los datos de la pestaña 'Evaluacion' no se pudieron leer.");
    const evaluation = { preguntas: [], caso_practico: { titulo: '', descripcion: '', preguntas: [] } };
    evalData.forEach(row => {
        if (!row.id_pregunta) return;
        if (row.id_pregunta === 'pregunta_mc') {
            const correctLetter = (row.respuesta_correcta || '').toString().trim().toUpperCase();
            const correctMap = {'A': 0, 'B': 1};
            evaluation.preguntas.push({
                texto: row.texto,
                opciones: [row.opcion_a, row.opcion_b].filter(Boolean),
                correcta: correctMap[correctLetter]
            });
        } else if (row.id_pregunta === 'caso_titulo') {
            evaluation.caso_practico.titulo = row.texto;
        } else if (row.id_pregunta === 'caso_descripcion') {
            evaluation.caso_practico.descripcion = row.texto;
        } else if (row.id_pregunta === 'pregunta_caso') {
            evaluation.caso_practico.preguntas.push(row.texto);
        }
    });
    return evaluation;
}

function generateCertificateCode(ss) {
    const sheet = ss.getSheetByName('Progreso');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const codeIndex = headers.indexOf('codigo_certificado');
    if (codeIndex === -1) { 
      return (parseConfig(sheetToJSON(ss.getSheetByName('Configuracion'))).correlativo_certificado_base || 25090001).toString();
    }
    
    const range = sheet.getRange(2, codeIndex + 1, sheet.getLastRow());
    const values = range.getValues().flat().filter(String).map(Number).filter(n => !isNaN(n) && n > 0);
    
    if (values.length === 0) {
        return (parseConfig(sheetToJSON(ss.getSheetByName('Configuracion'))).correlativo_certificado_base || 25090001).toString();
    }
    
    const lastCode = Math.max(...values);
    return (lastCode + 1).toString();
}

function updateProgressField(ss, dni, fieldName, value) {
  const sheet = ss.getSheetByName('Progreso');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const fieldIndex = headers.indexOf(fieldName);
  const dniIndex = headers.indexOf('dni');
  
  if (fieldIndex === -1 || dniIndex === -1) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][dniIndex] && data[i][dniIndex].toString() === dni.toString()) {
      sheet.getRange(i + 1, fieldIndex + 1).setValue(value);
      return;
    }
  }
}


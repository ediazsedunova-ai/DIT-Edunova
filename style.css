:root {
  /* Primitive Color Tokens */
  --color-white: rgba(255, 255, 255, 1);
  --color-black: rgba(0, 0, 0, 1);
  --color-background: #f8f9fa;
  --color-surface: #ffffff;
  --color-text: #212529;
  --color-text-secondary: #6c757d;
  --color-border: #dee2e6;
  --color-primary: #007bff;
  --color-primary-hover: #0056b3;
  --color-success: #28a745;
  --color-error: #dc3545;
  --color-warning: #ffc107;
  --color-whatsapp: #25D366;

  /* Sizing & Spacing */
  --space-4: 4px; --space-8: 8px; --space-12: 12px; --space-16: 16px;
  --space-20: 20px; --space-24: 24px; --space-32: 32px;

  /* Appearance */
  --radius-sm: 4px; --radius-base: 6px; --radius-lg: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,.1);
}
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: var(--color-background); color: var(--color-text); line-height: 1.5; }
.container { max-width: 960px; margin: 0 auto; padding: var(--space-20); }

/* Header */
.header { background: linear-gradient(90deg, #0056b3, #007bff); color: white; padding: var(--space-16) var(--space-20); box-shadow: var(--shadow-md); position: sticky; top: 0; z-index: 1000;}
.header-content { display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 12px; }
.logo h1 { margin: 0; font-size: 1.75rem; }
.course-title { text-align: center; }
.course-title h2 { margin: 0; font-size: 1.25rem; }
.course-title p { margin: 0; font-size: 0.9rem; opacity: 0.8; }
.header-actions { display: flex; align-items: center; gap: var(--space-12); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-8); padding: var(--space-8) var(--space-16); border-radius: var(--radius-base); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; text-decoration: none; }
.btn i { line-height: 1; }
.btn--primary { background-color: var(--color-primary); color: white; }
.btn--primary:hover { background-color: var(--color-primary-hover); }
.btn--secondary { background-color: #6c757d; color: white; }
.btn--secondary:hover { background-color: #5a6268; }
.btn--success { background-color: var(--color-success); color: white; }
.btn--outline { background-color: transparent; border-color: var(--color-border); color: var(--color-text); }
.btn--outline:hover { background-color: #f8f9fa; }
.btn--whatsapp { background-color: var(--color-whatsapp); color: white; border-color: var(--color-whatsapp); }
.btn--whatsapp:hover { background-color: #128C7E; }
.btn--sm { padding: var(--space-4) var(--space-12); font-size: 0.8rem; }
.btn--full-width { width: 100%; }
.btn:disabled { opacity: 0.65; cursor: not-allowed; }

/* Forms & Cards */
.card { background-color: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--color-border); }
.card__body { padding: var(--space-24); }
.welcome-card { text-align: center; }
.form-group { margin-bottom: var(--space-16); text-align: left; }
.form-label { display: block; margin-bottom: var(--space-8); font-weight: 500; }
.form-control { display: block; width: 100%; padding: var(--space-8) var(--space-12); font-size: 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-base); box-sizing: border-box; }
.form-actions { display: flex; justify-content: flex-end; gap: var(--space-12); margin-top: var(--space-20); }
.certificado-options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16); }
.option-card { border: 2px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-16); cursor: pointer; transition: all 0.2s ease; }
.option-card:has(input:checked) { border-color: var(--color-primary); background-color: #e7f1ff; }
.option-card input { display: none; }
.checkbox-container { display: flex; align-items: center; gap: var(--space-8); cursor: pointer; }
.checkmark { width: 18px; height: 18px; border: 2px solid var(--color-border); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.checkbox-container input:checked + .checkmark { background-color: var(--color-primary); border-color: var(--color-primary); }
.checkbox-container input:checked + .checkmark::after { content: '✔'; color: white; font-size: 12px; }
.checkbox-container input { display: none; }


/* Steps & Dashboard */
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24); }
.progress-card { margin-bottom: var(--space-24); }
.steps-container { display: flex; flex-direction: column; gap: var(--space-12); }
.step-item { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
.step-header { display: flex; align-items: center; gap: var(--space-16); padding: var(--space-12); background-color: #f8f9fa; cursor: pointer; }
.step-number { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; background-color: var(--color-border); color: var(--color-text-secondary); flex-shrink: 0; }
.step-title { flex-grow: 1; font-weight: 500; }
.step-status { font-size: 0.8rem; font-weight: bold; }
.step-actions { padding: var(--space-16); border-top: 1px solid var(--color-border); }
.step-item.active > .step-header { background-color: #e7f1ff; }
.step-item.active .step-number { background-color: var(--color-primary); color: white; }
.step-item.completed > .step-header { background-color: #d4edda; }
.step-item.completed .step-number { background-color: var(--color-success); color: white; }
.step-item.disabled { background-color: #fdfdfe; opacity: 0.7; }
.step-item.disabled .step-header { cursor: not-allowed; }

/* Certificate Section */
.certificate-section { text-align: center; padding: var(--space-24); border: 2px solid var(--color-success); border-radius: var(--radius-lg); background-color: #f0fff4; margin-top: 2rem;}
.certificate-section h4 { color: var(--color-success); margin-top: 0; font-size: 1.5rem; }
.certificate-section p { margin-bottom: var(--space-8); }
.certificate-section .promo-section { margin-top: var(--space-24); padding-top: var(--space-16); border-top: 1px solid #c3e6cb; }
.promo-section h5 { font-size: 1.1rem; }

/* Admin Panel */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-20); margin-bottom: var(--space-24); }
.stat-card .card__body { display: flex; align-items: center; gap: var(--space-16); }
.stat-card i { font-size: 2rem; color: var(--color-primary); }
.stat-card h4 { margin: 0; font-size: 1.5rem; }
.table-container { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;}
.table th, .table td { padding: var(--space-8) var(--space-12); text-align: left; border-bottom: 1px solid var(--color-border); }
.table th { background-color: #f8f9fa; }
.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
.status-completed { background-color: #d4edda; color: #155724; }
.status-pending { background-color: #fff3cd; color: #856404; }

/* Evaluation Specific Styles */
.question-item { border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-16); }
.question-text { font-weight: 500; margin-bottom: var(--space-12); }
.question-options { display: flex; flex-direction: column; gap: var(--space-8); }
.option-item { display: flex; align-items: center; gap: var(--space-8); padding: var(--space-8); border-radius: var(--radius-sm); cursor: pointer; }
.option-item:hover { background-color: #f8f9fa; }
.option-item span { flex-grow: 1; }
.case-study-section { margin-top: var(--space-32); }
.case-description { background-color: #e7f1ff; padding: var(--space-12); border-radius: var(--radius-base); margin-bottom: var(--space-16); border-left: 4px solid var(--color-primary); }
.exam-info { background-color: #fff3cd; padding: var(--space-12); border-radius: var(--radius-base); margin-bottom: var(--space-16); border-left: 4px solid var(--color-warning); }

/* Utilities & Modals */
.error-message { background-color: #f8d7da; color: #721c24; padding: var(--space-12); border-radius: var(--radius-base); margin-top: var(--space-16); }
.success-message { background-color: #d4edda; color: #155724; padding: var(--space-12); border-radius: var(--radius-base); }
#loadingSpinner { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.8); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.spinner { border: 8px solid #f3f3f3; border-top: 8px solid var(--color-primary); border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1050; }
.modal.hidden { display: none; }
.modal-content { background: var(--color-surface); border-radius: var(--radius-lg); max-width: 500px; width: 90%; }
.modal-header { padding: var(--space-16); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
.modal-body { padding: var(--space-20); }
.modal-footer { padding: var(--space-12) var(--space-20); text-align: right; border-top: 1px solid var(--color-border); }
.char-counter { font-size: 0.75rem; text-align: right; color: var(--color-text-secondary); }
.question-item.correct { border-left: 4px solid var(--color-success); background-color: #f0fff4; }
.question-item.incorrect { border-left: 4px solid var(--color-error); background-color: #fff0f1; }
.option-item.correct-answer { background-color: #d4edda !important; font-weight: bold; }
.option-item.incorrect { background-color: #f8d7da !important; }


@media (max-width: 768px) {
    .header-content { flex-direction: column; gap: var(--space-12); }
    .course-title { text-align: center; }
    .certificado-options { grid-template-columns: 1fr; }
}


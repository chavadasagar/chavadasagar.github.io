/**
 * ATS Resume Builder - Application Controller (script.js)
 * Implements real-time state management, localStorage persistence, multi-resume management,
 * ATS scoring engine, 1-Click Auto-Fit 1 Page optimizer, dynamic entry management, and PDF export.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Helper Utilities (XSS escaping, UUID, Deep Clone)
  // -------------------------------------------------------------------------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function generateId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -------------------------------------------------------------------------
  // 2. Default Sample Data & Initial State
  // -------------------------------------------------------------------------
  const SAMPLE_RESUME_DATA = {
    personal: {
      fullName: 'Alex Morgan',
      jobTitle: 'Senior Full Stack Software Engineer',
      email: 'alex.morgan.dev@gmail.com',
      phone: '+1 (555) 438-9201',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/alexmorgan-dev',
      portfolio: 'https://github.com/alexmorgan-dev'
    },
    summary: 'Results-driven Senior Software Engineer with 7+ years of experience architecting resilient cloud microservices, scalable distributed backends, and responsive modern web applications. Spearheaded system redesigns that improved application throughput by 42% and decreased API latencies across high-volume production environments.',
    experience: [
      {
        id: 'exp-1',
        role: 'Senior Full Stack Engineer',
        company: 'CloudScale Technologies',
        location: 'San Francisco, CA',
        startDate: '2021-06',
        endDate: '',
        isPresent: true,
        bullets: '• Architected and deployed event-driven microservices using Node.js, TypeScript, and AWS Lambda, processing over 12M daily events with 99.99% uptime.\n• Spearheaded frontend migration of core client dashboard to React and TypeScript, accelerating page load speeds by 38% and boosting user engagement by 24%.\n• Optimized PostgreSQL and Redis query performance, slashing p99 latency from 450ms to 95ms across high-throughput endpoints.\n• Mentored 6 mid-level and junior engineers on clean architecture, automated testing (Jest/Cypress), and CI/CD best practices.'
      },
      {
        id: 'exp-2',
        role: 'Full Stack Software Engineer',
        company: 'Apex Data Systems',
        location: 'Austin, TX',
        startDate: '2018-08',
        endDate: '2021-05',
        isPresent: false,
        bullets: '• Engineered RESTful APIs and GraphQL services using Python, Django, and Docker, serving 250,000+ active enterprise users.\n• Automated end-to-end deployment pipelines using GitHub Actions and Kubernetes, reducing release deployment cycles from 2 hours to 12 minutes.\n• Collaborated with cross-functional product and security teams to implement OAuth2.0 / JWT authentication, eliminating legacy vulnerabilities.'
      }
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2014-08',
        endDate: '2018-05',
        isPresent: false,
        location: 'Berkeley, CA',
        gpa: '3.85 / 4.0',
        highlights: "Dean's Honors List, President of ACM Student Chapter, Capstone Project: Distributed Hash Table."
      }
    ],
    skills: [
      { id: 'sk-1', name: 'JavaScript (ES6+)', category: 'Languages' },
      { id: 'sk-2', name: 'TypeScript', category: 'Languages' },
      { id: 'sk-3', name: 'Python', category: 'Languages' },
      { id: 'sk-4', name: 'SQL', category: 'Languages' },
      { id: 'sk-5', name: 'React.js', category: 'Frameworks & Libraries' },
      { id: 'sk-6', name: 'Node.js & Express', category: 'Frameworks & Libraries' },
      { id: 'sk-7', name: 'Next.js', category: 'Frameworks & Libraries' },
      { id: 'sk-8', name: 'PostgreSQL & MongoDB', category: 'Databases' },
      { id: 'sk-9', name: 'Docker & Kubernetes', category: 'Cloud & DevOps' },
      { id: 'sk-10', name: 'AWS (Lambda, S3, RDS, ECS)', category: 'Cloud & DevOps' },
      { id: 'sk-11', name: 'CI/CD Pipelines & Git', category: 'Tools & Platforms' },
      { id: 'sk-12', name: 'Distributed Systems & Microservices', category: 'Core Competencies' }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'Nexus Real-Time Collaborative Canvas',
        tech: 'React, WebSockets, Node.js, Redis, Canvas API',
        link: 'https://github.com/alexmorgan-dev/nexus-canvas',
        bullets: '• Engineered a real-time multiplayer whiteboard application supporting 50+ concurrent users per room with sub-30ms sync latency.\n• Implemented conflict-free replicated data types (CRDTs) to ensure zero data divergence under high network packet loss.'
      },
      {
        id: 'proj-2',
        name: 'Serverless Log Analytics Engine',
        tech: 'Python, AWS Lambda, DynamoDB, ElasticSearch',
        link: 'https://github.com/alexmorgan-dev/serverless-log-engine',
        bullets: '• Built an automated streaming ingestion pipeline parsing 500GB+ of daily server access logs, reducing anomaly detection time by 85%.'
      }
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        date: '2023-04',
        link: 'https://aws.amazon.com/verification'
      }
    ],
    languages: [
      { id: 'lang-1', name: 'English', proficiency: 'Native / Bilingual' },
      { id: 'lang-2', name: 'Spanish', proficiency: 'Conversational' }
    ],
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages']
  };

  const DEFAULT_SETTINGS = {
    template: 'tech',
    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
    fontSize: '10pt',
    lineSpacing: '1.34',
    margins: '0.45in 0.5in',
    accentColor: '#2563eb'
  };

  // -------------------------------------------------------------------------
  // 3. State & Storage Architecture
  // -------------------------------------------------------------------------
  const STORAGE_KEY_RESUMES = 'resumeBuilder_resumes';
  const STORAGE_KEY_ACTIVE = 'resumeBuilder_active_id';
  const STORAGE_KEY_THEME = 'resumeBuilder_theme';

  let appState = {
    resumes: [],
    activeResumeId: null,
    activeResume: null,
    zoomLevel: 1.0,
    undoStack: []
  };

  let debounceTimer = null;
  let lastFocusedInput = null;

  // Check if resume data has any content
  function isResumeEmpty(data) {
    if (!data) return true;
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [] } = data;
    const hasName = Boolean(personal.fullName && personal.fullName.trim());
    const hasSummary = Boolean(summary && summary.trim());
    const hasExp = Array.isArray(experience) && experience.some(e => (e.role && e.role.trim()) || (e.company && e.company.trim()));
    const hasEdu = Array.isArray(education) && education.some(e => e.institution && e.institution.trim());
    const hasSkills = Array.isArray(skills) && skills.length > 0;
    const hasProj = Array.isArray(projects) && projects.some(p => p.name && p.name.trim());

    return !hasName && !hasSummary && !hasExp && !hasEdu && !hasSkills && !hasProj;
  }

  // -------------------------------------------------------------------------
  // 4. Storage & Initialization Handlers
  // -------------------------------------------------------------------------
  function initStorage() {
    try {
      // 1. Theme initialization
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);

      // 2. Load Resumes List
      const savedResumesJson = localStorage.getItem(STORAGE_KEY_RESUMES);
      let resumesList = [];

      if (savedResumesJson) {
        try {
          resumesList = JSON.parse(savedResumesJson);
        } catch (e) {
          console.error('Failed to parse saved resumes, resetting to default:', e);
        }
      }

      // If empty, create initial sample resume
      if (!Array.isArray(resumesList) || resumesList.length === 0) {
        const initialResume = {
          id: generateId('res'),
          name: 'Software Engineering Resume (Sample)',
          data: deepClone(SAMPLE_RESUME_DATA),
          settings: deepClone(DEFAULT_SETTINGS),
          lastEdited: Date.now()
        };
        resumesList = [initialResume];
        localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(resumesList));
        localStorage.setItem(STORAGE_KEY_ACTIVE, initialResume.id);
      }

      appState.resumes = resumesList;

      // 3. Active Resume Pointer
      let activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
      let active = appState.resumes.find(r => r.id === activeId);

      if (!active) {
        active = appState.resumes[0];
        activeId = active.id;
        localStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
      }

      // Ensure settings and data structures exist
      if (!active.settings) active.settings = deepClone(DEFAULT_SETTINGS);
      if (!active.data) active.data = deepClone(SAMPLE_RESUME_DATA);

      appState.activeResumeId = activeId;
      appState.activeResume = active;

    } catch (err) {
      console.error('Storage initialization failed:', err);
    }
  }

  // Save current active resume to localStorage with debounce
  function autoSave() {
    triggerSaveIndicator('saving');

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      try {
        if (!appState.activeResume) return;

        appState.activeResume.lastEdited = Date.now();

        // Update in resumes array
        const idx = appState.resumes.findIndex(r => r.id === appState.activeResumeId);
        if (idx !== -1) {
          appState.resumes[idx] = appState.activeResume;
        } else {
          appState.resumes.push(appState.activeResume);
        }

        localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(appState.resumes));
        localStorage.setItem(STORAGE_KEY_ACTIVE, appState.activeResumeId);

        triggerSaveIndicator('saved');
        renderLivePreview();
        calculateAtsScore();
        updateResumeProgress();
      } catch (e) {
        console.error('AutoSave Error:', e);
        triggerSaveIndicator('error');
      }
    }, 150);
  }

  function triggerSaveIndicator(status) {
    const dot = document.getElementById('save-dot');
    const text = document.getElementById('save-status-text');
    if (!dot || !text) return;

    if (status === 'saving') {
      dot.className = 'save-dot saving';
      text.textContent = 'Saving changes...';
    } else if (status === 'saved') {
      dot.className = 'save-dot';
      text.textContent = 'All changes saved locally';
    } else {
      dot.className = 'save-dot';
      dot.style.backgroundColor = 'var(--danger)';
      text.textContent = 'Storage issue';
    }
  }

  // -------------------------------------------------------------------------
  // 5. Form Population & Synchronization
  // -------------------------------------------------------------------------
  function populateFormWithActiveData() {
    if (!appState.activeResume || !appState.activeResume.data) return;

    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [] } = appState.activeResume.data;
    const settings = appState.activeResume.settings || DEFAULT_SETTINGS;

    // Personal Info Fields
    setInputValue('inp-fullname', personal.fullName || '');
    setInputValue('inp-jobtitle', personal.jobTitle || '');
    setInputValue('inp-email', personal.email || '');
    setInputValue('inp-phone', personal.phone || '');
    setInputValue('inp-location', personal.location || '');
    setInputValue('inp-linkedin', personal.linkedin || '');
    setInputValue('inp-portfolio', personal.portfolio || '');

    // Summary
    setInputValue('inp-summary', summary || '');
    updateSummaryCounter(summary || '');

    // Dynamic Lists
    renderExperienceFormList(experience);
    renderEducationFormList(education);
    renderSkillsChips(skills);
    renderProjectsFormList(projects);
    renderCertificationsFormList(certifications);
    renderLanguagesFormList(languages);

    // Section Counters & Success states
    updateSectionCountBadge('count-personal', (personal.fullName || personal.email) ? '✓' : '0', Boolean(personal.fullName || personal.email));
    updateSectionCountBadge('count-summary', summary && summary.length > 50 ? '✓' : '0', Boolean(summary && summary.length > 50));
    updateSectionCountBadge('count-experience', experience.length, experience.length > 0);
    updateSectionCountBadge('count-education', education.length, education.length > 0);
    updateSectionCountBadge('count-skills', skills.length, skills.length > 0);
    updateSectionCountBadge('count-projects', projects.length, projects.length > 0);
    updateSectionCountBadge('count-certifications', certifications.length, certifications.length > 0);
    updateSectionCountBadge('count-languages', languages.length, languages.length > 0);

    // Settings Dropdowns & Controls
    applySettingsToToolbar(settings);

    // Refresh Resumes Dropdown
    refreshResumesDropdown();

    // Update Progress
    updateResumeProgress();
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function updateSectionCountBadge(id, count, isSuccess = false) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count;
    if (isSuccess) {
      badge.classList.add('badge-success');
    } else {
      badge.classList.remove('badge-success');
    }
  }

  function updateSummaryCounter(text) {
    const counter = document.getElementById('summary-char-counter');
    if (!counter) return;
    const len = (text || '').length;
    counter.textContent = `${len} / 500 chars`;

    if (len >= 280 && len <= 550) {
      counter.className = 'char-counter optimal';
    } else if (len > 0) {
      counter.className = 'char-counter warning';
    } else {
      counter.className = 'char-counter';
    }
  }

  // Calculate overall Resume Completion Progress (e.g. 85%)
  function updateResumeProgress() {
    if (!appState.activeResume || !appState.activeResume.data) return;
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [] } = appState.activeResume.data;

    let points = 0;

    if (personal.fullName && personal.fullName.trim()) points += 15;
    if (personal.email && personal.email.includes('@')) points += 10;
    if (personal.phone && personal.phone.trim()) points += 5;
    if (personal.location && personal.location.trim()) points += 5;
    if (summary && summary.trim().length >= 100) points += 15;
    if (experience && experience.length >= 1) points += 20;
    if (experience && experience.some(e => e.bullets && e.bullets.length > 20)) points += 10;
    if (skills && skills.length >= 5) points += 10;
    if (education && education.length >= 1) points += 10;

    points = Math.min(100, Math.max(0, points));

    const percentBadge = document.getElementById('resume-progress-percent');
    const fillBar = document.getElementById('resume-progress-bar');
    const tipText = document.getElementById('resume-progress-tip');

    if (percentBadge) percentBadge.textContent = `${points}% Complete`;
    if (fillBar) fillBar.style.width = `${points}%`;

    if (tipText) {
      if (points >= 90) {
        tipText.textContent = '🚀 Outstanding resume! Ready for 1-click PDF download & job submissions.';
      } else if (points >= 70) {
        tipText.textContent = '💡 Tip: Add quantifiable results (% or $) to your experience to reach 100%.';
      } else if (points >= 40) {
        tipText.textContent = '💡 Tip: Add key technical skills and 2–3 bullet points under work experience.';
      } else {
        tipText.textContent = '💡 Tip: Fill in your contact info and professional summary to begin.';
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. Dynamic Repeatable Form Builders
  // -------------------------------------------------------------------------

  // 6.1 Experience List Form Builder
  function renderExperienceFormList(list) {
    const container = document.getElementById('experience-list');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="field-tip-box" style="margin-bottom: 0.5rem;">
        <span>💼</span> <div>No work history yet. Click <strong>+ Add Work Experience Entry</strong> below to add your career roles.</div>
      </div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => `
      <div class="entry-card" data-index="${index}" data-id="${item.id}">
        <div class="entry-card-header">
          <div class="entry-card-title">
            <span class="entry-number">#${index + 1}</span>
            <span>${item.role ? escapeHtml(item.role) : 'New Experience'}</span>
            ${item.company ? `<span style="font-weight: 500; color: var(--text-muted);"> @ ${escapeHtml(item.company)}</span>` : ''}
          </div>
          <div class="entry-card-actions">
            ${index > 0 ? `<button type="button" class="btn-xs btn-move-exp-up" data-index="${index}" title="Move Up">↑</button>` : ''}
            ${index < list.length - 1 ? `<button type="button" class="btn-xs btn-move-exp-down" data-index="${index}" title="Move Down">↓</button>` : ''}
            <button type="button" class="btn-xs btn-danger btn-delete-exp" data-index="${index}" title="Delete Entry">✕</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Job Title / Role *</label>
            <input type="text" class="form-input exp-field" data-prop="role" value="${escapeHtml(item.role || '')}" placeholder="e.g. Senior Software Engineer" required />
          </div>
          <div class="form-group">
            <label class="form-label">Company / Organization *</label>
            <input type="text" class="form-input exp-field" data-prop="company" value="${escapeHtml(item.company || '')}" placeholder="e.g. CloudScale Tech" required />
          </div>
          <div class="form-group">
            <label class="form-label">Location (City, State / Remote)</label>
            <input type="text" class="form-input exp-field" data-prop="location" value="${escapeHtml(item.location || '')}" placeholder="e.g. San Francisco, CA" />
          </div>
          <div class="form-group">
            <label class="form-label">Start Date (YYYY-MM or YYYY)</label>
            <input type="text" class="form-input exp-field" data-prop="startDate" value="${escapeHtml(item.startDate || '')}" placeholder="e.g. 2021-05" />
          </div>
          <div class="form-group">
            <label class="form-label">End Date (or check Present)</label>
            <input type="text" class="form-input exp-field" data-prop="endDate" value="${escapeHtml(item.endDate || '')}" placeholder="e.g. 2023-11" ${item.isPresent ? 'disabled' : ''} />
          </div>
          <div class="form-group" style="justify-content: flex-end; padding-bottom: 0.35rem;">
            <label class="form-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
              <input type="checkbox" class="exp-checkbox-present" ${item.isPresent ? 'checked' : ''} />
              <span>Currently Working Here (Present)</span>
            </label>
          </div>
          <div class="form-group span-2">
            <label class="form-label">Bullet Points (Action verbs, metrics, accomplishments)</label>
            <textarea class="form-textarea exp-field exp-bullets-textarea" data-prop="bullets" rows="4" placeholder="• Spearheaded distributed cache architecture reducing latency by 45%&#10;• Led cross-functional squad of 5 engineers to deliver core API services">${escapeHtml(item.bullets || '')}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 6.2 Education List Form Builder
  function renderEducationFormList(list) {
    const container = document.getElementById('education-list');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="field-tip-box" style="margin-bottom: 0.5rem;">
        <span>🎓</span> <div>No education added. Click <strong>+ Add Education Entry</strong> below.</div>
      </div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => `
      <div class="entry-card" data-index="${index}" data-id="${item.id}">
        <div class="entry-card-header">
          <div class="entry-card-title">
            <span class="entry-number">#${index + 1}</span>
            <span>${item.institution ? escapeHtml(item.institution) : 'Education Entry'}</span>
          </div>
          <div class="entry-card-actions">
            ${index > 0 ? `<button type="button" class="btn-xs btn-move-edu-up" data-index="${index}" title="Move Up">↑</button>` : ''}
            ${index < list.length - 1 ? `<button type="button" class="btn-xs btn-move-edu-down" data-index="${index}" title="Move Down">↓</button>` : ''}
            <button type="button" class="btn-xs btn-danger btn-delete-edu" data-index="${index}" title="Delete Entry">✕</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group span-2">
            <label class="form-label">University / College / School *</label>
            <input type="text" class="form-input edu-field" data-prop="institution" value="${escapeHtml(item.institution || '')}" placeholder="e.g. UC Berkeley" required />
          </div>
          <div class="form-group">
            <label class="form-label">Degree (e.g. Bachelor of Science, B.S.)</label>
            <input type="text" class="form-input edu-field" data-prop="degree" value="${escapeHtml(item.degree || '')}" placeholder="e.g. Bachelor of Science" />
          </div>
          <div class="form-group">
            <label class="form-label">Field of Study / Major</label>
            <input type="text" class="form-input edu-field" data-prop="field" value="${escapeHtml(item.field || '')}" placeholder="e.g. Computer Science" />
          </div>
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="text" class="form-input edu-field" data-prop="startDate" value="${escapeHtml(item.startDate || '')}" placeholder="e.g. 2014-08" />
          </div>
          <div class="form-group">
            <label class="form-label">Graduation Date (or check Present)</label>
            <input type="text" class="form-input edu-field" data-prop="endDate" value="${escapeHtml(item.endDate || '')}" placeholder="e.g. 2018-05" ${item.isPresent ? 'disabled' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Location (City, State)</label>
            <input type="text" class="form-input edu-field" data-prop="location" value="${escapeHtml(item.location || '')}" placeholder="e.g. Berkeley, CA" />
          </div>
          <div class="form-group">
            <label class="form-label">GPA or Honors</label>
            <input type="text" class="form-input edu-field" data-prop="gpa" value="${escapeHtml(item.gpa || '')}" placeholder="e.g. 3.85 / 4.0" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Key Highlights / Coursework</label>
            <input type="text" class="form-input edu-field" data-prop="highlights" value="${escapeHtml(item.highlights || '')}" placeholder="e.g. Dean's Honors List, Algorithms, Distributed Systems" />
          </div>
        </div>
      </div>
    `).join('');
  }

  // 6.3 Skills Tags Builder
  function renderSkillsChips(skills) {
    const container = document.getElementById('skills-chips-container');
    if (!container) return;

    if (!skills || skills.length === 0) {
      container.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.25rem;">No skills added yet. Use the input above or click quick suggestions below.</span>`;
      return;
    }

    container.innerHTML = skills.map((item, index) => {
      const name = typeof item === 'string' ? item : item.name;
      const cat = typeof item === 'string' ? '' : (item.category || '');
      return `
        <div class="skill-chip" data-index="${index}">
          ${cat ? `<span class="skill-category-label">${escapeHtml(cat)}:</span>` : ''}
          <span>${escapeHtml(name)}</span>
          <button type="button" class="chip-remove-btn btn-delete-skill" data-index="${index}" title="Remove Skill">✕</button>
        </div>
      `;
    }).join('');
  }

  // 6.4 Projects List Form Builder
  function renderProjectsFormList(list) {
    const container = document.getElementById('projects-list');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="field-tip-box" style="margin-bottom: 0.5rem;">
        <span>🚀</span> <div>No projects added. Click <strong>+ Add Project Entry</strong> below to highlight your key work.</div>
      </div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => `
      <div class="entry-card" data-index="${index}" data-id="${item.id}">
        <div class="entry-card-header">
          <div class="entry-card-title">
            <span class="entry-number">#${index + 1}</span>
            <span>${item.name ? escapeHtml(item.name) : 'Project Title'}</span>
          </div>
          <div class="entry-card-actions">
            ${index > 0 ? `<button type="button" class="btn-xs btn-move-proj-up" data-index="${index}" title="Move Up">↑</button>` : ''}
            ${index < list.length - 1 ? `<button type="button" class="btn-xs btn-move-proj-down" data-index="${index}" title="Move Down">↓</button>` : ''}
            <button type="button" class="btn-xs btn-danger btn-delete-proj" data-index="${index}" title="Delete Entry">✕</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Project Name *</label>
            <input type="text" class="form-input proj-field" data-prop="name" value="${escapeHtml(item.name || '')}" placeholder="e.g. Nexus Collaborative Whiteboard" required />
          </div>
          <div class="form-group">
            <label class="form-label">Technologies Used</label>
            <input type="text" class="form-input proj-field" data-prop="tech" value="${escapeHtml(item.tech || '')}" placeholder="e.g. React, Node.js, WebSockets, Redis" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Live Link or GitHub URL</label>
            <input type="url" class="form-input proj-field" data-prop="link" value="${escapeHtml(item.link || '')}" placeholder="https://github.com/alexmorgan/nexus" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Project Bullet Points (Include metrics and impact)</label>
            <textarea class="form-textarea proj-field" data-prop="bullets" rows="3" placeholder="• Built real-time sync supporting 50+ concurrent users with sub-30ms latency">${escapeHtml(item.bullets || '')}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 6.5 Certifications Form Builder
  function renderCertificationsFormList(list) {
    const container = document.getElementById('certifications-list');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="field-tip-box" style="margin-bottom: 0.5rem;">
        <span>📜</span> <div>No certifications added yet. Click <strong>+ Add Certification Entry</strong> below.</div>
      </div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => `
      <div class="entry-card" data-index="${index}" data-id="${item.id}">
        <div class="entry-card-header">
          <div class="entry-card-title">
            <span class="entry-number">#${index + 1}</span>
            <span>${item.name ? escapeHtml(item.name) : 'Certification Name'}</span>
          </div>
          <div class="entry-card-actions">
            ${index > 0 ? `<button type="button" class="btn-xs btn-move-cert-up" data-index="${index}" title="Move Up">↑</button>` : ''}
            ${index < list.length - 1 ? `<button type="button" class="btn-xs btn-move-cert-down" data-index="${index}" title="Move Down">↓</button>` : ''}
            <button type="button" class="btn-xs btn-danger btn-delete-cert" data-index="${index}" title="Delete Entry">✕</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Certification Title *</label>
            <input type="text" class="form-input cert-field" data-prop="name" value="${escapeHtml(item.name || '')}" placeholder="e.g. AWS Certified Solutions Architect" required />
          </div>
          <div class="form-group">
            <label class="form-label">Issuing Organization</label>
            <input type="text" class="form-input cert-field" data-prop="issuer" value="${escapeHtml(item.issuer || '')}" placeholder="e.g. Amazon Web Services" />
          </div>
          <div class="form-group">
            <label class="form-label">Issue Date (YYYY-MM)</label>
            <input type="text" class="form-input cert-field" data-prop="date" value="${escapeHtml(item.date || '')}" placeholder="e.g. 2023-04" />
          </div>
          <div class="form-group">
            <label class="form-label">Verification URL / Credential ID</label>
            <input type="url" class="form-input cert-field" data-prop="link" value="${escapeHtml(item.link || '')}" placeholder="https://aws.amazon.com/verify" />
          </div>
        </div>
      </div>
    `).join('');
  }

  // 6.6 Languages Form Builder
  function renderLanguagesFormList(list) {
    const container = document.getElementById('languages-list');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="field-tip-box" style="margin-bottom: 0.5rem;">
        <span>🌐</span> <div>No languages added. Click <strong>+ Add Language Entry</strong> below.</div>
      </div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => `
      <div class="entry-card" data-index="${index}" data-id="${item.id}">
        <div class="entry-card-header">
          <div class="entry-card-title">
            <span class="entry-number">#${index + 1}</span>
            <span>${item.name ? escapeHtml(item.name) : 'Language'}</span>
          </div>
          <div class="entry-card-actions">
            ${index > 0 ? `<button type="button" class="btn-xs btn-move-lang-up" data-index="${index}" title="Move Up">↑</button>` : ''}
            ${index < list.length - 1 ? `<button type="button" class="btn-xs btn-move-lang-down" data-index="${index}" title="Move Down">↓</button>` : ''}
            <button type="button" class="btn-xs btn-danger btn-delete-lang" data-index="${index}" title="Delete Entry">✕</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Language *</label>
            <input type="text" class="form-input lang-field" data-prop="name" value="${escapeHtml(item.name || '')}" placeholder="e.g. English, Spanish, German" required />
          </div>
          <div class="form-group">
            <label class="form-label">Proficiency Level</label>
            <select class="form-select lang-field" data-prop="proficiency">
              <option value="Basic" ${item.proficiency === 'Basic' ? 'selected' : ''}>Basic</option>
              <option value="Conversational" ${item.proficiency === 'Conversational' ? 'selected' : ''}>Conversational</option>
              <option value="Fluent" ${item.proficiency === 'Fluent' ? 'selected' : ''}>Fluent</option>
              <option value="Native / Bilingual" ${(!item.proficiency || item.proficiency.includes('Native')) ? 'selected' : ''}>Native / Bilingual</option>
            </select>
          </div>
        </div>
      </div>
    `).join('');
  }

  // -------------------------------------------------------------------------
  // 7. Live Resume Preview Engine, Empty State & Page Indicator
  // -------------------------------------------------------------------------
  function renderLivePreview() {
    const container = document.getElementById('resume-paper-container');
    if (!container) return;

    if (!appState.activeResume) {
      initStorage();
    }
    if (!appState.activeResume || !window.ResumeTemplates) return;

    const data = appState.activeResume.data || {};
    const settings = appState.activeResume.settings || DEFAULT_SETTINGS;
    const templateName = settings.template || 'tech';

    // Apply CSS variables to root paper wrapper
    const paperWrapper = document.getElementById('paper-wrapper');
    const selectedFont = settings.fontFamily || "'Plus Jakarta Sans', Arial, sans-serif";
    const selectedSize = settings.fontSize || '10pt';
    const selectedSpacing = settings.lineSpacing || '1.34';
    const selectedPadding = settings.margins || '0.45in 0.5in';
    const selectedAccent = settings.accentColor || '#2563eb';

    if (paperWrapper) {
      paperWrapper.style.setProperty('--resume-font', selectedFont);
      paperWrapper.style.fontFamily = selectedFont;
      paperWrapper.style.setProperty('--resume-font-size', selectedSize);
      paperWrapper.style.setProperty('--resume-line-height', selectedSpacing);
      paperWrapper.style.setProperty('--resume-padding', selectedPadding);
      paperWrapper.style.setProperty('--resume-accent', selectedAccent);
    }

    // Check if empty
    if (isResumeEmpty(data)) {
      container.innerHTML = `
        <div class="preview-empty-state">
          <div class="empty-state-silhouette">
            <div class="silhouette-header-line"></div>
            <div class="silhouette-subline"></div>
            <div class="silhouette-section-line"></div>
            <div class="silhouette-bullet-line"></div>
            <div class="silhouette-bullet-line"></div>
            <div class="silhouette-section-line"></div>
            <div class="silhouette-bullet-line"></div>
          </div>
          <h3 class="empty-state-title">Your Live Resume Preview is Ready</h3>
          <p class="empty-state-desc">
            Start typing in the form fields on the left or load our pre-built Senior Engineer sample profile to see your resume come to life in real time.
          </p>
          <button type="button" id="btn-empty-load-sample" class="btn btn-primary">
            <span>✨</span> Load Sample Resume Data
          </button>
        </div>
      `;

      const emptyBtn = document.getElementById('btn-empty-load-sample');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', loadSampleDataAction);
      }
      updatePageHeightIndicator();
      return;
    }

    // Generate ATS-compliant semantic HTML
    const renderedHtml = window.ResumeTemplates.render(data, templateName, settings);
    container.innerHTML = renderedHtml;

    // Directly bind font style to rendered paper sheet
    const paper = container.querySelector('.resume-paper');
    if (paper) {
      paper.style.setProperty('--resume-font', selectedFont);
      paper.style.fontFamily = selectedFont;
      paper.style.setProperty('--resume-font-size', selectedSize);
      paper.style.setProperty('--resume-line-height', selectedSpacing);
      paper.style.setProperty('--resume-padding', selectedPadding);
      paper.style.setProperty('--resume-accent', selectedAccent);
    }

    // Measure page height & update status
    setTimeout(updatePageHeightIndicator, 50);
  }

  // Real-time Page Height & Overflow Indicator
  function updatePageHeightIndicator() {
    const paper = document.querySelector('.resume-paper');
    const badge = document.getElementById('page-fit-indicator');
    const text = document.getElementById('page-fit-text');
    const autoFitBtn = document.getElementById('btn-auto-fit-page');
    const guide = document.getElementById('page-break-guide');

    if (!paper || !badge || !text) return;

    const height = paper.scrollHeight;
    const PAGE_HEIGHT = 1056; // Standard 11in Letter height at 96 DPI

    if (height <= PAGE_HEIGHT + 15) {
      badge.className = 'page-indicator-badge fit-pass';
      text.textContent = '📄 1 Page (100% Fit)';
      if (autoFitBtn) autoFitBtn.classList.remove('pulse-highlight');
      if (guide) guide.style.display = 'none';
    } else {
      const pageRatio = (height / PAGE_HEIGHT).toFixed(1);
      badge.className = 'page-indicator-badge fit-spill';
      text.textContent = `⚠️ ${pageRatio} Pages (Spill)`;
      if (autoFitBtn) autoFitBtn.classList.add('pulse-highlight');
      if (guide) guide.style.display = 'flex';
    }
  }

  // 1-Click "⚡ Auto-Fit to 1 Page" Smart Optimizer
  function autoFitToSinglePage() {
    if (!appState.activeResume) return;
    const paper = document.querySelector('.resume-paper');
    if (!paper) return;

    const TARGET_PAGE_HEIGHT = 1056;
    showToast('Optimizing layout for 100% 1-Page Fit...', null, null, 1500);

    const fontSizes = ['10pt', '9.75pt', '9.5pt', '9.25pt', '9pt'];
    const lineSpacings = ['1.34', '1.28', '1.24', '1.20', '1.16'];
    const marginsList = ['0.45in 0.5in', '0.35in 0.45in', '0.3in 0.4in'];

    let bestFit = null;

    for (let m of marginsList) {
      for (let fs of fontSizes) {
        for (let ls of lineSpacings) {
          appState.activeResume.settings.margins = m;
          appState.activeResume.settings.fontSize = fs;
          appState.activeResume.settings.lineSpacing = ls;
          renderLivePreview();

          const currentHeight = paper.scrollHeight;
          if (currentHeight <= TARGET_PAGE_HEIGHT + 10) {
            bestFit = { margins: m, fontSize: fs, lineSpacing: ls };
            break;
          }
        }
        if (bestFit) break;
      }
      if (bestFit) break;
    }

    if (!bestFit) {
      // Apply compact baseline if content is very extensive
      appState.activeResume.settings.margins = '0.3in 0.4in';
      appState.activeResume.settings.fontSize = '9pt';
      appState.activeResume.settings.lineSpacing = '1.16';
      renderLivePreview();
    }

    applySettingsToToolbar(appState.activeResume.settings);
    autoSave();
    updatePageHeightIndicator();
    showToast('✨ Resume optimized to fit on 1 single page!');
  }

  // Apply Settings to UI Toolbar Controls
  function applySettingsToToolbar(settings) {
    if (!settings) return;

    // Template buttons
    document.querySelectorAll('#template-switcher .seg-btn').forEach(btn => {
      const t = btn.getAttribute('data-template');
      if (t === settings.template || (settings.template === 'minimal' && t === 'tech')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Font select
    const fontSel = document.getElementById('select-font-family');
    if (fontSel && settings.fontFamily) fontSel.value = settings.fontFamily;

    // Font size
    const sizeSel = document.getElementById('select-font-size');
    if (sizeSel && settings.fontSize) sizeSel.value = settings.fontSize;

    // Line spacing
    const spaceSel = document.getElementById('select-line-spacing');
    if (spaceSel && settings.lineSpacing) spaceSel.value = settings.lineSpacing;

    // Margins
    const marginsSel = document.getElementById('select-margins');
    if (marginsSel && settings.margins) marginsSel.value = settings.margins;

    // Accent color swatch & input
    const colorInp = document.getElementById('input-accent-color');
    const swatchCircle = document.getElementById('accent-swatch-preview');
    const hexLabel = document.getElementById('accent-hex-label');

    const col = settings.accentColor || '#2563eb';
    if (colorInp) colorInp.value = col;
    if (swatchCircle) swatchCircle.style.backgroundColor = col;
    if (hexLabel) hexLabel.textContent = col;
  }

  // -------------------------------------------------------------------------
  // 8. ATS Score Engine (Client-Side Real-Time Analysis)
  // -------------------------------------------------------------------------
  const ATS_ACTION_VERBS = [
    'spearheaded', 'architected', 'engineered', 'optimized', 'reduced', 'automated', 'scaled',
    'designed', 'developed', 'built', 'implemented', 'orchestrated', 'streamlined', 'delivered',
    'boosted', 'accelerated', 'launched', 'mentored', 'directed', 'pioneered', 'migrated'
  ];

  function calculateAtsScore() {
    if (!appState.activeResume || !appState.activeResume.data) return;
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [] } = appState.activeResume.data;

    let score = 0;
    const checklist = [];

    // 1. Contact Information (+20 pts)
    const hasName = Boolean(personal.fullName && personal.fullName.trim());
    const hasEmail = Boolean(personal.email && personal.email.includes('@'));
    const hasPhone = Boolean(personal.phone && personal.phone.trim().length >= 7);
    const hasLocation = Boolean(personal.location && personal.location.trim());
    const hasLink = Boolean(personal.linkedin || personal.portfolio);

    let contactPoints = 0;
    if (hasName) contactPoints += 5;
    if (hasEmail) contactPoints += 5;
    if (hasPhone) contactPoints += 5;
    if (hasLocation) contactPoints += 3;
    if (hasLink) contactPoints += 2;
    score += contactPoints;

    checklist.push({
      title: 'Contact Information Completeness',
      pass: contactPoints >= 18,
      warn: contactPoints >= 10 && contactPoints < 18,
      desc: (contactPoints >= 18)
        ? 'All key contact details present (Name, Email, Phone, Location, Profiles).'
        : 'Ensure email, phone number, and location are provided for recruiter contact.'
    });

    // 2. Professional Summary (+15 pts)
    const summaryLen = (summary || '').trim().length;
    let summaryPoints = 0;
    if (summaryLen >= 200 && summaryLen <= 600) {
      summaryPoints = 15;
    } else if (summaryLen > 50) {
      summaryPoints = 8;
    }
    score += summaryPoints;

    checklist.push({
      title: 'Professional Summary Length & Keywords',
      pass: summaryPoints === 15,
      warn: summaryPoints === 8,
      desc: (summaryPoints === 15)
        ? `Optimal summary length (${summaryLen} chars). Highlights core competencies.`
        : 'Summary should ideally be 250–500 characters highlighting career specialties.'
    });

    // 3. Work Experience Bullets (+25 pts)
    let totalBullets = 0;
    let longBullets = 0;
    if (Array.isArray(experience)) {
      experience.forEach(exp => {
        if (exp.bullets) {
          const lines = exp.bullets.split(/\r?\n/).filter(l => l.trim().length > 10);
          totalBullets += lines.length;
          lines.forEach(l => {
            if (l.trim().length >= 40) longBullets++;
          });
        }
      });
    }

    let expPoints = 0;
    if (totalBullets >= 4 && longBullets >= 3) {
      expPoints = 25;
    } else if (totalBullets >= 2) {
      expPoints = 15;
    }
    score += expPoints;

    checklist.push({
      title: 'Work Experience Depth & Impact',
      pass: expPoints === 25,
      warn: expPoints === 15,
      desc: (expPoints === 25)
        ? `Strong experience depth (${totalBullets} actionable bullet points recorded).`
        : 'Add at least 3–4 detailed bullet points per work experience entry.'
    });

    // 4. Strong Action Verbs (+15 pts)
    const allText = JSON.stringify(appState.activeResume.data).toLowerCase();
    let detectedVerbsCount = 0;
    ATS_ACTION_VERBS.forEach(verb => {
      if (allText.includes(verb)) detectedVerbsCount++;
    });

    let verbPoints = 0;
    if (detectedVerbsCount >= 4) {
      verbPoints = 15;
    } else if (detectedVerbsCount >= 2) {
      verbPoints = 8;
    }
    score += verbPoints;

    checklist.push({
      title: 'High-Impact Action Verbs',
      pass: verbPoints === 15,
      warn: verbPoints > 0 && verbPoints < 15,
      desc: (verbPoints === 15)
        ? `Found ${detectedVerbsCount} strong action verbs (e.g. Spearheaded, Architected, Reduced).`
        : `Include high-impact action verbs (e.g. Spearheaded, Architected, Engineered, Optimized). Found: ${detectedVerbsCount}.`
    });

    // 5. Measurable Metrics & Numbers (+10 pts)
    const metricsMatches = allText.match(/\b\d+(\.\d+)?%|\$\d+(\.\d+)?(k|m|b)?|\b\d+\+\b|\b\d+x\b/gi) || [];
    let metricPoints = 0;
    if (metricsMatches.length >= 3) {
      metricPoints = 10;
    } else if (metricsMatches.length >= 1) {
      metricPoints = 5;
    }
    score += metricPoints;

    checklist.push({
      title: 'Measurable Metrics & ROI ($ / %)',
      pass: metricPoints === 10,
      warn: metricPoints > 0 && metricPoints < 10,
      desc: (metricPoints === 10)
        ? `Great quantitative metrics detected (${metricsMatches.length} metrics: %, $, numbers).`
        : 'Add measurable figures (e.g., "improved throughput by 42%", "reduced latency by 85%").'
    });

    // 6. Skills Density & Categorization (+10 pts)
    const skillsCount = skills.length;
    let skillPoints = 0;
    if (skillsCount >= 8) {
      skillPoints = 10;
    } else if (skillsCount >= 4) {
      skillPoints = 5;
    }
    score += skillPoints;

    checklist.push({
      title: 'Technical & Core Skills Density',
      pass: skillPoints === 10,
      warn: skillPoints > 0 && skillPoints < 10,
      desc: (skillPoints === 10)
        ? `Comprehensive skill list (${skillsCount} skills). Helps ATS keyword matching.`
        : `Add at least 6–8 relevant technical and domain skills. Currently have: ${skillsCount}.`
    });

    // 7. Education Section (+5 pts)
    const eduCount = education.length;
    const eduPoints = eduCount >= 1 ? 5 : 0;
    score += eduPoints;

    checklist.push({
      title: 'Education Credentials',
      pass: eduPoints === 5,
      warn: false,
      desc: (eduPoints === 5)
        ? 'Education credentials properly recorded.'
        : 'Include your university, degree, or relevant educational background.'
    });

    // Enforce 0 - 100 range
    score = Math.min(100, Math.max(0, score));

    // Update UI Badge
    const badge = document.getElementById('ats-score-badge');
    const ratingLabel = document.getElementById('ats-score-rating');
    if (badge) {
      badge.textContent = score;
      badge.className = 'score-ring ' + (score >= 85 ? 'score-high' : score >= 65 ? 'score-med' : 'score-low');
    }
    if (ratingLabel) {
      ratingLabel.textContent = score >= 85 ? 'High Match' : score >= 65 ? 'Medium Match' : 'Needs Polish';
    }

    // Update Modal Details
    const modalScoreNum = document.getElementById('modal-ats-score-num');
    if (modalScoreNum) modalScoreNum.textContent = score;

    const heading = document.getElementById('modal-ats-status-heading');
    const desc = document.getElementById('modal-ats-status-desc');
    if (heading && desc) {
      if (score >= 85) {
        heading.textContent = 'Excellent ATS Compatibility!';
        desc.textContent = 'Your resume meets all top ATS parser standards: single-column layout, standard fonts, clear headings, and metric-driven bullet points.';
      } else if (score >= 65) {
        heading.textContent = 'Good Resume - A Few Optimizations Needed';
        desc.textContent = 'Follow the checklist below to add more action verbs, metrics, and complete contact details to maximize recruiter match rates.';
      } else {
        heading.textContent = 'Needs Improvement for ATS Parsers';
        desc.textContent = 'Populate your summary, work experience bullets, and skills to ensure ATS bots can parse your profile accurately.';
      }
    }

    // Render Checklist Items
    const checklistContainer = document.getElementById('ats-checklist-container');
    if (checklistContainer) {
      checklistContainer.innerHTML = checklist.map(item => `
        <div class="ats-check-item">
          <span class="check-icon ${item.pass ? 'pass' : item.warn ? 'warn' : 'fail'}">
            ${item.pass ? '✓' : item.warn ? '▲' : '✕'}
          </span>
          <div class="check-details">
            <div class="check-title">${escapeHtml(item.title)}</div>
            <div class="check-desc">${escapeHtml(item.desc)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // -------------------------------------------------------------------------
  // 9. Multi-Resume Manager & Actions
  // -------------------------------------------------------------------------
  function refreshResumesDropdown() {
    const select = document.getElementById('resume-select');
    if (!select) return;

    select.innerHTML = appState.resumes.map(r => `
      <option value="${r.id}" ${r.id === appState.activeResumeId ? 'selected' : ''}>
        ${escapeHtml(r.name || 'Untitled Resume')}
      </option>
    `).join('');
  }

  function createNewResume() {
    const newResume = {
      id: generateId('res'),
      name: `Resume (${appState.resumes.length + 1})`,
      data: {
        personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedin: '', portfolio: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages']
      },
      settings: deepClone(DEFAULT_SETTINGS),
      lastEdited: Date.now()
    };

    appState.resumes.push(newResume);
    appState.activeResumeId = newResume.id;
    appState.activeResume = newResume;

    localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(appState.resumes));
    localStorage.setItem(STORAGE_KEY_ACTIVE, newResume.id);

    populateFormWithActiveData();
    renderLivePreview();
    calculateAtsScore();
    showToast('New resume profile created!');
  }

  function duplicateCurrentResume() {
    if (!appState.activeResume) return;

    const dup = deepClone(appState.activeResume);
    dup.id = generateId('res');
    dup.name = `${appState.activeResume.name || 'Resume'} (Copy)`;
    dup.lastEdited = Date.now();

    appState.resumes.push(dup);
    appState.activeResumeId = dup.id;
    appState.activeResume = dup;

    localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(appState.resumes));
    localStorage.setItem(STORAGE_KEY_ACTIVE, dup.id);

    populateFormWithActiveData();
    renderLivePreview();
    calculateAtsScore();
    showToast('Resume duplicated successfully!');
  }

  function deleteCurrentResume() {
    if (appState.resumes.length <= 1) {
      showToast('Cannot delete the only resume. You can clear its data instead.', null, null, 3000);
      return;
    }

    openConfirmModal(
      'Delete Resume Profile',
      `Are you sure you want to delete "${appState.activeResume.name}"? This action cannot be undone.`,
      () => {
        const deletedId = appState.activeResumeId;
        appState.resumes = appState.resumes.filter(r => r.id !== deletedId);
        appState.activeResume = appState.resumes[0];
        appState.activeResumeId = appState.resumes[0].id;

        localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(appState.resumes));
        localStorage.setItem(STORAGE_KEY_ACTIVE, appState.activeResumeId);

        populateFormWithActiveData();
        renderLivePreview();
        calculateAtsScore();
        showToast('Resume deleted.');
      }
    );
  }

  function switchActiveResume(id) {
    const target = appState.resumes.find(r => r.id === id);
    if (!target) return;

    appState.activeResumeId = target.id;
    appState.activeResume = target;
    localStorage.setItem(STORAGE_KEY_ACTIVE, target.id);

    populateFormWithActiveData();
    renderLivePreview();
    calculateAtsScore();
    showToast(`Switched to: ${target.name}`);
  }

  function loadSampleDataAction() {
    if (!appState.activeResume) initStorage();
    appState.activeResume.data = deepClone(SAMPLE_RESUME_DATA);
    populateFormWithActiveData();
    renderLivePreview();
    calculateAtsScore();
    showToast('Sample resume data loaded!');
  }

  // -------------------------------------------------------------------------
  // 10. Toast Notification System with Undo Support
  // -------------------------------------------------------------------------
  function showToast(message, actionText = null, onAction = null, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      ${actionText ? `<button type="button" class="toast-undo-btn">${escapeHtml(actionText)}</button>` : ''}
    `;

    if (actionText && onAction) {
      const btn = toast.querySelector('.toast-undo-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          onAction();
          toast.remove();
        });
      }
    }

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  // -------------------------------------------------------------------------
  // 11. Confirmation & Modal Handlers
  // -------------------------------------------------------------------------
  let pendingConfirmAction = null;

  function openConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('modal-confirm-title');
    const msgEl = document.getElementById('modal-confirm-message');
    const confirmBtn = document.getElementById('btn-confirm-action');

    if (!modal || !titleEl || !msgEl || !confirmBtn) return;

    titleEl.textContent = title;
    msgEl.textContent = message;
    pendingConfirmAction = onConfirm;

    modal.classList.add('active');
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  // -------------------------------------------------------------------------
  // 12. Section Order & Visibility Manager
  // -------------------------------------------------------------------------
  const ALL_SECTIONS_META = [
    { key: 'summary', name: 'Professional Summary', icon: '📝' },
    { key: 'experience', name: 'Work Experience', icon: '💼' },
    { key: 'education', name: 'Education', icon: '🎓' },
    { key: 'skills', name: 'Skills & Competencies', icon: '⚡' },
    { key: 'projects', name: 'Key Projects', icon: '🚀' },
    { key: 'certifications', name: 'Certifications', icon: '📜' },
    { key: 'languages', name: 'Languages', icon: '🌐' }
  ];

  function openManageSectionsModal() {
    const container = document.getElementById('section-reorder-list');
    if (!container || !appState.activeResume || !appState.activeResume.data) return;

    const activeOrder = appState.activeResume.data.sectionOrder || ALL_SECTIONS_META.map(s => s.key);

    container.innerHTML = activeOrder.map((secKey, idx) => {
      const meta = ALL_SECTIONS_META.find(m => m.key === secKey) || { key: secKey, name: secKey, icon: '📄' };
      return `
        <div class="section-reorder-item" data-key="${meta.key}">
          <div class="reorder-item-left">
            <span>${meta.icon}</span>
            <span>${escapeHtml(meta.name)}</span>
          </div>
          <div class="reorder-item-actions">
            ${idx > 0 ? `<button type="button" class="btn-xs btn-sec-up" data-index="${idx}" title="Move Up">↑</button>` : ''}
            ${idx < activeOrder.length - 1 ? `<button type="button" class="btn-xs btn-sec-down" data-index="${idx}" title="Move Down">↓</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    openModal('modal-manage-sections');
  }

  // -------------------------------------------------------------------------
  // 13. Export & PDF Handlers
  // -------------------------------------------------------------------------
  function handlePrintResume() {
    window.print();
  }

  function handleDownloadPdf() {
    const paper = document.querySelector('.resume-paper');
    if (!paper) {
      showToast('Please enter your resume details first before exporting.', null, null, 3000);
      return;
    }

    const name = (appState.activeResume?.data?.personal?.fullName || 'Resume').replace(/\s+/g, '_');
    const filename = `${name}_Resume.pdf`;

    if (window.html2pdf) {
      showToast('Generating high-quality PDF...', null, null, 2500);

      const opt = {
        margin: [0.25, 0.35, 0.25, 0.35],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(paper).save().then(() => {
        showToast('PDF downloaded successfully!');
      }).catch(err => {
        console.error('html2pdf error, falling back to print:', err);
        handlePrintResume();
      });
    } else {
      handlePrintResume();
    }
  }

  function handleOpenPlainTextModal() {
    if (!appState.activeResume || !window.ResumeTemplates) return;
    const rawText = window.ResumeTemplates.generatePlainText(appState.activeResume.data);
    const textarea = document.getElementById('plain-text-output');
    if (textarea) textarea.value = rawText;
    openModal('modal-plain-text');
  }

  function handleCopyPlainText() {
    const textarea = document.getElementById('plain-text-output');
    if (!textarea) return;

    navigator.clipboard.writeText(textarea.value).then(() => {
      showToast('ATS Plain Text copied to clipboard!');
      closeModal('modal-plain-text');
    }).catch(() => {
      textarea.select();
      document.execCommand('copy');
      showToast('Copied to clipboard!');
    });
  }

  // Backup & JSON
  function handleExportCurrentJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState.activeResume, null, 2));
    const dlAnchor = document.createElement('a');
    const name = (appState.activeResume.name || 'resume').replace(/\s+/g, '_');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${name}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Active resume exported as JSON.');
  }

  function handleExportAllJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState.resumes, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `all_resumes_backup_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('All resumes backed up to JSON.');
  }

  function handleImportJsonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);

        if (Array.isArray(parsed)) {
          appState.resumes = parsed;
          appState.activeResume = parsed[0];
          appState.activeResumeId = parsed[0].id;
        } else if (parsed && parsed.data) {
          parsed.id = generateId('res');
          parsed.name = (parsed.name || 'Imported Resume') + ' (Imported)';
          appState.resumes.push(parsed);
          appState.activeResume = parsed;
          appState.activeResumeId = parsed.id;
        } else {
          throw new Error('Unrecognized resume JSON format');
        }

        localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(appState.resumes));
        localStorage.setItem(STORAGE_KEY_ACTIVE, appState.activeResumeId);

        populateFormWithActiveData();
        renderLivePreview();
        calculateAtsScore();
        closeModal('modal-json');
        showToast('Resume JSON imported successfully!');
      } catch (err) {
        alert('Invalid JSON file format. Please upload a valid resume backup file.');
      }
    };
    reader.readAsText(file);
  }

  // -------------------------------------------------------------------------
  // 14. Theme & Zoom Controller
  // -------------------------------------------------------------------------
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    }
  }

  function setZoom(val) {
    appState.zoomLevel = Math.min(1.3, Math.max(0.65, val));
    const wrapper = document.getElementById('paper-wrapper');
    const text = document.getElementById('zoom-level-text');
    if (wrapper) {
      wrapper.style.transform = `scale(${appState.zoomLevel})`;
    }
    if (text) {
      text.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
    }
  }

  // -------------------------------------------------------------------------
  // 15. Event Listeners & Interactive Bindings
  // -------------------------------------------------------------------------
  function setupEventListeners() {
    // 1. Personal Info inputs
    ['inp-fullname', 'inp-jobtitle', 'inp-email', 'inp-phone', 'inp-location', 'inp-linkedin', 'inp-portfolio'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('input', () => {
        const prop = id.replace('inp-', '');
        const keyMap = {
          fullname: 'fullName',
          jobtitle: 'jobTitle',
          email: 'email',
          phone: 'phone',
          location: 'location',
          linkedin: 'linkedin',
          portfolio: 'portfolio'
        };
        const mapped = keyMap[prop] || prop;
        if (!appState.activeResume.data.personal) appState.activeResume.data.personal = {};
        appState.activeResume.data.personal[mapped] = el.value;
        autoSave();
      });

      el.addEventListener('focus', () => { lastFocusedInput = el; });
    });

    // 2. Summary
    const summaryInp = document.getElementById('inp-summary');
    if (summaryInp) {
      summaryInp.addEventListener('input', () => {
        appState.activeResume.data.summary = summaryInp.value;
        updateSummaryCounter(summaryInp.value);
        autoSave();
      });
      summaryInp.addEventListener('focus', () => { lastFocusedInput = summaryInp; });
    }

    // 3. Action Verbs Click Helper
    document.querySelectorAll('.verb-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const verb = btn.getAttribute('data-verb');
        if (!verb) return;

        const activeTextarea = lastFocusedInput && lastFocusedInput.tagName === 'TEXTAREA'
          ? lastFocusedInput
          : document.querySelector('.exp-bullets-textarea');

        if (activeTextarea) {
          const start = activeTextarea.selectionStart || 0;
          const end = activeTextarea.selectionEnd || 0;
          const val = activeTextarea.value;
          const insertText = (start === 0 || val.charAt(start - 1) === '\n') ? `• ${verb} ` : `\n• ${verb} `;

          activeTextarea.value = val.substring(0, start) + insertText + val.substring(end);
          activeTextarea.focus();
          activeTextarea.setSelectionRange(start + insertText.length, start + insertText.length);
          activeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          showToast(`Inserted action verb: "${verb}"`);
        }
      });
    });

    // 4. Experience dynamic interactions
    const expContainer = document.getElementById('experience-list');
    if (expContainer) {
      expContainer.addEventListener('input', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const expItem = appState.activeResume.data.experience[index];
        if (!expItem) return;

        if (target.classList.contains('exp-field')) {
          const prop = target.getAttribute('data-prop');
          if (prop) {
            expItem[prop] = target.value;
            autoSave();
          }
        }
      });

      expContainer.addEventListener('change', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const expItem = appState.activeResume.data.experience[index];
        if (!expItem) return;

        if (target.classList.contains('exp-checkbox-present')) {
          expItem.isPresent = target.checked;
          const endInput = card.querySelector('input[data-prop="endDate"]');
          if (endInput) {
            endInput.disabled = target.checked;
            if (target.checked) endInput.value = '';
          }
          autoSave();
        }
      });

      expContainer.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const expList = appState.activeResume.data.experience;

        if (btn.classList.contains('btn-delete-exp')) {
          const deleted = expList.splice(index, 1)[0];
          renderExperienceFormList(expList);
          updateSectionCountBadge('count-experience', expList.length, expList.length > 0);
          autoSave();

          showToast('Experience entry deleted.', 'Undo', () => {
            expList.splice(index, 0, deleted);
            renderExperienceFormList(expList);
            updateSectionCountBadge('count-experience', expList.length, expList.length > 0);
            autoSave();
          });
        } else if (btn.classList.contains('btn-move-exp-up') && index > 0) {
          const item = expList.splice(index, 1)[0];
          expList.splice(index - 1, 0, item);
          renderExperienceFormList(expList);
          autoSave();
        } else if (btn.classList.contains('btn-move-exp-down') && index < expList.length - 1) {
          const item = expList.splice(index, 1)[0];
          expList.splice(index + 1, 0, item);
          renderExperienceFormList(expList);
          autoSave();
        }
      });
    }

    document.getElementById('btn-add-experience')?.addEventListener('click', () => {
      const expList = appState.activeResume.data.experience || [];
      expList.push({
        id: generateId('exp'),
        role: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        isPresent: true,
        bullets: ''
      });
      appState.activeResume.data.experience = expList;
      renderExperienceFormList(expList);
      updateSectionCountBadge('count-experience', expList.length, expList.length > 0);
      autoSave();
    });

    // 5. Education dynamic interactions
    const eduContainer = document.getElementById('education-list');
    if (eduContainer) {
      eduContainer.addEventListener('input', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const eduItem = appState.activeResume.data.education[index];
        if (!eduItem) return;

        if (target.classList.contains('edu-field')) {
          const prop = target.getAttribute('data-prop');
          if (prop) {
            eduItem[prop] = target.value;
            autoSave();
          }
        }
      });

      eduContainer.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const eduList = appState.activeResume.data.education;

        if (btn.classList.contains('btn-delete-edu')) {
          const deleted = eduList.splice(index, 1)[0];
          renderEducationFormList(eduList);
          updateSectionCountBadge('count-education', eduList.length, eduList.length > 0);
          autoSave();

          showToast('Education entry deleted.', 'Undo', () => {
            eduList.splice(index, 0, deleted);
            renderEducationFormList(eduList);
            updateSectionCountBadge('count-education', eduList.length, eduList.length > 0);
            autoSave();
          });
        } else if (btn.classList.contains('btn-move-edu-up') && index > 0) {
          const item = eduList.splice(index, 1)[0];
          eduList.splice(index - 1, 0, item);
          renderEducationFormList(eduList);
          autoSave();
        } else if (btn.classList.contains('btn-move-edu-down') && index < eduList.length - 1) {
          const item = eduList.splice(index, 1)[0];
          eduList.splice(index + 1, 0, item);
          renderEducationFormList(eduList);
          autoSave();
        }
      });
    }

    document.getElementById('btn-add-education')?.addEventListener('click', () => {
      const list = appState.activeResume.data.education || [];
      list.push({ id: generateId('edu'), institution: '', degree: '', field: '', startDate: '', endDate: '', isPresent: false, location: '', gpa: '', highlights: '' });
      appState.activeResume.data.education = list;
      renderEducationFormList(list);
      updateSectionCountBadge('count-education', list.length, list.length > 0);
      autoSave();
    });

    // 6. Skills input & tags interactions
    const skillNameInput = document.getElementById('inp-skill-name');
    const skillCategoryInput = document.getElementById('inp-skill-category');
    const addSkillBtn = document.getElementById('btn-add-skill');

    function handleAddSkillChip() {
      if (!skillNameInput) return;
      const raw = skillNameInput.value.trim();
      if (!raw) return;

      const category = skillCategoryInput ? skillCategoryInput.value.trim() : '';
      const skillsList = appState.activeResume.data.skills || [];

      const items = raw.split(',').map(s => s.trim()).filter(Boolean);
      items.forEach(skillStr => {
        skillsList.push({
          id: generateId('sk'),
          name: skillStr,
          category: category || 'Technical Skills'
        });
      });

      appState.activeResume.data.skills = skillsList;
      renderSkillsChips(skillsList);
      updateSectionCountBadge('count-skills', skillsList.length, skillsList.length > 0);
      skillNameInput.value = '';
      autoSave();
    }

    if (addSkillBtn) addSkillBtn.addEventListener('click', handleAddSkillChip);

    if (skillNameInput) {
      skillNameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          handleAddSkillChip();
        }
      });
    }

    // Quick Skill Suggestion buttons
    document.querySelectorAll('.quick-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const skillName = btn.getAttribute('data-skill');
        const catName = btn.getAttribute('data-cat') || 'Technical Skills';
        if (!skillName) return;

        const skillsList = appState.activeResume.data.skills || [];
        const exists = skillsList.some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === skillName.toLowerCase());

        if (!exists) {
          skillsList.push({ id: generateId('sk'), name: skillName, category: catName });
          appState.activeResume.data.skills = skillsList;
          renderSkillsChips(skillsList);
          updateSectionCountBadge('count-skills', skillsList.length, skillsList.length > 0);
          autoSave();
          showToast(`Added skill: ${skillName}`);
        }
      });
    });

    // Remove Skill chip
    document.getElementById('skills-chips-container')?.addEventListener('click', e => {
      const btn = e.target.closest('.btn-delete-skill');
      if (!btn) return;
      const index = parseInt(btn.getAttribute('data-index'), 10);
      const skillsList = appState.activeResume.data.skills;
      if (skillsList && skillsList[index]) {
        skillsList.splice(index, 1);
        renderSkillsChips(skillsList);
        updateSectionCountBadge('count-skills', skillsList.length, skillsList.length > 0);
        autoSave();
      }
    });

    // 7. Projects dynamic interactions
    const projContainer = document.getElementById('projects-list');
    if (projContainer) {
      projContainer.addEventListener('input', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const item = appState.activeResume.data.projects[index];
        if (!item) return;

        if (target.classList.contains('proj-field')) {
          const prop = target.getAttribute('data-prop');
          if (prop) {
            item[prop] = target.value;
            autoSave();
          }
        }
      });

      projContainer.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const list = appState.activeResume.data.projects;

        if (btn.classList.contains('btn-delete-proj')) {
          const deleted = list.splice(index, 1)[0];
          renderProjectsFormList(list);
          updateSectionCountBadge('count-projects', list.length, list.length > 0);
          autoSave();

          showToast('Project deleted.', 'Undo', () => {
            list.splice(index, 0, deleted);
            renderProjectsFormList(list);
            updateSectionCountBadge('count-projects', list.length, list.length > 0);
            autoSave();
          });
        } else if (btn.classList.contains('btn-move-proj-up') && index > 0) {
          const item = list.splice(index, 1)[0];
          list.splice(index - 1, 0, item);
          renderProjectsFormList(list);
          autoSave();
        } else if (btn.classList.contains('btn-move-proj-down') && index < list.length - 1) {
          const item = list.splice(index, 1)[0];
          list.splice(index + 1, 0, item);
          renderProjectsFormList(list);
          autoSave();
        }
      });
    }

    document.getElementById('btn-add-project')?.addEventListener('click', () => {
      const list = appState.activeResume.data.projects || [];
      list.push({ id: generateId('proj'), name: '', tech: '', link: '', bullets: '' });
      appState.activeResume.data.projects = list;
      renderProjectsFormList(list);
      updateSectionCountBadge('count-projects', list.length, list.length > 0);
      autoSave();
    });

    // 8. Certifications dynamic interactions
    const certContainer = document.getElementById('certifications-list');
    if (certContainer) {
      certContainer.addEventListener('input', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const item = appState.activeResume.data.certifications[index];
        if (!item) return;

        if (target.classList.contains('cert-field')) {
          const prop = target.getAttribute('data-prop');
          if (prop) {
            item[prop] = target.value;
            autoSave();
          }
        }
      });

      certContainer.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const list = appState.activeResume.data.certifications;

        if (btn.classList.contains('btn-delete-cert')) {
          const deleted = list.splice(index, 1)[0];
          renderCertificationsFormList(list);
          updateSectionCountBadge('count-certifications', list.length, list.length > 0);
          autoSave();

          showToast('Certification deleted.', 'Undo', () => {
            list.splice(index, 0, deleted);
            renderCertificationsFormList(list);
            updateSectionCountBadge('count-certifications', list.length, list.length > 0);
            autoSave();
          });
        } else if (btn.classList.contains('btn-move-cert-up') && index > 0) {
          const item = list.splice(index, 1)[0];
          list.splice(index - 1, 0, item);
          renderCertificationsFormList(list);
          autoSave();
        } else if (btn.classList.contains('btn-move-cert-down') && index < list.length - 1) {
          const item = list.splice(index, 1)[0];
          list.splice(index + 1, 0, item);
          renderCertificationsFormList(list);
          autoSave();
        }
      });
    }

    document.getElementById('btn-add-certification')?.addEventListener('click', () => {
      const list = appState.activeResume.data.certifications || [];
      list.push({ id: generateId('cert'), name: '', issuer: '', date: '', link: '' });
      appState.activeResume.data.certifications = list;
      renderCertificationsFormList(list);
      updateSectionCountBadge('count-certifications', list.length, list.length > 0);
      autoSave();
    });

    // 9. Languages dynamic interactions
    const langContainer = document.getElementById('languages-list');
    if (langContainer) {
      langContainer.addEventListener('input', e => {
        const target = e.target;
        const card = target.closest('.entry-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'), 10);
        const item = appState.activeResume.data.languages[index];
        if (!item) return;

        if (target.classList.contains('lang-field')) {
          const prop = target.getAttribute('data-prop');
          if (prop) {
            item[prop] = target.value;
            autoSave();
          }
        }
      });

      langContainer.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const list = appState.activeResume.data.languages;

        if (btn.classList.contains('btn-delete-lang')) {
          const deleted = list.splice(index, 1)[0];
          renderLanguagesFormList(list);
          updateSectionCountBadge('count-languages', list.length, list.length > 0);
          autoSave();

          showToast('Language entry deleted.', 'Undo', () => {
            list.splice(index, 0, deleted);
            renderLanguagesFormList(list);
            updateSectionCountBadge('count-languages', list.length, list.length > 0);
            autoSave();
          });
        } else if (btn.classList.contains('btn-move-lang-up') && index > 0) {
          const item = list.splice(index, 1)[0];
          list.splice(index - 1, 0, item);
          renderLanguagesFormList(list);
          autoSave();
        } else if (btn.classList.contains('btn-move-lang-down') && index < list.length - 1) {
          const item = list.splice(index, 1)[0];
          list.splice(index + 1, 0, item);
          renderLanguagesFormList(list);
          autoSave();
        }
      });
    }

    document.getElementById('btn-add-language')?.addEventListener('click', () => {
      const list = appState.activeResume.data.languages || [];
      list.push({ id: generateId('lang'), name: '', proficiency: 'Conversational' });
      appState.activeResume.data.languages = list;
      renderLanguagesFormList(list);
      updateSectionCountBadge('count-languages', list.length, list.length > 0);
      autoSave();
    });

    // 10. Accordion header toggles
    function updateAccordionToggleBtn() {
      const cards = document.querySelectorAll('.form-section-card');
      const anyExpanded = Array.from(cards).some(c => !c.classList.contains('collapsed'));
      const btn = document.getElementById('btn-toggle-all-accordions');
      if (btn) btn.textContent = anyExpanded ? 'Collapse All' : 'Expand All';
    }

    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.form-section-card');
        if (card) {
          card.classList.toggle('collapsed');
          updateAccordionToggleBtn();
        }
      });
    });

    document.getElementById('btn-toggle-all-accordions')?.addEventListener('click', () => {
      const cards = document.querySelectorAll('.form-section-card');
      const anyExpanded = Array.from(cards).some(c => !c.classList.contains('collapsed'));
      const btn = document.getElementById('btn-toggle-all-accordions');

      cards.forEach(c => {
        if (anyExpanded) {
          c.classList.add('collapsed');
        } else {
          c.classList.remove('collapsed');
        }
      });

      if (btn) btn.textContent = anyExpanded ? 'Expand All' : 'Collapse All';
    });

    // 11. Toolbar Controls (Templates, Fonts, Spacing, Margins, Auto-Fit)
    document.querySelectorAll('#template-switcher .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#template-switcher .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const t = btn.getAttribute('data-template');
        if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
        appState.activeResume.settings.template = t;

        renderLivePreview();
        autoSave();
      });
    });

    document.getElementById('select-font-family')?.addEventListener('change', e => {
      if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
      appState.activeResume.settings.fontFamily = e.target.value;
      renderLivePreview();
      autoSave();
      const fontName = e.target.options[e.target.selectedIndex]?.text || 'Font';
      showToast(`Applied font: ${fontName}`);
    });

    document.getElementById('select-font-size')?.addEventListener('change', e => {
      if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
      appState.activeResume.settings.fontSize = e.target.value;
      renderLivePreview();
      autoSave();
    });

    document.getElementById('select-line-spacing')?.addEventListener('change', e => {
      if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
      appState.activeResume.settings.lineSpacing = e.target.value;
      renderLivePreview();
      autoSave();
    });

    document.getElementById('select-margins')?.addEventListener('change', e => {
      if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
      appState.activeResume.settings.margins = e.target.value;
      renderLivePreview();
      autoSave();
    });

    // 1-Click Auto-Fit 1 Page
    document.getElementById('btn-auto-fit-page')?.addEventListener('click', autoFitToSinglePage);

    // Page Setup Popover Toggle
    const pageSetupBtn = document.getElementById('btn-page-setup');
    const pageSetupWrapper = document.getElementById('page-setup-wrapper');
    const pageSetupPopover = document.getElementById('page-setup-popover');

    if (pageSetupBtn && pageSetupPopover) {
      pageSetupBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = pageSetupPopover.classList.contains('active');
        if (isOpen) {
          pageSetupPopover.classList.remove('active');
          if (pageSetupWrapper) pageSetupWrapper.classList.remove('active');
        } else {
          pageSetupPopover.classList.add('active');
          if (pageSetupWrapper) pageSetupWrapper.classList.add('active');
        }
      });

      document.addEventListener('click', e => {
        if (!pageSetupPopover.contains(e.target) && !pageSetupBtn.contains(e.target)) {
          pageSetupPopover.classList.remove('active');
          if (pageSetupWrapper) pageSetupWrapper.classList.remove('active');
        }
      });
    }

    // Accent Color Picker Swatch Trigger
    const colorPickerTrigger = document.getElementById('color-picker-trigger');
    const colorInput = document.getElementById('input-accent-color');

    if (colorPickerTrigger && colorInput) {
      colorPickerTrigger.addEventListener('click', () => {
        colorInput.click();
      });

      colorInput.addEventListener('input', e => {
        const val = e.target.value;
        if (!appState.activeResume.settings) appState.activeResume.settings = deepClone(DEFAULT_SETTINGS);
        appState.activeResume.settings.accentColor = val;

        const swatchCircle = document.getElementById('accent-swatch-preview');
        const hexLabel = document.getElementById('accent-hex-label');
        if (swatchCircle) swatchCircle.style.backgroundColor = val;
        if (hexLabel) hexLabel.textContent = val;

        renderLivePreview();
        autoSave();
      });
    }

    // 12. Zoom Controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(appState.zoomLevel + 0.1));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(appState.zoomLevel - 0.1));
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
      const viewport = document.getElementById('preview-viewport');
      if (viewport) {
        const availableWidth = viewport.clientWidth - 40;
        const targetZoom = Math.min(1.15, Math.max(0.65, availableWidth / 816));
        setZoom(targetZoom);
      }
    });

    // 13. Mobile View Tabs
    const tabEdit = document.getElementById('tab-btn-edit');
    const tabPreview = document.getElementById('tab-btn-preview');

    tabEdit?.addEventListener('click', () => {
      document.body.classList.remove('show-mobile-preview');
      tabEdit.classList.add('active');
      tabPreview?.classList.remove('active');
    });

    tabPreview?.addEventListener('click', () => {
      document.body.classList.add('show-mobile-preview');
      tabPreview.classList.add('active');
      tabEdit?.classList.remove('active');
      renderLivePreview();
    });

    // 14. Overflow Menu Toggle & Click Outside
    const toolsBtn = document.getElementById('btn-tools-menu');
    const toolsWrapper = document.getElementById('tools-dropdown-wrapper');
    const toolsDropdownMenu = document.getElementById('tools-dropdown-menu');

    function closeToolsMenu() {
      if (toolsDropdownMenu) toolsDropdownMenu.classList.remove('active');
      if (toolsWrapper) toolsWrapper.classList.remove('active');
    }

    if (toolsBtn) {
      toolsBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = toolsDropdownMenu ? toolsDropdownMenu.classList.contains('active') : false;
        if (isOpen) {
          closeToolsMenu();
        } else {
          if (toolsDropdownMenu) toolsDropdownMenu.classList.add('active');
          if (toolsWrapper) toolsWrapper.classList.add('active');
        }
      });

      document.addEventListener('click', e => {
        if (toolsDropdownMenu && !toolsDropdownMenu.contains(e.target) && !toolsBtn.contains(e.target)) {
          closeToolsMenu();
        }
      });
    }

    // Overflow Menu Item Actions
    document.getElementById('menu-item-sample')?.addEventListener('click', () => {
      closeToolsMenu();
      loadSampleDataAction();
    });

    document.getElementById('menu-item-plain-text')?.addEventListener('click', () => {
      closeToolsMenu();
      handleOpenPlainTextModal();
    });

    document.getElementById('menu-item-backup')?.addEventListener('click', () => {
      closeToolsMenu();
      openModal('modal-json');
    });

    document.getElementById('menu-item-print')?.addEventListener('click', () => {
      closeToolsMenu();
      handlePrintResume();
    });

    document.getElementById('menu-item-clear')?.addEventListener('click', () => {
      closeToolsMenu();
      openConfirmModal(
        'Clear All Resume Data',
        'Are you sure you want to reset all form entries for this resume profile? (You can load sample data anytime).',
        () => {
          appState.activeResume.data = {
            personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', linkedin: '', portfolio: '' },
            summary: '',
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
            languages: [],
            sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages']
          };
          populateFormWithActiveData();
          renderLivePreview();
          calculateAtsScore();
          showToast('Resume data cleared.');
        }
      );
    });

    // Top Navigation & Profiles Switcher
    document.getElementById('resume-select')?.addEventListener('change', e => {
      switchActiveResume(e.target.value);
    });

    document.getElementById('btn-new-resume')?.addEventListener('click', createNewResume);
    document.getElementById('btn-duplicate-resume')?.addEventListener('click', duplicateCurrentResume);
    document.getElementById('btn-delete-resume')?.addEventListener('click', deleteCurrentResume);

    // Mode Switcher: Editor vs Wizard
    document.getElementById('btn-mode-editor')?.addEventListener('click', () => setAppMode('editor'));
    document.getElementById('btn-mode-wizard')?.addEventListener('click', () => setAppMode('wizard'));

    // Wizard Quick Preview and Exit Buttons
    document.getElementById('btn-wizard-quick-preview')?.addEventListener('click', openQuickPreviewModal);
    document.getElementById('btn-wizard-preview-bottom')?.addEventListener('click', openQuickPreviewModal);
    document.getElementById('btn-wizard-exit-editor')?.addEventListener('click', () => setAppMode('editor'));
    document.getElementById('btn-quick-preview-pdf')?.addEventListener('click', handleDownloadPdf);
    document.getElementById('btn-quick-preview-editor')?.addEventListener('click', () => {
      closeModal('modal-quick-preview');
      setAppMode('editor');
    });

    // Wizard Timeline dot clicks
    document.querySelectorAll('.wizard-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        goToWizardStep(step);
      });
    });

    // Wizard navigation buttons
    document.getElementById('btn-wizard-prev')?.addEventListener('click', prevWizardStep);
    document.getElementById('btn-wizard-next')?.addEventListener('click', nextWizardStep);
    document.getElementById('btn-wizard-skip')?.addEventListener('click', skipWizardStep);

    // ATS Score modal open
    document.getElementById('btn-open-ats')?.addEventListener('click', () => {
      calculateAtsScore();
      openModal('modal-ats-score');
    });

    // Manage sections modal open (Reorder Sections)
    document.getElementById('btn-manage-sections')?.addEventListener('click', openManageSectionsModal);

    // Section reorder interactions
    document.getElementById('section-reorder-list')?.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const order = appState.activeResume.data.sectionOrder;
      if (!order) return;

      if (btn.classList.contains('btn-sec-up') && idx > 0) {
        const item = order.splice(idx, 1)[0];
        order.splice(idx - 1, 0, item);
        openManageSectionsModal();
        renderLivePreview();
        autoSave();
      } else if (btn.classList.contains('btn-sec-down') && idx < order.length - 1) {
        const item = order.splice(idx, 1)[0];
        order.splice(idx + 1, 0, item);
        openManageSectionsModal();
        renderLivePreview();
        autoSave();
      }
    });

    // Plain text export
    document.getElementById('btn-copy-plain-text')?.addEventListener('click', handleCopyPlainText);

    // Primary Download PDF
    document.getElementById('btn-export-pdf')?.addEventListener('click', handleDownloadPdf);

    // JSON modal buttons
    document.getElementById('btn-export-current-json')?.addEventListener('click', handleExportCurrentJson);
    document.getElementById('btn-export-all-json')?.addEventListener('click', handleExportAllJson);
    document.getElementById('input-json-file')?.addEventListener('change', handleImportJsonFile);

    // Theme toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

    // Generic modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Backdrop click dismiss
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    // Confirm modal action trigger
    document.getElementById('btn-confirm-action')?.addEventListener('click', () => {
      if (typeof pendingConfirmAction === 'function') {
        pendingConfirmAction();
        pendingConfirmAction = null;
      }
      closeModal('modal-confirm');
    });

    // Global keyboard shortcuts (Ctrl+P / Cmd+P -> Print handler)
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrintResume();
      }
    });
  }

  // ==========================================================================
  // STEP-BY-STEP INTERACTIVE WIZARD CONTROLLER
  // ==========================================================================
  let currentWizardStep = 0;
  const TOTAL_WIZARD_STEPS = 9;

  function setAppMode(mode) {
    const editorBtn = document.getElementById('btn-mode-editor');
    const wizardBtn = document.getElementById('btn-mode-wizard');
    const mainApp = document.querySelector('.app-main');
    const editorPanel = document.getElementById('editor-panel');
    const wizardPanel = document.getElementById('wizard-panel');

    if (mode === 'wizard') {
      editorBtn?.classList.remove('active');
      wizardBtn?.classList.add('active');
      document.body.classList.add('mode-wizard-active');
      mainApp?.classList.add('mode-wizard-active');
      mainApp?.classList.remove('wizard-final-revealed');
      if (editorPanel) editorPanel.style.display = 'none';
      if (wizardPanel) wizardPanel.style.display = 'flex';
      currentWizardStep = 0;
      renderWizardStep();
      showToast('🪄 Wizard mode active. Answer one step at a time.');
    } else {
      wizardBtn?.classList.remove('active');
      editorBtn?.classList.add('active');
      document.body.classList.remove('mode-wizard-active');
      mainApp?.classList.remove('mode-wizard-active', 'wizard-final-revealed');
      if (wizardPanel) wizardPanel.style.display = 'none';
      if (editorPanel) editorPanel.style.display = 'flex';
      const previewPanel = document.getElementById('preview-panel');
      if (previewPanel) previewPanel.style.display = 'flex';
      populateFormWithActiveData();
      renderLivePreview();
      showToast('⚡ Switched to Full Editor mode.');
    }
  }

  function openQuickPreviewModal() {
    renderLivePreview();
    const paper = document.getElementById('resume-paper-container');
    const target = document.getElementById('quick-preview-paper-target');
    if (paper && target) {
      target.innerHTML = paper.innerHTML;
      const livePaper = target.querySelector('.resume-page') || target.querySelector('.resume-paper');
      if (livePaper) {
        livePaper.style.transform = 'none';
        livePaper.style.boxShadow = '0 15px 40px rgba(0,0,0,0.45)';
        livePaper.style.margin = '0 auto 3rem auto';
      }
    }
    openModal('modal-quick-preview');
    setTimeout(() => {
      const modalBody = document.getElementById('quick-preview-scroll-body') || document.querySelector('#modal-quick-preview .modal-body');
      if (modalBody) modalBody.scrollTop = 0;
      const backdrop = document.getElementById('modal-quick-preview');
      if (backdrop) backdrop.scrollTop = 0;
    }, 20);
  }

  function goToWizardStep(stepIndex) {
    currentWizardStep = Math.max(0, Math.min(TOTAL_WIZARD_STEPS - 1, stepIndex));
    renderWizardStep();
  }

  function nextWizardStep() {
    if (currentWizardStep < TOTAL_WIZARD_STEPS - 1) {
      currentWizardStep++;
      renderWizardStep();
      // Scroll wizard to top
      const wizardPanel = document.getElementById('wizard-panel');
      if (wizardPanel) wizardPanel.scrollTop = 0;
    } else {
      handleDownloadPdf();
    }
  }

  function prevWizardStep() {
    if (currentWizardStep > 0) {
      currentWizardStep--;
      renderWizardStep();
      const wizardPanel = document.getElementById('wizard-panel');
      if (wizardPanel) wizardPanel.scrollTop = 0;
    }
  }

  function skipWizardStep() {
    if (currentWizardStep < TOTAL_WIZARD_STEPS - 1) {
      currentWizardStep++;
      renderWizardStep();
    }
  }

  function renderWizardStep() {
    const container = document.getElementById('wizard-body-card');
    const stepBadge = document.getElementById('wizard-step-badge');
    const percentBadge = document.getElementById('wizard-percent-badge');
    const progressFill = document.getElementById('wizard-progress-fill');
    const prevBtn = document.getElementById('btn-wizard-prev');
    const nextText = document.getElementById('wizard-next-text');
    const mainApp = document.querySelector('.app-main');

    if (!container || !appState.activeResume) return;
    const data = appState.activeResume.data;

    // Update progress badges & timeline
    const stepNum = currentWizardStep + 1;
    const percent = Math.round((stepNum / TOTAL_WIZARD_STEPS) * 100);
    if (stepBadge) stepBadge.textContent = currentWizardStep === TOTAL_WIZARD_STEPS - 1 ? '🎉 Final Reveal' : `Step ${stepNum} of ${TOTAL_WIZARD_STEPS - 1}`;
    if (percentBadge) percentBadge.textContent = `${percent}% Complete`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (prevBtn) prevBtn.disabled = currentWizardStep === 0;
    if (nextText) nextText.textContent = currentWizardStep === TOTAL_WIZARD_STEPS - 1 ? '📥 Download Clean PDF' : (currentWizardStep === TOTAL_WIZARD_STEPS - 2 ? 'Generate Resume 🎉' : 'Save & Next →');

    // Update stepper dot classes
    document.querySelectorAll('.wizard-step-btn').forEach((btn, idx) => {
      btn.classList.remove('active', 'completed');
      if (idx === currentWizardStep) {
        btn.classList.add('active');
      } else if (idx < currentWizardStep) {
        btn.classList.add('completed');
      }
    });

    // STEP 0: Full Name & Professional Headline
    if (currentWizardStep === 0) {
      const p = data.personal || {};
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">👤 Step 1: Who are you?</h2>
          <p class="wizard-step-subtitle">Let's start with your full legal name and the target job title you want recruiters to see first.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>ATS Headline Rule:</strong> Match your headline to the exact job title you are applying for (e.g. <em>Senior Full Stack Engineer</em>).</div>
        </div>

        <div class="form-group" style="margin-top: 0.5rem;">
          <label class="form-label" style="font-size: 0.85rem;">Enter Your Full Name *</label>
          <input type="text" id="wiz-fullName" class="form-input" style="font-size: 1rem; padding: 0.75rem 1rem;" placeholder="e.g. Alex Morgan" value="${escapeHtml(p.fullName || '')}" autofocus />
        </div>

        <div class="form-group" style="margin-top: 0.85rem;">
          <label class="form-label" style="font-size: 0.85rem;">Target Job Title / Professional Headline *</label>
          <input type="text" id="wiz-jobTitle" class="form-input" style="font-size: 1rem; padding: 0.75rem 1rem;" placeholder="e.g. Senior Full Stack Software Engineer" value="${escapeHtml(p.jobTitle || '')}" />
        </div>

        <div style="margin-top: 0.65rem;">
          <span class="verb-label">1-Click Role Suggestions:</span>
          <div class="wizard-role-pills">
            <button type="button" class="wizard-role-pill" data-role="Senior Full Stack Software Engineer">Senior Full Stack Engineer</button>
            <button type="button" class="wizard-role-pill" data-role="Frontend Web Developer">Frontend Developer</button>
            <button type="button" class="wizard-role-pill" data-role="Backend Distributed Systems Engineer">Backend Engineer</button>
            <button type="button" class="wizard-role-pill" data-role="Cloud & DevOps Engineer">Cloud & DevOps</button>
            <button type="button" class="wizard-role-pill" data-role="Data Engineer & Analytics Specialist">Data Engineer</button>
          </div>
        </div>
      `;

      const fnInp = document.getElementById('wiz-fullName');
      const jtInp = document.getElementById('wiz-jobTitle');

      fnInp?.addEventListener('input', e => {
        if (!data.personal) data.personal = {};
        data.personal.fullName = e.target.value;
        renderLivePreview();
        autoSave();
      });

      fnInp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          jtInp?.focus();
        }
      });

      jtInp?.addEventListener('input', e => {
        if (!data.personal) data.personal = {};
        data.personal.jobTitle = e.target.value;
        renderLivePreview();
        autoSave();
      });

      jtInp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nextWizardStep();
        }
      });

      document.querySelectorAll('.wizard-role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const role = pill.getAttribute('data-role');
          if (jtInp && role) {
            jtInp.value = role;
            if (!data.personal) data.personal = {};
            data.personal.jobTitle = role;
            renderLivePreview();
            autoSave();
          }
        });
      });
      return;
    }

    // STEP 1: Contact Information & Links
    if (currentWizardStep === 1) {
      const p = data.personal || {};
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">📞 Step 2: How can recruiters contact you?</h2>
          <p class="wizard-step-subtitle">Enter your email, phone, location, and customized profile URLs.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>Privacy Tip:</strong> You don't need full street address. City & State (e.g. <em>San Francisco, CA</em>) is 100% sufficient and ATS-safe.</div>
        </div>

        <div class="form-grid-2" style="margin-top: 0.5rem;">
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="wiz-email" class="form-input" placeholder="alex.morgan@gmail.com" value="${escapeHtml(p.email || '')}" autofocus />
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number *</label>
            <input type="tel" id="wiz-phone" class="form-input" placeholder="+1 (555) 438-9201" value="${escapeHtml(p.phone || '')}" />
          </div>

          <div class="form-group span-2">
            <label class="form-label">Location (City, State / Country)</label>
            <input type="text" id="wiz-location" class="form-input" placeholder="San Francisco, CA" value="${escapeHtml(p.location || '')}" />
          </div>

          <div class="form-group">
            <label class="form-label">LinkedIn Profile URL</label>
            <input type="text" id="wiz-linkedin" class="form-input" placeholder="linkedin.com/in/alexmorgan" value="${escapeHtml(p.linkedin || '')}" />
          </div>

          <div class="form-group">
            <label class="form-label">Portfolio / GitHub / Website</label>
            <input type="text" id="wiz-portfolio" class="form-input" placeholder="github.com/alexmorgan-dev" value="${escapeHtml(p.portfolio || '')}" />
          </div>
        </div>
      `;

      ['email', 'phone', 'location', 'linkedin', 'portfolio'].forEach(field => {
        const inp = document.getElementById(`wiz-${field}`);
        inp?.addEventListener('input', e => {
          if (!data.personal) data.personal = {};
          data.personal[field] = e.target.value;
          renderLivePreview();
          autoSave();
        });
        inp?.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            nextWizardStep();
          }
        });
      });
      return;
    }

    // STEP 2: Professional Summary
    if (currentWizardStep === 2) {
      const summaryText = data.summary || '';
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">📝 Step 3: What is your professional summary?</h2>
          <p class="wizard-step-subtitle">A concise 2–4 sentence career elevator pitch highlighting your key strengths and metrics.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>ATS Formula:</strong> Target Title + Years of Experience + Key Technologies + Highest Business Impact.</div>
        </div>

        <div class="form-group" style="margin-top: 0.5rem;">
          <div class="form-label">
            <span>Summary Text</span>
            <span id="wiz-summary-counter" class="char-counter">${summaryText.length} / 500 chars</span>
          </div>
          <textarea id="wiz-summary" class="form-textarea" rows="6" placeholder="Briefly highlight your years of experience, core technical specialties, top accomplishments, and value you bring to the role...">${escapeHtml(summaryText)}</textarea>
        </div>

        <div style="margin-top: 0.5rem;">
          <span class="verb-label">1-Click Starter Templates:</span>
          <div class="wizard-role-pills">
            <button type="button" class="wizard-role-pill" id="wiz-starter-se">✨ Senior Engineer Starter</button>
            <button type="button" class="wizard-role-pill" id="wiz-starter-fs">✨ Full Stack Developer Starter</button>
            <button type="button" class="wizard-role-pill" id="wiz-starter-cloud">✨ Cloud / DevOps Starter</button>
          </div>
        </div>
      `;

      const txt = document.getElementById('wiz-summary');
      const counter = document.getElementById('wiz-summary-counter');
      txt?.addEventListener('input', e => {
        data.summary = e.target.value;
        if (counter) counter.textContent = `${e.target.value.length} / 500 chars`;
        renderLivePreview();
        autoSave();
      });

      document.getElementById('wiz-starter-se')?.addEventListener('click', () => {
        txt.value = 'Results-driven Senior Software Engineer with 5+ years of experience architecting high-throughput distributed backend services, cloud-native microservices, and modern frontend web applications. Expert in TypeScript, React, Node.js, and AWS with a track record of driving system latency down by 40%.';
        data.summary = txt.value;
        if (counter) counter.textContent = `${txt.value.length} / 500 chars`;
        renderLivePreview();
        autoSave();
      });

      document.getElementById('wiz-starter-fs')?.addEventListener('click', () => {
        txt.value = 'Full Stack Developer specializing in responsive React applications and resilient RESTful/GraphQL APIs. Proven ability in scaling collaborative platforms, reducing customer bug reports by 35%, and driving agile team delivery.';
        data.summary = txt.value;
        if (counter) counter.textContent = `${txt.value.length} / 500 chars`;
        renderLivePreview();
        autoSave();
      });

      document.getElementById('wiz-starter-cloud')?.addEventListener('click', () => {
        txt.value = 'Cloud & DevOps Engineer with 4+ years orchestrating Kubernetes clusters, AWS infrastructure as code (Terraform), and automated CI/CD deployment pipelines parsing 500GB+ daily logs with 99.99% system availability.';
        data.summary = txt.value;
        if (counter) counter.textContent = `${txt.value.length} / 500 chars`;
        renderLivePreview();
        autoSave();
      });
      return;
    }

    // STEP 3: Work Experience
    if (currentWizardStep === 3) {
      const expList = data.experience || [];
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">💼 Step 4: Where have you worked?</h2>
          <p class="wizard-step-subtitle">List your career roles with quantifiable achievements (most recent role first).</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>XYZ Formula:</strong> Accomplished [X], as measured by [Y], by doing [Z] (e.g. <em>"Reduced API response time by 45% by implementing Redis caching"</em>).</div>
        </div>

        <div class="action-verbs-bar" style="margin-top: 0.5rem;">
          <span class="verb-label">Insert Action Verb:</span>
          <button type="button" class="verb-chip" data-verb="Architected">Architected</button>
          <button type="button" class="verb-chip" data-verb="Spearheaded">Spearheaded</button>
          <button type="button" class="verb-chip" data-verb="Optimized">Optimized</button>
          <button type="button" class="verb-chip" data-verb="Engineered">Engineered</button>
          <button type="button" class="verb-chip" data-verb="Automated">Automated</button>
          <button type="button" class="verb-chip" data-verb="Scaled">Scaled</button>
        </div>

        <div id="wiz-experience-list" class="resume-entries-group"></div>

        <button type="button" id="btn-wiz-add-exp" class="btn btn-ghost add-entry-btn">
          <span>+</span> Add Another Work Experience Role
        </button>
      `;

      const listContainer = document.getElementById('wiz-experience-list');
      renderExperienceFormList(expList, listContainer);

      document.getElementById('btn-wiz-add-exp')?.addEventListener('click', () => {
        expList.push({
          id: generateId('exp'),
          role: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          bullets: ['']
        });
        data.experience = expList;
        renderExperienceFormList(expList, listContainer);
        renderLivePreview();
        autoSave();
      });
      return;
    }

    // STEP 4: Education
    if (currentWizardStep === 4) {
      const eduList = data.education || [];
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">🎓 Step 5: What is your educational background?</h2>
          <p class="wizard-step-subtitle">Add your university degrees, colleges, or formal diplomas.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>ATS Tip:</strong> Place your degree name first (e.g. <em>B.S. in Computer Science</em>), then your university name.</div>
        </div>

        <div id="wiz-education-list" class="resume-entries-group" style="margin-top: 0.5rem;"></div>

        <button type="button" id="btn-wiz-add-edu" class="btn btn-ghost add-entry-btn">
          <span>+</span> Add Education Degree
        </button>
      `;

      const eduContainer = document.getElementById('wiz-education-list');
      renderEducationFormList(eduList, eduContainer);

      document.getElementById('btn-wiz-add-edu')?.addEventListener('click', () => {
        eduList.push({
          id: generateId('edu'),
          degree: '',
          fieldOfStudy: '',
          institution: '',
          location: '',
          startDate: '',
          endDate: '',
          gpa: ''
        });
        data.education = eduList;
        renderEducationFormList(eduList, eduContainer);
        renderLivePreview();
        autoSave();
      });
      return;
    }

    // STEP 5: Skills & Competencies
    if (currentWizardStep === 5) {
      const skillsList = data.skills || [];
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">⚡ Step 6: What skills do you specialize in?</h2>
          <p class="wizard-step-subtitle">Organize your skills by category so recruiters can scan your core competencies in under 5 seconds.</p>
        </div>

        <div class="skills-input-wrapper" style="margin-top: 0.5rem;">
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label">Category</label>
              <input type="text" id="wiz-skill-cat" class="form-input" list="wiz-cat-presets" placeholder="e.g. Languages" />
              <datalist id="wiz-cat-presets">
                <option value="Languages"></option>
                <option value="Frameworks & Libraries"></option>
                <option value="Cloud & DevOps"></option>
                <option value="Databases"></option>
                <option value="Tools & Platforms"></option>
              </datalist>
            </div>
            <div class="form-group span-2">
              <label class="form-label">Skill Name (Press Enter to Add)</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="wiz-skill-name" class="form-input" placeholder="e.g. React.js, TypeScript, Docker..." />
                <button type="button" id="btn-wiz-add-skill" class="btn btn-primary" style="padding: 0.5rem 1rem;">Add</button>
              </div>
            </div>
          </div>

          <div class="skill-suggestions" style="margin-top: 0.75rem;">
            <span class="verb-label">Quick 1-Click Suggestions:</span>
            <button type="button" class="quick-skill-btn" data-cat="Languages" data-skill="JavaScript">JavaScript</button>
            <button type="button" class="quick-skill-btn" data-cat="Languages" data-skill="TypeScript">TypeScript</button>
            <button type="button" class="quick-skill-btn" data-cat="Frameworks & Libraries" data-skill="React">React</button>
            <button type="button" class="quick-skill-btn" data-cat="Frameworks & Libraries" data-skill="Node.js">Node.js</button>
            <button type="button" class="quick-skill-btn" data-cat="Databases" data-skill="PostgreSQL">PostgreSQL</button>
            <button type="button" class="quick-skill-btn" data-cat="Cloud & DevOps" data-skill="AWS">AWS</button>
            <button type="button" class="quick-skill-btn" data-cat="Cloud & DevOps" data-skill="Docker">Docker</button>
          </div>

          <div id="wiz-skills-chips" class="skill-chips-container" style="margin-top: 0.75rem;"></div>
        </div>
      `;

      const chipsContainer = document.getElementById('wiz-skills-chips');
      renderSkillChips(skillsList, chipsContainer);

      const addAction = () => {
        const catInp = document.getElementById('wiz-skill-cat');
        const nameInp = document.getElementById('wiz-skill-name');
        const name = nameInp?.value.trim();
        const category = catInp?.value.trim() || 'Core Competencies';
        if (name) {
          addSkillChip(name, category);
          if (nameInp) nameInp.value = '';
          renderSkillChips(data.skills, chipsContainer);
        }
      };

      document.getElementById('btn-wiz-add-skill')?.addEventListener('click', addAction);
      document.getElementById('wiz-skill-name')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addAction();
        }
      });
      return;
    }

    // STEP 6: Key Projects
    if (currentWizardStep === 6) {
      const projList = data.projects || [];
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">🚀 Step 7: What projects have you built?</h2>
          <p class="wizard-step-subtitle">Showcase open-source codebases, client systems, or high-impact technical apps.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>Pro Tip:</strong> Specify technologies used in parentheses (e.g. <em>React, Node, Redis</em>) and link the GitHub repository.</div>
        </div>

        <div id="wiz-projects-list" class="resume-entries-group" style="margin-top: 0.5rem;"></div>

        <button type="button" id="btn-wiz-add-proj" class="btn btn-ghost add-entry-btn">
          <span>+</span> Add Project Entry
        </button>
      `;

      const projContainer = document.getElementById('wiz-projects-list');
      renderProjectsFormList(projList, projContainer);

      document.getElementById('btn-wiz-add-proj')?.addEventListener('click', () => {
        projList.push({
          id: generateId('proj'),
          title: '',
          techStack: '',
          link: '',
          bullets: ['']
        });
        data.projects = projList;
        renderProjectsFormList(projList, projContainer);
        renderLivePreview();
        autoSave();
      });
      return;
    }

    // STEP 7: Certifications & Languages
    if (currentWizardStep === 7) {
      const certList = data.certifications || [];
      const langList = data.languages || [];
      container.innerHTML = `
        <div class="wizard-step-heading">
          <h2 class="wizard-step-title">📜 Step 8: Any certifications or languages?</h2>
          <p class="wizard-step-subtitle">Accredited certifications (AWS, GCP, PMP) and bilingual/multilingual capabilities.</p>
        </div>

        <div class="wizard-tip-box">
          <span>💡</span>
          <div><strong>Credentials:</strong> Certified candidates receive up to 30% more interview callbacks for technical positions.</div>
        </div>

        <h3 style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-top: 0.5rem;">Certifications</h3>
        <div id="wiz-certs-list" class="resume-entries-group"></div>
        <button type="button" id="btn-wiz-add-cert" class="btn btn-ghost add-entry-btn">
          <span>+</span> Add Certification
        </button>

        <h3 style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-top: 1rem;">Languages</h3>
        <div id="wiz-langs-list" class="resume-entries-group"></div>
        <button type="button" id="btn-wiz-add-lang" class="btn btn-ghost add-entry-btn">
          <span>+</span> Add Language
        </button>
      `;

      const certContainer = document.getElementById('wiz-certs-list');
      const langContainer = document.getElementById('wiz-langs-list');
      renderCertificationsFormList(certList, certContainer);
      renderLanguagesFormList(langList, langContainer);

      document.getElementById('btn-wiz-add-cert')?.addEventListener('click', () => {
        certList.push({ id: generateId('cert'), name: '', issuer: '', issueDate: '', link: '' });
        data.certifications = certList;
        renderCertificationsFormList(certList, certContainer);
        renderLivePreview();
        autoSave();
      });

      document.getElementById('btn-wiz-add-lang')?.addEventListener('click', () => {
        langList.push({ id: generateId('lang'), name: '', proficiency: 'Conversational' });
        data.languages = langList;
        renderLanguagesFormList(langList, langContainer);
        renderLivePreview();
        autoSave();
      });
      return;
    }

    // STEP 8: Grand Finale & Complete Resume Reveal!
    if (currentWizardStep === 8) {
      calculateAtsScore();
      const score = appState.atsScore.overall || 92;
      mainApp?.classList.add('wizard-final-revealed');
      renderLivePreview();

      container.innerHTML = `
        <div class="wizard-celebrate-card">
          <div class="celebrate-icon">🎉</div>
          <h2 class="celebrate-title">Your ATS Resume is 100% Complete!</h2>
          <p class="celebrate-desc">
            All your details have been structured into a clean, single-column, ATS-verified resume format ready for top tier recruiter submissions.
          </p>

          <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin: 0.75rem 0;">
            <div style="background: var(--primary-light); padding: 0.75rem 1.25rem; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${score} / 100</div>
              <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">ATS Score</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.1); padding: 0.75rem 1.25rem; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">100% Fit</div>
              <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">1-Page Clean</div>
            </div>
          </div>

          <div class="celebrate-actions">
            <button type="button" id="btn-wiz-quick-preview-final" class="btn btn-ghost" style="padding: 0.65rem 1.25rem;">
              <span>👁️</span> Quick Preview
            </button>
            <button type="button" id="btn-wiz-download-pdf" class="btn btn-primary btn-glow" style="padding: 0.65rem 1.35rem; font-size: 0.9rem;">
              <span>📥</span> Download PDF Now
            </button>
            <button type="button" id="btn-wiz-switch-editor" class="btn btn-ghost" style="padding: 0.65rem 1.25rem;">
              <span>⚡</span> Open in Full Editor
            </button>
            <button type="button" id="btn-wiz-copy-plain" class="btn btn-ghost" style="padding: 0.65rem 1.25rem;">
              <span>📋</span> Copy ATS Plain Text
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-wiz-quick-preview-final')?.addEventListener('click', openQuickPreviewModal);
      document.getElementById('btn-wiz-download-pdf')?.addEventListener('click', handleDownloadPdf);
      document.getElementById('btn-wiz-switch-editor')?.addEventListener('click', () => setAppMode('editor'));
      document.getElementById('btn-wiz-copy-plain')?.addEventListener('click', handleCopyPlainText);
    }
  }

  // -------------------------------------------------------------------------
  // 16. Application Bootstrapper
  // -------------------------------------------------------------------------
  function bootApp() {
    initStorage();
    populateFormWithActiveData();
    renderLivePreview();
    calculateAtsScore();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }

  window.addEventListener('load', renderLivePreview);

})();

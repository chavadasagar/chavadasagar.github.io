/**
 * ATS Resume Builder - Templates Engine (templates.js)
 * High-performance, semantic, ATS-compliant resume HTML generators.
 * All templates enforce single-column layouts, standard fonts, pure semantic HTML,
 * right-aligned dates/locations, and clean bullet points for 100% parser compatibility.
 */

(function (window) {
  'use strict';

  // Helper: Escape HTML to prevent XSS while maintaining clean formatting
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Format Dates (e.g., "2023-05" -> "May 2023", or pass-through strings)
  function formatDate(dateStr, isPresent) {
    if (isPresent) return 'Present';
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (!trimmed) return '';

    // If matches YYYY-MM
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${year}`;
      }
    }
    // If matches YYYY
    if (/^\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    return escapeHtml(trimmed);
  }

  // Helper: Format Date Range
  function formatDateRange(startDate, endDate, isPresent) {
    const start = formatDate(startDate, false);
    const end = isPresent ? 'Present' : formatDate(endDate, false);
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    if (end) return end;
    return '';
  }

  // Helper: Clean URL for display
  function formatDisplayUrl(url) {
    if (!url) return '';
    return String(url)
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '');
  }

  // Helper: Parse bullet points from text (newlines or hyphens/bullets) into <li> items
  function parseBullets(bulletsText) {
    if (!bulletsText) return '';
    const raw = String(bulletsText);
    const lines = raw.split(/\r?\n/);
    const validLines = [];

    lines.forEach(line => {
      let cleaned = line.trim();
      if (!cleaned) return;
      // Strip leading bullet symbols or dashes if user typed them
      cleaned = cleaned.replace(/^[\u2022\u2023\u25E6\u2043\u2219\*\-\+]\s*/, '').trim();
      if (cleaned) {
        validLines.push(cleaned);
      }
    });

    if (validLines.length === 0) return '';

    return `<ul class="resume-bullet-list">\n${validLines
      .map(item => `  <li class="resume-bullet-item">${escapeHtml(item)}</li>`)
      .join('\n')}\n</ul>`;
  }

  // Helper: Render Skills Section (Categorized or Flat)
  function renderSkillsHtml(skillsData) {
    if (!skillsData || !Array.isArray(skillsData) || skillsData.length === 0) {
      return '';
    }

    // Group skills by category if provided
    const hasCategories = skillsData.some(s => s.category && s.category.trim());

    if (!hasCategories) {
      // Flat list
      const allTags = skillsData
        .map(s => (typeof s === 'string' ? s : s.name))
        .filter(Boolean)
        .map(escapeHtml)
        .join(' • ');
      return `<p class="resume-skills-flat">${allTags}</p>`;
    }

    // Categorized list
    const categoriesMap = {};
    skillsData.forEach(item => {
      const cat = (item.category && item.category.trim()) || 'General Skills';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      const skillName = typeof item === 'string' ? item : item.name;
      if (skillName && skillName.trim()) {
        categoriesMap[cat].push(escapeHtml(skillName.trim()));
      }
    });

    const categoryKeys = Object.keys(categoriesMap);
    if (categoryKeys.length === 0) return '';

    return categoryKeys
      .map(cat => {
        const skillsList = categoriesMap[cat].join(', ');
        return `<div class="resume-skill-row">
          <strong class="resume-skill-category">${escapeHtml(cat)}:</strong>
          <span class="resume-skill-list">${skillsList}</span>
        </div>`;
      })
      .join('\n');
  }

  // Helper: Section Title mapping
  const SECTION_TITLES = {
    summary: 'PROFESSIONAL SUMMARY',
    experience: 'WORK EXPERIENCE',
    education: 'EDUCATION',
    skills: 'TECHNICAL & PROFESSIONAL SKILLS',
    projects: 'KEY PROJECTS',
    certifications: 'CERTIFICATIONS & LICENSES',
    languages: 'LANGUAGES'
  };

  /**
   * 1. TECH / FAANG STANDARD TEMPLATE (Jake's Resume / Silicon Valley Standard)
   * The gold standard for software engineers & tech professionals.
   * Single-column, crisp sans-serif, bold role & company on the left, right-aligned dates & location,
   * compact categorized skills, tight bullet spacing.
   */
  function renderTechTemplate(data, options = {}) {
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [], sectionOrder = [] } = data;

    const contactItems = [];
    if (personal.phone) contactItems.push(`<span>${escapeHtml(personal.phone)}</span>`);
    if (personal.email) contactItems.push(`<a href="mailto:${escapeHtml(personal.email)}" class="resume-link">${escapeHtml(personal.email)}</a>`);
    if (personal.linkedin) {
      const disp = formatDisplayUrl(personal.linkedin);
      contactItems.push(`<a href="${escapeHtml(personal.linkedin)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }
    if (personal.portfolio) {
      const disp = formatDisplayUrl(personal.portfolio);
      contactItems.push(`<a href="${escapeHtml(personal.portfolio)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }
    if (personal.location) contactItems.push(`<span>${escapeHtml(personal.location)}</span>`);

    let headerHtml = `
      <header class="resume-header tech-header">
        <h1 class="resume-name">${escapeHtml(personal.fullName || 'Your Full Name')}</h1>
        ${personal.jobTitle ? `<p class="resume-title">${escapeHtml(personal.jobTitle)}</p>` : ''}
        ${contactItems.length > 0 ? `<div class="resume-contact-bar">${contactItems.join(' • ')}</div>` : ''}
      </header>
    `;

    const sectionRenderers = {
      summary: () => {
        if (!summary || !summary.trim()) return '';
        return `
          <section class="resume-section" data-section="summary">
            <h2 class="resume-section-title">${SECTION_TITLES.summary}</h2>
            <div class="resume-divider"></div>
            <p class="resume-summary-text">${escapeHtml(summary.trim())}</p>
          </section>
        `;
      },

      experience: () => {
        if (!experience || experience.length === 0) return '';
        const itemsHtml = experience.map(exp => {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.isPresent);
          const location = exp.location ? `<span class="resume-location">${escapeHtml(exp.location)}</span>` : '';
          const bulletsHtml = parseBullets(exp.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-role">${escapeHtml(exp.role || 'Role / Job Title')}</strong>
                  ${exp.company ? `<span class="resume-entry-company"> — <strong>${escapeHtml(exp.company)}</strong></span>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${(dateRange && location) ? ` | ` : ''}${location}
                </div>
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="experience">
            <h2 class="resume-section-title">${SECTION_TITLES.experience}</h2>
            <div class="resume-divider"></div>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      education: () => {
        if (!education || education.length === 0) return '';
        const itemsHtml = education.map(edu => {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.isPresent);
          const degreeInfo = [edu.degree, edu.field].filter(Boolean).map(escapeHtml).join(' in ');
          const gpa = edu.gpa ? `<span class="resume-entry-gpa"> (GPA: ${escapeHtml(edu.gpa)})</span>` : '';

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-school">${escapeHtml(edu.institution || 'University / Institution')}</strong>
                  ${degreeInfo ? `<div class="resume-entry-degree">${degreeInfo}${gpa}</div>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${edu.location ? ` | <span class="resume-location">${escapeHtml(edu.location)}</span>` : ''}
                </div>
              </div>
              ${edu.highlights ? `<p class="resume-entry-details">${escapeHtml(edu.highlights)}</p>` : ''}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="education">
            <h2 class="resume-section-title">${SECTION_TITLES.education}</h2>
            <div class="resume-divider"></div>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      skills: () => {
        const skillsHtml = renderSkillsHtml(skills);
        if (!skillsHtml) return '';
        return `
          <section class="resume-section" data-section="skills">
            <h2 class="resume-section-title">${SECTION_TITLES.skills}</h2>
            <div class="resume-divider"></div>
            <div class="resume-skills-container">${skillsHtml}</div>
          </section>
        `;
      },

      projects: () => {
        if (!projects || projects.length === 0) return '';
        const itemsHtml = projects.map(proj => {
          const link = proj.link ? `<a href="${escapeHtml(proj.link)}" target="_blank" rel="noopener" class="resume-link resume-entry-link">${escapeHtml(formatDisplayUrl(proj.link))}</a>` : '';
          const tech = proj.tech ? `<span class="resume-entry-tech"> (Stack: ${escapeHtml(proj.tech)})</span>` : '';
          const bulletsHtml = parseBullets(proj.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-title">${escapeHtml(proj.name || 'Project Name')}</strong>
                  ${tech}
                </div>
                ${link ? `<div class="resume-entry-meta">${link}</div>` : ''}
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="projects">
            <h2 class="resume-section-title">${SECTION_TITLES.projects}</h2>
            <div class="resume-divider"></div>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      certifications: () => {
        if (!certifications || certifications.length === 0) return '';
        const itemsHtml = certifications.map(cert => {
          const date = cert.date ? formatDate(cert.date, false) : '';
          const link = cert.link ? `<a href="${escapeHtml(cert.link)}" target="_blank" rel="noopener" class="resume-link">[Credential]</a>` : '';

          return `
            <div class="resume-entry resume-entry-compact">
              <div class="resume-entry-main">
                <strong>${escapeHtml(cert.name || 'Certification Name')}</strong>
                ${cert.issuer ? ` – <span>${escapeHtml(cert.issuer)}</span>` : ''}
                ${link ? ` ${link}` : ''}
              </div>
              ${date ? `<div class="resume-entry-dates">${escapeHtml(date)}</div>` : ''}
            </div>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="certifications">
            <h2 class="resume-section-title">${SECTION_TITLES.certifications}</h2>
            <div class="resume-divider"></div>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      languages: () => {
        if (!languages || languages.length === 0) return '';
        const langItems = languages.map(lang => {
          const prof = lang.proficiency ? ` (${escapeHtml(lang.proficiency)})` : '';
          return `${escapeHtml(lang.name || '')}${prof}`;
        }).filter(Boolean).join(' • ');

        if (!langItems) return '';

        return `
          <section class="resume-section" data-section="languages">
            <h2 class="resume-section-title">${SECTION_TITLES.languages}</h2>
            <div class="resume-divider"></div>
            <p class="resume-languages-list">${langItems}</p>
          </section>
        `;
      }
    };

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    const activeOrder = (sectionOrder && sectionOrder.length > 0) ? sectionOrder : defaultOrder;

    const bodySectionsHtml = activeOrder
      .map(secKey => (sectionRenderers[secKey] ? sectionRenderers[secKey]() : ''))
      .filter(Boolean)
      .join('\n');

    return `
      <div class="resume-paper template-tech">
        ${headerHtml}
        <main class="resume-body">
          ${bodySectionsHtml}
        </main>
      </div>
    `;
  }

  /**
   * 2. HARVARD / IVY LEAGUE CLASSIC TEMPLATE
   * Prestigious serif typography (Georgia / Garamond), centered header, traditional horizontal rule,
   * italicized institution and role, right-aligned dates.
   */
  function renderClassicTemplate(data, options = {}) {
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [], sectionOrder = [] } = data;

    const contactItems = [];
    if (personal.location) contactItems.push(`<span>${escapeHtml(personal.location)}</span>`);
    if (personal.phone) contactItems.push(`<span>${escapeHtml(personal.phone)}</span>`);
    if (personal.email) contactItems.push(`<a href="mailto:${escapeHtml(personal.email)}" class="resume-link">${escapeHtml(personal.email)}</a>`);
    if (personal.linkedin) {
      const disp = formatDisplayUrl(personal.linkedin);
      contactItems.push(`<a href="${escapeHtml(personal.linkedin)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }
    if (personal.portfolio) {
      const disp = formatDisplayUrl(personal.portfolio);
      contactItems.push(`<a href="${escapeHtml(personal.portfolio)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }

    let headerHtml = `
      <header class="resume-header classic-header text-center">
        <h1 class="resume-name">${escapeHtml(personal.fullName || 'Your Full Name')}</h1>
        ${personal.jobTitle ? `<p class="resume-title">${escapeHtml(personal.jobTitle)}</p>` : ''}
        ${contactItems.length > 0 ? `<div class="resume-contact-bar">${contactItems.join(' • ')}</div>` : ''}
      </header>
    `;

    const sectionRenderers = {
      summary: () => {
        if (!summary || !summary.trim()) return '';
        return `
          <section class="resume-section" data-section="summary">
            <h2 class="resume-section-title">${SECTION_TITLES.summary}</h2>
            <hr class="resume-classic-rule" />
            <p class="resume-summary-text">${escapeHtml(summary.trim())}</p>
          </section>
        `;
      },

      experience: () => {
        if (!experience || experience.length === 0) return '';
        const itemsHtml = experience.map(exp => {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.isPresent);
          const location = exp.location ? `<span class="resume-location">${escapeHtml(exp.location)}</span>` : '';
          const bulletsHtml = parseBullets(exp.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-role">${escapeHtml(exp.role || 'Role / Job Title')}</strong>
                  ${exp.company ? `<span class="resume-entry-company">, <em>${escapeHtml(exp.company)}</em></span>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${(dateRange && location) ? ` | ` : ''}${location}
                </div>
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="experience">
            <h2 class="resume-section-title">${SECTION_TITLES.experience}</h2>
            <hr class="resume-classic-rule" />
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      education: () => {
        if (!education || education.length === 0) return '';
        const itemsHtml = education.map(edu => {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.isPresent);
          const degreeInfo = [edu.degree, edu.field].filter(Boolean).map(escapeHtml).join(' in ');
          const gpa = edu.gpa ? `<span class="resume-entry-gpa"> (GPA: ${escapeHtml(edu.gpa)})</span>` : '';

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-school">${escapeHtml(edu.institution || 'University / Institution')}</strong>
                  ${degreeInfo ? `<div class="resume-entry-degree"><em>${degreeInfo}</em>${gpa}</div>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${edu.location ? ` | <span class="resume-location">${escapeHtml(edu.location)}</span>` : ''}
                </div>
              </div>
              ${edu.highlights ? `<p class="resume-entry-details">${escapeHtml(edu.highlights)}</p>` : ''}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="education">
            <h2 class="resume-section-title">${SECTION_TITLES.education}</h2>
            <hr class="resume-classic-rule" />
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      skills: () => {
        const skillsHtml = renderSkillsHtml(skills);
        if (!skillsHtml) return '';
        return `
          <section class="resume-section" data-section="skills">
            <h2 class="resume-section-title">${SECTION_TITLES.skills}</h2>
            <hr class="resume-classic-rule" />
            <div class="resume-skills-container">${skillsHtml}</div>
          </section>
        `;
      },

      projects: () => {
        if (!projects || projects.length === 0) return '';
        const itemsHtml = projects.map(proj => {
          const link = proj.link ? `<a href="${escapeHtml(proj.link)}" target="_blank" rel="noopener" class="resume-link resume-entry-link">${escapeHtml(formatDisplayUrl(proj.link))}</a>` : '';
          const tech = proj.tech ? `<span class="resume-entry-tech"> (Technologies: ${escapeHtml(proj.tech)})</span>` : '';
          const bulletsHtml = parseBullets(proj.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-title">${escapeHtml(proj.name || 'Project Name')}</strong>
                  ${tech}
                </div>
                ${link ? `<div class="resume-entry-meta">${link}</div>` : ''}
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="projects">
            <h2 class="resume-section-title">${SECTION_TITLES.projects}</h2>
            <hr class="resume-classic-rule" />
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      certifications: () => {
        if (!certifications || certifications.length === 0) return '';
        const itemsHtml = certifications.map(cert => {
          const date = cert.date ? formatDate(cert.date, false) : '';
          const link = cert.link ? `<a href="${escapeHtml(cert.link)}" target="_blank" rel="noopener" class="resume-link">[Credential]</a>` : '';

          return `
            <div class="resume-entry resume-entry-compact">
              <div class="resume-entry-main">
                <strong>${escapeHtml(cert.name || 'Certification Name')}</strong>
                ${cert.issuer ? ` – <em>${escapeHtml(cert.issuer)}</em>` : ''}
                ${link ? ` ${link}` : ''}
              </div>
              ${date ? `<div class="resume-entry-dates">${escapeHtml(date)}</div>` : ''}
            </div>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="certifications">
            <h2 class="resume-section-title">${SECTION_TITLES.certifications}</h2>
            <hr class="resume-classic-rule" />
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      languages: () => {
        if (!languages || languages.length === 0) return '';
        const langItems = languages.map(lang => {
          const prof = lang.proficiency ? ` (${escapeHtml(lang.proficiency)})` : '';
          return `${escapeHtml(lang.name || '')}${prof}`;
        }).filter(Boolean).join(' • ');

        if (!langItems) return '';

        return `
          <section class="resume-section" data-section="languages">
            <h2 class="resume-section-title">${SECTION_TITLES.languages}</h2>
            <hr class="resume-classic-rule" />
            <p class="resume-languages-list">${langItems}</p>
          </section>
        `;
      }
    };

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    const activeOrder = (sectionOrder && sectionOrder.length > 0) ? sectionOrder : defaultOrder;

    const bodySectionsHtml = activeOrder
      .map(secKey => (sectionRenderers[secKey] ? sectionRenderers[secKey]() : ''))
      .filter(Boolean)
      .join('\n');

    return `
      <div class="resume-paper template-classic">
        ${headerHtml}
        <main class="resume-body">
          ${bodySectionsHtml}
        </main>
      </div>
    `;
  }

  /**
   * 3. MODERN EXECUTIVE TEMPLATE
   * Clean modern typography, subtle header accent line, bold title badges,
   * streamlined dividers with user-chosen accent color.
   */
  function renderModernTemplate(data, options = {}) {
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [], sectionOrder = [] } = data;

    const contactItems = [];
    if (personal.email) {
      contactItems.push(`<a href="mailto:${escapeHtml(personal.email)}" class="resume-link">${escapeHtml(personal.email)}</a>`);
    }
    if (personal.phone) {
      contactItems.push(`<span>${escapeHtml(personal.phone)}</span>`);
    }
    if (personal.location) {
      contactItems.push(`<span>${escapeHtml(personal.location)}</span>`);
    }
    if (personal.linkedin) {
      const disp = formatDisplayUrl(personal.linkedin);
      contactItems.push(`<a href="${escapeHtml(personal.linkedin)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }
    if (personal.portfolio) {
      const disp = formatDisplayUrl(personal.portfolio);
      contactItems.push(`<a href="${escapeHtml(personal.portfolio)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }

    let headerHtml = `
      <header class="resume-header modern-header">
        <div class="modern-header-top">
          <h1 class="resume-name">${escapeHtml(personal.fullName || 'Your Full Name')}</h1>
          ${personal.jobTitle ? `<div class="resume-title-badge">${escapeHtml(personal.jobTitle)}</div>` : ''}
        </div>
        ${contactItems.length > 0 ? `<div class="resume-contact-bar">${contactItems.join(' <span class="sep">|</span> ')}</div>` : ''}
      </header>
    `;

    const sectionRenderers = {
      summary: () => {
        if (!summary || !summary.trim()) return '';
        return `
          <section class="resume-section" data-section="summary">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.summary}</h2>
            <p class="resume-summary-text">${escapeHtml(summary.trim())}</p>
          </section>
        `;
      },

      experience: () => {
        if (!experience || experience.length === 0) return '';
        const itemsHtml = experience.map(exp => {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.isPresent);
          const location = exp.location ? `<span class="resume-location">${escapeHtml(exp.location)}</span>` : '';
          const bulletsHtml = parseBullets(exp.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-role">${escapeHtml(exp.role || 'Role / Job Title')}</strong>
                  ${exp.company ? `<span class="resume-entry-company"> @ ${escapeHtml(exp.company)}</span>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${location ? ` <span class="sep">|</span> ${location}` : ''}
                </div>
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="experience">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.experience}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      education: () => {
        if (!education || education.length === 0) return '';
        const itemsHtml = education.map(edu => {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.isPresent);
          const degreeInfo = [edu.degree, edu.field].filter(Boolean).map(escapeHtml).join(' in ');
          const gpa = edu.gpa ? `<span class="resume-entry-gpa"> (GPA: ${escapeHtml(edu.gpa)})</span>` : '';

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-school">${escapeHtml(edu.institution || 'University / Institution')}</strong>
                  ${degreeInfo ? `<div class="resume-entry-degree">${degreeInfo}${gpa}</div>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${edu.location ? ` <span class="sep">|</span> <span class="resume-location">${escapeHtml(edu.location)}</span>` : ''}
                </div>
              </div>
              ${edu.highlights ? `<p class="resume-entry-details">${escapeHtml(edu.highlights)}</p>` : ''}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="education">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.education}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      skills: () => {
        const skillsHtml = renderSkillsHtml(skills);
        if (!skillsHtml) return '';
        return `
          <section class="resume-section" data-section="skills">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.skills}</h2>
            <div class="resume-skills-container">${skillsHtml}</div>
          </section>
        `;
      },

      projects: () => {
        if (!projects || projects.length === 0) return '';
        const itemsHtml = projects.map(proj => {
          const link = proj.link ? `<a href="${escapeHtml(proj.link)}" target="_blank" rel="noopener" class="resume-link resume-entry-link">${escapeHtml(formatDisplayUrl(proj.link))}</a>` : '';
          const tech = proj.tech ? `<span class="resume-entry-tech"> (Stack: ${escapeHtml(proj.tech)})</span>` : '';
          const bulletsHtml = parseBullets(proj.bullets);

          return `
            <article class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-title">${escapeHtml(proj.name || 'Project Name')}</strong>
                  ${tech}
                </div>
                ${link ? `<div class="resume-entry-meta">${link}</div>` : ''}
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="projects">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.projects}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      certifications: () => {
        if (!certifications || certifications.length === 0) return '';
        const itemsHtml = certifications.map(cert => {
          const date = cert.date ? formatDate(cert.date, false) : '';
          const link = cert.link ? `<a href="${escapeHtml(cert.link)}" target="_blank" rel="noopener" class="resume-link">[Credential]</a>` : '';

          return `
            <div class="resume-entry resume-entry-compact">
              <div class="resume-entry-main">
                <strong>${escapeHtml(cert.name || 'Certification Name')}</strong>
                ${cert.issuer ? ` – <span>${escapeHtml(cert.issuer)}</span>` : ''}
                ${link ? ` ${link}` : ''}
              </div>
              ${date ? `<div class="resume-entry-dates">${escapeHtml(date)}</div>` : ''}
            </div>
          `;
        }).join('\n');

        return `
          <section class="resume-section" data-section="certifications">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.certifications}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      languages: () => {
        if (!languages || languages.length === 0) return '';
        const langItems = languages.map(lang => {
          const prof = lang.proficiency ? ` (${escapeHtml(lang.proficiency)})` : '';
          return `${escapeHtml(lang.name || '')}${prof}`;
        }).filter(Boolean).join(' • ');

        if (!langItems) return '';

        return `
          <section class="resume-section" data-section="languages">
            <h2 class="resume-section-title modern-section-title">${SECTION_TITLES.languages}</h2>
            <p class="resume-languages-list">${langItems}</p>
          </section>
        `;
      }
    };

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    const activeOrder = (sectionOrder && sectionOrder.length > 0) ? sectionOrder : defaultOrder;

    const bodySectionsHtml = activeOrder
      .map(secKey => (sectionRenderers[secKey] ? sectionRenderers[secKey]() : ''))
      .filter(Boolean)
      .join('\n');

    return `
      <div class="resume-paper template-modern">
        ${headerHtml}
        <main class="resume-body">
          ${bodySectionsHtml}
        </main>
      </div>
    `;
  }

  /**
   * 4. COMPACT 1-PAGE OPTIMIZED TEMPLATE
   * Specially engineered for maximum information density to fit 5+ years of experience
   * cleanly onto 1 page without sacrificing ATS parser scores or visual hierarchy.
   */
  function renderCompactTemplate(data, options = {}) {
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [], sectionOrder = [] } = data;

    const contactItems = [];
    if (personal.phone) contactItems.push(`<span>${escapeHtml(personal.phone)}</span>`);
    if (personal.email) contactItems.push(`<a href="mailto:${escapeHtml(personal.email)}" class="resume-link">${escapeHtml(personal.email)}</a>`);
    if (personal.location) contactItems.push(`<span>${escapeHtml(personal.location)}</span>`);
    if (personal.linkedin) {
      const disp = formatDisplayUrl(personal.linkedin);
      contactItems.push(`<a href="${escapeHtml(personal.linkedin)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }
    if (personal.portfolio) {
      const disp = formatDisplayUrl(personal.portfolio);
      contactItems.push(`<a href="${escapeHtml(personal.portfolio)}" target="_blank" rel="noopener" class="resume-link">${escapeHtml(disp)}</a>`);
    }

    let headerHtml = `
      <header class="resume-header compact-header">
        <div class="compact-header-row">
          <h1 class="resume-name">${escapeHtml(personal.fullName || 'Your Full Name')}</h1>
          ${personal.jobTitle ? `<span class="compact-header-title"> | ${escapeHtml(personal.jobTitle)}</span>` : ''}
        </div>
        ${contactItems.length > 0 ? `<div class="resume-contact-bar">${contactItems.join(' • ')}</div>` : ''}
      </header>
    `;

    const sectionRenderers = {
      summary: () => {
        if (!summary || !summary.trim()) return '';
        return `
          <section class="resume-section compact-section" data-section="summary">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.summary}</h2>
            <p class="resume-summary-text">${escapeHtml(summary.trim())}</p>
          </section>
        `;
      },

      experience: () => {
        if (!experience || experience.length === 0) return '';
        const itemsHtml = experience.map(exp => {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.isPresent);
          const location = exp.location ? `<span class="resume-location">${escapeHtml(exp.location)}</span>` : '';
          const bulletsHtml = parseBullets(exp.bullets);

          return `
            <article class="resume-entry compact-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-role">${escapeHtml(exp.role || 'Role / Job Title')}</strong>
                  ${exp.company ? `<span class="resume-entry-company">, <strong>${escapeHtml(exp.company)}</strong></span>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${location ? ` | ${location}` : ''}
                </div>
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section compact-section" data-section="experience">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.experience}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      education: () => {
        if (!education || education.length === 0) return '';
        const itemsHtml = education.map(edu => {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.isPresent);
          const degreeInfo = [edu.degree, edu.field].filter(Boolean).map(escapeHtml).join(' in ');
          const gpa = edu.gpa ? `<span class="resume-entry-gpa"> (GPA: ${escapeHtml(edu.gpa)})</span>` : '';

          return `
            <article class="resume-entry compact-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-school">${escapeHtml(edu.institution || 'University / Institution')}</strong>
                  ${degreeInfo ? ` — <span>${degreeInfo}${gpa}</span>` : ''}
                </div>
                <div class="resume-entry-meta">
                  ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ''}
                  ${edu.location ? ` | <span class="resume-location">${escapeHtml(edu.location)}</span>` : ''}
                </div>
              </div>
              ${edu.highlights ? `<p class="resume-entry-details">${escapeHtml(edu.highlights)}</p>` : ''}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section compact-section" data-section="education">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.education}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      skills: () => {
        const skillsHtml = renderSkillsHtml(skills);
        if (!skillsHtml) return '';
        return `
          <section class="resume-section compact-section" data-section="skills">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.skills}</h2>
            <div class="resume-skills-container">${skillsHtml}</div>
          </section>
        `;
      },

      projects: () => {
        if (!projects || projects.length === 0) return '';
        const itemsHtml = projects.map(proj => {
          const link = proj.link ? `<a href="${escapeHtml(proj.link)}" target="_blank" rel="noopener" class="resume-link resume-entry-link">${escapeHtml(formatDisplayUrl(proj.link))}</a>` : '';
          const tech = proj.tech ? `<span class="resume-entry-tech"> (${escapeHtml(proj.tech)})</span>` : '';
          const bulletsHtml = parseBullets(proj.bullets);

          return `
            <article class="resume-entry compact-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-main">
                  <strong class="resume-entry-title">${escapeHtml(proj.name || 'Project Name')}</strong>
                  ${tech}
                </div>
                ${link ? `<div class="resume-entry-meta">${link}</div>` : ''}
              </div>
              ${bulletsHtml}
            </article>
          `;
        }).join('\n');

        return `
          <section class="resume-section compact-section" data-section="projects">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.projects}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      certifications: () => {
        if (!certifications || certifications.length === 0) return '';
        const itemsHtml = certifications.map(cert => {
          const date = cert.date ? formatDate(cert.date, false) : '';
          const link = cert.link ? `<a href="${escapeHtml(cert.link)}" target="_blank" rel="noopener" class="resume-link">[Link]</a>` : '';

          return `
            <div class="resume-entry resume-entry-compact">
              <div class="resume-entry-main">
                <strong>${escapeHtml(cert.name || 'Certification Name')}</strong>
                ${cert.issuer ? ` – <span>${escapeHtml(cert.issuer)}</span>` : ''}
                ${link ? ` ${link}` : ''}
              </div>
              ${date ? `<div class="resume-entry-dates">${escapeHtml(date)}</div>` : ''}
            </div>
          `;
        }).join('\n');

        return `
          <section class="resume-section compact-section" data-section="certifications">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.certifications}</h2>
            <div class="resume-entries-group">${itemsHtml}</div>
          </section>
        `;
      },

      languages: () => {
        if (!languages || languages.length === 0) return '';
        const langItems = languages.map(lang => {
          const prof = lang.proficiency ? ` (${escapeHtml(lang.proficiency)})` : '';
          return `${escapeHtml(lang.name || '')}${prof}`;
        }).filter(Boolean).join(' • ');

        if (!langItems) return '';

        return `
          <section class="resume-section compact-section" data-section="languages">
            <h2 class="resume-section-title compact-title">${SECTION_TITLES.languages}</h2>
            <p class="resume-languages-list">${langItems}</p>
          </section>
        `;
      }
    };

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    const activeOrder = (sectionOrder && sectionOrder.length > 0) ? sectionOrder : defaultOrder;

    const bodySectionsHtml = activeOrder
      .map(secKey => (sectionRenderers[secKey] ? sectionRenderers[secKey]() : ''))
      .filter(Boolean)
      .join('\n');

    return `
      <div class="resume-paper template-compact">
        ${headerHtml}
        <main class="resume-body">
          ${bodySectionsHtml}
        </main>
      </div>
    `;
  }

  /**
   * Plain Text / ATS Raw Text Generator
   * Generates formatted raw text perfect for pasting directly into job application textareas (Taleo, Workday, etc.)
   */
  function generatePlainText(data) {
    const { personal = {}, summary = '', experience = [], education = [], skills = [], projects = [], certifications = [], languages = [], sectionOrder = [] } = data;
    const lines = [];

    // Header
    lines.push((personal.fullName || 'FULL NAME').toUpperCase());
    if (personal.jobTitle) lines.push(personal.jobTitle);
    
    const contactParts = [];
    if (personal.email) contactParts.push(personal.email);
    if (personal.phone) contactParts.push(personal.phone);
    if (personal.location) contactParts.push(personal.location);
    if (personal.linkedin) contactParts.push(personal.linkedin);
    if (personal.portfolio) contactParts.push(personal.portfolio);
    if (contactParts.length > 0) lines.push(contactParts.join(' | '));
    lines.push('');

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    const activeOrder = (sectionOrder && sectionOrder.length > 0) ? sectionOrder : defaultOrder;

    activeOrder.forEach(sectionKey => {
      if (sectionKey === 'summary' && summary && summary.trim()) {
        lines.push('=== PROFESSIONAL SUMMARY ===');
        lines.push(summary.trim());
        lines.push('');
      } else if (sectionKey === 'experience' && experience && experience.length > 0) {
        lines.push('=== WORK EXPERIENCE ===');
        experience.forEach(exp => {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.isPresent);
          lines.push(`${exp.role || 'Role'} | ${exp.company || 'Company'} | ${dateRange}${exp.location ? ` | ${exp.location}` : ''}`);
          if (exp.bullets) {
            exp.bullets.split(/\r?\n/).forEach(b => {
              const cleaned = b.replace(/^[\u2022\*\-\+]\s*/, '').trim();
              if (cleaned) lines.push(`* ${cleaned}`);
            });
          }
          lines.push('');
        });
      } else if (sectionKey === 'education' && education && education.length > 0) {
        lines.push('=== EDUCATION ===');
        education.forEach(edu => {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.isPresent);
          const degreeInfo = [edu.degree, edu.field].filter(Boolean).join(' in ');
          lines.push(`${edu.institution || 'University'} | ${degreeInfo} | ${dateRange}${edu.location ? ` | ${edu.location}` : ''}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`);
          if (edu.highlights) lines.push(edu.highlights.trim());
          lines.push('');
        });
      } else if (sectionKey === 'skills' && skills && skills.length > 0) {
        lines.push('=== TECHNICAL & PROFESSIONAL SKILLS ===');
        const categoriesMap = {};
        skills.forEach(s => {
          const cat = (s.category && s.category.trim()) || 'Skills';
          if (!categoriesMap[cat]) categoriesMap[cat] = [];
          const name = typeof s === 'string' ? s : s.name;
          if (name) categoriesMap[cat].push(name);
        });
        Object.keys(categoriesMap).forEach(cat => {
          lines.push(`${cat}: ${categoriesMap[cat].join(', ')}`);
        });
        lines.push('');
      } else if (sectionKey === 'projects' && projects && projects.length > 0) {
        lines.push('=== PROJECTS ===');
        projects.forEach(proj => {
          lines.push(`${proj.name || 'Project'}${proj.tech ? ` (Technologies: ${proj.tech})` : ''}${proj.link ? ` | ${proj.link}` : ''}`);
          if (proj.bullets) {
            proj.bullets.split(/\r?\n/).forEach(b => {
              const cleaned = b.replace(/^[\u2022\*\-\+]\s*/, '').trim();
              if (cleaned) lines.push(`* ${cleaned}`);
            });
          }
          lines.push('');
        });
      } else if (sectionKey === 'certifications' && certifications && certifications.length > 0) {
        lines.push('=== CERTIFICATIONS ===');
        certifications.forEach(cert => {
          const date = cert.date ? formatDate(cert.date, false) : '';
          lines.push(`${cert.name || 'Certification'}${cert.issuer ? ` - ${cert.issuer}` : ''}${date ? ` (${date})` : ''}${cert.link ? ` | ${cert.link}` : ''}`);
        });
        lines.push('');
      } else if (sectionKey === 'languages' && languages && languages.length > 0) {
        lines.push('=== LANGUAGES ===');
        const lList = languages.map(l => `${l.name}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ');
        lines.push(lList);
        lines.push('');
      }
    });

    return lines.join('\n').trim();
  }

  // Master Render Function
  function renderResume(data, templateName = 'tech', options = {}) {
    switch (templateName) {
      case 'classic':
      case 'harvard':
        return renderClassicTemplate(data, options);
      case 'modern':
        return renderModernTemplate(data, options);
      case 'compact':
        return renderCompactTemplate(data, options);
      case 'tech':
      case 'minimal':
      default:
        return renderTechTemplate(data, options);
    }
  }

  // Expose to window
  window.ResumeTemplates = {
    render: renderResume,
    renderTech: renderTechTemplate,
    renderClassic: renderClassicTemplate,
    renderModern: renderModernTemplate,
    renderCompact: renderCompactTemplate,
    generatePlainText: generatePlainText,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatDateRange: formatDateRange
  };

})(window);

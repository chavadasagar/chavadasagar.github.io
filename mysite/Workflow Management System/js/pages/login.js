/**
 * ==================================================
 * LOGIN PAGE
 * Authentication screen with demo credentials assistant
 * Route: #/login
 * ==================================================
 */

(function () {
  'use strict';

  class LoginPage {
    render(container) {
      // If already authenticated, redirect immediately
      if (window.HRM && window.HRM.AuthService && window.HRM.AuthService.isAuthenticated()) {
        if (window.HRM.Router) {
          window.HRM.Router.navigate('#/dashboard');
        } else {
          window.location.hash = '#/dashboard';
        }
        return;
      }

      // Fetch seeded users to display demo credentials
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      const db = dbService ? dbService.getDatabase() : {};
      const users = db.users || [];

      container.innerHTML = `
        <div class="login-viewport" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
          <div style="width: 100%; max-width: 460px;">
            <!-- Brand & Welcome -->
            <div style="text-align: center; margin-bottom: var(--space-6);">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); box-shadow: var(--shadow-glow); color: #ffffff; font-weight: 800; font-size: 24px; margin-bottom: var(--space-3);">
                H
              </div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700; color: var(--text); letter-spacing: -0.02em;">Welcome to HRM Core</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Enterprise Human Resource & Workflow Management
              </p>
            </div>

            <!-- Login Card -->
            <div class="card" style="box-shadow: var(--shadow-xl); border-color: var(--border);">
              <div class="card-body" style="padding: var(--space-6);">
                <div id="login-error-alert" class="hidden" style="background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-xs); margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 14px; font-weight: bold;">✕</span>
                  <span id="login-error-message">Error message</span>
                </div>

                <form id="login-form" autocomplete="off">
                  <div class="form-group">
                    <label class="form-label required" for="login-email">Email Address</label>
                    <input 
                      type="email" 
                      id="login-email" 
                      class="input" 
                      placeholder="name@company.com" 
                      required 
                      autofocus
                    >
                  </div>

                  <div class="form-group" style="margin-bottom: var(--space-5);">
                    <div class="flex items-center justify-between">
                      <label class="form-label required" for="login-password">Password</label>
                      <span class="text-xs text-muted">Demo: Demo@123</span>
                    </div>
                    <input 
                      type="password" 
                      id="login-password" 
                      class="input" 
                      placeholder="••••••••" 
                      required
                    >
                  </div>

                  <button type="submit" class="btn btn-primary w-full" id="btn-submit-login" style="height: 44px; font-size: var(--text-sm); font-weight: 600;">
                    Sign In to Platform
                  </button>
                </form>
              </div>

              <!-- Quick Demo Credentials Helper -->
              <div class="card-footer" style="flex-direction: column; align-items: stretch; gap: var(--space-3); background-color: var(--surface);">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold" style="color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                    Demo Accounts (1-Click Fill)
                  </span>
                  <span class="badge badge-info badge-pill">Seed v2</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${users.map(u => {
                    const roles = dbService.getUserRoles(u.id);
                    const roleNames = roles.map(r => r.name).join(', ');
                    return `
                      <button 
                        type="button" 
                        class="btn btn-outline btn-sm quick-demo-user-btn" 
                        style="justify-content: space-between; text-align: left; padding: 6px 10px; font-size: 11px;"
                        data-email="${u.email}"
                        data-pass="${u.password}"
                        title="Click to fill ${u.name}'s credentials"
                      >
                        <span style="font-weight: 600; color: var(--text);">${u.name} (${roleNames})</span>
                        <span style="color: var(--primary); font-family: var(--font-mono);">${u.employeeCode}</span>
                      </button>
                    `;
                  }).join('')}
                </div>

                <div style="margin-top: 2px;">
                  <p class="text-xs text-muted" style="font-size: 10px; text-align: center;">
                    Client-side demo session &bull; Key: <code style="font-family: var(--font-mono); color: var(--primary-text); background: var(--surface-elevated); padding: 1px 4px; border-radius: 3px;">current_session</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      const form = container.querySelector('#login-form');
      const emailInput = container.querySelector('#login-email');
      const passwordInput = container.querySelector('#login-password');
      const errorAlert = container.querySelector('#login-error-alert');
      const errorMessage = container.querySelector('#login-error-message');
      const submitBtn = container.querySelector('#btn-submit-login');

      // Quick Demo Auto-fill buttons
      const demoBtns = container.querySelectorAll('.quick-demo-user-btn');
      demoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const email = btn.getAttribute('data-email');
          const pass = btn.getAttribute('data-pass');
          if (emailInput && passwordInput) {
            emailInput.value = email;
            passwordInput.value = pass;
            errorAlert.classList.add('hidden');
            errorAlert.style.display = 'none';
            // Subtle flash highlight
            emailInput.focus();
          }
        });
      });

      // Handle form submission
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          errorAlert.classList.add('hidden');
          errorAlert.style.display = 'none';

          const email = emailInput.value.trim();
          const password = passwordInput.value;

          if (!window.HRM || !window.HRM.AuthService) {
            alert('Authentication service is not loaded.');
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Verifying...';

          const result = window.HRM.AuthService.login(email, password);

          if (result.success) {
            if (window.HRM.Toast) {
              window.HRM.Toast.success(`Welcome back, ${result.user.name}!`, 'Signed In');
            }

            // Navigate to dashboard
            setTimeout(() => {
              if (window.HRM.Router) {
                window.HRM.Router.navigate('#/dashboard');
              } else {
                window.location.hash = '#/dashboard';
              }
            }, 100);
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In to Platform';
            errorMessage.textContent = result.error || 'Authentication failed.';
            errorAlert.classList.remove('hidden');
            errorAlert.style.display = 'flex';
            passwordInput.focus();
          }
        });
      }
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.LoginPage = new LoginPage();
  window.LoginPage = window.HRM.LoginPage;
})();

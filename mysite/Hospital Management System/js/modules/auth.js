/**
 * auth.js - Simulated Authentication, Role Selection, and Patient Registration
 */

window.HMS_AUTH = {
  init: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    // Navigation between Auth screens
    document.getElementById('goto-signup').addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('signup-view');
    });

    document.getElementById('goto-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('login-view');
    });

    document.getElementById('goto-forgot').addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('forgot-view');
    });

    document.getElementById('forgot-back-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('login-view');
    });

    // Form Submissions
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('signup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignup();
    });

    document.getElementById('forgot-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleForgot();
    });
  },

  switchView: function(viewId) {
    document.querySelectorAll('.auth-form-view').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    this.clearErrors();
  },

  clearErrors: function() {
    document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
    document.querySelectorAll('.auth-card input, .auth-card select').forEach(el => el.classList.remove('error'));
  },

  fillDemo: function(role) {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    
    // Map role to seeded usernames
    const roleUsernames = {
      admin: 'admin',
      doctor: 'doctor',
      receptionist: 'receptionist',
      pharmacist: 'pharmacist',
      labtech: 'labtech',
      patient: 'patient'
    };

    usernameInput.value = roleUsernames[role] || '';
    passwordInput.value = 'password';
    
    // Submit form
    this.handleLogin();
  },

  handleLogin: function() {
    this.clearErrors();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    let hasError = false;

    if (!username) {
      this.setError('login-username', 'Username is required');
      hasError = true;
    }
    if (!password) {
      this.setError('login-password', 'Password is required');
      hasError = true;
    }

    if (hasError) return;

    // Validate credentials in localStorage
    const users = window.HMS_DB.getAll(window.HMS_DB.KEYS.USERS);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.password !== password) {
      window.HMS_APP.toast('Login Failed', 'Invalid username or password.', 'danger');
      this.setError('login-username', 'Invalid credentials');
      this.setError('login-password', 'Invalid credentials');
      return;
    }

    // Success login
    window.HMS_DB.setCurrentSession(user);
    window.HMS_APP.toast('Welcome back!', `Logged in successfully as ${user.name} (${user.role}).`, 'success');
    
    // Clear login fields
    usernameInput.value = '';
    passwordInput.value = '';

    // Switch overlays and route to dashboard
    window.location.hash = '#/dashboard';
    window.HMS_APP.checkSession();
  },

  handleSignup: function() {
    this.clearErrors();
    
    const fields = [
      { id: 'signup-name', label: 'Full Name' },
      { id: 'signup-dob', label: 'Date of Birth' },
      { id: 'signup-gender', label: 'Gender' },
      { id: 'signup-blood', label: 'Blood Group' },
      { id: 'signup-phone', label: 'Phone Number' },
      { id: 'signup-email', label: 'Email' },
      { id: 'signup-address', label: 'Address' },
      { id: 'signup-emergency', label: 'Emergency Contact' },
      { id: 'signup-username', label: 'Username' },
      { id: 'signup-password', label: 'Password' }
    ];

    let hasError = false;
    const data = {};

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const val = el.value.trim();
      if (!val) {
        this.setError(f.id, `${f.label} is required`);
        hasError = true;
      } else {
        data[f.id.replace('signup-', '')] = val;
      }
    });

    if (hasError) return;

    // Advanced Validations
    // 1. Phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(data.phone)) {
      this.setError('signup-phone', 'Phone must be exactly 10 numeric digits');
      hasError = true;
    }

    // 2. Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      this.setError('signup-email', 'Please enter a valid email address');
      hasError = true;
    }

    // 3. DOB can't be future
    const dobDate = new Date(data.dob);
    const today = new Date();
    if (dobDate > today) {
      this.setError('signup-dob', 'Date of Birth cannot be in the future');
      hasError = true;
    }

    // 4. Unique Username
    const users = window.HMS_DB.getAll(window.HMS_DB.KEYS.USERS);
    const usernameTaken = users.some(u => u.username.toLowerCase() === data.username.toLowerCase());
    if (usernameTaken) {
      this.setError('signup-username', 'Username is already taken');
      hasError = true;
    }

    // 5. Password strength (minimum 6 chars)
    if (data.password.length < 6) {
      this.setError('signup-password', 'Password must be at least 6 characters long');
      hasError = true;
    }

    if (hasError) return;

    // Process signup:
    // Create new patient record
    const newPatient = {
      name: data.name,
      dob: data.dob,
      gender: data.gender,
      blood_group: data.blood,
      phone: data.phone,
      email: data.email,
      address: data.address,
      emergency_contact: data.emergency,
      medical_history: 'None'
    };
    
    const savedPatient = window.HMS_DB.insert(window.HMS_DB.KEYS.PATIENTS, newPatient);

    // Create user account
    const newUser = {
      username: data.username,
      password: data.password,
      role: 'Patient',
      name: data.name,
      entityId: savedPatient.id
    };

    window.HMS_DB.insert(window.HMS_DB.KEYS.USERS, newUser);

    // Automatically Log In
    window.HMS_DB.setCurrentSession(newUser);
    window.HMS_APP.toast('Registration Successful', `Welcome ${newUser.name}! Your account is registered.`, 'success');
    
    // Reset form
    document.getElementById('signup-form').reset();
    
    // Load app dashboard
    window.location.hash = '#/dashboard';
    window.HMS_APP.checkSession();
  },

  handleForgot: function() {
    this.clearErrors();
    const forgotInput = document.getElementById('forgot-username');
    const val = forgotInput.value.trim();

    if (!val) {
      this.setError('forgot-username', 'Please enter your username or email');
      return;
    }

    // Mock reset notification
    window.HMS_APP.toast('Password Reset Sent', 'A simulated reset link has been dispatched to your email/phone.', 'info');
    forgotInput.value = '';
    this.switchView('login-view');
  },

  setError: function(inputId, message) {
    const inputEl = document.getElementById(inputId);
    const errEl = document.getElementById(`${inputId}-err`);
    
    if (inputEl) inputEl.classList.add('error');
    if (errEl) errEl.innerText = message;
  }
};

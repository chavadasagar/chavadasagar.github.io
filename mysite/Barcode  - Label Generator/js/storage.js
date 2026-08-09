/**
 * Storage Manager for Barcode & Label Generator
 * Handles local persistence of templates, batch history, and user settings.
 */

const StorageManager = (function () {
  'use strict';

  const STORAGE_KEYS = {
    CUSTOM_TEMPLATES: 'lbl_custom_templates_v1',
    RECENT_BATCHES: 'lbl_recent_batches_v1',
    LAST_FORM_STATE: 'lbl_last_form_state_v1',
    USER_SETTINGS: 'lbl_user_settings_v1'
  };

  function getCustomTemplates() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load custom templates from localStorage', e);
      return [];
    }
  }

  function saveCustomTemplate(template) {
    try {
      const templates = getCustomTemplates();
      const existingIdx = templates.findIndex(t => t.id === template.id);
      if (existingIdx !== -1) {
        templates[existingIdx] = { ...template, updatedAt: Date.now() };
      } else {
        templates.push({
          ...template,
          id: template.id || 'tmpl_' + Date.now(),
          createdAt: Date.now()
        });
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
      return true;
    } catch (e) {
      console.error('Failed to save custom template', e);
      return false;
    }
  }

  function deleteCustomTemplate(templateId) {
    try {
      let templates = getCustomTemplates();
      templates = templates.filter(t => t.id !== templateId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
      return true;
    } catch (e) {
      console.error('Failed to delete custom template', e);
      return false;
    }
  }

  function getAllTemplates() {
    const builtin = window.BuiltinTemplates || [];
    const custom = getCustomTemplates();
    return [...builtin, ...custom];
  }

  function getRecentBatches() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_BATCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecentBatch(batchName, items, templateConfig) {
    try {
      const batches = getRecentBatches();
      const newEntry = {
        id: 'batch_' + Date.now(),
        name: batchName || `Batch ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        timestamp: Date.now(),
        itemCount: items.length,
        items: items,
        templateConfig: templateConfig
      };
      // Keep most recent 15 batches
      batches.unshift(newEntry);
      if (batches.length > 15) batches.pop();
      localStorage.setItem(STORAGE_KEYS.RECENT_BATCHES, JSON.stringify(batches));
      return newEntry;
    } catch (e) {
      console.error('Failed to save batch to history', e);
      return null;
    }
  }

  function deleteRecentBatch(batchId) {
    try {
      let batches = getRecentBatches();
      batches = batches.filter(b => b.id !== batchId);
      localStorage.setItem(STORAGE_KEYS.RECENT_BATCHES, JSON.stringify(batches));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearAllBatches() {
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT_BATCHES);
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveFormState(state) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_FORM_STATE, JSON.stringify(state));
    } catch (e) {}
  }

  function loadFormState() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_FORM_STATE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      return data ? JSON.parse(data) : {
        theme: 'dark',
        defaultCurrency: '$',
        defaultPreset: '50x25',
        barcodeFormat: 'CODE128',
        printDarkness: 'normal'
      };
    } catch (e) {
      return { theme: 'dark', defaultCurrency: '$', defaultPreset: '50x25' };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  function exportAllDataJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      customTemplates: getCustomTemplates(),
      recentBatches: getRecentBatches(),
      settings: getSettings()
    };
    return JSON.stringify(data, null, 2);
  }

  function importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.customTemplates && Array.isArray(parsed.customTemplates)) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(parsed.customTemplates));
      }
      if (parsed.recentBatches && Array.isArray(parsed.recentBatches)) {
        localStorage.setItem(STORAGE_KEYS.RECENT_BATCHES, JSON.stringify(parsed.recentBatches));
      }
      if (parsed.settings) {
        localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(parsed.settings));
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  return {
    getCustomTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    getAllTemplates,
    getRecentBatches,
    saveRecentBatch,
    deleteRecentBatch,
    clearAllBatches,
    saveFormState,
    loadFormState,
    getSettings,
    saveSettings,
    exportAllDataJSON,
    importDataJSON
  };
})();

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}

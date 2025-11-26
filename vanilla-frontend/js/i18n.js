/**
 * Internationalization (i18n) Handler
 * Manages language switching and translation
 */

const I18n = {
  currentLanguage: 'en', // Default language

  /**
   * Initialize i18n system
   */
  init() {
    // Load saved language from localStorage FIRST
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
      this.currentLanguage = savedLanguage;
    } else {
      // If no saved language, default to 'en' and save it
      this.currentLanguage = 'en';
      localStorage.setItem('language', 'en');
    }

    // Set HTML lang attribute immediately
    if (document.documentElement) {
      document.documentElement.lang = this.currentLanguage;
    }

    // Apply translations
    this.applyTranslations();

    // Initialize language switcher if it exists
    this.initLanguageSwitcher();
  },

  /**
   * Change language
   */
  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'vi') {
      console.warn('Unsupported language:', lang);
      return;
    }

    // Save to localStorage FIRST
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    // Update HTML lang attribute
    if (document.documentElement) {
      document.documentElement.lang = lang;
    }
    
    // Apply translations immediately
    this.applyTranslations();
    this.updateLanguageSwitcher();
    
    // Force re-apply translations after a short delay to catch dynamically loaded content
    setTimeout(() => {
      this.applyTranslations();
    }, 100);
  },

  /**
   * Get translation for a key
   * Supports nested keys like 'auth.welcomeBack'
   */
  t(key, defaultValue = '') {
    const keys = key.split('.');
    let value = Translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return value || defaultValue || key;
  },

  /**
   * Apply translations to all elements with data-i18n attribute
   */
  applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      
      const translation = this.t(key);

      // Handle different element types
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.type === 'submit' || element.type === 'button') {
          element.value = translation;
        } else {
          // Only update placeholder if it's not being actively edited
          if (document.activeElement !== element) {
            element.placeholder = translation;
          }
        }
      } else if (element.tagName === 'OPTION') {
        element.textContent = translation;
      } else {
        // Preserve HTML structure if element contains other elements
        if (element.children.length === 0) {
          element.textContent = translation;
        } else {
          // Only update text if it's a simple text node
          const firstChild = element.firstChild;
          if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
            firstChild.textContent = translation;
          }
        }
      }
    });

    // Translate elements with data-i18n-title attribute (for title attributes)
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        element.title = this.t(key);
      }
    });

    // Translate elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key && document.activeElement !== element) {
        element.placeholder = this.t(key);
      }
    });

    // Translate page title if it has data-i18n attribute
    const pageTitle = document.querySelector('title[data-i18n]');
    if (pageTitle) {
      const key = pageTitle.getAttribute('data-i18n');
      if (key) {
        document.title = this.t(key);
      }
    }
  },

  /**
   * Initialize language switcher UI
   */
  initLanguageSwitcher() {
    const switcher = document.getElementById('languageSwitcher');
    if (switcher) {
      this.updateLanguageSwitcher();
      return true;
    }
    return false;
  },

  /**
   * Update language switcher UI
   */
  updateLanguageSwitcher() {
    const switcher = document.getElementById('languageSwitcher');
    if (!switcher) {
      console.warn('Language switcher element not found');
      return;
    }

    // Check if Translations is available
    if (typeof Translations === 'undefined') {
      console.warn('Translations not loaded yet');
      // Set a default button that will be updated later
      switcher.innerHTML = `
        <button class="language-btn" onclick="I18n.setLanguage('vi')" title="Language">
          <span class="language-icon">🌐</span>
          <span class="language-text">EN</span>
          <span class="language-arrow">▼</span>
        </button>
      `;
      return;
    }

    const currentLangText = this.currentLanguage === 'en' 
      ? this.t('common.english', 'English') 
      : this.t('common.vietnamese', 'Vietnamese');
    
    const otherLang = this.currentLanguage === 'en' ? 'vi' : 'en';
    const langTitle = this.t('common.language', 'Language');

    switcher.innerHTML = `
      <button class="language-btn" onclick="I18n.setLanguage('${otherLang}')" title="${langTitle}">
        <span class="language-icon">🌐</span>
        <span class="language-text">${currentLangText}</span>
        <span class="language-arrow">▼</span>
      </button>
    `;
  },

  /**
   * Translate status values
   */
  translateStatus(status) {
    const statusKey = status.toLowerCase().replace(/\s+/g, '');
    return this.t(`status.${statusKey}`, status);
  },

  /**
   * Translate priority values
   */
  translatePriority(priority) {
    const priorityKey = priority.toLowerCase();
    return this.t(`priority.${priorityKey}`, priority);
  },

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  },

  /**
   * Check if current language is Vietnamese
   */
  isVietnamese() {
    return this.currentLanguage === 'vi';
  }
};

// Load language preference IMMEDIATELY, even before DOM is ready
(function() {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
    I18n.currentLanguage = savedLanguage;
    // Set HTML lang attribute immediately if document is available
    if (document.documentElement) {
      document.documentElement.lang = savedLanguage;
    }
  }
})();

// Auto-initialize when DOM is ready
function initializeI18n() {
  // Ensure we load from localStorage again (in case it was set before script loaded)
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
    I18n.currentLanguage = savedLanguage;
  }
  
  I18n.init();
  
  // Ensure language switcher is rendered
  setTimeout(() => {
    const switcher = document.getElementById('languageSwitcher');
    if (switcher && (!switcher.innerHTML || switcher.innerHTML.trim() === '')) {
      I18n.updateLanguageSwitcher();
    }
    // Re-apply translations for any dynamically added content
    I18n.applyTranslations();
  }, 200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeI18n);
} else {
  // DOM is already ready, initialize immediately
  initializeI18n();
}

// Also try to initialize after window load as fallback
window.addEventListener('load', () => {
  // Re-apply translations one more time after everything is loaded
  I18n.applyTranslations();
  
  const switcher = document.getElementById('languageSwitcher');
  if (switcher && (!switcher.innerHTML || switcher.innerHTML.trim() === '')) {
    I18n.updateLanguageSwitcher();
  }
});


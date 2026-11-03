/**
 * RIDEWISE LANDING PAGE — 3-WAY THEME CONTROLLER (System | Light | Dark)
 */

const ThemeController = {
  STORAGE_KEY: 'ridewise_theme_choice',

  init() {
    // 1. Get saved choice (system, light, or dark), default to 'system'
    const savedChoice = localStorage.getItem(this.STORAGE_KEY) || 'system';
    this.setChoice(savedChoice);

    // 2. Add click listeners to the 3 buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-theme-choice');
        this.setChoice(choice);
      });
    });

    // 3. Listen to live OS system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentChoice = localStorage.getItem(this.STORAGE_KEY) || 'system';
      if (currentChoice === 'system') {
        this.applySystemTheme();
      }
    });
  },

  setChoice(choice) {
    localStorage.setItem(this.STORAGE_KEY, choice);

    // Update active highlight on the 3-button pill
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.getAttribute('data-theme-choice') === choice) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Apply the actual theme
    if (choice === 'system') {
      this.applySystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', choice);
    }
  },

  applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
};


document.addEventListener('DOMContentLoaded', () => {
  ThemeController.init();
});
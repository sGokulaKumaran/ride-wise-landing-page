/**
 * RIDEWISE LANDING PAGE — SCRIPT
 * 1. ThemeController : 3-way theme switch (System | Light | Dark)
 * 2. TopbarController: slim-on-scroll + route progress line
 */

/* ==========================================================================
   1. THEME CONTROLLER
   ========================================================================== */
const ThemeController = {
  STORAGE_KEY: 'ridewise_theme_choice',
  CHOICES: ['system', 'light', 'dark'],   // same order as the buttons

  init() {
    // 1. Get saved choice (system, light, or dark), default to 'system'
    const savedChoice = localStorage.getItem(this.STORAGE_KEY) || 'system';
    this.setChoice(savedChoice);

    // 2. Add click listeners to the 3 buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setChoice(btn.getAttribute('data-theme-choice'));
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
    if (!this.CHOICES.includes(choice)) choice = 'system';
    localStorage.setItem(this.STORAGE_KEY, choice);

    // Update active state on the 3 buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-theme-choice') === choice;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive);
    });

    // Slide the highlight thumb to the active button
    const segment = document.getElementById('themeSegment');
    if (segment) segment.style.setProperty('--i', this.CHOICES.indexOf(choice));

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

/* ==========================================================================
   START
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  ThemeController.init();
});

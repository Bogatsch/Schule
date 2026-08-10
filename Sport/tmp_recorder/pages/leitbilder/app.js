const categoryButtons = [...document.querySelectorAll('[data-category]')];
const categoryPanels = [...document.querySelectorAll('[data-category-content]')];
const sportButtons = [...document.querySelectorAll('[data-sport]')];
const sportPanels = [...document.querySelectorAll('[data-sport-content]')];

function selectCategory(category, { updateAddress = true, focusHeading = true } = {}) {
  const selectedPanel = categoryPanels.find((panel) => panel.dataset.categoryContent === category);
  if (!selectedPanel) {
    return;
  }

  categoryButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  });
  categoryPanels.forEach((panel) => {
    panel.hidden = panel !== selectedPanel;
  });

  if (updateAddress) {
    window.history.replaceState(null, '', `#${category}`);
  }
  if (focusHeading) {
    selectedPanel.querySelector('h2')?.focus({ preventScroll: true });
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => selectCategory(button.dataset.category));
});

sportButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const sport = button.dataset.sport;
    const selectedPanel = sportPanels.find((panel) => panel.dataset.sportContent === sport);
    if (!selectedPanel) {
      return;
    }

    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willOpen));
    selectedPanel.hidden = !willOpen;
  });
});

const initialCategory = window.location.hash.slice(1);
if (initialCategory) {
  selectCategory(initialCategory, { updateAddress: false, focusHeading: false });
}

(() => {
  const grid = document.querySelector('.photo-grid');
  const dialog = document.querySelector('.photo-enlargement');
  const enlarged = dialog.querySelector('img');
  if (typeof dialog.showModal !== 'function') return;
  grid.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const image = link.querySelector('img');
    if (!image) return;
    event.preventDefault();
    enlarged.src = link.href;
    enlarged.alt = image.alt;
    dialog.showModal();
  });
  dialog.addEventListener('click', () => dialog.close());
})();

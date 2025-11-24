document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('startAppButton');
  if (!btn) return;
  btn.addEventListener('click', function (e) {
    if (e && e.preventDefault) e.preventDefault();
    showFancyAlert('Silahkan pilih Bidang Tugas anda dan lanjutkan');
  });

  // Fancy alert implementation local to welcome page
  function showFancyAlert(message) {
    if (document.getElementById('welcome-fancy-alert')) return;
    const overlay = document.createElement('div');
    overlay.id = 'welcome-fancy-alert';
    overlay.className = 'fancy-alert-overlay';

    const box = document.createElement('div');
    box.className = 'fancy-alert-box';

    const title = document.createElement('h3');
    title.textContent = 'Silahkan Lanjutkan';

    const msg = document.createElement('p');
    msg.textContent = message;

    const btnOk = document.createElement('button');
    btnOk.className = 'fancy-alert-ok';
    btnOk.textContent = 'Lanjutkan';

    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btnOk);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    btnOk.focus();

    function cleanup() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }

    function onKey(ev) {
      if (ev.key === 'Escape') cleanup();
      if (ev.key === 'Enter') btnOk.click();
    }

    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cleanup();
    });

    btnOk.addEventListener('click', () => {
      // Close modal and remain on welcome page
      cleanup();
    });

    document.addEventListener('keydown', onKey);
  }
});

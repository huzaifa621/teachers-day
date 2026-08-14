(() => {
  const state = {
    role: null,
    studentName: null,
    studentInstitute: null,
    professors: [],
    selectedProfId: null
  };

  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function api(url, opts = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...opts });
    let data = null;
    try { data = await res.json(); } catch (_) { /* non-JSON response */ }
    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  function showAlert(id, message, type) {
    const el = $(id);
    el.textContent = message;
    el.className = `alert ${type} show`;
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // ---------- LOGIN ----------
  qsa('.role-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.role-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.dataset.role;
      $('studentLogin').style.display = role === 'student' ? 'block' : 'none';
      $('adminLogin').style.display = role === 'admin' ? 'block' : 'none';
    });
  });

  $('studentLoginBtn').addEventListener('click', async () => {
    const name = $('studentLoginName').value.trim();
    const institute = $('studentLoginInstitute').value.trim();
    if (!name || !institute) {
      showAlert('studentLoginAlert', 'Please enter your name and institute', 'error');
      return;
    }
    try {
      await api('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, institute })
      });
      state.role = 'student';
      state.studentName = name;
      state.studentInstitute = institute;
      showApp();
    } catch (e) {
      showAlert('studentLoginAlert', e.message, 'error');
    }
  });

  $('adminLoginBtn').addEventListener('click', async () => {
    const password = $('adminPassword').value;
    try {
      await api('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      state.role = 'admin';
      showApp();
    } catch (e) {
      showAlert('loginAlert', e.message, 'error');
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    await api('/api/auth/logout', { method: 'POST' });
    state.role = null;
    state.studentName = null;
    state.studentInstitute = null;
    state.professors = [];
    state.selectedProfId = null;
    $('mainApp').style.display = 'none';
    $('loginScreen').classList.add('show');
    $('studentLoginName').value = '';
    $('studentLoginInstitute').value = '';
    $('adminPassword').value = '';
  });

  async function showApp() {
    $('loginScreen').classList.remove('show');
    $('mainApp').style.display = 'block';

    if (state.role === 'student') {
      $('studentTabs').style.display = 'flex';
      $('adminTabs').style.display = 'none';
      switchTab('student');
    } else {
      $('studentTabs').style.display = 'none';
      $('adminTabs').style.display = 'flex';
      switchTab('admin-home');
    }
    await loadProfessors();
  }

  // ---------- TABS ----------
  function switchTab(tab) {
    qsa('.tab-content').forEach((t) => t.classList.remove('active'));
    qsa('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const target = $(tab);
    if (!target) return;
    target.classList.add('active');

    if (tab === 'admin-home') loadDashboard();
    if (tab === 'admin-directory') loadDirectory();
    if (tab === 'admin-send') loadSendPanel();
    if (tab === 'gallery') loadGallery();
  }

  qsa('.tab-btn').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // ---------- PROFESSORS ----------
  async function loadProfessors() {
    try {
      state.professors = await api('/api/professors');
    } catch (e) {
      state.professors = [];
    }
    renderProfessorList(state.professors);
    $('profCount').textContent = state.professors.length;
  }

  function renderProfessorList(list) {
    const el = $('profList');
    if (!list.length) {
      el.innerHTML = '<p class="muted">No professors yet.</p>';
      return;
    }
    el.innerHTML = list.map((p) => `
      <div class="prof-card ${p.id === state.selectedProfId ? 'selected' : ''}" data-id="${p.id}">
        <img src="${p.photo}" alt="${escapeHtml(p.name)}">
        <p><strong>${escapeHtml(p.name)}</strong></p>
        <p style="color:#8b6f47;">${escapeHtml(p.institute)}</p>
      </div>
    `).join('');
    qsa('.prof-card', el).forEach((card) => {
      card.addEventListener('click', () => {
        state.selectedProfId = card.dataset.id;
        qsa('.prof-card', el).forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        updatePreview();
      });
    });
  }

  $('profSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderProfessorList(state.professors.filter((p) =>
      p.name.toLowerCase().includes(q) || p.institute.toLowerCase().includes(q)
    ));
  });

  // ---------- SUBMIT TRIBUTE + LIVE PREVIEW ----------
  qsa('input[name="submitType"]').forEach((r) => r.addEventListener('change', onTypeChange));
  function onTypeChange() {
    const type = qs('input[name="submitType"]:checked').value;
    $('textSection').style.display = type === 'text' ? 'block' : 'none';
    $('videoSection').style.display = type === 'video' ? 'block' : 'none';
    $('pdfSection').style.display = type === 'pdf' ? 'block' : 'none';
    updatePreview();
  }

  $('videoUploadArea').addEventListener('click', () => $('videoFile').click());
  $('pdfUploadArea').addEventListener('click', () => $('pdfFile').click());
  $('photoUploadArea').addEventListener('click', () => $('profPhoto').click());

  $('videoFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    $('videoName').textContent = f ? `Selected: ${f.name}` : '';
    updatePreview();
  });
  $('pdfFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    $('pdfName').textContent = f ? `Selected: ${f.name}` : '';
    updatePreview();
  });

  $('message').addEventListener('input', () => {
    $('charCount').textContent = $('message').value.length;
    updatePreview();
  });
  $('studentFontFamily').addEventListener('change', updatePreview);
  $('studentTextColor').addEventListener('change', updatePreview);

  let lastVideoUrl = null;
  function updatePreview() {
    const type = qs('input[name="submitType"]:checked').value;
    const name = state.studentName || $('studentLoginName').value || 'Student';
    const institute = state.studentInstitute || $('studentLoginInstitute').value || 'Institute';
    const prof = state.professors.find((p) => p.id === state.selectedProfId);
    const fontFamily = $('studentFontFamily').value;
    const textColor = $('studentTextColor').value;

    $('previewFrame').style.fontFamily = fontFamily;
    $('previewStudentName').textContent = name;
    $('previewStudentName').style.color = textColor;
    $('previewStudentInstitute').textContent = institute;
    $('previewProfName').textContent = prof?.name || 'Prof Name';
    $('previewProfName').style.color = textColor;

    $('previewProfImg').innerHTML = prof?.photo
      ? `<img src="${prof.photo}" alt="${escapeHtml(prof.name)}">`
      : '<span class="muted tiny">Prof Photo</span>';

    const left = $('previewLeft');
    if (lastVideoUrl) { URL.revokeObjectURL(lastVideoUrl); lastVideoUrl = null; }

    if (type === 'text') {
      const message = $('message').value || 'Your message will appear here';
      left.innerHTML = `<div class="quote" style="color:${textColor};">${escapeHtml(message)}</div>`;
    } else if (type === 'video') {
      const file = $('videoFile').files[0];
      if (file) {
        lastVideoUrl = URL.createObjectURL(file);
        left.innerHTML = `<video controls src="${lastVideoUrl}"></video>`;
      } else {
        left.innerHTML = '<div class="muted center">Video will show here</div>';
      }
    } else if (type === 'pdf') {
      const file = $('pdfFile').files[0];
      left.innerHTML = file
        ? `<div class="muted center">PDF selected:<br><strong>${escapeHtml(file.name)}</strong></div>`
        : '<div class="muted center">PDF will show here</div>';
    }
  }

  $('submitBtn').addEventListener('click', async () => {
    const type = qs('input[name="submitType"]:checked').value;
    const message = $('message').value.trim();
    const videoFile = $('videoFile').files[0];
    const pdfFile = $('pdfFile').files[0];

    if (!state.selectedProfId) return showAlert('studentAlert', 'Select a professor', 'error');
    if (type === 'text' && !message) return showAlert('studentAlert', 'Write your message', 'error');
    if (type === 'video' && !videoFile) return showAlert('studentAlert', 'Upload your video', 'error');
    if (type === 'pdf' && !pdfFile) return showAlert('studentAlert', 'Upload your PDF', 'error');

    const fd = new FormData();
    fd.append('type', type);
    fd.append('profId', state.selectedProfId);
    fd.append('fontFamily', $('studentFontFamily').value);
    fd.append('textColor', $('studentTextColor').value);
    if (type === 'text') fd.append('message', message);
    if (type === 'video') fd.append('file', videoFile);
    if (type === 'pdf') fd.append('file', pdfFile);

    $('submitBtn').disabled = true;
    $('submitBtn').textContent = 'Submitting...';
    try {
      await fetch('/api/submissions', { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error((data && data.error) || 'Submission failed');
          return data;
        });
      showAlert('studentAlert', 'Tribute submitted! Thank you!', 'success');
      $('message').value = '';
      $('videoFile').value = '';
      $('pdfFile').value = '';
      $('videoName').textContent = '';
      $('pdfName').textContent = '';
      $('charCount').textContent = '0';
      state.selectedProfId = null;
      renderProfessorList(state.professors);
      updatePreview();
    } catch (e) {
      showAlert('studentAlert', e.message, 'error');
    } finally {
      $('submitBtn').disabled = false;
      $('submitBtn').textContent = 'Submit Tribute';
    }
  });

  // ---------- GALLERY ----------
  let allSubmissions = [];
  async function loadGallery() {
    try {
      allSubmissions = await api('/api/submissions');
    } catch (e) {
      allSubmissions = [];
    }
    renderGallery(allSubmissions);
  }

  function typeLabel(t) { return t === 'text' ? 'Message' : t === 'video' ? 'Video' : 'PDF'; }

  function renderGallery(list) {
    $('totalCount').textContent = list.length;
    const el = $('galleryContent');
    if (!list.length) {
      el.innerHTML = '<p class="muted">No tributes yet.</p>';
      return;
    }
    el.innerHTML = list.map((s) => {
      let thumb = '';
      if (s.type === 'text') thumb = `<div style="font-size:36px;">&#128221;</div>`;
      else if (s.type === 'video') thumb = `<video muted><source src="${s.fileUrl}"></video>`;
      else thumb = `<div style="font-size:36px;">&#128196;</div>`;

      return `
        <div class="gallery-card">
          <div class="gallery-thumbnail" data-view="${s.id}">${thumb}</div>
          <div class="gallery-info">
            <div class="gallery-header"><span class="gallery-type">${typeLabel(s.type)}</span></div>
            ${s.type === 'text' ? `<div class="gallery-text">&ldquo;${escapeHtml((s.message || '').slice(0, 90))}&rdquo;</div>` : ''}
            ${s.type !== 'text' ? `<div class="gallery-text">${escapeHtml(s.fileName || '')}</div>` : ''}
            <div class="gallery-meta">
              <div><strong>To:</strong> ${escapeHtml(s.profName)}</div>
              <div><strong>From:</strong> ${escapeHtml(s.studentName)}</div>
              <div><strong>Date:</strong> ${new Date(s.createdAt).toLocaleString()}</div>
            </div>
            <div>
              ${s.type !== 'text' ? `<button class="gallery-btn" data-view="${s.id}">View</button>` : ''}
              <button class="gallery-btn alt" data-pdf="${s.id}">PDF</button>
              <button class="gallery-btn alt" data-card="${s.id}">Card</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    qsa('[data-view]', el).forEach((btn) => btn.addEventListener('click', () => viewSubmission(btn.dataset.view)));
    qsa('[data-pdf]', el).forEach((btn) => btn.addEventListener('click', () => downloadFile(`/api/submissions/${btn.dataset.pdf}/download/pdf`, btn)));
    qsa('[data-card]', el).forEach((btn) => btn.addEventListener('click', () => downloadFile(`/api/submissions/${btn.dataset.card}/download/card`, btn)));
  }

  $('gallerySearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderGallery(allSubmissions.filter((s) =>
      s.studentName.toLowerCase().includes(q) ||
      s.profName.toLowerCase().includes(q) ||
      (s.message || '').toLowerCase().includes(q)
    ));
  });

  function viewSubmission(id) {
    const s = allSubmissions.find((x) => x.id === id);
    if (!s) return;
    let body = '';
    if (s.type === 'video') body = `<video controls autoplay><source src="${s.fileUrl}"></video>`;
    else if (s.type === 'pdf') body = `<iframe src="${s.fileUrl}"></iframe>`;
    $('modalBody').innerHTML = body;
    $('mediaModal').classList.add('show');
  }
  $('modalCloseBtn').addEventListener('click', closeModal);
  $('mediaModal').addEventListener('click', (e) => { if (e.target.id === 'mediaModal') closeModal(); });
  function closeModal() {
    $('mediaModal').classList.remove('show');
    $('modalBody').innerHTML = '';
  }

  async function downloadFile(url, triggerBtn) {
    const original = triggerBtn ? triggerBtn.textContent : null;
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = 'Preparing...'; }
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && data.error) || 'Download failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : 'download';
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      alert(e.message);
    } finally {
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = original; }
    }
  }

  // ---------- ADMIN: DASHBOARD ----------
  async function loadDashboard() {
    try {
      const stats = await api('/api/stats');
      $('statInstitutes').textContent = stats.institutes;
      $('statProfs').textContent = stats.professors;
      $('statSubs').textContent = stats.submissions;
      $('statStudents').textContent = stats.students;
      $('storageUsed').textContent = `${stats.storageMB} MB`;
    } catch (e) { /* ignore */ }
  }
  $('exportJsonBtn').addEventListener('click', () => downloadFile('/api/admin/export.json'));
  $('exportCsvBtn').addEventListener('click', () => downloadFile('/api/admin/export.csv'));
  $('settingsExportJsonBtn').addEventListener('click', () => downloadFile('/api/admin/export.json'));
  $('settingsExportCsvBtn').addEventListener('click', () => downloadFile('/api/admin/export.csv'));
  $('backupBtn').addEventListener('click', () => downloadFile('/api/admin/backup.json'));
  $('clearAllBtn').addEventListener('click', async () => {
    if (!confirm('This clears all professors and tributes from the database. Uploaded files stay on disk. Continue?')) return;
    await api('/api/admin/clear-all', { method: 'DELETE' });
    await loadProfessors();
    await loadDashboard();
    alert('All data cleared.');
  });

  // ---------- ADMIN: ADD PROFESSOR ----------
  $('profPhoto').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      $('photoPreview').innerHTML = `<img src="${evt.target.result}" style="max-width:100px;border:2px solid #8b6f47;border-radius:6px;margin-top:10px;">`;
    };
    reader.readAsDataURL(f);
  });

  $('addProfBtn').addEventListener('click', async () => {
    const institute = $('adminInstitute').value.trim();
    const instituteCode = $('instituteCode').value.trim();
    const name = $('profName').value.trim();
    const dept = $('profDept').value.trim();
    const email = $('profEmail').value.trim();
    const photo = $('profPhoto').files[0];

    if (!institute || !name || !dept || !photo) {
      return showAlert('adminAlert', 'Fill all required fields', 'error');
    }

    const fd = new FormData();
    fd.append('institute', institute);
    fd.append('instituteCode', instituteCode);
    fd.append('name', name);
    fd.append('dept', dept);
    fd.append('email', email);
    fd.append('photo', photo);

    $('addProfBtn').disabled = true;
    try {
      const res = await fetch('/api/professors', { method: 'POST', body: fd, credentials: 'same-origin' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'Could not add professor');

      $('adminInstitute').value = '';
      $('instituteCode').value = '';
      $('profName').value = '';
      $('profDept').value = '';
      $('profEmail').value = '';
      $('profPhoto').value = '';
      $('photoPreview').innerHTML = '';

      await loadProfessors();
      showAlert('adminAlert', `${name} added!`, 'success');
    } catch (e) {
      showAlert('adminAlert', e.message, 'error');
    } finally {
      $('addProfBtn').disabled = false;
    }
  });

  // ---------- ADMIN: DIRECTORY ----------
  function loadDirectory() {
    const dir = $('instituteDirectory');
    const byInstitute = {};
    state.professors.forEach((p) => {
      (byInstitute[p.institute] ||= []).push(p);
    });
    const entries = Object.entries(byInstitute);
    if (!entries.length) {
      dir.innerHTML = '<p class="muted">No professors yet.</p>';
      return;
    }
    dir.innerHTML = entries.map(([inst, profs]) => `
      <div class="inst-group">
        <h3>${escapeHtml(inst)}</h3>
        <div class="professor-grid" style="max-height:none;">
          ${profs.map((p) => `
            <div class="prof-card" style="cursor:default;">
              <img src="${p.photo}" alt="${escapeHtml(p.name)}">
              <p><strong>${escapeHtml(p.name)}</strong></p>
              <p>${escapeHtml(p.dept)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ---------- ADMIN: SEND TO PROFS ----------
  async function loadSendPanel() {
    await loadProfessors();
    let subs = [];
    try { subs = await api('/api/submissions'); } catch (e) { /* ignore */ }

    const byInstitute = {};
    state.professors.forEach((p) => { (byInstitute[p.institute] ||= []).push(p); });

    const panel = $('downloadPanel');
    const entries = Object.entries(byInstitute);
    if (!entries.length) {
      panel.innerHTML = '<p class="muted">No professors yet.</p>';
      return;
    }

    panel.innerHTML = entries.map(([inst, profs]) => `
      <div class="inst-group">
        <h3>${escapeHtml(inst)}</h3>
        ${profs.map((p) => {
          const profSubs = subs.filter((s) => s.profId === p.id);
          const textCount = profSubs.filter((s) => s.type === 'text').length;
          const mediaSubs = profSubs.filter((s) => s.type !== 'text');
          return `
            <div class="prof-send-row">
              <div class="who">
                <img src="${p.photo}" alt="${escapeHtml(p.name)}">
                <div>
                  <div><strong>${escapeHtml(p.name)}</strong></div>
                  <div class="meta">${escapeHtml(p.dept)} &middot; ${profSubs.length} tribute(s)</div>
                </div>
              </div>
              <div class="actions">
                <button class="btn-secondary btn-small" data-bundle="${p.id}" ${textCount === 0 ? 'disabled' : ''}>
                  Combined PDF (${textCount} message${textCount === 1 ? '' : 's'})
                </button>
              </div>
              ${mediaSubs.length ? `
                <div class="media-list" style="width:100%;">
                  ${mediaSubs.map((s) => `
                    <div class="media-row">
                      <span>${typeLabel(s.type)} from <strong>${escapeHtml(s.studentName)}</strong></span>
                      <span>
                        <button class="gallery-btn alt" data-pdf="${s.id}">PDF</button>
                        <button class="gallery-btn alt" data-card="${s.id}">${s.type === 'video' ? 'Video Card' : 'Card'}</button>
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    qsa('[data-bundle]', panel).forEach((btn) => btn.addEventListener('click', () =>
      downloadFile(`/api/professors/${btn.dataset.bundle}/download/pdf`, btn)));
    qsa('[data-pdf]', panel).forEach((btn) => btn.addEventListener('click', () =>
      downloadFile(`/api/submissions/${btn.dataset.pdf}/download/pdf`, btn)));
    qsa('[data-card]', panel).forEach((btn) => btn.addEventListener('click', () =>
      downloadFile(`/api/submissions/${btn.dataset.card}/download/card`, btn)));
  }

  // Live-refresh the professor picker while a student is composing (mirrors admin additions).
  setInterval(() => {
    if (state.role === 'student' && $('student').classList.contains('active')) {
      loadProfessors();
    }
  }, 5000);

  updatePreview();
})();

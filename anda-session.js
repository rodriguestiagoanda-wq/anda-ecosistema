(function () {
  'use strict';
  var LIMIT = 15 * 60 * 1000;
  var timer = null;
  var WORKER = 'https://anda-neon.rodriguestiago-anda.workers.dev';

  function current() {
    try { return JSON.parse(sessionStorage.getItem('anda_user') || 'null'); } catch (_) { return null; }
  }
  function createLock() {
    if (document.getElementById('andaSessionLock')) return;
    var box = document.createElement('div');
    box.id = 'andaSessionLock';
    box.innerHTML = '<form id="andaUnlockForm" style="width:min(390px,calc(100vw - 28px));background:#fff;border-radius:10px;padding:22px;box-shadow:0 24px 70px #0006;font:13px Arial;color:#17324d"><div style="display:flex;align-items:center;gap:10px;margin-bottom:15px"><strong style="background:#243f8f;color:#fff;padding:12px;border-radius:5px">ANDA</strong><div><b style="font-size:17px">Sessão bloqueada</b><div style="font-size:11px;color:#687783">15 minutos sem actividade</div></div></div><label style="display:block;font-weight:700;margin:8px 0">Utilizador<input id="andaUnlockUser" required autocomplete="username" style="display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #9eabb4;border-radius:4px"></label><label style="display:block;font-weight:700;margin:8px 0">Senha<input id="andaUnlockPass" type="password" required autocomplete="current-password" style="display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #9eabb4;border-radius:4px"></label><div id="andaUnlockError" style="min-height:18px;color:#b42323;font-size:11px"></div><button style="width:100%;border:0;border-radius:4px;padding:10px;background:#243f8f;color:#fff;font-weight:800;cursor:pointer">Continuar onde parei</button></form>';
    box.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:#10213ddd;align-items:center;justify-content:center;padding:14px';
    document.body.appendChild(box);
    document.getElementById('andaUnlockForm').addEventListener('submit', unlock);
  }
  function lock() {
    createLock();
    clearTimeout(timer);
    document.getElementById('andaSessionLock').style.display = 'flex';
  }
  function touch() {
    if (document.getElementById('andaSessionLock')?.style.display === 'flex') return;
    sessionStorage.setItem('anda_last_activity', String(Date.now()));
    clearTimeout(timer);
    timer = setTimeout(lock, LIMIT);
  }
  async function unlock(event) {
    event.preventDefault();
    var username = document.getElementById('andaUnlockUser').value.trim().toLowerCase();
    var password = document.getElementById('andaUnlockPass').value;
    var error = document.getElementById('andaUnlockError');
    error.textContent = 'A verificar...';
    try {
      var response = await fetch(WORKER, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'SELECT * FROM app_users ORDER BY id ASC',params:[]})});
      if (!response.ok) throw new Error('Sem ligação à base de dados.');
      var payload = await response.json();
      var found = (payload.rows || []).find(function (u) { return String(u.username).toLowerCase() === username && u.password === password; });
      if (!found) throw new Error('Utilizador ou senha incorrectos.');
      if (/Gestao_contratos\.html$/i.test(location.pathname) && found.role !== 'admin') throw new Error('A Gestão de Contratos é exclusiva para administradores.');
      sessionStorage.setItem('anda_user', JSON.stringify(found));
      window.ANDA_CURRENT_USER = found;
      document.getElementById('andaSessionLock').style.display = 'none';
      document.getElementById('andaUnlockPass').value = '';
      error.textContent = '';
      touch();
    } catch (err) { error.textContent = err.message || 'Não foi possível iniciar a sessão.'; }
  }
  document.addEventListener('DOMContentLoaded', function () {
    createLock();
    var last = Number(sessionStorage.getItem('anda_last_activity') || 0);
    if (current() && last && Date.now() - last >= LIMIT) lock(); else touch();
    ['pointerdown','keydown','scroll','touchstart'].forEach(function (name) { addEventListener(name, touch, {passive:true}); });
  });
})();

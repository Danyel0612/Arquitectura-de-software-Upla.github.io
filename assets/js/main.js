const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET       = "pdfs";
const SESSION_KEY  = "upla-session";   // clave en localStorage

/* ─────────────────────────────────────────────────────────────
   VISOR MODAL — abre PDF/imagen en la misma página
───────────────────────────────────────────────────────────── */
function crearModal() {
  if (document.getElementById('upla-visor')) return;
  const modal = document.createElement('div');
  modal.id = 'upla-visor';
  modal.innerHTML = `
    <div id="upla-visor-overlay">
      <div id="upla-visor-box">
        <button id="upla-visor-close" title="Cerrar">✕</button>
        <div id="upla-visor-content"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Cerrar al hacer click en el overlay o en el botón X
  document.getElementById('upla-visor-close').onclick = cerrarVisor;
  document.getElementById('upla-visor-overlay').onclick = (e) => {
    if (e.target === document.getElementById('upla-visor-overlay')) cerrarVisor();
  };
  // Cerrar con ESC
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarVisor(); });
}

function abrirVisor(url, nombre) {
  crearModal();
  const content = document.getElementById('upla-visor-content');
  const ext = nombre.split('.').pop().toLowerCase();
  const esImagen = ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
  const esPDF    = ext === 'pdf';

  if (esImagen) {
    content.innerHTML = `<img src="${url}" alt="${nombre}" style="max-width:100%;max-height:80vh;border-radius:10px;display:block;margin:auto;">`;
  } else if (esPDF) {
    content.innerHTML = `<iframe src="${url}" style="width:100%;height:80vh;border:none;border-radius:10px;"></iframe>`;
  } else {
    // Otros formatos: ofrecer descarga
    content.innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:4rem;margin-bottom:1rem;">📄</div>
        <p style="margin-bottom:1.5rem;color:#8ba4c0;">${nombre}</p>
        <a href="${url}" download="${nombre}" target="_blank"
           style="padding:12px 28px;background:linear-gradient(135deg,#00e5ff,#7c3aed);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">⬇ Descargar</a>
      </div>`;
  }

  document.getElementById('upla-visor-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cerrarVisor() {
  const overlay = document.getElementById('upla-visor-overlay');
  if (overlay) overlay.style.display = 'none';
  document.getElementById('upla-visor-content').innerHTML = '';
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────────────────
   SESIÓN — leer / guardar / borrar sin pasar por el lock del SDK
───────────────────────────────────────────────────────────── */
function leerSesion() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Verificar que no haya expirado
    if (s && s.expires_at && Date.now() / 1000 < s.expires_at) return s;
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch { return null; }
}

function guardarSesion(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

function borrarSesion() {
  localStorage.removeItem(SESSION_KEY);
  // Limpiar también cualquier clave residual de versiones anteriores
  Object.keys(localStorage)
    .filter(k => k.startsWith("sb-") || k.startsWith("upla-portafolio"))
    .forEach(k => localStorage.removeItem(k));
}

/* ─────────────────────────────────────────────────────────────
   CLIENTE SUPABASE — solo para Storage/DB (sin auth lock)
───────────────────────────────────────────────────────────── */
if (!window.supabase) {
  console.error("Supabase SDK no cargó.");
}

// Cliente anónimo para LEER archivos (nunca se traba)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

/* ─────────────────────────────────────────────────────────────
   LOGIN / LOGOUT vía fetch directo (sin SDK de auth)
───────────────────────────────────────────────────────────── */
async function iniciarSesion(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Error al iniciar sesión");
  guardarSesion(data);
  return data;
}

async function cerrarSesion(accessToken) {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method:  "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${accessToken}` }
    });
  } catch {}
  borrarSesion();
}

/* ─────────────────────────────────────────────────────────────
   UTILIDADES
───────────────────────────────────────────────────────────── */
function extraerEtiqueta(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.length > 50 ? url.slice(0, 50) + "…" : url; }
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR — mostrar "Cerrar Sesión" o "Ingresar"
───────────────────────────────────────────────────────────── */
function actualizarNavbar(session) {
  const navBtn = document.querySelector(".navbar .nav-btn");
  if (!navBtn) return;
  if (session) {
    navBtn.textContent = "Cerrar Sesión";
    navBtn.href = "#";
    navBtn.style.cssText =
      "background:rgba(255,100,100,0.2);border-color:rgba(255,100,100,0.4);color:#ff6b6b";
    navBtn.onclick = async (e) => {
      e.preventDefault();
      navBtn.textContent = "Saliendo…";
      await cerrarSesion(session.access_token);
      window.location.reload();
    };
  } else {
    navBtn.textContent = "Ingresar";
    navBtn.style.cssText = "";
    navBtn.href = (window.location.pathname.includes("/pages/")) ? "login.html" : "pages/login.html";
    navBtn.onclick = null;
  }
}

/* ─────────────────────────────────────────────────────────────
   CONTROLES — mostrar/ocultar botones según sesión
───────────────────────────────────────────────────────────── */
function controlarOpciones(session) {
  const loggedIn = !!session;
  document.querySelectorAll(".upload-btn").forEach(btn =>
    btn.style.setProperty("display", loggedIn ? "inline-block" : "none", "important"));
  document.querySelectorAll(".link-upload").forEach(box =>
    box.style.setProperty("display", loggedIn ? "flex" : "none", "important"));
  actualizarNavbar(session);
}

/* ─────────────────────────────────────────────────────────────
   ACORDEÓN
───────────────────────────────────────────────────────────── */
function activarDespliegue() {
  document.querySelectorAll(".week-header").forEach(header => {
    header.addEventListener("click", () => {
      header.closest(".week-card")?.classList.toggle("open");
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   CARGA DE ARCHIVOS Y LINKS DE UNA ZONA
───────────────────────────────────────────────────────────── */
async function cargarContenidoDeZona(zone) {
  const ruta     = zone.dataset.path;
  const fileList = zone.querySelector(".file-list");
  if (!ruta || !fileList) return;

  fileList.innerHTML = `<div class="file-loading">⏳ Cargando archivos…</div>`;
  let totalItems = 0;

  /* Archivos del Storage */
  try {
    const { data: archivos, error } = await db.storage.from(BUCKET).list(ruta, { limit: 100 });
    if (!error && Array.isArray(archivos)) {
      archivos
        .filter(f => f.name && f.name !== ".emptyFolderPlaceholder" && f.name.includes("."))
        .forEach(file => {
          const { data: pub } = db.storage.from(BUCKET).getPublicUrl(`${ruta}/${file.name}`);
          const div = document.createElement("div");
          div.className = "uploaded-file-item";
          div.innerHTML = `
            <span class="uploaded-file-name">📎 ${file.name}</span>
            <button class="uploaded-file-link ver-btn" data-url="${pub.publicUrl}" data-nombre="${file.name}">VER</button>`;
          div.querySelector('.ver-btn').onclick = () => abrirVisor(pub.publicUrl, file.name);
          fileList.appendChild(div);
          totalItems++;
        });
    }
    if (error) console.error("Storage error:", ruta, error.message);
  } catch (e) { console.error("Storage excepción:", ruta, e.message); }

  /* Links de la DB */
  try {
    const { data: links, error } = await db.from("links").select("id,titulo,url").eq("ruta", ruta);
    if (!error && Array.isArray(links)) {
      links.forEach(link => {
        const etiqueta = (link.titulo && link.titulo !== "Link guardado")
          ? link.titulo : extraerEtiqueta(link.url);
        const div = document.createElement("div");
        div.className = "uploaded-file-item";
        div.innerHTML = `
          <span class="uploaded-file-name">🔗 ${etiqueta}</span>
          <a class="uploaded-file-link" href="${link.url}" target="_blank">ABRIR</a>`;
        fileList.appendChild(div);
        totalItems++;
      });
    }
    if (error) console.error("DB error:", ruta, error.message);
  } catch (e) { console.error("DB excepción:", ruta, e.message); }

  const loading = fileList.querySelector(".file-loading");
  if (loading) loading.remove();
  if (totalItems === 0) {
    fileList.innerHTML = `<div class="file-empty">Sin archivos subidos aún</div>`;
  }
}

async function cargarTodo() {
  const zonas = [...document.querySelectorAll(".upload-zone[data-path]")];
  await Promise.all(zonas.map(z => cargarContenidoDeZona(z)));
}

/* ─────────────────────────────────────────────────────────────
   SUBIDA DE ARCHIVOS
───────────────────────────────────────────────────────────── */
function configurarSubidas(session) {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const s = leerSesion();
      if (!s) { alert("Debes iniciar sesión."); return; }

      const input = Object.assign(document.createElement("input"),
        { type: "file", accept: ".pdf,.png,.jpg,.jpeg,.doc,.docx" });

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const zone = btn.closest(".upload-zone");
        const path = `${zone.dataset.path}/${Date.now()}-${file.name}`;
        btn.textContent = "Subiendo…";

        // Subir con el token de sesión del usuario
        const uploadClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { headers: { Authorization: `Bearer ${s.access_token}` } }
        });
        const { error } = await uploadClient.storage.from(BUCKET).upload(path, file);
        btn.textContent = "Subir PDF";
        if (error) { alert("Error subiendo: " + error.message); return; }
        await cargarContenidoDeZona(zone);
      };
      input.click();
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   GUARDADO DE LINKS
───────────────────────────────────────────────────────────── */
function configurarLinks() {
  document.querySelectorAll(".save-link-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const s = leerSesion();
      if (!s) { alert("Debes iniciar sesión."); return; }

      const zone  = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url   = input.value.trim();
      if (!url) { alert("Pega un enlace primero."); return; }
      try { new URL(url); } catch { alert("URL inválida. Incluye https://"); return; }

      btn.textContent = "Guardando…";
      const linkClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${s.access_token}` } }
      });
      const { error } = await linkClient.from("links").insert([
        { ruta: zone.dataset.path, titulo: extraerEtiqueta(url), url }
      ]);
      btn.textContent = "Guardar Link";
      if (error) { alert("Error guardando link: " + error.message); return; }
      input.value = "";
      await cargarContenidoDeZona(zone);
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   INICIO
───────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  const session = leerSesion();

  activarDespliegue();
  controlarOpciones(session);   // Instantáneo — no espera red
  cargarTodo();                  // Paralelo — no bloquea la UI
  configurarSubidas(session);
  configurarLinks();
});

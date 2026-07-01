const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET      = "pdfs";

/* ── Inicializar cliente ── */
if (!window.supabase) {
  console.error("❌ Supabase SDK no cargó. Verifica el script en el HTML.");
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ──────────────────────────────────────────
   Utilidades
────────────────────────────────────────── */
function extraerEtiqueta(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.length > 50 ? url.slice(0, 50) + "…" : url; }
}

/* ──────────────────────────────────────────
   Navbar — estado de sesión
────────────────────────────────────────── */
async function actualizarNavbar() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;
  const navBtn = document.querySelector(".navbar .nav-btn");
  if (!navBtn) return;
  if (user) {
    navBtn.textContent = "Cerrar Sesión";
    navBtn.href = "#";
    navBtn.style.cssText = "background:rgba(255,100,100,0.2);border-color:rgba(255,100,100,0.4);color:#ff6b6b";
    navBtn.onclick = async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  } else {
    navBtn.textContent = "Ingresar";
    navBtn.style.cssText = "";
    navBtn.onclick = null;
  }
}

/* ──────────────────────────────────────────
   Acordeón
────────────────────────────────────────── */
function activarDespliegue() {
  document.querySelectorAll(".week-header").forEach(header => {
    header.addEventListener("click", () => {
      header.closest(".week-card")?.classList.toggle("open");
    });
  });
}

/* ──────────────────────────────────────────
   Carga de una zona: archivos + links
────────────────────────────────────────── */
async function cargarContenidoDeZona(zone) {
  const ruta     = zone.dataset.path;
  const fileList = zone.querySelector(".file-list");
  if (!ruta || !fileList) return;

  /* Indicador de carga */
  fileList.innerHTML = `<div class="file-loading">⏳ Cargando archivos…</div>`;

  let totalItems = 0;

  /* ── Archivos del Storage ── */
  try {
    const { data: archivos, error } = await supabaseClient
      .storage.from(BUCKET).list(ruta, { limit: 100 });

    if (error) {
      console.error("Storage error en", ruta, error);
    } else if (Array.isArray(archivos)) {
      archivos
        .filter(f => f.name && f.name !== ".emptyFolderPlaceholder" && f.name.includes("."))
        .forEach(file => {
          const { data: pub } = supabaseClient.storage
            .from(BUCKET).getPublicUrl(`${ruta}/${file.name}`);
          const div = document.createElement("div");
          div.className = "uploaded-file-item";
          div.dataset.tipo = "archivo";
          div.innerHTML = `
            <span class="uploaded-file-name">📎 ${file.name}</span>
            <a class="uploaded-file-link" href="${pub.publicUrl}" target="_blank">VER</a>`;
          fileList.appendChild(div);
          totalItems++;
        });
    }
  } catch (e) {
    console.error("Excepción cargando archivos de", ruta, e);
  }

  /* ── Links de la DB ── */
  try {
    const { data: links, error } = await supabaseClient
      .from("links").select("id,titulo,url").eq("ruta", ruta);

    if (error) {
      console.error("DB error en", ruta, error);
    } else if (Array.isArray(links)) {
      links.forEach(link => {
        const etiqueta = (link.titulo && link.titulo !== "Link guardado")
          ? link.titulo : extraerEtiqueta(link.url);
        const div = document.createElement("div");
        div.className = "uploaded-file-item";
        div.dataset.tipo = "link";
        div.innerHTML = `
          <span class="uploaded-file-name">🔗 ${etiqueta}</span>
          <a class="uploaded-file-link" href="${link.url}" target="_blank">ABRIR</a>`;
        fileList.appendChild(div);
        totalItems++;
      });
    }
  } catch (e) {
    console.error("Excepción cargando links de", ruta, e);
  }

  /* Quitar el indicador de carga */
  const loading = fileList.querySelector(".file-loading");
  if (loading) loading.remove();

  /* Mensaje si no hay nada */
  if (totalItems === 0) {
    fileList.innerHTML = `<div class="file-empty">Sin archivos subidos aún</div>`;
  }
}

/* ──────────────────────────────────────────
   Carga todas las zonas en paralelo
────────────────────────────────────────── */
async function cargarTodo() {
  const zonas = [...document.querySelectorAll(".upload-zone[data-path]")];
  await Promise.all(zonas.map(z => cargarContenidoDeZona(z)));
}

/* ──────────────────────────────────────────
   Visibilidad de controles (solo con sesión)
────────────────────────────────────────── */
async function controlarOpciones() {
  const { data } = await supabaseClient.auth.getSession();
  const loggedIn = !!data.session?.user;

  document.querySelectorAll(".upload-btn").forEach(btn =>
    btn.style.setProperty("display", loggedIn ? "inline-block" : "none", "important"));

  document.querySelectorAll(".link-upload").forEach(box =>
    box.style.setProperty("display", loggedIn ? "flex" : "none", "important"));

  await actualizarNavbar();
}

/* ──────────────────────────────────────────
   Subida de archivos
────────────────────────────────────────── */
function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) { alert("Debes iniciar sesión."); return; }

      const input = Object.assign(document.createElement("input"),
        { type: "file", accept: ".pdf,.png,.jpg,.jpeg,.doc,.docx" });

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const zone = btn.closest(".upload-zone");
        const path = `${zone.dataset.path}/${Date.now()}-${file.name}`;
        btn.textContent = "Subiendo…";
        const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file);
        btn.textContent = "Subir PDF";
        if (error) { alert("Error: " + error.message); return; }
        await cargarContenidoDeZona(zone);
      };
      input.click();
    });
  });
}

/* ──────────────────────────────────────────
   Guardado de links
────────────────────────────────────────── */
function configurarLinks() {
  document.querySelectorAll(".save-link-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) { alert("Debes iniciar sesión."); return; }

      const zone  = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url   = input.value.trim();
      if (!url) { alert("Pega un enlace primero."); return; }
      try { new URL(url); } catch { alert("URL inválida. Incluye https://"); return; }

      btn.textContent = "Guardando…";
      const { error } = await supabaseClient.from("links").insert([
        { ruta: zone.dataset.path, titulo: extraerEtiqueta(url), url }
      ]);
      btn.textContent = "Guardar Link";
      if (error) { alert("Error: " + error.message); return; }
      input.value = "";
      await cargarContenidoDeZona(zone);
    });
  });
}

/* ──────────────────────────────────────────
   Inicio
────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  activarDespliegue();
  await cargarTodo();
  await controlarOpciones();
  configurarSubidas();
  configurarLinks();
});

supabaseClient.auth.onAuthStateChange(async () => {
  await controlarOpciones();
});
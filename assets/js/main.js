const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET = "pdfs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ──────────────────────────────────────────
   Utilidades
────────────────────────────────────────── */

/** Extrae el dominio de una URL para usar como etiqueta legible. */
function extraerEtiqueta(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

/* ──────────────────────────────────────────
   Navbar: mostrar estado de sesión
────────────────────────────────────────── */

async function actualizarNavbar() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  // Busca el botón de "Ingresar" en el navbar
  const navBtn = document.querySelector(".navbar .nav-btn");
  if (!navBtn) return;

  if (user) {
    // Cambia el botón a "Cerrar sesión"
    navBtn.textContent = "Cerrar Sesión";
    navBtn.href = "#";
    navBtn.onclick = async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
    navBtn.style.background = "rgba(255,100,100,0.2)";
    navBtn.style.borderColor = "rgba(255,100,100,0.4)";
    navBtn.style.color = "#ff6b6b";
  } else {
    navBtn.textContent = "Ingresar";
    navBtn.href = navBtn.href.includes("login") ? navBtn.href : "login.html";
    navBtn.onclick = null;
    navBtn.style.background = "";
    navBtn.style.borderColor = "";
    navBtn.style.color = "";
  }
}

/* ──────────────────────────────────────────
   Despliegue de semanas (acordeón)
────────────────────────────────────────── */

function activarDespliegue() {
  document.querySelectorAll(".week-header").forEach(header => {
    header.onclick = () => {
      const card = header.closest(".week-card");
      if (card) card.classList.toggle("open");
    };
  });
}

/* ──────────────────────────────────────────
   Carga de archivos desde Supabase Storage
   (visible para TODOS los usuarios)
────────────────────────────────────────── */

async function cargarArchivos() {
  for (const card of document.querySelectorAll(".week-card")) {
    const fileList   = card.querySelector(".file-list");
    const uploadZone = card.querySelector(".upload-zone");
    if (!fileList || !uploadZone) continue;

    const ruta = uploadZone.dataset.path;

    // Limpia items de archivo previos (sin tocar los de link)
    card.querySelectorAll(".uploaded-file-item[data-tipo='archivo']").forEach(el => el.remove());

    const { data, error } = await supabaseClient.storage.from(BUCKET).list(ruta);
    if (error || !data) continue;

    data
      .filter(f => f.name !== ".emptyFolderPlaceholder" && f.name.includes("."))
      .forEach(file => {
        const filePath = `${ruta}/${file.name}`;
        const { data: publicData } = supabaseClient.storage.from(BUCKET).getPublicUrl(filePath);

        const item = document.createElement("div");
        item.className = "uploaded-file-item";
        item.dataset.tipo = "archivo";
        item.innerHTML = `
          <span class="uploaded-file-name">📎 ${file.name}</span>
          <a class="uploaded-file-link" href="${publicData.publicUrl}" target="_blank">VER</a>
        `;
        fileList.appendChild(item);
      });
  }
}

/* ──────────────────────────────────────────
   Carga de links desde Supabase DB
   (visible para TODOS los usuarios)
────────────────────────────────────────── */

async function cargarLinks() {
  for (const zone of document.querySelectorAll(".upload-zone")) {
    const ruta     = zone.dataset.path;
    const fileList = zone.querySelector(".file-list");
    if (!ruta || !fileList) continue;

    // Limpia items de link previos
    zone.querySelectorAll(".uploaded-file-item[data-tipo='link']").forEach(el => el.remove());

    const { data, error } = await supabaseClient
      .from("links")
      .select("*")
      .eq("ruta", ruta);

    if (error || !data) continue;

    data.forEach(link => {
      const etiqueta = link.titulo && link.titulo !== "Link guardado"
        ? link.titulo
        : extraerEtiqueta(link.url);

      const item = document.createElement("div");
      item.className = "uploaded-file-item";
      item.dataset.tipo = "link";
      item.innerHTML = `
        <span class="uploaded-file-name">🔗 ${etiqueta}</span>
        <a class="uploaded-file-link" href="${link.url}" target="_blank">ABRIR</a>
      `;
      fileList.appendChild(item);
    });
  }
}

/* ──────────────────────────────────────────
   Control de visibilidad de controles de
   subida — SOLO visibles con sesión activa
────────────────────────────────────────── */

async function controlarOpciones() {
  const { data } = await supabaseClient.auth.getSession();
  const loggedIn = !!data.session?.user;

  // Botón "Subir PDF" → visible SOLO con sesión
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.style.setProperty("display", loggedIn ? "inline-block" : "none", "important");
  });

  // Sección de guardar link → visible SOLO con sesión
  document.querySelectorAll(".link-upload").forEach(box => {
    box.style.setProperty("display", loggedIn ? "flex" : "none", "important");
  });

  // Actualiza el navbar
  await actualizarNavbar();
}

/* ──────────────────────────────────────────
   Configurar subida de archivos PDF
────────────────────────────────────────── */

function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        alert("Debes iniciar sesión para subir archivos.");
        return;
      }

      const input = document.createElement("input");
      input.type   = "file";
      input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const zone = btn.closest(".upload-zone");
        const ruta = `${zone.dataset.path}/${Date.now()}-${file.name}`;

        btn.textContent = "Subiendo…";
        const { error } = await supabaseClient.storage.from(BUCKET).upload(ruta, file);
        btn.textContent = "Subir PDF";

        if (error) {
          alert("Error al subir: " + error.message);
          return;
        }

        await cargarArchivos();
        await cargarLinks();
      };

      input.click();
    };
  });
}

/* ──────────────────────────────────────────
   Configurar guardado de links
────────────────────────────────────────── */

function configurarLinks() {
  document.querySelectorAll(".save-link-btn").forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        alert("Debes iniciar sesión para guardar links.");
        return;
      }

      const zone  = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url   = input.value.trim();

      if (!url) {
        alert("Pega un enlace primero.");
        return;
      }

      // Valida URL
      try { new URL(url); } catch {
        alert("El enlace no es válido. Asegúrate de incluir https://");
        return;
      }

      const etiqueta = extraerEtiqueta(url);

      btn.textContent = "Guardando…";
      const { error } = await supabaseClient.from("links").insert([
        { ruta: zone.dataset.path, titulo: etiqueta, url }
      ]);
      btn.textContent = "Guardar Link";

      if (error) {
        alert("Error al guardar el link: " + error.message);
        return;
      }

      input.value = "";
      await cargarArchivos();
      await cargarLinks();
    };
  });
}

/* ──────────────────────────────────────────
   Inicialización al cargar la página
────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", async () => {
  activarDespliegue();

  // Siempre carga archivos y links (para visitantes y usuarios)
  await cargarArchivos();
  await cargarLinks();

  // Controla visibilidad de botones de subida según sesión
  await controlarOpciones();

  // Configura eventos (solo actúan si hay sesión)
  configurarSubidas();
  configurarLinks();
});

/* ──────────────────────────────────────────
   Reacciona en tiempo real a login / logout
────────────────────────────────────────── */
supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  await controlarOpciones();
});
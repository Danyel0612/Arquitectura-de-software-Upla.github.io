const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET      = "pdfs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ──────────────────────────────────────────
   Utilidades
────────────────────────────────────────── */

function extraerEtiqueta(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 50 ? url.slice(0, 50) + "…" : url;
  }
}

/* ──────────────────────────────────────────
   Navbar — muestra estado de sesión
────────────────────────────────────────── */

async function actualizarNavbar() {
  const { data } = await supabaseClient.auth.getSession();
  const user     = data.session?.user;
  const navBtn   = document.querySelector(".navbar .nav-btn");
  if (!navBtn) return;

  if (user) {
    navBtn.textContent    = "Cerrar Sesión";
    navBtn.href           = "#";
    navBtn.style.background  = "rgba(255,100,100,0.2)";
    navBtn.style.borderColor = "rgba(255,100,100,0.4)";
    navBtn.style.color       = "#ff6b6b";
    navBtn.onclick = async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  } else {
    navBtn.textContent    = "Ingresar";
    navBtn.style.background  = "";
    navBtn.style.borderColor = "";
    navBtn.style.color       = "";
    navBtn.onclick = null;
  }
}

/* ──────────────────────────────────────────
   Acordeón de semanas
────────────────────────────────────────── */

function activarDespliegue() {
  document.querySelectorAll(".week-header").forEach(header => {
    header.addEventListener("click", () => {
      const card = header.closest(".week-card");
      if (card) card.classList.toggle("open");
    });
  });
}

/* ──────────────────────────────────────────
   Carga archivos + links de una sola zona
   y los renderiza en su file-list
────────────────────────────────────────── */

async function cargarContenidoDeZona(zone) {
  const ruta     = zone.dataset.path;
  const fileList = zone.querySelector(".file-list");
  if (!ruta || !fileList) return;

  // Vaciar el file-list completamente antes de repoblar
  fileList.innerHTML = "";

  // ── 1. Archivos desde Supabase Storage ──
  try {
    const { data: archivos, error: errStorage } =
      await supabaseClient.storage.from(BUCKET).list(ruta, { limit: 100 });

    if (!errStorage && Array.isArray(archivos)) {
      archivos
        .filter(f => f.name && f.name !== ".emptyFolderPlaceholder" && f.name.includes("."))
        .forEach(file => {
          const fullPath  = `${ruta}/${file.name}`;
          const { data: pub } = supabaseClient.storage.from(BUCKET).getPublicUrl(fullPath);

          const div = document.createElement("div");
          div.className        = "uploaded-file-item";
          div.dataset.tipo     = "archivo";
          div.innerHTML = `
            <span class="uploaded-file-name">📎 ${file.name}</span>
            <a class="uploaded-file-link" href="${pub.publicUrl}" target="_blank">VER</a>
          `;
          fileList.appendChild(div);
        });
    }
  } catch (e) {
    console.error("Error al cargar archivos de", ruta, e);
  }

  // ── 2. Links desde la tabla de base de datos ──
  try {
    const { data: links, error: errDB } = await supabaseClient
      .from("links")
      .select("id, titulo, url")
      .eq("ruta", ruta);

    if (!errDB && Array.isArray(links)) {
      links.forEach(link => {
        const etiqueta = (link.titulo && link.titulo !== "Link guardado")
          ? link.titulo
          : extraerEtiqueta(link.url);

        const div = document.createElement("div");
        div.className    = "uploaded-file-item";
        div.dataset.tipo = "link";
        div.innerHTML = `
          <span class="uploaded-file-name">🔗 ${etiqueta}</span>
          <a class="uploaded-file-link" href="${link.url}" target="_blank">ABRIR</a>
        `;
        fileList.appendChild(div);
      });
    }
  } catch (e) {
    console.error("Error al cargar links de", ruta, e);
  }
}

/* ──────────────────────────────────────────
   Recarga TODAS las zonas de la página
────────────────────────────────────────── */

async function cargarTodo() {
  const zonas = document.querySelectorAll(".upload-zone[data-path]");
  // Las cargamos en paralelo para que sea más rápido
  await Promise.all([...zonas].map(zone => cargarContenidoDeZona(zone)));
}

/* ──────────────────────────────────────────
   Control de visibilidad (solo con sesión)
────────────────────────────────────────── */

async function controlarOpciones() {
  const { data } = await supabaseClient.auth.getSession();
  const loggedIn = !!data.session?.user;

  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.style.setProperty("display", loggedIn ? "inline-block" : "none", "important");
  });

  document.querySelectorAll(".link-upload").forEach(box => {
    box.style.setProperty("display", loggedIn ? "flex" : "none", "important");
  });

  await actualizarNavbar();
}

/* ──────────────────────────────────────────
   Subida de archivos
────────────────────────────────────────── */

function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        alert("Debes iniciar sesión para subir archivos.");
        return;
      }

      const input    = document.createElement("input");
      input.type     = "file";
      input.accept   = ".pdf,.png,.jpg,.jpeg,.doc,.docx";
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const zone     = btn.closest(".upload-zone");
        const filePath = `${zone.dataset.path}/${Date.now()}-${file.name}`;

        btn.textContent = "Subiendo…";
        const { error } = await supabaseClient.storage.from(BUCKET).upload(filePath, file);
        btn.textContent = "Subir PDF";

        if (error) {
          alert("Error al subir: " + error.message);
          return;
        }
        // Recarga solo esta zona
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
      if (!data.session) {
        alert("Debes iniciar sesión para guardar links.");
        return;
      }

      const zone  = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url   = input.value.trim();

      if (!url) { alert("Pega un enlace primero."); return; }

      try { new URL(url); } catch {
        alert("El enlace no es válido. Incluye https://");
        return;
      }

      btn.textContent = "Guardando…";
      const { error } = await supabaseClient.from("links").insert([
        { ruta: zone.dataset.path, titulo: extraerEtiqueta(url), url }
      ]);
      btn.textContent = "Guardar Link";

      if (error) {
        alert("Error al guardar: " + error.message);
        return;
      }

      input.value = "";
      await cargarContenidoDeZona(zone);
    });
  });
}

/* ──────────────────────────────────────────
   Inicialización
────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", async () => {
  activarDespliegue();
  await cargarTodo();          // carga archivos + links en todas las zonas
  await controlarOpciones();  // muestra/oculta botones según sesión
  configurarSubidas();
  configurarLinks();
});

// Reacciona a login / logout en tiempo real
supabaseClient.auth.onAuthStateChange(async () => {
  await controlarOpciones();
});
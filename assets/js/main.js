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
    // Usa el hostname sin "www." como etiqueta amigable
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
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
────────────────────────────────────────── */

async function cargarArchivos() {
  for (const card of document.querySelectorAll(".week-card")) {
    const fileList  = card.querySelector(".file-list");
    const uploadZone = card.querySelector(".upload-zone");
    if (!fileList || !uploadZone) continue;

    const ruta = uploadZone.dataset.path;
    const { data, error } = await supabaseClient.storage.from(BUCKET).list(ruta);

    // Limpia solo los items de tipo archivo (no los de link)
    card.querySelectorAll(".uploaded-file-item[data-tipo='archivo']").forEach(el => el.remove());

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
────────────────────────────────────────── */

async function cargarLinks() {
  for (const zone of document.querySelectorAll(".upload-zone")) {
    const ruta     = zone.dataset.path;
    const fileList = zone.querySelector(".file-list");
    if (!ruta || !fileList) continue;

    const { data, error } = await supabaseClient
      .from("links")
      .select("*")
      .eq("ruta", ruta);
    if (error || !data) continue;

    // Limpia solo los items de tipo link antes de re-renderizar
    zone.querySelectorAll(".uploaded-file-item[data-tipo='link']").forEach(el => el.remove());

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
   Control de visibilidad según sesión
────────────────────────────────────────── */

async function controlarOpciones() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.style.setProperty("display", user ? "inline-block" : "none", "important");
  });

  document.querySelectorAll(".link-upload").forEach(box => {
    box.style.setProperty("display", user ? "flex" : "none", "important");
  });
}

/* ──────────────────────────────────────────
   Configurar subida de archivos PDF
────────────────────────────────────────── */

function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return alert("Debes iniciar sesión");

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

        if (error) return alert("Error: " + error.message);

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
      if (!data.session) return alert("Debes iniciar sesión");

      // El botón está dentro de .link-upload que está dentro de .upload-zone
      const zone  = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url   = input.value.trim();

      if (!url) return alert("Pega un link primero");

      // Valida que sea una URL válida
      try { new URL(url); } catch { return alert("El enlace no es válido. Asegúrate de incluir https://"); }

      const etiqueta = extraerEtiqueta(url);

      btn.textContent = "Guardando…";
      const { error } = await supabaseClient.from("links").insert([
        {
          ruta:   zone.dataset.path,
          titulo: etiqueta,
          url
        }
      ]);
      btn.textContent = "Guardar Link";

      if (error) return alert("Error al guardar link: " + error.message);

      input.value = "";
      await cargarArchivos();
      await cargarLinks();
    };
  });
}

/* ──────────────────────────────────────────
   Inicialización
────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", async () => {
  activarDespliegue();
  await cargarArchivos();
  await cargarLinks();
  await controlarOpciones();
  configurarSubidas();
  configurarLinks();
});

// Reacciona a cambios de sesión (login / logout)
supabaseClient.auth.onAuthStateChange(() => {
  controlarOpciones();
});
const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET = "pdfs";
const ADMIN_EMAIL = "danyel061295@gmail.com";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* DESPLEGAR SEMANAS */
document.querySelectorAll(".week-header").forEach(header => {
  header.addEventListener("click", () => {
    const card = header.closest(".week-card");
    if (card) {
      card.classList.toggle("open");
    }
  });
});

/* PROGRESO */
const bar = document.querySelector(".progress-bar-fill");
const text = document.querySelector(".progress-pct");
if (bar && text) {
  bar.style.width = "100%";
  text.textContent = "100%";
}

/* RUTA DE UNIDAD */
function obtenerUnidadActual() {
  const ruta = window.location.pathname;
  if (ruta.includes("unidad1")) return "unidad1";
  if (ruta.includes("unidad2")) return "unidad2";
  if (ruta.includes("unidad3")) return "unidad3";
  if (ruta.includes("unidad4")) return "unidad4";
  return "unidad1";
}

/* RUTA DE SEMANA */
function obtenerSemana(card) {
  const numero = card.querySelector(".week-number").textContent.trim();
  return numero.toLowerCase().replace("s", "semana");
}

/* CARGAR ARCHIVOS */
async function cargarArchivos() {
  const unidad = obtenerUnidadActual();

  for (const card of document.querySelectorAll(".week-card")) {
    const fileList = card.querySelector(".file-list");
    if (!fileList) continue;

    const uploadZone = card.querySelector(".upload-zone");
    const semana = obtenerSemana(card);
    const ruta = uploadZone?.dataset.path || `${unidad}/${semana}`;

    const { data, error } = await supabaseClient.storage.from(BUCKET).list(ruta);

    fileList.innerHTML = "";

    if (error || !data) {
      fileList.innerHTML = `<span style="color:#fca5a5;">Error al cargar archivos</span>`;
      continue;
    }

    const archivos = data.filter(file =>
      file.name !== ".emptyFolderPlaceholder" && file.name.includes(".")
    );

    if (archivos.length === 0) {
      fileList.innerHTML = `<span style="color:#8ba4c0;">No hay archivos subidos.</span>`;
      continue;
    }

    archivos.forEach(file => {
      const filePath = `${ruta}/${file.name}`;
      const { data: publicData } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      fileList.innerHTML += `
        <div class="uploaded-file-item">
          <span class="uploaded-file-name">📎 ${file.name}</span>
          <a class="uploaded-file-link" href="${publicData.publicUrl}" target="_blank">VER</a>
        </div>
      `;
    });
  }
}

/* MOSTRAR SUBIR PDF SOLO AL ADMIN */
async function controlarBotonSubirPDF() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  document.querySelectorAll(".upload-btn").forEach(btn => {
    if (user && user.email === ADMIN_EMAIL) {
      btn.style.setProperty("display", "inline-block", "important");
    } else {
      btn.style.setProperty("display", "none", "important");
    }
  });
}

/* SUBIR ARCHIVOS */
async function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const card = btn.closest(".week-card");
        const uploadZone = card.querySelector(".upload-zone");
        const unidad = obtenerUnidadActual();
        const semana = obtenerSemana(card);
        const rutaBase = uploadZone?.dataset.path || `${unidad}/${semana}`;

        const nombreArchivo = `${Date.now()}-${file.name}`;
        const ruta = `${rutaBase}/${nombreArchivo}`;

        btn.textContent = "Subiendo...";

        const { error } = await supabaseClient.storage
          .from(BUCKET)
          .upload(ruta, file);

        btn.textContent = "Subir PDF";

        if (error) {
          alert("Error al subir: " + error.message);
          return;
        }

        await cargarArchivos();
      };

      input.click();
    });
  });
}

/* EJECUTAR */
document.addEventListener("DOMContentLoaded", async () => {
  await cargarArchivos();
  await controlarBotonSubirPDF();
  configurarSubidas();
});

supabaseClient.auth.onAuthStateChange(() => {
  controlarBotonSubirPDF();
});
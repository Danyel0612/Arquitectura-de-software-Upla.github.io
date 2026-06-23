const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET = "pdfs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function obtenerUnidadActual() {
  const ruta = window.location.pathname;
  if (ruta.includes("unidad1")) return "unidad1";
  if (ruta.includes("unidad2")) return "unidad2";
  if (ruta.includes("unidad3")) return "unidad3";
  if (ruta.includes("unidad4")) return "unidad4";
  return "unidad1";
}

function obtenerSemana(card) {
  return card.querySelector(".week-number").textContent.trim().toLowerCase().replace("s", "semana");
}

function activarDespliegue() {
  document.querySelectorAll(".week-header").forEach(header => {
    header.onclick = () => {
      const card = header.closest(".week-card");
      if (card) card.classList.toggle("open");
    };
  });
}

async function cargarArchivos() {
  for (const card of document.querySelectorAll(".week-card")) {
    const fileList = card.querySelector(".file-list");
    const uploadZone = card.querySelector(".upload-zone");
    if (!fileList || !uploadZone) continue;

    const ruta = uploadZone.dataset.path;
    const { data, error } = await supabaseClient.storage.from(BUCKET).list(ruta);

    fileList.innerHTML = "";

    if (error || !data) continue;

    data.filter(f => f.name !== ".emptyFolderPlaceholder" && f.name.includes("."))
      .forEach(file => {
        const filePath = `${ruta}/${file.name}`;
        const { data: publicData } = supabaseClient.storage.from(BUCKET).getPublicUrl(filePath);

        fileList.innerHTML += `
          <div class="uploaded-file-item">
            <span class="uploaded-file-name">📎 ${file.name}</span>
            <a class="uploaded-file-link" href="${publicData.publicUrl}" target="_blank">VER</a>
          </div>
        `;
      });
  }
}

async function cargarLinks() {
  for (const zone of document.querySelectorAll(".upload-zone")) {
    const ruta = zone.dataset.path;
    const fileList = zone.querySelector(".file-list");
    if (!ruta || !fileList) continue;

    const { data, error } = await supabaseClient.from("links").select("*").eq("ruta", ruta);
    if (error || !data) continue;

    data.forEach(link => {
      fileList.innerHTML += `
        <div class="uploaded-file-item">
          <span class="uploaded-file-name">🔗 ${link.titulo}</span>
          <a class="uploaded-file-link" href="${link.url}" target="_blank">ABRIR</a>
        </div>
      `;
    });
  }
}

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

function configurarSubidas() {
  document.querySelectorAll(".upload-btn").forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return alert("Debes iniciar sesión");

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const zone = btn.closest(".upload-zone");
        const ruta = `${zone.dataset.path}/${Date.now()}-${file.name}`;

        btn.textContent = "Subiendo...";
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

function configurarLinks() {
  document.querySelectorAll(".save-link-btn").forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return alert("Debes iniciar sesión");

      const zone = btn.closest(".upload-zone");
      const input = zone.querySelector(".link-input");
      const url = input.value.trim();

      if (!url) return alert("Pega un link primero");

      const { error } = await supabaseClient.from("links").insert([
        {
          ruta: zone.dataset.path,
          titulo: "Link guardado",
          url
        }
      ]);

      if (error) return alert("Error al guardar link: " + error.message);

      input.value = "";
      await cargarArchivos();
      await cargarLinks();
    };
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  activarDespliegue();
  await cargarArchivos();
  await cargarLinks();
  await controlarOpciones();
  configurarSubidas();
  configurarLinks();
});

supabaseClient.auth.onAuthStateChange(() => {
  controlarOpciones();
});
// =============================
// 🔹 UTILIDAD SEGURA
// =============================
function safeQuery(selector) {
  return document.querySelector(selector);
}

// =============================
// 🔹 NAVBAR / HAMBURGER
// =============================
(function () {
  const hamburger = safeQuery(".hamburger");
  const navLinks = safeQuery(".nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
})();

// =============================
// 🔹 DESPLEGABLE DE SEMANAS (S01, S02...)
// =============================
(function () {
  const headers = document.querySelectorAll(".week-header");

  if (headers.length > 0) {
    headers.forEach(header => {
      header.addEventListener("click", () => {
        const card = header.closest(".week-card");

        if (card) {
          card.classList.toggle("open");
        }
      });
    });
  }
})();

// =============================
// 🔹 PROGRESS BAR
// =============================
(function () {
  const bar = safeQuery(".progress-bar-fill");
  const text = safeQuery(".progress-pct");

  if (bar && text) {
    const porcentaje = 100;
    bar.style.width = porcentaje + "%";
    text.textContent = porcentaje + "%";
  }
})();

// =============================
// 🔹 EFECTO HOVER NAV ACTIVO
// =============================
(function () {
  const navItems = document.querySelectorAll(".nav-links a");

  navItems.forEach(item => {
    item.addEventListener("mouseenter", () => {
      item.style.transform = "scale(1.05)";
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "scale(1)";
    });
  });
})();

// =============================
// 🔹 ANIMACIÓN DE ENTRADA (CARDS)
// =============================
(function () {
  const cards = document.querySelectorAll(".week-card");

  if (cards.length > 0) {
    cards.forEach((card, index) => {
      card.style.opacity = 0;
      card.style.transform = "translateY(20px)";

      setTimeout(() => {
        card.style.transition = "all 0.5s ease";
        card.style.opacity = 1;
        card.style.transform = "translateY(0)";
      }, index * 100);
    });
  }
})();
// =============================
// SUPABASE ARCHIVOS POR SEMANA
// =============================
const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";
const BUCKET = "pdfs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function usuarioLogueado() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data.user;
}

function obtenerUnidadActual() {
  const ruta = window.location.pathname;

  if (ruta.includes("unidad1")) return "unidad1";
  if (ruta.includes("unidad2")) return "unidad2";
  if (ruta.includes("unidad3")) return "unidad3";

  return "unidad1"; // fallback
}

function obtenerSemana(card) {
  const numero = card.querySelector(".week-number").textContent.trim(); 
  // S01, S02, S03...

  return numero.toLowerCase().replace("s", "semana");
}

async function cargarArchivos() {
  const unidad = obtenerUnidadActual();

  const cards = document.querySelectorAll(".week-card");

  for (const card of cards) {
    const semana = obtenerSemana(card);
    const fileList = card.querySelector(".file-list");

    if (!fileList) continue;

    const uploadZone = card.querySelector(".upload-zone");
    const ruta = uploadZone ? uploadZone.dataset.path : `${unidad}/${semana}`;

    console.log("Buscando archivos en:", ruta);

    const { data, error } = await supabaseClient.storage
      .from("pdfs")
      .list(ruta);

    console.log("Archivos encontrados:", data);
    console.log("Error:", error);

    fileList.innerHTML = "";

    if (error) {
      fileList.innerHTML = `<span style="color:#fca5a5;">Error al cargar archivos</span>`;
      continue;
    }

    if (!data || data.length === 0) {
      fileList.innerHTML = `<span style="color:#8ba4c0;">No hay archivos subidos.</span>`;
      continue;
    }

    data.forEach(file => {
      const filePath = `${ruta}/${file.name}`;

      const { data: publicData } = supabaseClient.storage
        .from("pdfs")
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


async function configurarSubidas() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data.user;

  document.querySelectorAll(".upload-btn").forEach(btn => {
    if (!user) {
      btn.style.display = "none";
      } else {
      btn.style.display = "block";
      }

    btn.style.display = "inline-block";

    btn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const card = btn.closest(".week-card");
        const unidad = obtenerUnidadActual();
        const semana = obtenerSemana(card);

        const nombreArchivo = `${Date.now()}-${file.name}`;
        const ruta = `${unidad}/${semana}/${nombreArchivo}`;

        btn.textContent = "Subiendo...";

        const { error } = await supabaseClient.storage
          .from(BUCKET)
          .upload(ruta, file);

        if (error) {
          alert("Error al subir: " + error.message);
          btn.textContent = "Subir PDF";
          return;
        }

        btn.textContent = "Subir PDF";
        await cargarArchivos();
      };

      input.click();
    });
  });
}

cargarArchivos();
configurarSubidas();
const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      el.classList.add("active");
    }
  });
});
// =============================
// CONTROL VISIBILIDAD SUBIR PDF
// =============================
async function controlarBotonesUpload() {
  const botones = document.querySelectorAll(".upload-btn");

  if (!supabaseClient) {
    botones.forEach(btn => btn.style.display = "none");
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  botones.forEach(btn => {
    if (data.session) {
      btn.style.display = "inline-block";
    } else {
      btn.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  controlarBotonesUpload();
});

controlarBotonesUpload();
const ADMIN_EMAIL = "tu_correo@gmail.com";

async function controlarBotonesUpload() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data.user;

  const botones = document.querySelectorAll(".upload-btn");

  botones.forEach(btn => {
    if (!user || user.email !== ADMIN_EMAIL) {
      btn.style.display = "none";
    } else {
      btn.style.display = "inline-block";
    }
  });
}
async function mostrarBotonSiHaySesion() {
  const { data } = await supabaseClient.auth.getSession();

  document.querySelectorAll(".upload-btn").forEach(btn => {
    if (data.session) {
      btn.style.setProperty("display", "inline-block", "important");
    } else {
      btn.style.setProperty("display", "none", "important");
    }
  });
}

document.querySelectorAll(".upload-btn").forEach(btn => {
  btn.style.setProperty("display", "inline-block", "important");
});
async function mostrarBotonesUpload() {
  const { data } = await supabaseClient.auth.getSession();

  console.log("Sesión detectada:", data.session);

  document.querySelectorAll(".upload-btn").forEach(btn => {
    if (data.session) {
      btn.style.setProperty("display", "inline-block", "important");
    } else {
      btn.style.setProperty("display", "none", "important");
    }
  });
}

mostrarBotonesUpload();

supabaseClient.auth.onAuthStateChange(() => {
  mostrarBotonesUpload();
});
async function controlarBotonSubirPDF() {
  const { data } = await supabaseClient.auth.getSession();

  document.querySelectorAll(".upload-btn").forEach(btn => {
    if (data.session) {
      btn.style.setProperty("display", "inline-block", "important");
    } else {
      btn.style.setProperty("display", "none", "important");
    }
  });
}

controlarBotonSubirPDF();

supabaseClient.auth.onAuthStateChange(() => {
  controlarBotonSubirPDF();
});
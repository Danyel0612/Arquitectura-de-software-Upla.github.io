// ===== NAVBAR SCROLL =====
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== HAMBURGER MENU =====
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
  hamburger.classList.toggle('open');
});

// ===== CLOSE MENU ON LINK CLICK =====
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks?.classList.remove('open'));
});

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== PROGRESS BAR ANIMATION =====
const progressFill = document.querySelector('.progress-bar-fill');
const progressPct = document.querySelector('.progress-pct');
if (progressFill) {
  setTimeout(() => {
    const target = parseInt(progressFill.dataset.progress || '100');
    progressFill.style.width = target + '%';
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (progressPct) progressPct.textContent = count + '%';
      if (count >= target) clearInterval(interval);
    }, 1500 / target);
  }, 600);
}

// ===== WEEK ACCORDION =====
document.querySelectorAll('.week-header').forEach(header => {
  header.addEventListener('click', () => {
    const card = header.closest('.week-card');
    const isOpen = card.classList.contains('open');
    // close all
    document.querySelectorAll('.week-card').forEach(c => c.classList.remove('open'));
    // toggle
    if (!isOpen) card.classList.add('open');
  });
});

// ===== OPEN FIRST WEEK BY DEFAULT =====
const firstWeek = document.querySelector('.week-card');
firstWeek?.classList.add('open');

// ===== UPLOAD BUTTONS (DEMO) =====

// ===== SUPABASE PDF UPLOAD =====
// ===== SUPABASE PDF UPLOAD =====
const SUPABASE_URL = "https://cilnbzovlcarnjkiuylh.supabase.co";
const SUPABASE_KEY = "sb_publishable_pizASaSdNvJwCiZxwCc9KA_PoYoB69a";

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function getPageKey() {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("unidad1")) return "unidad1";
  if (path.includes("unidad2")) return "unidad2";
  if (path.includes("unidad3")) return "unidad3";
  if (path.includes("unidad4")) return "unidad4";

  return "general";
}

function getWeekNumberFromCard(weekCard, index) {
  const weekNumberEl = weekCard.querySelector(".week-number");
  if (!weekNumberEl) {
    return String(index + 1).padStart(2, "0");
  }

  const text = weekNumberEl.textContent.trim();
  const match = text.match(/\d+/);
  return match ? match[0].padStart(2, "0") : String(index + 1).padStart(2, "0");
}

function renderUploadedLink(uploadZone, publicUrl) {
  let link = uploadZone.querySelector(".uploaded-link");

  if (!link) {
    link = document.createElement("a");
    link.className = "uploaded-link";
    link.target = "_blank";
    link.style.display = "inline-block";
    link.style.marginTop = "10px";
    link.style.color = "var(--accent-cyan)";
    link.style.textDecoration = "none";
    uploadZone.appendChild(link);
  }

  link.href = publicUrl;
  link.textContent = "Ver PDF subido";
}

async function loadExistingPdfs() {
  if (!supabaseClient) return;

  const pageKey = getPageKey();
  const weekCards = document.querySelectorAll(".week-card");

  weekCards.forEach(async (weekCard, index) => {
    const weekNum = getWeekNumberFromCard(weekCard, index);
    const uploadZone = weekCard.querySelector(".upload-zone");
    const fileList = weekCard.querySelector(".file-list");

    if (!uploadZone || !fileList) return;

    const folderPath = `${pageKey}/semana${weekNum}`;

    const { data: files, error } = await supabaseClient
      .storage
      .from("pdfs")
      .list(folderPath, {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error("Error al listar archivos:", error.message);
      return;
    }

    fileList.innerHTML = "";

    const realFiles = (files || []).filter(file => file.name !== ".emptyFolderPlaceholder");

    if (realFiles.length === 0) {
      fileList.innerHTML = `<p style="color: var(--text-muted); margin-top: 10px;">No hay archivos subidos.</p>`;
      return;
    }

    realFiles.forEach(file => {
      const { data: urlData } = supabaseClient
        .storage
        .from("pdfs")
        .getPublicUrl(`${folderPath}/${file.name}`);

      const item = document.createElement("div");
      item.className = "uploaded-file-item";
      item.innerHTML = `
        <span class="uploaded-file-name">📎 ${file.name}</span>
        <a href="${urlData.publicUrl}" target="_blank" class="uploaded-file-link">Ver</a>
      `;

fileList.appendChild(item);
    });
  });
}

function enablePdfUploads() {
  if (!supabaseClient) {
    alert("Supabase no se cargó correctamente.");
    return;
  }

  const pageKey = getPageKey();
  const weekCards = document.querySelectorAll(".week-card");

  weekCards.forEach((weekCard, index) => {
    const uploadBtn = weekCard.querySelector(".upload-btn");
    const uploadZone = weekCard.querySelector(".upload-zone");

    if (!uploadBtn || !uploadZone) return;

    uploadBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

input.onchange = async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const weekNum = getWeekNumberFromCard(weekCard, index);

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Subiendo...";

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  for (const file of files) {

    if (!allowedTypes.includes(file.type)) {
      alert("Formato no permitido: " + file.name);
      continue;
    }

    const cleanName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^\w.-]/g, "");

    const fileName = `${pageKey}/semana${weekNum}/${Date.now()}-${cleanName}`;

    const { error } = await supabaseClient
      .storage
      .from("pdfs")
      .upload(fileName, file);

    if (error) {
      console.error("Error al subir:", error.message);
      alert("Error al subir " + file.name + ": " + error.message);
      continue;
    }
  }

  alert("Archivos subidos correctamente");

  uploadBtn.disabled = false;
  uploadBtn.textContent = "✓ Subido";

  location.reload(); // 👈 AQUÍ SÍ VA
};

      input.click();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (document.querySelector(".upload-btn")) {
    enablePdfUploads();
    await loadExistingPdfs();
  }
});
// ===== ACTIVE NAV LINK =====
const currentPage = window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-links a').forEach(link => {
  const href = link.getAttribute('href')?.split('/').pop();
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

// ===== ANIMATED COUNTER (HOMEPAGE) =====
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  if (isNaN(target)) return;
  let count = 0;
  const step = Math.ceil(target / 40);
  const interval = setInterval(() => {
    count += step;
    if (count >= target) { count = target; clearInterval(interval); }
    el.textContent = count + (el.dataset.suffix || '');
  }, 50);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));
async function loadExistingFiles() {
  const { data, error } = await supabase.storage
    .from("pdfs")
    .list(pageKey, { limit: 100 });

  document.querySelectorAll(".week-card").forEach(async (card, index) => {
    const weekNum = getWeekNumberFromCard(card, index);
    const container = card.querySelector(".file-list");

    if (!container) return;

    container.innerHTML = "";

    const weekFolder = `${pageKey}/semana${weekNum}`;

    const { data: files } = await supabase.storage
      .from("pdfs")
      .list(weekFolder);

    if (!files || files.length === 0) {
      container.innerHTML = "<p>No hay archivos</p>";
      return;
    }
    const realFiles = files.filter(file => file.name !== ".emptyFolderPlaceholder");
      realFiles.forEach(file => {
    const url = `${SUPABASE_URL}/storage/v1/object/public/pdfs/${weekFolder}/${file.name}`;

    const item = document.createElement("div");
      item.innerHTML = `
        <a href="${url}" target="_blank">${file.name}</a>
      `;

      container.appendChild(item);
    });
  });
}
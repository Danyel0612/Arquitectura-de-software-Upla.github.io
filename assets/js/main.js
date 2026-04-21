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

  const { data, error } = await supabaseClient
    .storage
    .from("pdfs")
    .list("", { limit: 100, offset: 0 });

  if (error) {
    console.error("Error al listar PDFs:", error.message);
    return;
  }

  const weekCards = document.querySelectorAll(".week-card");

  weekCards.forEach((weekCard, index) => {
    const uploadZone = weekCard.querySelector(".upload-zone");
    const uploadBtn = weekCard.querySelector(".upload-btn");

    if (!uploadZone || !uploadBtn) return;

    const weekNum = getWeekNumberFromCard(weekCard, index);
    const expectedName = `${pageKey}-semana${weekNum}.pdf`;

    const found = data.find(file => file.name === expectedName);
    if (!found) return;

    const { data: urlData } = supabaseClient
      .storage
      .from("pdfs")
      .getPublicUrl(found.name);

    uploadBtn.textContent = "✓ Subido";
    uploadBtn.style.background = "rgba(0,255,163,0.15)";
    uploadBtn.style.borderColor = "rgba(0,255,163,0.4)";
    uploadBtn.style.color = "var(--accent-green)";

    const uploadTextStrong = uploadZone.querySelector(".upload-text strong");
    if (uploadTextStrong) {
      uploadTextStrong.textContent = found.name;
    }

    renderUploadedLink(uploadZone, urlData.publicUrl);
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
      input.accept = "application/pdf";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
          alert("Solo se permiten archivos PDF.");
          return;
        }

        const weekNum = getWeekNumberFromCard(weekCard, index);
        const fileName = `${pageKey}-semana${weekNum}.pdf`;

        uploadBtn.disabled = true;
        uploadBtn.textContent = "Subiendo...";

        const { error } = await supabaseClient
          .storage
          .from("pdfs")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true
          });

        if (error) {
          console.error("Error al subir:", error.message);
          alert("Error al subir: " + error.message);
          uploadBtn.disabled = false;
          uploadBtn.textContent = "Subir PDF";
          return;
        }

        const { data: urlData } = supabaseClient
          .storage
          .from("pdfs")
          .getPublicUrl(fileName);

        uploadBtn.disabled = false;
        uploadBtn.textContent = "✓ Subido";
        uploadBtn.style.background = "rgba(0,255,163,0.15)";
        uploadBtn.style.borderColor = "rgba(0,255,163,0.4)";
        uploadBtn.style.color = "var(--accent-green)";

        const uploadTextStrong = uploadZone.querySelector(".upload-text strong");
        if (uploadTextStrong) {
          uploadTextStrong.textContent = file.name;
        }

        renderUploadedLink(uploadZone, urlData.publicUrl);
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

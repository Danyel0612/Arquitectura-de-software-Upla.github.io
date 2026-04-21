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
document.querySelectorAll('.upload-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        btn.textContent = '✓ Subido';
        btn.style.background = 'rgba(0,255,163,0.15)';
        btn.style.borderColor = 'rgba(0,255,163,0.4)';
        btn.style.color = 'var(--accent-green)';
        const uploadText = btn.closest('.upload-zone').querySelector('.upload-text');
        if (uploadText) uploadText.querySelector('strong').textContent = file.name;
      }
    };
    input.click();
  });
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

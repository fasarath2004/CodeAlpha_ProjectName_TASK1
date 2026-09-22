const gallery = document.getElementById('gallery');
const galleryItems = document.querySelectorAll('.gallery-item');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search');
const noResults = document.getElementById('no-results');
const statsEl = document.getElementById('stats');
const shuffleBtn = document.getElementById('shuffle-btn');
const themeToggle = document.getElementById('theme-toggle');
const toast = document.getElementById('toast');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxChip = document.getElementById('lightbox-chip');
const lightboxCounter = document.getElementById('lightbox-counter');
const closeBtn = document.querySelector('.close-btn');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const lbPlay = document.getElementById('lb-play');
const lbFullscreen = document.getElementById('lb-fullscreen');
const lbDownload = document.getElementById('lb-download');

const addModal = document.getElementById('add-modal');
const addImgBtn = document.getElementById('add-img-btn');
const addTitle = document.getElementById('add-title');
const addUrl = document.getElementById('add-url');
const addCategory = document.getElementById('add-category');
const addConfirm = document.getElementById('add-confirm');
const addClose = document.querySelector('.add-close');

let activeFilter = 'all';
let currentIndex = 0;
let visibleItems = [];
let likes = new Set();
let toastTimer = null;
let slideshowTimer = null;
let playing = false;

/* ---------- Theme ---------- */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '\u263E' : '\u2600';
}

function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('gallery-theme'); } catch (e) {}
    applyTheme(saved === 'light' ? 'light' : 'dark');
    themeToggle.title = saved === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
}

themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    themeToggle.title = next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    try { localStorage.setItem('gallery-theme', next); } catch (e) {}
    showToast(next === 'dark' ? 'Dark theme active' : 'Light theme active');
});

/* ---------- Favorites ---------- */
function persistLikes() {
    try { localStorage.setItem('gallery-likes', JSON.stringify([...likes])); } catch (e) {}
}

function toggleLike(item, btn) {
    const title = item.dataset.title;
    if (likes.has(title)) {
        likes.delete(title);
        item.classList.remove('liked');
        btn.textContent = '\u2661';
        showToast('Removed from Favorites');
    } else {
        likes.add(title);
        item.classList.add('liked');
        btn.textContent = '\u2665';
        showToast('Added to Favorites \u2764');
    }
    persistLikes();
    updateStats();
    if (activeFilter === 'favorites') updateVisibleItems();
}

/* ---------- Item decoration (chips, like, remove, click) ---------- */
function getItems() {
    return Array.from(document.querySelectorAll('.gallery-item'));
}

function decorateItem(item) {
    if (item.querySelector('.chip')) return;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = item.dataset.category;
    item.prepend(chip);

    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    likeBtn.title = 'Add to favorites';
    likeBtn.setAttribute('aria-label', 'Toggle favorite');
    likeBtn.textContent = '\u2661';
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(item, likeBtn);
    });
    item.append(likeBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Remove image';
    removeBtn.setAttribute('aria-label', 'Remove image');
    removeBtn.textContent = '\u2715';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage(item);
    });
    item.append(removeBtn);

    item.addEventListener('click', () => {
        updateVisibleItems();
        currentIndex = visibleItems.indexOf(item);
        openLightbox();
    });
}

galleryItems.forEach(decorateItem);

function initLikes() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('gallery-likes') || '[]'); } catch (e) {}
    likes = new Set(saved);
    getItems().forEach(item => {
        if (likes.has(item.dataset.title)) {
            item.classList.add('liked');
            item.querySelector('.like-btn').textContent = '\u2665';
        }
    });
}

/* ---------- Filtering ---------- */
function animateIn(items) {
    items.forEach((item, i) => {
        item.style.setProperty('--i', i);
        item.style.animation = 'none';
        void item.offsetWidth;
        item.style.animation = '';
    });
}

function matchesSearch(item) {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return true;
    const title = (item.dataset.title || '').toLowerCase();
    const category = (item.dataset.category || '').toLowerCase();
    return title.includes(query) || category.includes(query);
}

function isVisible(item) {
    if (!matchesSearch(item)) return false;
    if (activeFilter === 'favorites') return likes.has(item.dataset.title);
    return activeFilter === 'all' || item.dataset.category === activeFilter;
}

function updateStats() {
    const total = getItems().length;
    const favWord = likes.size === 1 ? 'favorite' : 'favorites';
    statsEl.textContent = `Showing ${visibleItems.length} / ${total} \u00B7 ${likes.size} ${favWord}`;
}

function updateVisibleItems() {
    const items = getItems();
    visibleItems = items.filter(item => isVisible(item));
    items.forEach(item => {
        item.classList.toggle('hide', !isVisible(item));
    });
    noResults.classList.toggle('visible', visibleItems.length === 0);
    animateIn(visibleItems);
    updateStats();
    if (visibleItems.length === 0) closeLightbox();
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        updateVisibleItems();
    });
});

searchInput.addEventListener('input', () => {
    document.querySelector('.search-wrap').classList.toggle('has-text', searchInput.value.length > 0);
    updateVisibleItems();
});

const clearSearchBtn = document.getElementById('clear-search');
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    document.querySelector('.search-wrap').classList.remove('has-text');
    updateVisibleItems();
    searchInput.focus();
});

/* ---------- Shuffle ---------- */
shuffleBtn.addEventListener('click', () => {
    const arr = getItems();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    arr.forEach(node => gallery.appendChild(node));
    animateIn(getItems().filter(item => !item.classList.contains('hide')));
    showToast('Grid shuffled');
});

/* ---------- Lightbox ---------- */
lightboxImg.addEventListener('load', () => lightboxImg.classList.add('ready'));
lightboxImg.addEventListener('error', () => lightboxImg.classList.add('ready'));

function updateLightboxInfo() {
    const item = visibleItems[currentIndex];
    lightboxImg.classList.remove('ready');
    lightboxImg.src = item.querySelector('img').src;
    lightboxImg.alt = item.querySelector('img').alt || 'Enlarged view';
    lightboxCaption.textContent = item.dataset.title || '';
    lightboxChip.textContent = item.dataset.category || '';
    lightboxCounter.textContent = `${currentIndex + 1} / ${visibleItems.length}`;
}

function openLightbox() {
    updateLightboxInfo();
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('show');
    lightbox.classList.remove('immersive');
    lightboxImg.classList.remove('ready');
    document.body.style.overflow = '';
    setPlaying(false);
    if (document.fullscreenElement === lightbox) {
        document.exitFullscreen().catch(() => {});
    }
}

function showImage(index) {
    currentIndex = (index + visibleItems.length) % visibleItems.length;
    updateLightboxInfo();
}

function navigate(direction) {
    if (!visibleItems.length) return;
    setPlaying(false);
    showImage(currentIndex + direction);
}

closeBtn.addEventListener('click', closeLightbox);
prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

prevBtn.addEventListener('click', (e) => e.stopPropagation());
nextBtn.addEventListener('click', (e) => e.stopPropagation());
closeBtn.addEventListener('click', (e) => e.stopPropagation());

/* ---------- Slideshow ---------- */
function setPlaying(on) {
    playing = on;
    lbPlay.textContent = on ? '\u275A\u275A' : '\u25B6';
    lbPlay.title = on ? 'Pause slideshow' : 'Play slideshow';
    lbPlay.setAttribute('aria-label', lbPlay.title);
    lbPlay.classList.toggle('active', on);
    clearInterval(slideshowTimer);
    if (on) {
        slideshowTimer = setInterval(() => {
            if (visibleItems.length) showImage(currentIndex + 1);
        }, 3000);
    }
}

lbPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    setPlaying(!playing);
});

/* ---------- Fullscreen ---------- */
function enterImmersive() {
    lightbox.classList.toggle('immersive', !lightbox.classList.contains('immersive'));
    lbFullscreen.classList.toggle('active', lightbox.classList.contains('immersive'));
    lbFullscreen.title = lightbox.classList.contains('immersive') ? 'Exit full view' : 'Fullscreen';
}

lbFullscreen.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (document.fullscreenEnabled) {
        if (!document.fullscreenElement) {
            try {
                await lightbox.requestFullscreen();
                lbFullscreen.classList.add('active');
                setPlaying(false);
                return;
            } catch (err) {
                enterImmersive();
                return;
            }
        }
        if (document.fullscreenElement === lightbox) {
            try { await document.exitFullscreen(); } catch (err) {}
            return;
        }
    }
    enterImmersive();
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        lbFullscreen.classList.remove('active');
        lightbox.classList.remove('immersive');
    } else {
        lbFullscreen.classList.add('active');
    }
});

/* ---------- Download ---------- */
async function downloadCurrent() {
    const url = lightboxImg.src;
    const name = (lightboxCaption.textContent || 'gallery').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg';
    if (!url) return;
    showToast('Downloading image...');
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
        showToast('Image downloaded');
    } catch (err) {
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', name);
        a.setAttribute('target', '_blank');
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
}

lbDownload.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadCurrent();
});

/* ---------- Add / Remove images ---------- */
function removeImage(item) {
    const title = item.dataset.title;
    likes.delete(title);
    persistLikes();
    if (lightbox.classList.contains('show')) closeLightbox();
    item.remove();
    updateVisibleItems();
    showToast('Image removed');
}

function addImageToGallery(title, url, category) {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    figure.dataset.category = category;
    figure.dataset.title = title;

    const img = document.createElement('img');
    img.src = url;
    img.alt = title;
    img.loading = 'lazy';

    const fig = document.createElement('figcaption');
    fig.className = 'caption';
    const t = document.createElement('span');
    t.className = 'caption-title';
    t.textContent = title;
    const c = document.createElement('span');
    c.className = 'caption-cat';
    c.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    fig.append(t, c);
    figure.append(img, fig);
    gallery.appendChild(figure);
    decorateItem(figure);
    updateVisibleItems();
}

function closeAddModal() {
    addModal.classList.remove('show');
    addTitle.value = '';
    addUrl.value = '';
}

addImgBtn.addEventListener('click', () => {
    addModal.classList.add('show');
    setTimeout(() => addTitle.focus(), 60);
});

addClose.addEventListener('click', closeAddModal);

addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeAddModal();
});

addConfirm.addEventListener('click', () => {
    const title = addTitle.value.trim();
    const url = addUrl.value.trim();
    const cat = addCategory.value;
    if (!title || !url) {
        showToast('Enter a title and an image URL');
        return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('Enter a valid https:// image URL');
        return;
    }
    addImageToGallery(title, url, cat);
    closeAddModal();
    showToast('Image added');
});

/* ---------- Toast ---------- */
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
}

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', (e) => {
    if (addModal.classList.contains('show')) {
        if (e.key === 'Escape') closeAddModal();
        return;
    }
    if (!lightbox.classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'f' || e.key === 'F') lbFullscreen.click();
    if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
    }
});

initTheme();
initLikes();
updateVisibleItems();
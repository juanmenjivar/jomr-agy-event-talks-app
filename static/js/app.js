// BigQuery Release Explorer - Client Application

// Global State
let allReleases = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedRelease = null;

// DOM Elements
const releasesList = document.getElementById('releases-list');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheTimeSpan = document.getElementById('cache-time');
const themeToggleBtn = document.getElementById('theme-toggle');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Counters
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statAnnouncements = document.getElementById('stat-announcements');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const tweetDateBadge = document.getElementById('tweet-date-badge');
const includeUrlCheck = document.getElementById('include-url-check');
const includeHashtagsCheck = document.getElementById('include-hashtags-check');
const charCounter = document.getElementById('char-counter');
const charProgressCircle = document.getElementById('char-progress-circle');
const charLimitWarning = document.getElementById('char-limit-warning');

// SVG Ring Constants
const CIRCLE_RADIUS = 10;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Initialize SVG Progress Ring
if (charProgressCircle) {
    charProgressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// ----------------------------------------------------
// Theme Toggle Logic
// ----------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    }
});

// ----------------------------------------------------
// Core Data Fetching
// ----------------------------------------------------
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    refreshIcon.classList.add('rotate-anim');
    refreshBtn.disabled = true;
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allReleases = data.releases;
            updateStats(allReleases);
            renderReleases();
            
            // Format cache update time
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (data.fetched_fresh) {
                cacheTimeSpan.textContent = `Status: Synced fresh with Google Cloud at ${timeStr}`;
            } else {
                cacheTimeSpan.textContent = `Status: Loaded from local cache (Updated: ${timeStr})`;
            }
        } else {
            console.error("API error:", data.error);
            releasesList.innerHTML = `<div class="empty-state">
                <div class="empty-icon text-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Failed to fetch releases</h3>
                <p>${data.error || 'Unknown error occurred while parsing the feed.'}</p>
            </div>`;
        }
    } catch (error) {
        console.error("Network error:", error);
        releasesList.innerHTML = `<div class="empty-state">
            <div class="empty-icon text-danger"><i class="fa-solid fa-wifi"></i></div>
            <h3>Network Error</h3>
            <p>Could not connect to the Flask server. Make sure the backend is running.</p>
        </div>`;
    } finally {
        showLoading(false);
        refreshIcon.classList.remove('rotate-anim');
        refreshBtn.disabled = false;
    }
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        releasesList.classList.add('hidden');
        emptyState.classList.add('hidden');
        // Render skeletons
        releasesList.innerHTML = renderSkeletons(5);
        releasesList.classList.remove('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

function renderSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <div class="skeleton-card">
            <div class="card-header">
                <div class="card-meta-left">
                    <div class="skeleton-item skeleton-badge"></div>
                    <div class="skeleton-item skeleton-title"></div>
                </div>
            </div>
            <div class="card-content">
                <div class="skeleton-item skeleton-p1"></div>
                <div class="skeleton-item skeleton-p2"></div>
                <div class="skeleton-item skeleton-p3"></div>
            </div>
        </div>`;
    }
    return html;
}

// ----------------------------------------------------
// UI Rendering & Filtering
// ----------------------------------------------------
function updateStats(releases) {
    statTotal.textContent = releases.length;
    
    const features = releases.filter(r => r.type.toLowerCase() === 'feature').length;
    const issues = releases.filter(r => ['issue', 'bug fix', 'bugfix'].includes(r.type.toLowerCase())).length;
    const announcements = releases.filter(r => r.type.toLowerCase() === 'announcement').length;
    
    statFeatures.textContent = features;
    statIssues.textContent = issues;
    statAnnouncements.textContent = announcements;
}

function getIconForType(type) {
    switch (type.toLowerCase()) {
        case 'feature': return 'fa-solid fa-star';
        case 'issue': return 'fa-solid fa-triangle-exclamation';
        case 'announcement': return 'fa-solid fa-bullhorn';
        case 'deprecated': return 'fa-solid fa-ban';
        case 'bug fix':
        case 'bugfix': return 'fa-solid fa-bug';
        default: return 'fa-solid fa-circle-info';
    }
}

function renderReleases() {
    // Filter list
    const filtered = allReleases.filter(release => {
        // Filter by pill
        const matchesPill = currentFilter === 'all' || 
            (currentFilter === 'Issue' && ['issue', 'bug fix', 'bugfix'].includes(release.type.toLowerCase())) ||
            release.type.toLowerCase() === currentFilter.toLowerCase();
            
        // Filter by search text
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
            release.date.toLowerCase().includes(searchLower) ||
            release.type.toLowerCase().includes(searchLower) ||
            release.text.toLowerCase().includes(searchLower);
            
        return matchesPill && matchesSearch;
    });

    if (filtered.length === 0) {
        releasesList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    releasesList.innerHTML = filtered.map(release => {
        const typeClass = release.type.toLowerCase().replace(' ', '');
        const icon = getIconForType(release.type);
        
        return `
        <article class="release-card" data-id="${release.id}">
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="type-badge ${typeClass}">
                        <i class="${icon}"></i> ${release.type}
                    </span>
                    <span class="card-date">
                        <i class="fa-regular fa-calendar"></i> ${release.date}
                    </span>
                </div>
                <div class="card-actions-right">
                    <button class="btn-tweet-action" onclick="openTweetComposer('${release.id}')">
                        <i class="fa-brands fa-x-twitter"></i> Tweet
                    </button>
                </div>
            </div>
            
            <div class="card-content">
                ${release.html}
            </div>
            
            <div class="card-footer">
                <a href="${release.link}" target="_blank" class="btn-link-docs">
                    View in Documentation <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>
        </article>
        `;
    }).join('');
}

// ----------------------------------------------------
// Event Handlers for Filters & Search
// ----------------------------------------------------
document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.getAttribute('data-filter');
        renderReleases();
    });
});

// Stats click shortcut filtering
document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
        const filterType = card.getAttribute('data-type');
        let targetFilter = 'all';
        
        if (filterType === 'Feature') targetFilter = 'Feature';
        else if (filterType === 'Issue') targetFilter = 'Issue';
        else if (filterType === 'Announcement') targetFilter = 'Announcement';
        
        const pill = document.querySelector(`.filter-pill[data-filter="${targetFilter}"]`);
        if (pill) {
            pill.click();
        }
    });
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
    }
    renderReleases();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderReleases();
});

resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    
    const allPill = document.querySelector('.filter-pill[data-filter="all"]');
    if (allPill) allPill.click();
    
    currentFilter = 'all';
    renderReleases();
});

refreshBtn.addEventListener('click', () => {
    fetchReleases(true);
});

// ----------------------------------------------------
// Tweet Composer & Web Intent Logic
// ----------------------------------------------------
window.openTweetComposer = function(id) {
    const release = allReleases.find(r => r.id === id);
    if (!release) return;
    
    selectedRelease = release;
    
    // Set date badge
    tweetDateBadge.textContent = release.date.split(',')[0]; // E.g., "June 17"
    
    // Generate text template
    composeTweetContent();
    
    // Open Modal
    tweetModal.classList.add('active');
};

function composeTweetContent() {
    if (!selectedRelease) return;
    
    const includeUrl = includeUrlCheck.checked;
    const includeTags = includeHashtagsCheck.checked;
    
    const typeLabel = selectedRelease.type.toUpperCase();
    const dateLabel = selectedRelease.date;
    
    const hashtagsText = " #BigQuery #GoogleCloud";
    const urlText = ` ${selectedRelease.link}`;
    
    // Structure:
    // [TYPE] Update ([Date]): [Desc]
    // Link: [URL]
    // [Hashtags]
    
    let baseFormatHeader = `BigQuery ${typeLabel} (${dateLabel}): `;
    let suffixText = '';
    
    if (includeUrl) {
        suffixText += urlText;
    }
    if (includeTags) {
        suffixText += hashtagsText;
    }
    
    // Max characters on Twitter/X is 280
    const totalMax = 280;
    const suffixLen = suffixText.length;
    const headerLen = baseFormatHeader.length;
    
    // Calculate remaining characters for the main body
    // If it exceeds, we truncate with '...'
    const availableDescLen = totalMax - headerLen - suffixLen - 4; // safety buffer
    
    let originalDesc = selectedRelease.text;
    let descriptionText = originalDesc;
    
    if (descriptionText.length > availableDescLen) {
        descriptionText = originalDesc.substring(0, availableDescLen).trim() + "...";
    }
    
    // Formulate final text
    const finalText = `${baseFormatHeader}${descriptionText}${suffixText}`;
    
    tweetTextarea.value = finalText;
    updateCharCounter();
}

function updateCharCounter() {
    const text = tweetTextarea.value;
    const length = text.length;
    
    charCounter.textContent = `${length} / 280`;
    
    // Handle circle progress ring
    let percentage = Math.min((length / 280) * 100, 100);
    const offset = CIRCLE_CIRCUMFERENCE - (percentage / 100) * CIRCLE_CIRCUMFERENCE;
    charProgressCircle.style.strokeDashoffset = offset;
    
    // Handle Warning & Ring colors
    if (length > 280) {
        charCounter.className = "char-counter danger";
        charProgressCircle.setAttribute('stroke', '#ef4444'); // Red
        charLimitWarning.classList.remove('hidden');
    } else if (length > 250) {
        charCounter.className = "char-counter warning";
        charProgressCircle.setAttribute('stroke', '#f59e0b'); // Amber
        charLimitWarning.classList.add('hidden');
    } else {
        charCounter.className = "char-counter";
        charProgressCircle.setAttribute('stroke', '#1d9bf0'); // X Blue
        charLimitWarning.classList.add('hidden');
    }
}

// Modal closing functions
function closeTweetModal() {
    tweetModal.classList.remove('active');
    selectedRelease = null;
}

[closeModalBtn, cancelTweetBtn, modalOverlay].forEach(el => {
    if (el) el.addEventListener('click', closeTweetModal);
});

// Event listeners for Composer controls
includeUrlCheck.addEventListener('change', composeTweetContent);
includeHashtagsCheck.addEventListener('change', composeTweetContent);
tweetTextarea.addEventListener('input', updateCharCounter);

// Publish Intent
postTweetBtn.addEventListener('click', () => {
    const tweetText = tweetTextarea.value;
    if (!tweetText) return;
    
    const encodedText = encodeURIComponent(tweetText);
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(xIntentUrl, '_blank');
    closeTweetModal();
});

// Key bindings
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
        closeTweetModal();
    }
});

// ----------------------------------------------------
// Page Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases();
});

// Global Application State
let allReleaseItems = [];
let currentCategoryFilter = 'all';
let currentSearchQuery = '';
let selectedItemForTweet = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const filterPills = document.getElementById('filter-pills');
const feedStatus = document.getElementById('feed-status');
const lastFetchedTime = document.getElementById('last-fetched-time');
const skeletonContainer = document.getElementById('skeleton-container');
const cardsContainer = document.getElementById('cards-container');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Counters
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statBreaking = document.getElementById('stat-breaking');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalUpdateType = document.getElementById('modal-update-type');
const modalUpdateDate = document.getElementById('modal-update-date');
const modalUpdateSnippet = document.getElementById('modal-update-snippet');
const tweetTextarea = document.getElementById('tweet-textarea');
const tweetCharCount = document.getElementById('tweet-char-count');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const copyBtnText = document.getElementById('copy-btn-text');
const modalTweetBtn = document.getElementById('modal-tweet-btn');
const xPreviewText = document.getElementById('x-preview-text');

// Hashtag Shortcut Buttons
const hashBqBtn = document.getElementById('add-hashtag-bq');
const hashGcpBtn = document.getElementById('add-hashtag-gcp');
const hashDeBtn = document.getElementById('add-hashtag-de');

// Toast Notification
const toast = document.getElementById('toast');

/**
 * Parses a single raw feed entry's HTML content into distinct, granular update items.
 * A single feed entry representing a day's releases can contain multiple H3 sections.
 */
function parseEntryToReleaseItems(entry) {
    if (!entry.content) {
        return [{
            id: entry.id,
            date: entry.title,
            updated: entry.updated,
            link: entry.link,
            type: 'Update',
            contentHtml: '<p>No details provided.</p>',
            plainText: 'No details provided.'
        }];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    const children = Array.from(doc.body.children);
    
    if (children.length === 0) {
        return [{
            id: entry.id,
            date: entry.title,
            updated: entry.updated,
            link: entry.link,
            type: 'Update',
            contentHtml: entry.content,
            plainText: doc.body.textContent || doc.body.innerText || ""
        }];
    }

    const items = [];
    let currentType = '';
    let currentContentElements = [];
    let itemIndex = 0;

    children.forEach((child) => {
        if (child.tagName === 'H3') {
            // Save the previous section if it has elements
            if (currentContentElements.length > 0 || currentType) {
                const contentHtml = currentContentElements.map(el => el.outerHTML).join('');
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = contentHtml;
                const plainText = tempDiv.textContent || tempDiv.innerText || '';

                items.push({
                    id: `${entry.id}_sub_${itemIndex++}`,
                    date: entry.title,
                    updated: entry.updated,
                    link: entry.link,
                    type: currentType || 'Update',
                    contentHtml: contentHtml,
                    plainText: plainText.trim()
                });
                currentContentElements = [];
            }
            currentType = child.textContent.trim();
        } else {
            currentContentElements.push(child);
        }
    });

    // Save the final section
    if (currentContentElements.length > 0 || items.length === 0) {
        const contentHtml = currentContentElements.map(el => el.outerHTML).join('');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';

        items.push({
            id: `${entry.id}_sub_${itemIndex}`,
            date: entry.title,
            updated: entry.updated,
            link: entry.link,
            type: currentType || 'Update',
            contentHtml: contentHtml,
            plainText: plainText.trim()
        });
    }

    return items;
}

/**
 * Fetches the releases from the backend API.
 * @param {boolean} forceRefresh - If true, requests the backend to bypass its cache.
 */
async function fetchReleases(forceRefresh = false) {
    showLoadingState(true);
    
    // Animate spinner
    const spinner = refreshBtn.querySelector('.refresh-icon');
    spinner.classList.add('spinning');
    refreshBtn.disabled = true;

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Clear previous state
        allReleaseItems = [];
        
        // Process each entry into sub-items
        if (data.releases && Array.isArray(data.releases)) {
            data.releases.forEach(entry => {
                const subItems = parseEntryToReleaseItems(entry);
                allReleaseItems.push(...subItems);
            });
        }
        
        // Update stats dashboard
        updateStats();
        
        // Render time metadata
        if (data.last_fetched) {
            const date = new Date(data.last_fetched * 1000);
            lastFetchedTime.textContent = `Last synced: ${date.toLocaleTimeString()} (${data.source === 'cache' ? 'cached' : 'fresh'})`;
        }

        // Display results
        renderFeed();
        
        if (data.error) {
            showToast(data.error);
        }

    } catch (error) {
        console.error("Error fetching release notes:", error);
        feedStatus.textContent = "Error loading updates.";
        showToast("Failed to fetch release notes. Please check the backend connection.");
        
        // Show empty feed if we have nothing
        if (allReleaseItems.length === 0) {
            cardsContainer.style.display = 'none';
            emptyState.style.display = 'block';
        }
    } finally {
        showLoadingState(false);
        spinner.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

/**
 * Updates stats counters based on parsed release items.
 */
function updateStats() {
    statTotal.textContent = allReleaseItems.length;
    
    const featuresCount = allReleaseItems.filter(item => item.type.toLowerCase() === 'feature').length;
    const announcementsCount = allReleaseItems.filter(item => item.type.toLowerCase() === 'announcement').length;
    const breakingCount = allReleaseItems.filter(item => 
        item.type.toLowerCase() === 'breaking' || item.type.toLowerCase() === 'issue'
    ).length;
    
    statFeatures.textContent = featuresCount;
    statAnnouncements.textContent = announcementsCount;
    statBreaking.textContent = breakingCount;
}

/**
 * Toggles visibility between skeleton loaders and real cards.
 */
function showLoadingState(isLoading) {
    if (isLoading) {
        skeletonContainer.style.display = 'flex';
        cardsContainer.style.display = 'none';
        emptyState.style.display = 'none';
        feedStatus.textContent = "Loading updates...";
    } else {
        skeletonContainer.style.display = 'none';
    }
}

/**
 * Filter and search helper to filter release notes.
 */
function getFilteredItems() {
    return allReleaseItems.filter(item => {
        // 1. Category Filter
        let categoryMatch = false;
        if (currentCategoryFilter === 'all') {
            categoryMatch = true;
        } else {
            categoryMatch = item.type.toLowerCase() === currentCategoryFilter;
        }
        
        // 2. Search Query Match (Title, Date, Category Type or Content Text)
        let searchMatch = false;
        if (!currentSearchQuery) {
            searchMatch = true;
        } else {
            const query = currentSearchQuery.toLowerCase();
            searchMatch = item.date.toLowerCase().includes(query) || 
                          item.type.toLowerCase().includes(query) || 
                          item.plainText.toLowerCase().includes(query);
        }
        
        return categoryMatch && searchMatch;
    });
}

/**
 * Renders the filtered release cards into the timeline view.
 */
function renderFeed() {
    const filteredItems = getFilteredItems();
    
    // Clear container
    cardsContainer.innerHTML = '';
    
    if (filteredItems.length === 0) {
        cardsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        feedStatus.textContent = `0 updates found`;
        return;
    }
    
    emptyState.style.display = 'none';
    cardsContainer.style.display = 'flex';
    feedStatus.textContent = `Showing ${filteredItems.length} update${filteredItems.length === 1 ? '' : 's'}`;
    
    filteredItems.forEach(item => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.dataset.id = item.id;
        
        // Determine badge class
        const typeLower = item.type.toLowerCase();
        let badgeClass = 'badge-update';
        if (['feature', 'announcement', 'issue', 'breaking', 'change'].includes(typeLower)) {
            badgeClass = `badge-${typeLower}`;
        }
        
        card.innerHTML = `
            <div class="card-top">
                <div class="card-meta">
                    <span class="badge ${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <button class="tweet-btn-small" onclick="openTweetComposer('${item.id}')">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
            <div class="card-content">
                ${item.contentHtml}
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

/**
 * Generates structured, compliant tweet contents under 280 characters.
 */
function generateDefaultTweetText(item) {
    // 1. Emoji picker based on type
    const emojiMap = {
        'feature': '🚀',
        'announcement': '📢',
        'issue': '⚠️',
        'breaking': '🚨',
        'change': '🔄',
        'update': '📝'
    };
    const emoji = emojiMap[item.type.toLowerCase()] || '📝';
    
    // 2. Draft the components
    const prefix = `${emoji} BigQuery ${item.type} (${item.date}): `;
    
    // Parse link fragment to direct user to the specific day's anchor
    let directLink = item.link;
    if (!directLink) {
        // Fallback direct link anchor
        const anchor = item.date.replace(/[\s,]+/g, '_');
        directLink = `https://docs.cloud.google.com/bigquery/docs/release-notes#${anchor}`;
    }
    
    const suffix = `\n\nRead more: ${directLink}\n#BigQuery #GoogleCloud`;
    
    // 3. Calculate max character space left for the snippet body
    // X handles URLs as 23 characters exactly. Let's calculate based on that:
    // Link text replaces URL string. So URL length is 23 characters.
    const suffixLengthWithXUrl = suffix.length - directLink.length + 23;
    const maxBodyLength = 280 - prefix.length - suffixLengthWithXUrl - 5; // safety margin
    
    // Clean description text
    let cleanText = item.plainText
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
        
    // Slice off trailing parentheses or details if needed
    if (cleanText.length > maxBodyLength) {
        cleanText = cleanText.substring(0, maxBodyLength - 3).trim() + '...';
    }
    
    return `${prefix}${cleanText}${suffix}`;
}

/**
 * Opens the X Composer Modal inside the page.
 */
window.openTweetComposer = function(itemId) {
    const item = allReleaseItems.find(i => i.id === itemId);
    if (!item) return;
    
    selectedItemForTweet = item;
    
    // Fill background info
    modalUpdateType.textContent = item.type;
    modalUpdateType.className = `preview-badge badge-${item.type.toLowerCase()}`;
    modalUpdateDate.textContent = item.date;
    
    // Strip first 80 chars for modal header summary snippet
    const snippet = item.plainText.substring(0, 80) + (item.plainText.length > 80 ? '...' : '');
    modalUpdateSnippet.textContent = snippet;
    
    // Populate textarea
    const defaultText = generateDefaultTweetText(item);
    tweetTextarea.value = defaultText;
    
    // Reset copy button status
    copyBtnText.textContent = "Copy Tweet";
    
    // Trigger preview and character check
    updateTweetCharacterCheck();
    
    // Show Modal
    tweetModal.classList.add('open');
    document.body.style.overflow = 'hidden'; // stop page scrolling
};

/**
 * Closes the Tweet modal.
 */
function closeTweetModal() {
    tweetModal.classList.remove('open');
    document.body.style.overflow = '';
    selectedItemForTweet = null;
}

/**
 * Recalculates remaining characters (counting URLs as 23 characters for Twitter/X)
 * and updates UI previews in real-time.
 */
function updateTweetCharacterCheck() {
    const text = tweetTextarea.value;
    
    // Twitter/X counts any URL as exactly 23 characters. Let's compute actual Twitter length.
    // This regex matches common URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let twitterLength = text.length;
    urls.forEach(url => {
        twitterLength = twitterLength - url.length + 23;
    });
    
    const remaining = 280 - twitterLength;
    
    tweetCharCount.textContent = `${twitterLength} / 280`;
    
    // Color states
    tweetCharCount.className = 'char-count';
    if (remaining < 0) {
        tweetCharCount.classList.add('error');
    } else if (remaining <= 40) {
        tweetCharCount.classList.add('warning');
    }
    
    // Update live X screen preview
    // Replace URLs in preview text with colored links for high fidelity look
    let previewHtml = escapeHtml(text);
    const htmlUrlRegex = /(https?:\/\/[^\s]+)/g;
    previewHtml = previewHtml.replace(htmlUrlRegex, '<span class="x-link" style="color: #1d9bf0; cursor: pointer;">$1</span>');
    xPreviewText.innerHTML = previewHtml;
}

/**
 * Helper to escape HTML strings.
 */
function escapeHtml(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return string.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Displays a non-intrusive bottom toast notification.
 */
function showToast(message) {
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Helper to append a hashtag to the text inside the composer if it does not exceed the limit.
 */
function appendHashtag(tag) {
    const text = tweetTextarea.value;
    if (text.includes(tag)) return;
    
    // Append nicely with whitespace
    if (text.endsWith('\n') || text.endsWith(' ')) {
        tweetTextarea.value = text + tag;
    } else {
        tweetTextarea.value = text + ' ' + tag;
    }
    
    updateTweetCharacterCheck();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load
    fetchReleases();
    
    // 2. Refresh Button Click
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // 3. Search Inputs
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        if (currentSearchQuery) {
            searchClearBtn.style.display = 'block';
        } else {
            searchClearBtn.style.display = 'none';
        }
        renderFeed();
    });
    
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });
    
    // 4. Category Filter Pill Click
    filterPills.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all pills
            filterPills.querySelectorAll('.filter-pill').forEach(pill => {
                pill.classList.remove('active');
            });
            
            // Add active class to clicked pill
            e.target.classList.add('active');
            
            currentCategoryFilter = e.target.dataset.category;
            renderFeed();
        }
    });
    
    // 5. Empty State Reset Filters
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        searchClearBtn.style.display = 'none';
        
        filterPills.querySelectorAll('.filter-pill').forEach(pill => {
            if (pill.dataset.category === 'all') {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        currentCategoryFilter = 'all';
        renderFeed();
    });
    
    // 6. Tweet Modal Controls
    modalCloseBtn.addEventListener('click', closeTweetModal);
    
    // Click outside modal container closes it
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });
    
    // 7. Live Character Count Checker on Type
    tweetTextarea.addEventListener('input', updateTweetCharacterCheck);
    
    // 8. Copy to Clipboard
    modalCopyBtn.addEventListener('click', async () => {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            copyBtnText.textContent = "Copied!";
            showToast("Tweet text copied to clipboard!");
            setTimeout(() => {
                copyBtnText.textContent = "Copy Tweet";
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast("Failed to copy text. Please copy manually.");
        }
    });
    
    // 9. Post to X (Open intent)
    modalTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
    });
    
    // 10. Hashtag button modifiers
    hashBqBtn.addEventListener('click', () => appendHashtag('#BigQuery'));
    hashGcpBtn.addEventListener('click', () => appendHashtag('#GoogleCloud'));
    hashDeBtn.addEventListener('click', () => appendHashtag('#DataEngineering'));
});

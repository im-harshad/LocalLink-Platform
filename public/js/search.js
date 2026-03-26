// Service Discovery and Searching Logic

async function fetchAllProviders() {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
    
    try {
        const response = await fetch('/api/services/discover');
        const providers = await response.json();
        renderProviders(providers);
    } catch (err) {
        console.error('Error fetching providers:', err);
        grid.innerHTML = '<div class="col-12 text-center text-danger">Failed to load professionals.</div>';
    }
}

async function fetchProvidersByCategory(categoryId) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';

    try {
        const response = await fetch(`/api/services/category/${categoryId}`);
        const providers = await response.json();
        renderProviders(providers);
    } catch (err) {
        console.error('Error fetching providers by category:', err);
        grid.innerHTML = '<div class="col-12 text-center text-danger">Failed to load category professionals.</div>';
    }
}

function renderProviders(providers) {
    const grid = document.getElementById('results-grid');
    const resultsCount = document.getElementById('results-count');

    if (!Array.isArray(providers)) {
        resultsCount.textContent = '0 local experts found';
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No professionals matching your criteria were found.</div>';
        return;
    }

    resultsCount.textContent = `${providers.length} local expert${providers.length !== 1 ? 's' : ''} found nearby`;
    
    if (providers.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 animate-fade-in">
                <div class="mb-4 opacity-25"><i class="fa-solid fa-magnifying-glass-location fa-4x"></i></div>
                <h5 class="text-muted">No professionals found here</h5>
                <p class="small text-muted">Try choosing another category or broaden your search.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = providers.map((p, index) => `
        <div class="col-md-6 col-lg-4 animate-fade-in" style="animation-delay: ${index * 0.05}s">
            <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden Professional-card">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="category-icon m-0" style="width: 45px; height: 45px; font-size: 1.2rem;">
                            <i class="${getCategoryIcon(p.category_name || p.service_type)}"></i>
                        </div>
                        <span class="badge bg-success-subtle text-success border-0 px-2 py-1 small rounded-pill">
                            <i class="fa-solid fa-shield-check me-1"></i> Verified
                        </span>
                    </div>
                    <h5 class="fw-bold text-dark mb-1">${p.name}</h5>
                    <div class="d-flex align-items-center mb-2 small">
                        <div class="text-warning me-2">
                            ${p.average_rating > 0 
                                ? Array(5).fill(0).map((_, i) => `<i class="fa-${i < Math.floor(p.average_rating) ? 'solid' : (i < p.average_rating ? 'solid fa-star-half-stroke' : 'regular')} fa-star"></i>`).join('')
                                : Array(5).fill('<i class="fa-regular fa-star opacity-25"></i>').join('')}
                        </div>
                        <span class="text-muted fw-bold">${p.average_rating > 0 ? parseFloat(p.average_rating).toFixed(1) : ''} (${p.review_count || 0})</span>
                    </div>
                    <div class="d-flex align-items-center mb-3 text-muted small">
                        <i class="fa-solid fa-location-dot me-2"></i>
                        <span>${p.location || 'Local Area'}</span>
                    </div>
                    <p class="card-text text-muted small mb-4 line-clamp-2">
                        ${p.description || 'Dedicated neighborhood professional providing top-tier services to the local community.'}
                    </p>
                    <div class="d-grid">
                        <a href="/views/provider-profile.html?id=${p.id}" class="btn btn-outline-primary fw-bold py-2 rounded-3">
                            Profile & Booking <i class="fa-solid fa-arrow-right ms-2 small"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getCategoryIcon(type) {
    const t = type.toLowerCase();
    if (t.includes('plumb')) return 'fa-solid fa-faucet-drip';
    if (t.includes('elect')) return 'fa-solid fa-bolt';
    if (t.includes('clean')) return 'fa-solid fa-broom';
    if (t.includes('paint')) return 'fa-solid fa-paint-roller';
    if (t.includes('garden')) return 'fa-solid fa-seedling';
    return 'fa-solid fa-briefcase';
}

const searchBtn = document.getElementById('search-btn');
const searchInput = document.getElementById('search-input');

if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value;
        if (query) {
            fetch(`/api/services/search?query=${query}`)
                .then(res => res.json())
                .then(renderProviders)
                .catch(err => {
                    console.error('Search error:', err);
                    Swal.fire('Search Error', 'Could not complete your professional search.', 'error');
                });
        }
    });
    
    // Allow enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });
}

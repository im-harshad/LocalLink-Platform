// Booking and Provider Details Logic

async function loadProviderDetails(providerId) {
    try {
        // Fetch Provider Details from PUBLIC endpoint
        const providerRes = await fetch(`/api/services/provider-info/${providerId}`);
        const provider = await providerRes.json();

        if (provider) {
            document.getElementById('provider-name').textContent = provider.name;
            document.getElementById('provider-service-type').textContent = provider.service_type;
            document.getElementById('provider-location').textContent = provider.location || 'Local Area';
            document.getElementById('provider-desc').textContent = provider.description || 'Professional neighborhood expert dedicated to providing high-quality services with excellence and punctuality.';
            document.getElementById('provider-initials').textContent = provider.name.split(' ').map(n => n[0]).join('').toUpperCase();

            // Fetch Services
            const servicesRes = await fetch(`/api/services/provider/${providerId}`);
            const services = await servicesRes.json();
            renderServicesList(services);
        }

        // Fetch Queue Status
        const queueRes = await fetch(`/api/queue/status/${providerId}`);
        const queueStatus = await queueRes.json();
        document.getElementById('current-serving-token').textContent = `# ${queueStatus.serving_token || '--'}`;
        document.getElementById('people-waiting').textContent = `${queueStatus.people_waiting || '0'}`;

        // Fetch and Render Reviews
        loadReviews(providerId);

    } catch (err) {
        console.error('Error loading provider details:', err);
        Swal.fire('Connection Error', 'Failed to synchronize professional data.', 'error');
    }
}

async function loadReviews(providerId) {
    const list = document.getElementById('reviews-list');
    const formContainer = document.getElementById('review-form-container');
    const token = sessionStorage.getItem('token');

    try {
        const res = await fetch(`/api/reviews/provider/${providerId}`);
        const data = await res.json();
        
        updateRatingUI(data.average_rating, data.total_reviews);

        if (!data.reviews || data.reviews.length === 0) {
            list.innerHTML = '<div class="text-center py-5 text-muted small"><i class="fa-regular fa-comment-dots d-block mb-3 fa-2x opacity-25"></i>No client feedback shared yet. Be the first to share your experience!</div>';
        } else {
            list.innerHTML = data.reviews.map(r => `
                <div class="mb-4 pb-4 border-bottom last-child-no-border">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold small me-2" style="width: 32px; height: 32px;">
                                ${r.reviewer_name[0]}
                            </div>
                            <span class="fw-bold text-dark small">${r.reviewer_name}</span>
                        </div>
                        <div class="text-warning small">
                            ${Array(5).fill(0).map((_, i) => `<i class="fa-${i < r.rating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
                        </div>
                    </div>
                    <p class="text-muted small mb-1">${r.comment}</p>
                    <span class="text-muted opacity-50 fw-medium" style="font-size: 0.75rem;">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>
            `).join('');
        }

        // Check if user is logged in (to potentially show review form)
        if (token) {
            // Check if user has completed bookings with this provider (simple dash check)
            const bookingsRes = await fetch('/api/bookings/my-bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const bookings = await bookingsRes.json();
            const hasCompleted = bookings.some(b => b.provider_id === parseInt(providerId) && b.status === 'completed');
            
            // Also check if they already reviewed
            const alreadyReviewed = data.reviews.some(r => r.user_id === JSON.parse(atob(token.split('.')[1])).id);

            if (hasCompleted && !alreadyReviewed) {
                formContainer.classList.remove('d-none');
            }
        }

    } catch (err) {
        console.error('Error loading reviews:', err);
    }
}

function updateRatingUI(avg, total) {
    const starsContainer = document.getElementById('rating-stars');
    const summaryText = document.getElementById('rating-summary-text');
    const avgDisplay = document.getElementById('avg-rating-display');
    const totalDisplay = document.getElementById('total-reviews-display');

    if (total == 0) {
        starsContainer.innerHTML = Array(5).fill('<i class="fa-regular fa-star opacity-25"></i>').join('');
        summaryText.textContent = 'No ratings';
        if (avgDisplay) avgDisplay.textContent = '0.0';
        if (totalDisplay) totalDisplay.textContent = 'No reviews yet';
        return;
    }

    const fullStars = Math.floor(avg);
    const hasHalf = avg - fullStars >= 0.5;
    
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) starsHtml += '<i class="fa-solid fa-star"></i>';
        else if (i === fullStars + 1 && hasHalf) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
        else starsHtml += '<i class="fa-regular fa-star"></i>';
    }

    starsContainer.innerHTML = starsHtml;
    summaryText.textContent = `(${avg}/5)`;
    if (avgDisplay) avgDisplay.textContent = avg;
    if (totalDisplay) totalDisplay.textContent = `Based on ${total} review${total != 1 ? 's' : ''}`;
}

document.getElementById('submit-review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    const providerId = new URLSearchParams(window.location.search).get('id');
    const rating = document.querySelector('input[name="rating"]:checked').value;
    const comment = document.getElementById('review-comment').value;

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ provider_id: providerId, rating, comment })
        });

        const data = await response.json();
        if (response.ok) {
            Swal.fire('Review Submitted', 'Thank you for your valuable feedback!', 'success');
            document.getElementById('review-form-container').classList.add('d-none');
            loadReviews(providerId);
        } else {
            Swal.fire('Submission Error', data.message, 'error');
        }
    } catch (err) {
        console.error('Review submission error:', err);
        Swal.fire('System Failure', 'Could not process review at this moment.', 'error');
    }
});

function renderServicesList(services) {
    const list = document.getElementById('services-list');
    if (!Array.isArray(services) || services.length === 0) {
        list.innerHTML = '<div class="col-12 text-center py-4 text-muted">No specific services listed at the moment.</div>';
        return;
    }
    
    list.innerHTML = services.map(s => `
        <div class="col-12">
            <div class="card border-0 shadow-sm p-3 service-item animate-fade-in" 
                 style="cursor: pointer; transition: transform 0.2s;" onclick="selectService(${s.id}, '${s.name}', ${s.price})">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="category-icon m-0 me-3 bg-light text-primary" style="width: 40px; height: 40px; font-size: 1rem;">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <div>
                            <h6 class="mb-0 fw-bold text-dark">${s.name}</h6>
                            <p class="mb-0 small text-muted">${s.description || 'Professional Service Offering'}</p>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold text-primary fs-5">₹${s.price}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function selectService(id, name, price) {
    document.getElementById('selected-service-id').value = id;
    document.getElementById('selected-service-name').textContent = name;
    document.getElementById('selected-service-price').textContent = `₹${price}`;
    
    const summary = document.getElementById('service-summary');
    summary.classList.remove('d-none');
    summary.classList.add('animate-fade-in');
    
    // Only enable book button if a time slot is ALSO already selected
    const hasSlot = document.getElementById('booking-date')?.value;
    document.getElementById('book-btn').disabled = !hasSlot;
    
    // Smooth scroll to form if mobile
    if (window.innerWidth < 992) {
        document.getElementById('booking-form').scrollIntoView({ behavior: 'smooth' });
    }
}

document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    if (!token) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'You need a professional account to book services.',
            icon: 'info',
            confirmButtonText: 'Login Now'
        }).then(() => window.location.href = '/views/login.html');
        return;
    }

    const serviceId = document.getElementById('selected-service-id').value;
    const bookingDate = document.getElementById('booking-date').value;
    const providerId = new URLSearchParams(window.location.search).get('id');
    const bookBtn = document.getElementById('book-btn');

    if (!serviceId) {
        return Swal.fire('Select a Service', 'Please click on a service from the Service Menu first.', 'warning');
    }
    if (!bookingDate) {
        return Swal.fire('Select a Time Slot', 'Please pick a date and time slot from the calendar.', 'warning');
    }

    try {
        bookBtn.disabled = true;
        bookBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                provider_id: providerId,
                service_id: serviceId,
                booking_date: bookingDate
            })
        });

        const data = await response.json();
        if (data.bookingId || data.success) {
            // Redirect to payment page with booking details
            const providerName = document.getElementById('provider-name')?.textContent || 'Provider';
            const bookingDateVal = document.getElementById('booking-date').value;
            const params = new URLSearchParams({
                booking_id: data.bookingId,
                price: data.price || 0,
                service: encodeURIComponent(data.service_name || 'Service'),
                provider: encodeURIComponent(providerName),
                date: encodeURIComponent(bookingDateVal),
                token: data.token_number
            });
            Swal.fire({
                title: 'Booking Confirmed! 🎉',
                html: `<p>Token <strong>#${data.token_number}</strong> issued!</p>
                       <p class="small text-muted">Proceeding to secure payment...</p>`,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
            }).then(() => window.location.href = `/views/payment.html?${params}`);
        } else {
            Swal.fire('Booking Failed', data.message || 'Validation error', 'error');
        }
    } catch (err) {
        console.error('Booking error:', err);
        Swal.fire('System Error', 'Could not process your professional booking.', 'error');
    } finally {
        bookBtn.disabled = false;
        bookBtn.innerHTML = 'Generate Token & Book <i class="fa-solid fa-arrow-right ms-2"></i>';
    }
});

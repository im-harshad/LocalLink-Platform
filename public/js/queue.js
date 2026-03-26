// Queue and User Token Management Logic

async function loadUserQueueInfo() {
    const token = sessionStorage.getItem('token');
    const activeQueueCard = document.getElementById('active-queue-card');
    const noActiveQueue = document.getElementById('no-active-queue');

    try {
        const response = await fetch('/api/queue/user-info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.inQueue) {
            activeQueueCard.classList.remove('d-none');
            noActiveQueue.classList.add('d-none');

            document.getElementById('user-token-num').textContent = `# ${data.token_number}`;
            document.getElementById('user-position').textContent = data.position === 1 ? 'Next Up!' : data.position;
            document.getElementById('active-provider-name').textContent = data.provider_name;
            document.getElementById('active-service-type').textContent = data.service_type;
            document.getElementById('token-status').textContent = data.status.toUpperCase();
            
            // Adjust badge color
            const statusBadge = document.getElementById('token-status');
            statusBadge.classList.remove('bg-primary', 'bg-warning', 'bg-info', 'bg-success');
            if (data.status === 'serving') statusBadge.classList.add('bg-info');
            else if (data.status === 'waiting') statusBadge.classList.add('bg-warning');
            else if (data.status === 'completed') statusBadge.classList.add('bg-success');

            // Estimated wait time (simplified mock calculation: 10 mins per person waiting)
            const waitTime = data.position * 10;
            document.getElementById('wait-time').textContent = `~ ${waitTime} mins`;

        } else {
            activeQueueCard.classList.add('d-none');
            noActiveQueue.classList.remove('d-none');
        }
    } catch (err) {
        console.error('Error loading queue info:', err);
    }
}

// Polling for live updates (Optional: refresh every 30 seconds)
if (window.location.pathname.includes('customer-dashboard.html')) {
    setInterval(loadUserQueueInfo, 30000);
}

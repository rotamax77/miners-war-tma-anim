const API_URL = 'http://localhost:3000/api/videos';

let currentType = '';
let currentGenre = '';
let currentLanguage = '';

const grid = document.getElementById('videos-grid');
const typeLinks = document.querySelectorAll('#nav-links a');
const genreSelect = document.getElementById('genre-select');
const langSelect = document.getElementById('language-select');

const playerContainer = document.getElementById('video-player-container');
const videoPlayer = document.getElementById('video-player');
const playerTitle = document.getElementById('player-title');
const playerDesc = document.getElementById('player-desc');
const closePlayerBtn = document.getElementById('close-player');

// Fetch and display videos
async function fetchVideos() {
    try {
        const params = new URLSearchParams();
        if (currentType) params.append('type', currentType);
        if (currentGenre) params.append('genre', currentGenre);
        if (currentLanguage) params.append('language', currentLanguage);

        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();

        displayVideos(result.data);
    } catch (error) {
        console.error('Error fetching videos:', error);
        grid.innerHTML = '<p>Erreur lors du chargement des vidéos.</p>';
    }
}

function displayVideos(videos) {
    grid.innerHTML = '';

    if (videos.length === 0) {
        grid.innerHTML = '<p>Aucun contenu trouvé pour ces critères.</p>';
        return;
    }

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => playVideo(video);

        // Image placeholder if no thumbnail
        const imgUrl = video.thumbnail_url || 'https://via.placeholder.com/300x450?text=No+Image';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/300x450?text=Image+Not+Found'">
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="tags">
                    <span>${video.release_year || 'N/A'}</span>
                    <span class="lang-badge">${video.language}</span>
                </div>
                <div class="tags" style="color: var(--primary-color);">
                    <span>${video.type.toUpperCase()}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function playVideo(video) {
    playerTitle.textContent = video.title;
    playerDesc.textContent = video.description || 'Aucune description disponible.';
    videoPlayer.src = video.video_url;

    playerContainer.classList.remove('hidden');
    videoPlayer.play().catch(e => console.log("Lecture automatique bloquée", e));

    // Scroll to player
    playerContainer.scrollIntoView({ behavior: 'smooth' });
}

closePlayerBtn.addEventListener('click', () => {
    playerContainer.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.src = ''; // stop downloading
});

// Event Listeners for Filters
typeLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        // Update active class
        typeLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');

        currentType = e.target.getAttribute('data-type');
        fetchVideos();
    });
});

genreSelect.addEventListener('change', (e) => {
    currentGenre = e.target.value;
    fetchVideos();
});

langSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    fetchVideos();
});

// Initial load
fetchVideos();

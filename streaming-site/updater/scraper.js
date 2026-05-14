const axios = require('axios');
const db = require('../backend/db');
const cron = require('node-cron');

const INTERNET_ARCHIVE_API_URL = 'https://archive.org/advancedsearch.php';

// Fonction pour récupérer des films français dans le domaine public sur Internet Archive
async function fetchMovies() {
    console.log('Fetching movies from Internet Archive...');
    try {
        const query = 'collection:(SciFi_Horror OR feature_films OR comedy_films OR animationandcartoons) AND language:(fre OR french OR Français) AND mediatype:(movies)';
        const response = await axios.get(INTERNET_ARCHIVE_API_URL, {
            params: {
                q: query,
                fl: 'identifier,title,description,year,subject',
                sort: 'downloads desc',
                rows: 50,
                output: 'json'
            }
        });

        const items = response.data.response.docs;
        let addedCount = 0;

        for (const item of items) {
            const title = item.title || 'Sans titre';
            const description = item.description || '';
            const year = item.year ? parseInt(item.year, 10) : null;
            // Simplification : on classe tout comme "film" par défaut et "anime" si ça vient de la collection animation
            let type = 'film';
            if (item.subject && item.subject.toString().toLowerCase().includes('animation')) {
                type = 'anime';
            }

            // On déduit un genre depuis "subject"
            let genre = 'Divers';
            if (item.subject) {
                const subjects = Array.isArray(item.subject) ? item.subject : [item.subject];
                genre = subjects.slice(0, 3).join(', ');
            }

            const videoUrl = `https://archive.org/download/${item.identifier}/format=h.264`; // Fake URL for demonstration, we would need actual files usually
            const thumbnailUrl = `https://archive.org/services/img/${item.identifier}`;

            // Insertion dans la BD (On ignore si ça existe déjà grace à l'UNIQUE de video_url)
            try {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO videos (title, type, genre, language, video_url, thumbnail_url, description, release_year)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [title, type, genre, 'VF', videoUrl, thumbnailUrl, description, year], function(err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint failed')) {
                                resolve(); // Already exists
                            } else {
                                console.error('Error inserting video', err.message);
                                reject(err);
                            }
                        } else {
                            addedCount++;
                            resolve();
                        }
                    });
                });
            } catch (err) {
               // handle
            }
        }
        console.log(`Finished fetching. Added ${addedCount} new movies.`);

    } catch (error) {
        console.error('Error fetching movies:', error.message);
    }
}

// Fonction pour vérifier la disponibilité des liens vidéo (basique)
async function checkLinks() {
    console.log('Checking links status...');
    db.all('SELECT id, video_url FROM videos', [], async (err, rows) => {
        if (err) {
            console.error('Error fetching videos for link check', err.message);
            return;
        }

        for (const row of rows) {
            try {
                // On fait un HEAD request pour voir si le fichier est là
                const response = await axios.head(row.video_url);
                if (response.status >= 200 && response.status < 400) {
                     // Still working
                     db.run('UPDATE videos SET is_working = 1 WHERE id = ?', [row.id]);
                } else {
                    db.run('UPDATE videos SET is_working = 0 WHERE id = ?', [row.id]);
                }
            } catch (error) {
                // Si la requête échoue (ex: 404)
                db.run('UPDATE videos SET is_working = 0 WHERE id = ?', [row.id]);
            }
        }
        console.log('Link checking completed.');
    });
}

// Fonction pour initialiser la DB avec quelques données de démo garanties
async function seedDemoData() {
    const demoVideos = [
        {
            title: "Le Voyage dans la Lune",
            type: "film",
            genre: "Sci-Fi",
            language: "VF",
            video_url: "https://archive.org/download/Levoyagedanslalunecolor/Le_voyage_dans_la_lune_color.mp4",
            thumbnail_url: "https://archive.org/services/img/Levoyagedanslalunecolor",
            description: "Film muet de Georges Méliès (1902).",
            release_year: 1902
        },
        {
            title: "Popeye the Sailor Meets Sindbad the Sailor",
            type: "anime",
            genre: "Animation, Comédie",
            language: "VO",
            video_url: "https://archive.org/download/Popeye_the_Sailor_Meets_Sindbad_the_Sailor/Popeye_the_Sailor_Meets_Sindbad_the_Sailor_512kb.mp4",
            thumbnail_url: "https://archive.org/services/img/Popeye_the_Sailor_Meets_Sindbad_the_Sailor",
            description: "Classic Popeye cartoon.",
            release_year: 1936
        },
        {
            title: "Night of the Living Dead",
            type: "film",
            genre: "Horreur",
            language: "VOSTFR",
            video_url: "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
            thumbnail_url: "https://archive.org/services/img/night_of_the_living_dead",
            description: "Classic zombie movie by George A. Romero.",
            release_year: 1968
        }
    ];

    for (const v of demoVideos) {
         db.run(`
            INSERT OR IGNORE INTO videos (title, type, genre, language, video_url, thumbnail_url, description, release_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [v.title, v.type, v.genre, v.language, v.video_url, v.thumbnail_url, v.description, v.release_year]);
    }
    console.log("Demo data seeded.");
}

// Planifier l'exécution toutes les 24 heures (ex: à 2h du matin)
cron.schedule('0 2 * * *', () => {
    fetchMovies();
    checkLinks();
});

// Pour lancer manuellement
async function run() {
    await seedDemoData();
    await fetchMovies();
    // await checkLinks(); // Commenté pour éviter de faire trop de requêtes lors du test
}

if (require.main === module) {
    run();
}

module.exports = { fetchMovies, checkLinks };

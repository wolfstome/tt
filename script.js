// ======================================================================
// CONFIGURATION: GOOGLE SHEET URLs (YOUR KEYS)
// ======================================================================

// 1. CSV URL: 🌟 FIXED: Using the Google Visualization API for reliable CSV output.
// IMPORTANT: Replace the placeholder below with the ID you copied from your sheet's browser URL.
const WISHES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRqqcKPAStgKwqTNo4HYEltpwLGgXlUa-eIfyF5X5L9ATJF4GS2yi43cVxjshWeaYPlOfGYI1gzs6Ci/pubhtml?gid=0&single=true'; 

// 2. WEB APP URL: (Your current, deployed Apps Script link)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyU92H0553E4K-bJpZo67wBQPgFIoKbH29qlGZirSK6y58WGze6JYKnlAkNDyLQG6WQKA/exec'; 

const wishesFeed = document.querySelector('.wishes-feed');


// ======================================================================
// MAIN EVENT LISTENER: Ensure all HTML elements are loaded before running
// ======================================================================
document.addEventListener('DOMContentLoaded', function() {

    // ... (Sections 1, 2, 3: Audio, Animations, Countdown - NO CHANGES) ...
    const welcomeScreen = document.querySelector('.welcome-overlay'); 
    const enterBtn = document.querySelector('#enter-btn'); 
    const bgAudio = document.getElementById('bg-audio'); 

    document.body.style.overflow = 'hidden';

    if (enterBtn && welcomeScreen) {
        enterBtn.addEventListener('click', () => {
            welcomeScreen.classList.add('hide-welcome');
            
            if (bgAudio) {
                bgAudio.volume = 0.6; 
                bgAudio.play().catch(error => console.log("Audio playback failed:", error));
            }
            
            setTimeout(() => {
                document.body.style.overflow = 'auto';
            }, 1000); 
        });
    }

    const observerOptions = { threshold: 0.1 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.slide-up').forEach(el => observer.observe(el));

    const targetDate = new Date("Dec 20, 2025 12:00:00").getTime();
    const countdownGrid = document.querySelector('.countdown-grid'); 

    const SECOND = 1000;
    const MINUTE = SECOND * 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;
    let timerInterval;

    function updateTimer() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff < 0) {
            if (countdownGrid) {
                const startTime = new Date(targetDate);
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                countdownGrid.innerHTML = `<div class="cd-box" style="width:100%; border-color:white;"><span class="cd-num">Mubarak!</span><span class="cd-label">Celebration Started on ${startTime.toLocaleDateString('en-US', options)}</span></div>`;
            }
            clearInterval(timerInterval); 
            return;
        }

        const days = Math.floor(diff / DAY);
        const hours = Math.floor((diff % DAY) / HOUR);
        const mins = Math.floor((diff % HOUR) / MINUTE);
        const secs = Math.floor((diff % MINUTE) / SECOND);

        if (countdownGrid) {
            countdownGrid.innerHTML = `
                <div class="cd-box"><span class="cd-num">${days}</span><span class="cd-label">Days</span></div>
                <div class="cd-box"><span class="cd-num">${hours}</span><span class="cd-label">Hrs</span></div>
                <div class="cd-box"><span class="cd-num">${mins}</span><span class="cd-label">Min</span></div>
                <div class="cd-box"><span class="cd-num">${secs}</span><span class="cd-label">Sec</span></div>
            `;
        }
    }

    if (countdownGrid) {
        timerInterval = setInterval(updateTimer, SECOND); 
        updateTimer();
    }
    
    // ======================================================================
    // 4. WISHES SYSTEM (GOOGLE SHEET FETCHING & SUBMISSION LOGIC)
    // ======================================================================
    
    const wishForm = document.getElementById('wish-form');

    // 🌟 UPDATED CSV Parsing Function for better reliability
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // Regex to handle CSV fields, including those wrapped in quotes
        const csvRegex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;

        // Get and clean headers (remove surrounding quotes)
        const headers = lines[0].match(csvRegex).map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].match(csvRegex);
            
            // Skip broken rows
            if (!values || values.length !== headers.length) continue; 
            
            const wishObj = {};
            
            headers.forEach((header, index) => {
                // Clean up value (remove surrounding quotes)
                wishObj[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
            });
            
            // Filter out empty rows
            if (wishObj.Name && wishObj.Wish && wishObj.Name.toLowerCase() !== 'name') {
                data.push(wishObj);
            }
        }
        return data;
    }
    
    // Rendering Function (NO CHANGES)
    function renderWishes(wishes) {
        if (!wishesFeed) return;
        wishesFeed.innerHTML = '';
        
        if (wishes.length === 0) {
            wishesFeed.innerHTML = '<p class="no-wishes" style="text-align:center; color:#777; padding-top: 10px;">No wishes found. Be the first to send a blessing!</p>';
        }

        wishes.forEach(wish => {
            const hasReply = wish.ReplyName && wish.ReplyMessage;
            
            let replyHtml = '';
            if (hasReply) {
                replyHtml = `
                <div class="replies-section" style="display: block;">
                    <h4>Our Reply:</h4>
                    <div class="reply-item">
                        <p><strong>${wish.ReplyName}:</strong> ${wish.ReplyMessage}</p>
                    </div>
                </div>
                `;
            }

            const wishCard = document.createElement('div');
            wishCard.className = 'wish-card slide-up visible'; 
            wishCard.innerHTML = `
                <div class="wish-main">
                    <p class="wish-text">"${wish.Wish}"</p>
                    <p class="wish-author">- ${wish.Name}</p>
                    <div class="wish-actions" style="display:none;"></div> 
                </div>
                ${replyHtml}
            `;
            // Prepend new wishes to show newest first
            wishesFeed.prepend(wishCard); 
        });
    }

    // Core Function to Fetch and Display Wishes (NO CHANGES)
    async function fetchAndRenderWishes() {
        if (!wishesFeed) return;

        try {
            const response = await fetch(WISHES_CSV_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvData = await response.text();
            const wishes = parseCSV(csvData);
            
            // Reverse array to show newest wishes first 
            wishes.reverse(); 
            
            renderWishes(wishes);
            console.log('Wishes loaded successfully:', wishes.length);
            
        } catch (error) {
            console.error('Error fetching or rendering wishes:', error);
            if (wishesFeed) {
                 wishesFeed.innerHTML = '<p class="text-center text-danger">Failed to load wishes. Please check the sheet URL.</p>';
            }
        }
    }


    if (wishForm) {
        // --- WISH SUBMISSION LOGIC (NO CHANGES) ---
        wishForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const submitButton = wishForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            const data = new FormData(wishForm); // Collects data using input 'name' attributes (Name, Wish)

            try {
                // Send data to the Apps Script endpoint
                const response = await fetch(WEB_APP_URL, {
                    method: 'POST',
                    body: data,
                    mode: 'no-cors' // Crucial for cross-domain submission
                });
                
                alert('🎉 Your blessing has been submitted! It will appear on the list shortly after the sheet updates.');
                wishForm.reset();
                
                // 💥 KEY: Wait 3 seconds for the Google Sheet to process, then refresh the displayed wishes 💥
                setTimeout(fetchAndRenderWishes, 3000); 

            } catch (error) {
                console.error('Submission error:', error);
                alert('❌ Submission failed. Please check your network connection or the WEB_APP_URL.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            }
        });
    }

    // Initial Render of Wishes on Load
    fetchAndRenderWishes();

    // ======================================================================
    // 5. EVENT FILTERING LOGIC (NO CHANGES)
    // ======================================================================
    function filterEvents() {
        const urlParams = new URLSearchParams(window.location.search);
        const filterType = urlParams.get('show'); 

        const mehndiCard = document.getElementById('mehndi-card');
        const baratCard = document.getElementById('barat-card');
        const walimaCard = document.getElementById('walima-card');
        
        const allCards = [mehndiCard, baratCard, walimaCard];
        allCards.forEach(card => {
            if (card) card.style.display = 'none';
        });

        // Show cards based on URL parameter
        switch (filterType) {
            case 'walima':
                if (walimaCard) walimaCard.style.display = 'block';
                break;
            case 'barat':
                if (baratCard) baratCard.style.display = 'block';
                break;
            case 'mehndi':
                if (mehndiCard) mehndiCard.style.display = 'block';
                break;
            case 'baratwalima':
                if (baratCard) baratCard.style.display = 'block';
                if (walimaCard) walimaCard.style.display = 'block';
                break;
            case 'mehindbarat':
                if (mehndiCard) mehndiCard.style.display = 'block';
                if (baratCard) baratCard.style.display = 'block';
                break;
            case 'mehndiorwalima': 
                if (mehndiCard) mehndiCard.style.display = 'block';
                if (walimaCard) walimaCard.style.display = 'block';
                break;
            case 'all':
            default:
                allCards.forEach(card => {
                    if (card) card.style.display = 'block';
                });
                break;
        }

        // ===================== ZOHA LOGIC =====================
        const zohaBlock = document.getElementById("zoha-block");
        if (zohaBlock) {
            // Zoha block should be hidden only when 'show=walima'
            if (filterType === "walima") {
                zohaBlock.style.display = "none";
            } else {
                zohaBlock.style.display = "block";
            }
        }
    }
    
    // Run the filter function when the page loads
    filterEvents();


});

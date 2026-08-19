        (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') document.body.classList.add('dark-mode');
        })();

        
        window.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme');
            const toggleBtn = document.querySelector('.theme-toggle');
            if (savedTheme === 'dark' && toggleBtn) toggleBtn.innerText = '☀️';
            fetchUpdates(true); // Call first fetch with "true" to hide loader
        });

        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            document.querySelector('.theme-toggle').innerText = isDark ? '☀️' : '🌙';
        }

        // --- FULL SCREEN API LOGIC ---
        function toggleFullScreen() {
            if (!document.fullscreenElement) {
                // Enter Fullscreen
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                // Exit Fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }

        setInterval(() => {
            document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        }, 1000);

        function globalFilter() {
            const query = document.getElementById('globalSearch').value.toLowerCase().trim();
            const cards = document.querySelectorAll('.now-serving-card, .queue-item');
            cards.forEach(card => {
                const nameText = (card.querySelector('.now-name') || card.querySelector('.queue-name')).textContent.toLowerCase();
                card.style.display = (nameText.includes(query) || card.innerText.toLowerCase().includes(query)) ? "" : "none";
            });
        }

        async function fetchUpdates(firstLoad = false) {
            try {
                // Fetch Company Name & Queue Data simultaneously
                const [metaRes, queueRes] = await Promise.all([
                    fetch('/get-company'),
                    fetch('/get-queue')
                ]);

                const metaData = await metaRes.json();
                const data = await queueRes.json();

                document.getElementById('headerTitle').innerText = `🎓 ${metaData.company}`;
                
                const grid = document.getElementById('nowServingGrid');
                const list = document.getElementById('upNextList');

                const interviewing = data.filter(s => s.status && s.status.toLowerCase() === 'interviewing');
                const waiting = data.filter(s => s.status && s.status.toLowerCase() === 'waiting');

                document.getElementById('activeCountBadge').innerText = `${interviewing.length} Active`;

                // --- 1. RENDER ACTIVE CARDS ---
                grid.innerHTML = interviewing.length === 0 
                    ? `<div style="grid-column:1/-1; text-align:center; padding:5rem; color:var(--text-muted); opacity: 0.5;"><div style="font-size: 3rem;">☕</div>No Active Interviews</div>`
                    : interviewing.map(s => {
                        const displayName = s.name || "Unknown";
                        const initials = displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                        const currentRoom = s.path[s.currentStep] || "Finish";
                        
                        // Progress Bar Math
                        const totalRounds = s.path.length;
                        const currentRoundNum = s.currentStep + 1;
                        const progressPercent = (currentRoundNum / totalRounds) * 100;
                        const nextStepText = s.path[s.currentStep + 1] ? `Next: ${s.path[s.currentStep + 1]}` : 'Final Round';
                        
                        return `
                        <div class="now-serving-card">
                            <div class="card-profile">
                                <div class="card-avatar">${initials}</div>
                                <div class="card-name-group">
                                    <span class="card-label">Candidate</span>
                                    <h2 class="now-name">${displayName}</h2>
                                </div>
                            </div>
                            <div class="card-room-box">
                                <span class="card-label">Currently At</span>
                                <span class="room-text">${currentRoom}</span>
                            </div>
                            
                            <div class="progress-container">
                                <div class="progress-text">
                                    <span>Round ${currentRoundNum} of ${totalRounds}</span>
                                    <span>${nextStepText}</span>
                                </div>
                                <div class="progress-track">
                                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                                </div>
                            </div>
                        </div>`;
                    }).join('');

                // --- 2. RENDER WAITING QUEUE ---
                list.innerHTML = waiting.length === 0
                    ? `<div class="empty-state" style="text-align:center; padding:2rem;"><div style="font-size:40px;">☕</div><p>All clear!</p></div>`
                    : waiting.map((s, i) => `
                        <div class="queue-item">
                            <div class="queue-left">
                                <div class="token-circle">${i+1}</div>
                                <div class="queue-name">${s.name}</div>
                            </div>
                            <div class="queue-room-badge">
                                ${s.path[s.currentStep] || "Waiting"}
                            </div>
                        </div>`).join('');

                
                globalFilter();
            } catch (err) { console.error(err); }
        }

        const socket = io();
        
        // 1. Listen for the database update
        socket.on('queueUpdated', async () => {
            await fetchUpdates(); // Wait for the screen to finish redrawing

            // 2. IF the chime just played, flash the entire panel!
            if (window.pendingFlash) {
                const activePanel = document.querySelector('.active-section');
                if (activePanel) {
                    activePanel.classList.add('flash-active');
                    
                    // Remove class after 2 seconds so it can happen again later
                    setTimeout(() => {
                        activePanel.classList.remove('flash-active');
                    }, 2000);
                }
                window.pendingFlash = false; // Reset the flag
            }
        });
        
        // 3. Listen for the audio chime
        socket.on('playChime', () => {
            const chime = document.getElementById('chimeSound');
            if (chime) {
                chime.currentTime = 0; // Rewind for rapid-fire clicks
                chime.play().catch(err => console.log("Audio needs interaction"));
            }
            
            // Leave a sticky note for queueUpdated to trigger the visual flash
            window.pendingFlash = true; 
        });
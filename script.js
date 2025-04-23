// Variables globales
        let lastSmokeTime = null;
        let nextSmokeTime = null;
        let smokeInterval = 60 * 60 * 1000; // 60 minutes par défaut (en ms)
        let dailyTarget = 20;
        let reductionTarget = 0; // Nouvel objectif de réduction quotidien
        let pricePerPack = 10;
        let cigarettesPerPack = 20;
        let todayCount = 0;
        let history = []; // Tableau d'objets { time: isoString, type: 'smoke' | 'envy' }
        let envyHistory = []; // Tableau pour l'historique des envies
        let motivationShown = false; // Indicateur pour le message de motivation
        let motivationTimeout = null; // Pour gérer le timeout du message
        let lastMotivationCheck = null; // Pour éviter de spammer les messages

        // Éléments DOM
        const smokeBtn = document.getElementById('smokeBtn');
        const envyBtn = document.getElementById('envyBtn');
        const lastCigaretteDisplay = document.getElementById('lastCigarette');
        const nextCigaretteDisplay = document.getElementById('nextCigarette');
        const todayCountDisplay = document.getElementById('todayCount');
        const dailyGoalDisplay = document.getElementById('dailyGoalDisplay');
        const moneySavedDisplay = document.getElementById('moneySaved');
        const intervalInput = document.getElementById('interval');
        const dailyTargetInput = document.getElementById('dailyTarget');
        const reductionTargetInput = document.getElementById('reductionTarget');
        const pricePerPackInput = document.getElementById('pricePerPack');
        const cigarettesPerPackInput = document.getElementById('cigarettesPerPack');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const targetCountDisplay = document.getElementById('targetCount');
        const reductionPercentDisplay = document.getElementById('reductionPercent');
        const historyList = document.getElementById('historyList');
        const motivationMessage = document.getElementById('motivationMessage');

        // Initialisation au chargement de la page
        document.addEventListener('DOMContentLoaded', () => {
            loadData();
            updateStaticDisplays(); // Mettre à jour les stats fixes
            updateDynamicDisplays(); // Mettre à jour les timers une première fois
            setInterval(updateDynamicDisplays, 1000); // Lancer la boucle pour les timers/motivation
            setupEventListeners();
        });

        // --- Fonctions de gestion des données ---

        function loadData() {
            // Paramètres
            const savedInterval = localStorage.getItem('smokeIntervalMinutes');
            const savedTarget = localStorage.getItem('dailyTarget');
            const savedReductionTarget = localStorage.getItem('reductionTarget');
            const savedPrice = localStorage.getItem('pricePerPack');
            const savedCigarettes = localStorage.getItem('cigarettesPerPack');
            const savedLastSmoke = localStorage.getItem('lastSmokeTime');
            const savedTodayCount = localStorage.getItem('todayCount');
            const savedHistory = localStorage.getItem('smokeHistory');
            const savedEnvyHistory = localStorage.getItem('envyHistory');

            if (savedInterval) {
                const parsedInterval = parseInt(savedInterval, 10);
                if (!isNaN(parsedInterval) && parsedInterval >= 5) {
                    smokeInterval = parsedInterval * 60 * 1000;
                    intervalInput.value = parsedInterval;
                }
            }
            if (savedTarget) {
                const parsedTarget = parseInt(savedTarget, 10);
                if (!isNaN(parsedTarget) && parsedTarget >= 1) {
                    dailyTarget = parsedTarget;
                    dailyTargetInput.value = parsedTarget;
                }
            }
            if (savedReductionTarget) {
                const parsedReductionTarget = parseFloat(savedReductionTarget);
                if (!isNaN(parsedReductionTarget) && parsedReductionTarget >= 0) {
                    reductionTarget = parsedReductionTarget;
                    reductionTargetInput.value = parsedReductionTarget.toFixed(1);
                }
            }
            if (savedPrice) {
                const parsedPrice = parseFloat(savedPrice);
                if (!isNaN(parsedPrice) && parsedPrice >= 0.1) {
                    pricePerPack = parsedPrice;
                    pricePerPackInput.value = parsedPrice.toFixed(2);
                }
            }
            if (savedCigarettes) {
                const parsedCigarettes = parseInt(savedCigarettes, 10);
                if (!isNaN(parsedCigarettes) && parsedCigarettes >= 1) {
                    cigarettesPerPack = parsedCigarettes;
                    cigarettesPerPackInput.value = parsedCigarettes;
                }
            }
            if (savedLastSmoke && savedLastSmoke !== 'null') {
                lastSmokeTime = new Date(savedLastSmoke);
            }
            if (savedTodayCount) {
                const parsedTodayCount = parseInt(savedTodayCount, 10);
                if (!isNaN(parsedTodayCount) && parsedTodayCount >= 0) {
                    todayCount = parsedTodayCount;
                }
            }
            if (savedHistory) {
                history = JSON.parse(savedHistory).map(item => ({ ...item, time: new Date(item.time) }));
                // Filtrer l'historique pour ne garder que les entrées d'aujourd'hui
                const today = new Date().toDateString();
                history = history.filter(item => new Date(item.time).toDateString() === today);
                todayCount = history.filter(item => item.type === 'smoke').length;
            }
            if (savedEnvyHistory) {
                envyHistory = JSON.parse(savedEnvyHistory).map(time => new Date(time));
                // Filtrer l'historique des envies pour ne garder que celles d'aujourd'hui
                const today = new Date().toDateString();
                envyHistory = envyHistory.filter(time => new Date(time).toDateString() === today);
            }

            // Appliquer la réduction progressive (une fois au chargement pour aujourd'hui)
            applyProgressiveReduction();
        }

        function saveData() {
            localStorage.setItem('smokeIntervalMinutes', parseInt(smokeInterval / (60 * 1000)));
            localStorage.setItem('dailyTarget', dailyTarget);
            localStorage.setItem('reductionTarget', reductionTarget);
            localStorage.setItem('pricePerPack', pricePerPack);
            localStorage.setItem('cigarettesPerPack', cigarettesPerPack);
            localStorage.setItem('lastSmokeTime', lastSmokeTime ? lastSmokeTime.toISOString() : null);
            localStorage.setItem('todayCount', todayCount);
            localStorage.setItem('smokeHistory', JSON.stringify(history.map(item => ({ ...item, time: item.time.toISOString() }))));
            localStorage.setItem('envyHistory', JSON.stringify(envyHistory.map(time => time.toISOString())));
        }

        function resetTodayData() {
            todayCount = 0;
            history = [];
            envyHistory = [];
            lastSmokeTime = null;
            saveData();
            updateStaticDisplays();
            updateHistoryDisplay();
        }

        // --- Gestion des événements ---

        function setupEventListeners() {
            smokeBtn.addEventListener('click', recordSmoke);
            envyBtn.addEventListener('click', recordEnvy);
            intervalInput.addEventListener('change', updateSettings);
            dailyTargetInput.addEventListener('change', updateSettings);
            reductionTargetInput.addEventListener('change', updateSettings);
            pricePerPackInput.addEventListener('change', updateSettings);
            cigarettesPerPackInput.addEventListener('change', updateSettings);

            // Réinitialiser les données au début de chaque jour (approche simplifiée)
            setInterval(() => {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                if (hour === 0 && minute < 5) { // Réinitialiser entre 00:00 et 00:04
                    const lastReset = localStorage.getItem('lastResetDay');
                    const today = now.toDateString();
                    if (today !== lastReset) {
                        resetTodayData();
                        localStorage.setItem('lastResetDay', today);
                    }
                }
            }, 60 * 1000); // Vérifier chaque minute
        }

        function updateSettings() {
            const newInterval = parseInt(intervalInput.value, 10);
            const newDailyTarget = parseInt(dailyTargetInput.value, 10);
            const newReductionTarget = parseFloat(reductionTargetInput.value);
            const newPrice = parseFloat(pricePerPackInput.value);
            const newCigarettesPerPack = parseInt(cigarettesPerPackInput.value, 10);

            if (!isNaN(newInterval) && newInterval >= 5) {
                smokeInterval = newInterval * 60 * 1000;
            }
            if (!isNaN(newDailyTarget) && newDailyTarget >= 1) {
                dailyTarget = newDailyTarget;
            }
            if (!isNaN(newReductionTarget) && newReductionTarget >= 0) {
                reductionTarget = newReductionTarget;
            }
            if (!isNaN(newPrice) && newPrice >= 0.1) {
                pricePerPack = newPrice;
            }
            if (!isNaN(newCigarettesPerPack) && newCigarettesPerPack >= 1) {
                cigarettesPerPack = newCigarettesPerPack;
            }

            saveData();
            updateStaticDisplays();
            updateDynamicDisplays();
        }

        // --- Enregistrement des actions ---

        function recordSmoke() {
            const now = new Date();
            if (lastSmokeTime && (now.getTime() - lastSmokeTime.getTime()) < smokeInterval) {
                alert(`Veuillez attendre au moins ${parseInt(smokeInterval / (60 * 1000))} minutes entre les cigarettes.`);
                return;
            }

            history.push({ time: now, type: 'smoke' });
            lastSmokeTime = now;
            todayCount++;
            saveData();
            updateStaticDisplays();
            updateDynamicDisplays();
            updateHistoryDisplay();
            showMotivationMessage();
        }

        function recordEnvy() {
            envyHistory.push(new Date());
            saveData();
            updateHistoryDisplay();
            alert("Envie enregistrée. Essayez de résister !");
        }

        // --- Affichage des données ---

        function updateStaticDisplays() {
            lastCigaretteDisplay.textContent = lastSmokeTime ? formatDate(lastSmokeTime) : 'Jamais';
            todayCountDisplay.textContent = todayCount;
            dailyGoalDisplay.textContent = dailyTarget;
            targetCountDisplay.textContent = dailyTarget;

            const money = (todayCount / cigarettesPerPack) * pricePerPack;
            moneySavedDisplay.textContent = `${money.toFixed(2)}€`;

            const progress = todayCount / dailyTarget;
            const percentage = Math.min(100, Math.round(progress * 100));
            progressFill.style.width = `${percentage}%`;
            progressPercent.textContent = `${percentage}%`;

            const reduction = ((dailyTarget - todayCount) / dailyTarget) * 100;
            reductionPercentDisplay.textContent = `${isNaN(reduction) || !isFinite(reduction) ? '0' : Math.max(0, reduction).toFixed(0)}%`;
        }

        function updateDynamicDisplays() {
            const now = new Date();
            if (lastSmokeTime) {
                const nextTime = new Date(lastSmokeTime.getTime() + smokeInterval);
                if (now < nextTime) {
                    const timeLeft = nextTime.getTime() - now.getTime();
                    nextCigaretteDisplay.textContent = formatTimeLeft(timeLeft);
                } else {
                    nextCigaretteDisplay.textContent = 'Maintenant ou bientôt';
                }
            } else {
                nextCigaretteDisplay.textContent = '--';
            }

            // Afficher un message de motivation de temps en temps si l'objectif est respecté
            if (todayCount < dailyTarget && (lastSmokeTime || todayCount === 0)) {
                checkAndShowMotivation();
            } else {
                hideMotivationMessage();
            }
        }

        function updateHistoryDisplay() {
            historyList.innerHTML = '';
            const allHistory = [...history.map(item => ({ ...item, typeLabel: 'Cigarette' })), ...envyHistory.map(time => ({ time: time, type: 'envy', typeLabel: 'Envie' }))];
            allHistory.sort((a, b) => b.time.getTime() - a.time.getTime());

            if (allHistory.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.classList.add('history-empty');
                emptyMessage.textContent = 'Aucune activité enregistrée aujourd\'hui';
                historyList.appendChild(emptyMessage);
            } else {
                allHistory.forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.classList.add('history-item');

                    const timeSpan = document.createElement('span');
                    timeSpan.classList.add('history-time');
                    timeSpan.textContent = formatTime(item.time);

                    const typeSpan = document.createElement('span');
                    if (item.type === 'envy') {
                        typeSpan.classList.add('history-envy');
                        typeSpan.textContent = 'Envie';
                    }

                    historyItem.appendChild(timeSpan);
                    historyItem.appendChild(typeSpan);
                    historyList.appendChild(historyItem);
                });
            }
        }

        // --- Fonctions utilitaires ---

        function formatDate(date) {
            const options = { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' };
            return date.toLocaleDateString('fr-FR', options);
        }

        function formatTime(date) {
            const options = { hour: 'numeric', minute: 'numeric' };
            return date.toLocaleTimeString('fr-FR', options);
        }

        function formatTimeLeft(ms) {
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const seconds = Math.floor((ms / 1000) % 60);
            return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }

        function showMotivationMessage() {
            if (!motivationShown) {
                motivationMessage.textContent = getMotivationMessage();
                motivationMessage.classList.add('show');
                motivationShown = true;
                if (motivationTimeout) clearTimeout(motivationTimeout);
                motivationTimeout = setTimeout(hideMotivationMessage, 5000); // Cacher après 5 secondes
            }
        }

        function hideMotivationMessage() {
            motivationMessage.classList.remove('show');
            motivationShown = false;
            motivationTimeout = null;
        }

        function getMotivationMessage() {
            const messages = [
                "Bravo pour vos efforts aujourd'hui !",
                "Chaque cigarette évitée est une victoire.",
                "Vous êtes plus fort que l'envie.",
                "Continuez sur cette voie, vous faites du bien à votre corps.",
                "Pensez aux bénéfices que vous ressentez déjà."
            ];
            return messages[Math.floor(Math.random() * messages.length)];
        }

        function applyProgressiveReduction() {
            const today = new Date().toDateString();
            const lastReductionDay = localStorage.getItem('lastReductionDay');

            if (reductionTarget > 0 && today !== lastReductionDay) {
                dailyTarget = Math.max(1, dailyTarget - reductionTarget);
                dailyTargetInput.value = dailyTarget;
                localStorage.setItem('dailyTarget', dailyTarget);
                localStorage.setItem('lastReductionDay', today);
                updateStaticDisplays();
            }
        }

        function checkAndShowMotivation() {
            const now = new Date();
            if (!lastMotivationCheck || (now.getTime() - lastMotivationCheck.getTime()) > 60 * 60 * 1000) { // Vérifier toutes les heures
                const percentage = todayCount / dailyTarget;
                if (percentage < 0.5) {
                    showMotivationMessage();
                    lastMotivationCheck = now;
                }
            }
        }

// Bestehende Referenzen
const chatTitle = document.getElementById('chatTitle');
const desktopChatTitle = document.getElementById('desktopChatTitle');
const chatContent = document.getElementById('chatContent');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const chatList = document.getElementById('chatList');
const burgerBtn = document.getElementById('burgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const body = document.body;

let chats = []; // Wird aus JSON geladen
let currentChatIndex = -1; // Start with -1 to ensure the first displayChat always runs

// --- Funktion zum Laden und Verarbeiten der Chats aus JSON ---
async function loadChats() {
    try {
        const response = await fetch('chats.json'); // Fetch JSON file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        chats = await response.json(); // Parse JSON directly
        console.log("Chats loaded:", chats); // Zum Debuggen
    } catch (error) {
        console.error('Fehler beim Laden oder Verarbeiten der Chats:', error);
        chatContent.innerHTML = '<p style="color: red;">Fehler beim Laden der Chat-Daten.</p>';
        chatTitle.textContent = 'Fehler';
        desktopChatTitle.textContent = 'Fehler';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        chats = []; // Ensure chats is empty on error
    }
}

// --- Bestehende UI-Funktionen ---

function toggleSidebar() {
    body.classList.toggle('sidebar-visible');
    const isExpanded = body.classList.contains('sidebar-visible');
    burgerBtn.setAttribute('aria-expanded', isExpanded);
}

function closeSidebar() {
    if (body.classList.contains('sidebar-visible')) {
        body.classList.remove('sidebar-visible');
        burgerBtn.setAttribute('aria-expanded', 'false');
    }
}

function populateSidebar() {
    chatList.innerHTML = '';
    if (!chats || chats.length === 0) {
        console.warn("Keine Chats zum Anzeigen in der Sidebar.");
        return;
    }
    chats.forEach((chat, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = chat.title;
        listItem.dataset.index = index;
        chatList.appendChild(listItem);
    });
}

function setActiveSidebarItem(index) {
    if (!chats || chats.length === 0) return;
    const items = chatList.querySelectorAll('li');
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) {
        items[index].classList.add('active');
        // Scroll into view only if sidebar is visible or on desktop
        if (body.classList.contains('sidebar-visible') || window.innerWidth >= 768) {
            // Use timeout to ensure element is visible before scrolling (especially on initial load)
             setTimeout(() => {
                 items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
             }, 100); // Small delay might help
        }
    }
}

function displayChat(index) {
    // Prevent updates if index is invalid or same as current
    if (!chats || index < 0 || index >= chats.length || index === currentChatIndex) {
         // Allow display if currentChatIndex is -1 (initial load) even if index is 0
         if(index !== 0 || currentChatIndex !== -1) {
              console.log(`Display chat skipped: index=${index}, currentChatIndex=${currentChatIndex}`);
              return;
         }
    }

    console.log(`Displaying chat: index=${index}`); // Debug log
    currentChatIndex = index;
    const currentChat = chats[index];

    chatTitle.textContent = currentChat.title;
    desktopChatTitle.textContent = currentChat.title;

    chatContent.innerHTML = ''; // Clear previous messages
    currentChat.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', message.sender);
        const textP = document.createElement('p');
        textP.textContent = message.text;
        const timeDiv = document.createElement('div');
        timeDiv.classList.add('time');
        timeDiv.textContent = message.time;
        messageDiv.appendChild(textP);
        messageDiv.appendChild(timeDiv);
        chatContent.appendChild(messageDiv);
    });
    // Scroll to bottom after messages are added
    setTimeout(() => chatContent.scrollTop = chatContent.scrollHeight, 0);
    updateButtons();
    setActiveSidebarItem(index);
}


function updateButtons() {
     if (!chats || chats.length === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    prevBtn.disabled = currentChatIndex === 0;
    nextBtn.disabled = currentChatIndex === chats.length - 1;
}

// --- NEU: Hash Change Handler ---
// This function now ONLY reacts to hash changes AFTER initial load
function handleHashChange() {
    if (!chats || chats.length === 0) return; // Safety check

    const hash = window.location.hash.substring(1);
    let index = parseInt(hash);

    // Validate index
    if (isNaN(index) || index < 0 || index >= chats.length) {
         // If hash is invalid *after* initial load, gently go back to current index's hash or 0
         console.warn(`Invalid hash "${window.location.hash}" detected after load.`);
         const targetIndex = (currentChatIndex >= 0 && currentChatIndex < chats.length) ? currentChatIndex : 0;
          // Use replaceState to avoid adding a bad entry to history and prevent loop
         window.history.replaceState(null, null, '#' + targetIndex);
         index = targetIndex; // Use the corrected index
    }

    // Display chat only if the index is different from the currently displayed one
    // This check is now crucial as displayChat is called separately on init
    if (index !== currentChatIndex) {
        displayChat(index);
    }
}


// --- Event Listeners ---
burgerBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', closeSidebar);

chatList.addEventListener('click', (event) => {
    if (event.target && event.target.nodeName === 'LI') {
        const index = parseInt(event.target.dataset.index);
        if (!isNaN(index) && index >= 0 && chats && index < chats.length) {
            // Change the hash - this will trigger handleHashChange
            if (`#${index}` !== window.location.hash) {
                 window.location.hash = index;
            } else {
                 // If hash is already correct but chat not displayed (unlikely now), force display
                 displayChat(index);
            }
            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        }
    }
});

prevBtn.addEventListener('click', () => {
    if (currentChatIndex > 0) {
        window.location.hash = currentChatIndex - 1; // Trigger handleHashChange
    }
});

nextBtn.addEventListener('click', () => {
     if (chats && currentChatIndex < chats.length - 1) {
        window.location.hash = currentChatIndex + 1; // Trigger handleHashChange
    }
});


// --- NEU: Initialisierungsfunktion ---
async function initializeApp() {
    await loadChats(); // Wait for chats to load

    if (chats && chats.length > 0) {
        populateSidebar(); // Populate sidebar first

        // Determine initial index *after* loading chats
        const initialHash = window.location.hash.substring(1);
        let initialIndex = parseInt(initialHash);

        // Validate initial index
        if (isNaN(initialIndex) || initialIndex < 0 || initialIndex >= chats.length) {
            initialIndex = 0; // Default to the first chat
            // Silently update the URL to #0 if it was invalid or missing, without adding to history
             window.history.replaceState(null, null, '#' + initialIndex);
        }

        // Directly display the determined initial chat
        // Set currentChatIndex to -1 before this call to ensure it runs
        currentChatIndex = -1;
        displayChat(initialIndex);

        // Add the hashchange listener *after* the initial chat is displayed
        window.addEventListener('hashchange', handleHashChange);

    } else {
        console.log("Initialization skipped - no chats loaded or error loading chats.");
        // Ensure buttons remain disabled if no chats loaded
        updateButtons();
    }
}

// --- Initialisierung beim Laden der Seite ---
initializeApp(); // Start the initialization process
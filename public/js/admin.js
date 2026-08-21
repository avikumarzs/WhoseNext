// --- Helper Function: Title Case Formatter ---
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Store queue data globally for the panel to access
let globalQueueData = [];

async function initializeDashboard() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) toggleBtn.innerText = '☀️';
    }

    try {
        async function getCompany() {
            const response = await fetch('/get-company');
            if (response.ok) {
                const data = await response.json();
                if (data && data.company) {
                   const companyName = data.company !== 'Placement Drive' ? data.company : 'Active Pipeline';
                   const dynamicHeader = document.getElementById('dynamic-company-header');
                   if (dynamicHeader) dynamicHeader.innerText = companyName;
                }
            }
        }
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
        await Promise.race([Promise.all([getCompany(), loadQueue()]), timeoutPromise]);
    } catch (error) { console.error('Init failed:', error); }
}

initializeDashboard();

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelector('.theme-toggle').innerText = isDark ? '☀️' : '🌙';
}

// --- Core Modal Logic ---
function showModal(options) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');
        const input = document.getElementById('modal-input');
        const btnCancel = document.getElementById('modal-cancel');
        const btnConfirm = document.getElementById('modal-confirm');

        title.innerText = options.title;
        desc.innerText = options.desc || '';
        
        if (options.type === 'prompt') {
            input.style.display = 'block';
            input.value = options.defaultVal || '';
            setTimeout(() => input.focus(), 100); 
        } else {
            input.style.display = 'none';
        }

        if (options.infoOnly) btnCancel.style.display = 'none';
        else btnCancel.style.display = 'inline-block';

        btnConfirm.innerText = options.confirmText || 'Confirm';
        btnConfirm.style.background = options.danger ? 'var(--danger)' : 'var(--primary)';

        overlay.classList.remove('hidden');

        const cleanup = () => {
            overlay.classList.add('hidden');
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
        };

        btnCancel.onclick = () => { cleanup(); resolve(null); };
        btnConfirm.onclick = () => { cleanup(); resolve(options.type === 'prompt' ? input.value : true); };
    });
}

// --- Company Details Modal Logic ---
async function openCompanyModal() {
    const response = await fetch('/get-company');
    const data = await response.json();
    
    document.getElementById('company-name-input').value = data.company !== 'Placement Drive' ? data.company : '';
    document.getElementById('drive-date-input').value = data.date || '';
    
    document.getElementById('company-details-modal').classList.remove('hidden');
}

function closeCompanyModal() {
    document.getElementById('company-details-modal').classList.add('hidden');
}

async function saveCompanyDetails() {
    const company = document.getElementById('company-name-input').value || 'Placement Drive';
    const date = document.getElementById('drive-date-input').value;
    
    await fetch('/set-company', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ company, date }) 
    });
    
    initializeDashboard();
    closeCompanyModal();
}

function openAddCandidateModal() {
    document.getElementById('prn').value = '';
    document.getElementById('name').value = '';
    document.getElementById('branch').value = '';
    document.getElementById('room').value = '';
    document.getElementById('add-candidate-modal').classList.remove('hidden');
}

function closeAddCandidateModal() {
    document.getElementById('add-candidate-modal').classList.add('hidden');
}

async function addStudent() {
    const prn = document.getElementById('prn').value || 'N/A';
    const rawName = document.getElementById('name').value;
    const branch = document.getElementById('branch').value || 'N/A';
    const room = document.getElementById('room').value;
    
    if(rawName.trim() !== '') {
        const formattedName = toTitleCase(rawName);
        await fetch('/add-student', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prn, name: formattedName, branch, room, status: 'unmarked' }) });
        closeAddCandidateModal();
        loadQueue();
    } else {
        alert("Name is required!");
    }
}

// --- Bulletproof Excel Parsing ---
function handleExcelUpload() {
    const fileInput = document.getElementById('excelFile');
    const statusDiv = document.getElementById('uploadStatus');
    if (fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    statusDiv.innerText = "Reading file..."; 
    statusDiv.classList.remove('hidden'); 
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            let studentsToUpload = [];

            for(let row of jsonData) {
                const getStrictVal = (obj, exactKeys) => {
                    const foundKey = Object.keys(obj).find(k => exactKeys.includes(k.trim().toLowerCase()));
                    return foundKey ? obj[foundKey] : null;
                };
                
                const prn = getStrictVal(row, ['prn', 'id', 'rollno']) || "N/A";
                const rawName = getStrictVal(row, ['name', 'student name']);
                const branch = getStrictVal(row, ['branch', 'department', 'dept']) || "N/A";
                const room = getStrictVal(row, ['room', 'interview line', 'interview', 'location']) || "Waiting Area";
                
                if(rawName && String(rawName).trim() !== "") {
                    studentsToUpload.push({ 
                        prn: String(prn).trim(), 
                        name: toTitleCase(String(rawName).trim()), 
                        branch: String(branch).trim(), 
                        room: String(room).trim(),
                        status: 'unmarked' 
                    });
                }
            }

            if (studentsToUpload.length > 0) {
                const confirmUpload = await showModal({ 
                    title: "Confirm Upload", 
                    desc: `Found ${studentsToUpload.length} candidates. Inject into pipeline?`, 
                    confirmText: "Upload Now" 
                });
                
                if (confirmUpload) {
                    statusDiv.innerText = "Processing pipeline...";
                    await fetch('/add-bulk-students', { 
                        method: 'POST', 
                        headers: {'Content-Type':'application/json'}, 
                        body: JSON.stringify({ students: studentsToUpload }) 
                    });
                    statusDiv.innerText = "Upload Complete!";
                    setTimeout(() => {
                        statusDiv.classList.add('hidden');
                        statusDiv.innerText = "";
                    }, 3000);
                } else {
                    statusDiv.classList.add('hidden');
                }
            } else {
                statusDiv.classList.add('hidden');
                await showModal({ 
                    title: "Data Error", 
                    desc: "Could not locate an exact 'Name' or 'Student Name' header column. Please check your Excel formatting.", 
                    infoOnly: true 
                });
            }
        } catch (err) {
            statusDiv.classList.add('hidden');
            await showModal({ title: "Upload Failed", desc: "Error: " + err.message, infoOnly: true });
        } finally {
            fileInput.value = ""; 
            loadQueue();
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Stat Drill-Down Logic ---
function openStatModal(category) {
    let filtered = [];
    let title = "";
    const data = globalQueueData;

    if (category === 'total') {
        filtered = data.filter(s => s.status !== 'absent');
        title = "Total Candidates";
    } else if (category === 'active') {
        filtered = data.filter(s => s.status && s.status.toLowerCase() === 'interviewing');
        title = "Currently Interviewing";
    } else if (category === 'waiting') {
        filtered = data.filter(s => s.status && (s.status.toLowerCase() === 'waiting' || s.status.toLowerCase() === 'hold'));
        title = "Waiting / On Hold";
    } else if (category === 'completed') {
        filtered = data.filter(s => {
            if (s.status === 'absent') return false;
            const isCompletedPath = s.currentStep >= s.path.length;
            return isCompletedPath || s.status === 'completed' || s.status === 'rejected';
        });
        title = "Completed Pipeline";
    }

    document.getElementById('stat-modal-title').innerText = title;
    const list = document.getElementById('stat-modal-list');
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:25px; color:var(--text-muted); font-size: 0.9rem;">No candidates found in this category.</td></tr>';
    } else {
        filtered.forEach(s => {
            list.innerHTML += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 10px; font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${s.prn || 'N/A'}</td>
                    <td class="align-left" style="padding: 12px 10px; font-weight: 700; font-size: 0.9rem;">${s.name}</td>
                    <td style="padding: 12px 10px; color: var(--text-muted); font-size: 0.85rem;">${s.branch || 'N/A'}</td>
                </tr>
            `;
        });
    }
    
    document.getElementById('stat-details-modal').classList.remove('hidden');
}

function closeStatModal() {
    document.getElementById('stat-details-modal').classList.add('hidden');
}

// --- Core Queue Logic ---
async function loadQueue() {
    try {
        const res = await fetch('/get-queue');
        const data = await res.json();
        globalQueueData = data; 
        const list = document.getElementById('adminList');
        list.innerHTML = '';

        const activeCount = data.filter(s => s.status && s.status.toLowerCase() === 'interviewing').length;
        const waitingCount = data.filter(s => s.status && (s.status.toLowerCase() === 'waiting' || s.status.toLowerCase() === 'hold')).length;
        
        const completedCount = data.filter(s => {
            if (s.status === 'absent') return false;
            const isCompletedPath = s.currentStep >= s.path.length;
            return isCompletedPath || s.status === 'completed' || s.status === 'rejected';
        }).length;

        document.getElementById('stat-total').innerText = data.filter(s => s.status !== 'absent').length; 
        document.getElementById('stat-active').innerText = activeCount;
        document.getElementById('stat-waiting').innerText = waitingCount;
        if(document.getElementById('stat-completed')) document.getElementById('stat-completed').innerText = completedCount;

        let visibleCount = 0;
        const tickSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const crossSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        data.forEach((s, i) => {
            const currentStatus = s.status ? s.status.toLowerCase() : 'unmarked';
            
            if (currentStatus === 'absent') return;
            visibleCount++;

            const isCompletedPath = s.currentStep >= s.path.length;
            const isDone = (isCompletedPath || currentStatus === 'completed' || currentStatus === 'rejected');
            
            const pathDisplay = `<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding: 4px 0;">` +
                s.path.map((room, idx) => {
                    if (isDone) return `<span style="background:var(--surface-hover); color:var(--text-muted); padding:5px 12px; border-radius:8px; font-size:0.85rem;">${room}</span>`;
                    if (idx < s.currentStep) return `<span style="background:var(--success); color:white; padding:5px 12px; border-radius:8px; font-size:0.85rem;">${room} ✓</span>`;
                    if (idx === s.currentStep) return `<span style="background:var(--accent); color:white; padding:5px 12px; border-radius:8px; font-size:0.85rem; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.15);">👉 ${room}</span>`;
                    return `<span style="background:var(--surface-hover); color:var(--text-muted); padding:5px 12px; border-radius:8px; font-size:0.85rem;">${room}</span>`;
                }).join('<span style="color:var(--text-muted); font-size:1rem; font-weight:bold;">→</span>')
            + `</div>`;

            let statusText = 'Waiting';
            if (isDone) { statusText = 'Completed'; } 
            else if (currentStatus === 'interviewing') { 
                const currentRoom = s.path[s.currentStep] || 'Room';
                statusText = `Inside ${currentRoom}`; 
            }

            let attendanceHtml = '';
            if (currentStatus === 'unmarked') {
                attendanceHtml = `
                    <div style="display:flex; justify-content:center; gap:10px;">
                        <button type="button" title="Present" style="background:var(--success); color:white; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s;" onclick="sendAction(${i}, 'waiting')">${tickSvg}</button>
                        <button type="button" title="Absent" style="background:var(--danger); color:white; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s;" onclick="markAbsent(${i})">${crossSvg}</button>
                    </div>
                `;
            } else {
                attendanceHtml = `<span style="color:var(--success); font-weight:bold; font-size:0.85rem; padding: 4px 10px; background: rgba(0,255,0,0.1); border-radius: 20px;">✓ Marked</span>`;
            }

            const manageHtml = `<button type="button" onclick="openPanel(${i})" style="padding: 6px 14px; background: transparent; border: 1px solid var(--border); color: var(--text-main); border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: 600; font-size: 0.85rem;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='transparent'">Open ↗</button>`;

            list.innerHTML += `<tr>
                <td style="padding: 16px 10px; font-family: monospace; color: var(--text-muted); letter-spacing: 0.5px;">${s.prn || 'N/A'}</td>
                <td class="align-left" style="padding: 16px 10px; font-weight:800;">${s.name}</td>
                <td style="padding: 16px 10px; color:var(--text-muted); font-size:0.9rem;">${s.branch || 'N/A'}</td>
                <td style="padding: 16px 10px;">${pathDisplay}</td>
                <td style="padding: 16px 10px; font-weight: 500;">${statusText}</td>
                <td style="padding: 16px 10px;">${attendanceHtml}</td>
                <td style="padding: 16px 10px;">${manageHtml}</td>
            </tr>`;
        });
        
        if(visibleCount === 0) {
            list.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted); font-size: 1.1rem;">Active pipeline is empty. Add candidates to begin.</td></tr>';
        }

        filterQueue();

        const openPrn = sessionStorage.getItem('openPanelPRN');
        if (openPrn) {
            const reOpenIndex = data.findIndex((student, index) => (student.prn + '-' + index) === openPrn);
            if (reOpenIndex !== -1 && data[reOpenIndex].status !== 'absent') {
                openPanel(reOpenIndex);
            } else {
                closePanel(); 
            }
        }

    } catch (err) { console.error(err); }
}

async function markAbsent(index) {
    const confirmAbs = await showModal({
        title: "Mark Candidate Absent?",
        desc: "This will remove the candidate from the active dashboard. Their details will remain in the final downloaded Excel sheet, but all their interview round columns will be blank.",
        type: 'confirm',
        danger: true,
        confirmText: "Mark Absent"
    });
    if (confirmAbs) {
        await sendAction(index, 'absent');
    }
}

// --- Slide-Out Panel Logic ---
function openPanel(index) {
    const s = globalQueueData[index];
    if (!s) return;

    sessionStorage.setItem('openPanelPRN', s.prn + '-' + index);

    const currentStatus = s.status ? s.status.toLowerCase() : 'unmarked';
    const isCompletedPath = s.currentStep >= s.path.length;
    const isDone = (isCompletedPath || currentStatus === 'completed' || currentStatus === 'rejected');
    const currentRoom = s.path[s.currentStep] || "Finish";

    document.getElementById('panel-name').innerText = s.name;
    document.getElementById('panel-room').innerText = isDone ? 'Pipeline Completed' : `Currently: ${currentRoom}`;

    const statusActionsDiv = document.getElementById('panel-status-actions');
    const adminActionsDiv = document.getElementById('panel-admin-actions');

    let historyHtml = `
        <div style="margin-bottom: 25px; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px solid var(--border);">
            <h4 style="margin-top:0; margin-bottom:15px; font-size:0.75rem; letter-spacing: 0.5px; color:var(--text-muted); text-transform:uppercase;">Interview Timeline</h4>
            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.9rem;">
    `;
    
    s.path.forEach((room, idx) => {
        let stepStatus = ''; let color = 'var(--text-muted)'; let icon = '⚪';
        if (isDone) {
            stepStatus = idx < s.currentStep ? 'Passed' : (idx === s.currentStep ? (s.status === 'rejected' ? 'Rejected' : 'Completed') : 'Skipped');
            color = idx <= s.currentStep ? 'var(--text-main)' : 'var(--text-muted)';
            icon = idx < s.currentStep ? '✅' : (idx === s.currentStep && s.status === 'rejected' ? '❌' : (idx === s.currentStep ? '✅' : '⚪'));
        } else {
            if (idx < s.currentStep) { stepStatus = 'Passed'; color = 'var(--success)'; icon = '✅'; } 
            else if (idx === s.currentStep) {
                stepStatus = currentStatus === 'waiting' ? 'Waiting' : (currentStatus === 'interviewing' ? 'Interviewing' : 'On Hold');
                color = 'var(--accent)'; icon = '👉';
            } else { stepStatus = 'Pending'; color = 'var(--text-muted)'; icon = '⚪'; }
        }
        
        historyHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="color:${color}; font-weight:${idx === s.currentStep && !isDone ? 'bold' : 'normal'};">${icon} &nbsp;${room}</span>
                <span style="font-size:0.7rem; font-weight: bold; text-transform: uppercase; background:rgba(0,0,0,0.04); padding:3px 8px; border-radius:6px; color:${color};">${stepStatus}</span>
            </div>
        `;
    });
    historyHtml += '</div></div>';

    let actionButtonsHtml = '';
    
    if (isDone) {
        let currentFinal = s.finalStatus || 'Pending';
        
        // Feature 3: Lock Final Verdict
        if (currentFinal !== 'Pending') {
            actionButtonsHtml = `
                <div style="text-align:center; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border);">
                    <span style="color:var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 700; display:block; margin-bottom: 5px;">Final Verdict</span>
                    <span style="color:var(--text-main); font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; display:block;">🔒 ${currentFinal}</span>
                    <span style="font-size: 0.75rem; color: var(--warning); display:block;">Locked. Use Rewrite Status to modify.</span>
                </div>`;
        } else {
            actionButtonsHtml = `
                <div style="text-align:center; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border);">
                    <span style="color:var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 700; display:block; margin-bottom: 5px;">Final Verdict</span>
                    <span style="color:var(--text-main); font-size: 1.2rem; font-weight: 800; margin-bottom: 15px; display:block;">Pending</span>
                    
                    <div style="display:flex; gap:8px; justify-content:center; width: 100%;">
                        <button type="button" class="btn-done" style="flex:1; padding:10px 5px !important; font-size:0.75rem !important;" onclick="saveFinalStatus(${index}, 'Selected');">🌟 Selected</button>
                        <button type="button" class="btn-del" style="flex:1; padding:10px 5px !important; font-size:0.75rem !important;" onclick="saveFinalStatus(${index}, 'Rejected');">❌ Rejected</button>
                        <button type="button" class="btn-primary" style="flex:1; padding:10px 5px !important; font-size:0.75rem !important; background:var(--warning); color:black;" onclick="saveFinalStatus(${index}, 'Put on Hold');">⏸️ Hold</button>
                    </div>
                </div>`;
        }
    } 
    else if (currentStatus === 'waiting') {
        actionButtonsHtml = `<button type="button" class="btn-call" onclick="sendAction(${index}, 'call');">📢 Call In to ${currentRoom}</button>`;
    } 
    else if (currentStatus === 'hold') {
        actionButtonsHtml = `<button type="button" class="btn-call" style="background:var(--success);" onclick="sendAction(${index}, 'call');">▶️ Resume in ${currentRoom}</button>`;
    } 
    else if (currentStatus === 'interviewing') {
        actionButtonsHtml = `
            <button type="button" class="btn-done" onclick="sendAction(${index}, 'pass');">✅ Mark Passed</button>
            <button type="button" class="btn-del" onclick="sendAction(${index}, 'fail');">👎 Mark Rejected</button>
            <button type="button" class="btn-primary" style="background:var(--warning); color:black;" onclick="sendAction(${index}, 'hold');">⏸️ Put on Hold</button>
        `;
    } else {
        actionButtonsHtml = `<div style="text-align:center; background: rgba(0,0,0,0.02); border-radius: 8px; color:var(--text-muted); font-size: 0.85rem; font-style:italic; padding: 15px;">Mark candidate present on dashboard to unlock actions.</div>`;
    }

    statusActionsDiv.innerHTML = historyHtml + actionButtonsHtml;
    
    // Feature 4: Added Rewrite Status Button
    adminActionsDiv.innerHTML = `
        <button type="button" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; margin-bottom: 10px;" onclick="openOverrideModal(${index}); closePanel();" onmouseover="this.style.background='var(--warning)'; this.style.color='white'" onmouseout="this.style.background='rgba(245, 158, 11, 0.1)'; this.style.color='var(--warning)'">🔄 Rewrite Status</button>
        <button type="button" style="background: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); width: 100%; margin-bottom: 10px;" onclick="editPath(${index}); closePanel();" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--surface-hover)'">✏️ Rewrite Room Path</button>
        <button type="button" style="background: rgba(255,0,0,0.05); color: var(--danger); border: 1px solid rgba(255,0,0,0.2); border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%;" onclick="remove(${index}); closePanel();" onmouseover="this.style.background='var(--danger)'; this.style.color='white'" onmouseout="this.style.background='rgba(255,0,0,0.05)'; this.style.color='var(--danger)'">✕ Remove from Pipeline</button>
    `;

    document.getElementById('panel-overlay').classList.remove('hidden');
    document.getElementById('control-panel').classList.remove('hidden');
}

function closePanel() {
    sessionStorage.removeItem('openPanelPRN'); 
    document.getElementById('panel-overlay').classList.add('hidden');
    document.getElementById('control-panel').classList.add('hidden');
}

// --- Rewrite Status Logic ---
let currentOverrideIndex = -1;

function openOverrideModal(index) {
    currentOverrideIndex = index;
    const s = globalQueueData[index];
    const targetSelect = document.getElementById('override-target');
    targetSelect.innerHTML = '';
    
    // Add all rooms in their path
    s.path.forEach((room, idx) => {
        targetSelect.innerHTML += `<option value="${idx}">Round ${idx + 1}: ${room}</option>`;
    });
    // Add Final Verdict option
    targetSelect.innerHTML += `<option value="final">Final Verdict</option>`;
    
    document.getElementById('override-modal').classList.remove('hidden');
}

function closeOverrideModal() {
    document.getElementById('override-modal').classList.add('hidden');
    currentOverrideIndex = -1;
}

async function submitOverride() {
    if (currentOverrideIndex === -1) return;
    
    const target = document.getElementById('override-target').value;
    const newStatus = document.getElementById('override-status').value;
    
    await fetch('/override-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: currentOverrideIndex, target, newStatus })
    });
    
    closeOverrideModal();
    await loadQueue();
    openPanel(currentOverrideIndex);
}

// --- Action API Calls ---
async function sendAction(i, action) {
    await fetch('/update-status', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ index: i, action }) }); 
    await loadQueue(); 
    
    if (!document.getElementById('control-panel').classList.contains('hidden')) {
        openPanel(i);
    }
}

async function saveFinalStatus(index, status) {
    await fetch('/update-final-status', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ index, finalStatus: status }) 
    });
    await loadQueue();
    setTimeout(() => openPanel(index), 100);
}

async function remove(i) { 
    const confirmDel = await showModal({ title: "Remove Candidate?", desc: "Are you sure you want to completely remove this candidate from the pipeline?", type: 'confirm', danger: true, confirmText: "Remove" });
    if(confirmDel) { await fetch(`/remove-student/${i}`, { method: 'DELETE' }); loadQueue(); } 
}

async function editPath(index) {
    const res = await fetch('/get-queue');
    const data = await res.json();
    const student = data[index];
    const currentPathString = student.path.join(', ');
    
    const newPath = await showModal({ title: `Edit Path: ${student.name}`, desc: "Update the interview rooms (comma separated):", type: 'prompt', defaultVal: currentPathString, confirmText: "Save Path" });
    if (newPath !== null && newPath.trim() !== "") {
        await fetch('/edit-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index, newPath }) });
        loadQueue();
    }
}

async function resetSystem() {
    const confirmFirst = await showModal({ title: "🚨 System Reset", desc: "Permanently delete ALL candidates and wipe the drive?", type: 'confirm', danger: true, confirmText: "Proceed" });
    if (confirmFirst) {
        const password = await showModal({ title: "Confirm Wipe", desc: "Type the word RESET to confirm:", type: 'prompt', danger: true, confirmText: "Wipe System" });
        if (password === 'RESET') { await fetch('/reset-all', { method: 'POST' }); loadQueue(); }
    }
}

function downloadExcel() { window.location.href = '/download-excel'; }

function filterQueue() {
    const query = document.getElementById('adminSearch').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#adminList tr');
    rows.forEach(row => {
        const nameCell = row.cells[1]; 
        if (nameCell) row.style.display = nameCell.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}

function toggleStats() {
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
        if (statsContainer.style.display === 'none') {
            statsContainer.style.display = 'block';
        } else {
            statsContainer.style.display = 'none';
        }
    }
}

const socket = io();
socket.on('queueUpdated', () => loadQueue());
let currentMode = 'confirmation';
let pendingData = null;

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('printArea').innerHTML = '';
    document.getElementById('printArea').style.display = 'none';
    document.getElementById('hoverPreview').style.display = 'none';
    
    const targetView = document.getElementById(viewId + 'View');
    if (targetView) targetView.style.display = 'block';
    
    if(viewId === 'history') loadHistory();
}

function openForm(mode) {
    currentMode = mode;
    showView('form');
    document.getElementById('formTitle').innerText = mode === 'confirmation' ? 'Booking Confirmation' : 'Final Bill';
    document.getElementById('refLookup').style.display = mode === 'bill' ? 'flex' : 'none';
    document.getElementById('addonsContainer').innerHTML = '';
    
    const history = JSON.parse(localStorage.getItem('flo_history') || '[]');
    document.getElementById('bookingId').value = `FLO${String(history.length + 1).padStart(3, '0')}`;

    // Reset Form Fields
    document.getElementById('guestName').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('pricePerNight').value = '';
    document.getElementById('advance').value = '';

    const cin = document.getElementById('checkin');
    const cout = document.getElementById('checkout');
    [cin, cout].forEach(el => el.removeEventListener('change', calculateNights));
    [cin, cout].forEach(el => el.addEventListener('change', calculateNights));
}

function calculateNights() {
    const cin = document.getElementById('checkin').value;
    const cout = document.getElementById('checkout').value;
    const display = document.getElementById('totalNightsDisplay');
    if (cin && cout) {
        const d1 = new Date(cin);
        const d2 = new Date(cout);
        if (d2 <= d1) {
            alert("Check-out must be after Check-in!");
            document.getElementById('checkout').value = '';
            display.value = "Total Nights: 0";
            return;
        }
        const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        display.value = `Total Nights: ${diff}`;
    }
}

function addNewRow() {
    const container = document.getElementById('addonsContainer');
    const rowCount = container.children.length + 1;
    const div = document.createElement('div'); 
    div.className = 'grid-2';
    div.style.marginBottom = "10px";
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:5px">
            <span style="font-size:10px; color:#aaa; min-width:45px">ADD-${String(rowCount).padStart(2, '0')}</span>
            <input placeholder="Item Name" class="addon-name">
        </div>
        <input type="number" placeholder="Price" class="addon-price">`;
    container.appendChild(div);
}

function fetchBookingDetails() {
    const id = document.getElementById('lookupRef').value.toUpperCase();
    const history = JSON.parse(localStorage.getItem('flo_history') || '[]');
    const data = history.find(i => i.bookingId === id);
    
    if(data) {
        document.getElementById('bookingId').value = data.bookingId;
        document.getElementById('prefix').value = data.prefix;
        document.getElementById('guestName').value = data.guestName;
        document.getElementById('phone').value = data.phone;
        document.getElementById('guestEmail').value = data.email === 'N/A' ? '' : data.email;
        document.getElementById('channel').value = data.channel || '';
        document.getElementById('checkin').value = data.checkin;
        document.getElementById('checkout').value = data.checkout;
        document.getElementById('totalNightsDisplay').value = `Total Nights: ${data.nights}`;
        document.getElementById('adults').value = data.adults;
        document.getElementById('children').value = data.children;
        document.getElementById('pricePerNight').value = data.price;
        document.getElementById('gst').value = data.gst;
        document.getElementById('advance').value = data.advance;
        document.getElementById('discount').value = data.discount;
        document.getElementById('paymentMode').value = data.paymentMode || 'Cash';
        
        const container = document.getElementById('addonsContainer');
        container.innerHTML = '';
        data.addons.forEach(ad => {
            const div = document.createElement('div'); div.className = 'grid-2';
            div.innerHTML = `<div style="display:flex; align-items:center; gap:5px"><span style="font-size:10px; color:#aaa; min-width:45px">${ad.id}</span><input value="${ad.name}" class="addon-name"></div><input type="number" value="${ad.price}" class="addon-price">`;
            container.appendChild(div);
        });
        alert("Found Guest: " + data.guestName);
    } else alert("Not found");
}

function processSubmission() {
    const phone = document.getElementById('phone').value.trim();
    if(phone.length !== 10) return alert("Phone must be 10 digits");

    let addons = [];
    document.querySelectorAll('#addonsContainer .grid-2').forEach((row, index) => {
        const name = row.querySelector('.addon-name').value;
        const price = parseFloat(row.querySelector('.addon-price').value) || 0;
        if(name) addons.push({ id: `ADD-${String(index + 1).padStart(2, '0')}`, name, price });
    });

    pendingData = {
        ref: "ID-" + Date.now(),
        type: currentMode,
        bookingDate: new Date().toLocaleDateString('en-GB'),
        prefix: document.getElementById('prefix').value,
        guestName: document.getElementById('guestName').value,
        phone: phone,
        email: document.getElementById('guestEmail').value || 'N/A',
        bookingId: document.getElementById('bookingId').value,
        channel: document.getElementById('channel').value,
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        nights: parseInt(document.getElementById('totalNightsDisplay').value.replace(/\D/g,'')) || 1,
        adults: parseInt(document.getElementById('adults').value) || 0,
        children: parseInt(document.getElementById('children').value) || 0,
        price: parseFloat(document.getElementById('pricePerNight').value) || 0,
        discount: parseFloat(document.getElementById('discount').value) || 0,
        advance: parseFloat(document.getElementById('advance').value) || 0,
        addons: addons,
        gst: parseFloat(document.getElementById('gst').value) || 0,
        paymentMode: document.getElementById('paymentMode').value
    };
    renderInvoice(pendingData);
}

function renderInvoice(data, isPreview = false, isReprint = false) {
    if(!isPreview) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById('printArea').style.display = 'block';
    }
    const target = isPreview ? document.getElementById('hoverPreview') : document.getElementById('printArea');
    
    const subTotal = (data.price + data.addons.reduce((s, i) => s + i.price, 0)) - data.discount;
    const gstAmt = (subTotal * data.gst) / 100;
    const grandTotal = subTotal + gstAmt;
    const balance = grandTotal - data.advance;

    let billingTable = '';
    if (data.type === 'bill') {
        billingTable = `
            <table class="inv-table">
                <tr><td>Base Stay</td><td align="right">₹${data.price.toFixed(2)}</td></tr>
                ${data.addons.map(a => `<tr><td>${a.name}</td><td align="right">₹${a.price.toFixed(2)}</td></tr>`).join('')}
                <tr style="color:green"><td>Discount</td><td align="right">-₹${data.discount.toFixed(2)}</td></tr>
                <tr><td>GST (${data.gst}%)</td><td align="right">₹${gstAmt.toFixed(2)}</td></tr>
                <tr style="border-top:2px solid #000"><td><b>Total</b></td><td align="right"><b>₹${grandTotal.toFixed(2)}</b></td></tr>
                <tr><td>Advance (${data.paymentMode})</td><td align="right">₹${data.advance.toFixed(2)}</td></tr>
                <tr style="border-top:1px solid #000"><td><b>GROSS AMOUNT</b><br><small>(${data.paymentMode})</small></td><td align="right"><b>₹${balance.toFixed(2)}</b></td></tr>
            </table>`;
    } else {
        billingTable = `
            <table class="inv-table">
                ${data.addons.map(a => `<tr><td>${a.name}</td><td align="right">₹${a.price.toFixed(2)}</td></tr>`).join('')}
                <tr style="border-top:1px solid #eee"><td><b>Advance Paid (${data.paymentMode})</b></td><td align="right"><b>₹${data.advance.toFixed(2)}</b></td></tr>
            </table>`;
    }

    target.innerHTML = `
        <div class="inv-box">
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid #eee; margin-bottom:15px">
                <h3 style="font-family:'Playfair Display',serif; letter-spacing:2px">THE FLO VILLA</h3>
                <div align="right"><b>${data.type.toUpperCase()}</b><br>${data.bookingId}</div>
            </div>
            <p>Guest: ${data.prefix} ${data.guestName} | ${data.phone}</p>
            <p>Stay: ${data.checkin} to ${data.checkout} (${data.nights} Nights)</p>
            ${billingTable}
            <div class="no-print" style="margin-top:20px; display:flex; gap:10px">
                <button class="btn-primary" onclick="${isReprint ? 'window.print()' : 'printAndSave()'}">Print</button>
                <button class="btn-outline" onclick="location.reload()">Back</button>
            </div>
        </div>`;
    
    if(isPreview) target.style.display = 'block';
}

function printAndSave() {
    const history = JSON.parse(localStorage.getItem('flo_history') || '[]');
    history.unshift(pendingData);
    localStorage.setItem('flo_history', JSON.stringify(history));
    window.print();
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem('flo_history') || '[]');
    const typeF = document.getElementById('filterType').value;
    const sortF = document.getElementById('sortBy').value;

    if(typeF !== 'all') history = history.filter(h => h.type === typeF);
    
    if(sortF === 'name') history.sort((a,b) => a.guestName.localeCompare(b.guestName));
    else if(sortF === 'id') history.sort((a,b) => a.bookingId.localeCompare(b.bookingId));
    else if(sortF === 'dateOld') history.sort((a,b) => new Date(a.checkin) - new Date(b.checkin));
    else history.sort((a,b) => b.ref.split('-')[1] - a.ref.split('-')[1]);

    const container = document.getElementById('historyContainer');
    container.innerHTML = history.map((h, i) => `
        <div class="history-item">
            <div style="line-height:1.4">
                <span style="font-size:9px; color:var(--gold); font-weight:800; text-transform:uppercase;">${h.type}</span><br>
                <b style="color:#000; font-size:15px">${h.bookingId} — ${h.guestName}</b><br>
                <small style="color:#888;">
                    <b>Booked:</b> ${h.bookingDate} | <b>Stay:</b> ${h.checkin}
                </small>
            </div>
            <div style="display:flex; gap:15px;">
                <button title="Print" onclick="renderInvoice(JSON.parse(localStorage.getItem('flo_history'))[${i}], false, true)" style="cursor:pointer; border:none; background:none; font-size:1.2rem;">🖨️</button>
                <button title="Delete" onclick="deleteHistory(${i})" style="cursor:pointer; border:none; background:none; font-size:1.2rem; color:#ff4d4d;">✕</button>
            </div>
        </div>
    `).join('') || '<div style="text-align:center; padding:40px; color:#999;">No records found.</div>';
}

function deleteHistory(i) {
    if(!confirm("Delete this record permanently?")) return;
    let history = JSON.parse(localStorage.getItem('flo_history') || '[]');
    history.splice(i, 1);
    localStorage.setItem('flo_history', JSON.stringify(history));
    loadHistory();
}

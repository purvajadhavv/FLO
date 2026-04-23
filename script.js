let invoiceCount = localStorage.getItem("invoiceCount") || 0;

function generateInvoice() {

  // Get values
  let name = document.getElementById("name").value;
  let checkin = document.getElementById("checkin").value;
  let checkout = document.getElementById("checkout").value;

  let room = +document.getElementById("room").value || 0;
  let food = +document.getElementById("food").value || 0;
  let other = +document.getElementById("other").value || 0;

  let gstPercent = +document.getElementById("gst").value || 0;
  let advance = +document.getElementById("advance").value || 0;

  // Invoice number
  invoiceCount++;
  localStorage.setItem("invoiceCount", invoiceCount);

  let invoiceNo = `INV-2026-${String(invoiceCount).padStart(3, '0')}`;

  // Calculations
  let subtotal = room + food + other;
  let gstAmount = subtotal * (gstPercent / 100);
  let total = subtotal + gstAmount;
  let balance = total - advance;

  // Display invoice
  let html = `
    <h3>My Hotel</h3>
    <p><b>Invoice No:</b> ${invoiceNo}</p>
    <p><b>Name:</b> ${name}</p>
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Check-out:</b> ${checkout}</p>

    <hr>

    <p>Room: ₹${room}</p>
    <p>Food: ₹${food}</p>
    <p>Other: ₹${other}</p>

    <p><b>Subtotal:</b> ₹${subtotal}</p>
    <p>GST (${gstPercent}%): ₹${gstAmount}</p>

    <p><b>Total:</b> ₹${total}</p>
    <p>Advance: ₹${advance}</p>

    <h3>Balance: ₹${balance}</h3>
  `;

  document.getElementById("invoice").innerHTML = html;

  // Save current data globally
  window.currentInvoice = {
    invoiceNo,
    name,
    checkin,
    checkout,
    room,
    food,
    other,
    gstPercent,
    advance,
    subtotal,
    gstAmount,
    total,
    balance
  };
}

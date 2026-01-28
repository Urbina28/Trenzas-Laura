import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBI9-YZJYiagoLeL_jeUrHO5H2KA1TH0Ts",
  authDomain: "trenzas-laura.firebaseapp.com",
  projectId: "trenzas-laura",
  storageBucket: "trenzas-laura.firebasestorage.app",
  messagingSenderId: "583936097017",
  appId: "1:583936097017:web:892a71bc63aa33f24a8028"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appointmentsCol = collection(db, 'citas');
let calendar;

// --- NAVEGACIÓN ---
window.showSection = (sectionId) => {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`sec-${sectionId}`);
    if (target) target.classList.remove('hidden');

    if(sectionId === 'list') loadAppointments();
    if(sectionId === 'resumen') calculateCorte('dia');
    if(sectionId === 'calendario') initCalendar();
};

// --- CÁLCULOS DE DINERO EN TIEMPO REAL ---
window.calcularRestante = () => {
    const total = parseFloat(document.getElementById('totalCost').value) || 0;
    const anticipo = parseFloat(document.getElementById('anticipo').value) || 0;
    const restante = total - anticipo;
    document.getElementById('monto-restante').innerText = `$${restante}`;
};

window.updatePaymentInfo = () => {
    const service = document.getElementById('serviceType').value;
    const manualDiv = document.getElementById('manual-payment-div');
    const emmaActive = document.getElementById('emma').checked;
    const sayActive = document.getElementById('say').checked;
    
    let pay = 0;
    if (service === 'trenzas') { pay = 250; manualDiv.classList.add('hidden'); }
    else if (service === 'retiro') { pay = 175; manualDiv.classList.add('hidden'); }
    else { 
        manualDiv.classList.remove('hidden');
        pay = parseFloat(document.getElementById('manualPay').value) || 0; 
    }

    document.getElementById('pay-emma').innerText = emmaActive ? `$${pay}` : '$0';
    document.getElementById('pay-say').innerText = sayActive ? `$${pay}` : '$0';
};

// --- GUARDAR CITA ---
document.getElementById('appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const service = document.getElementById('serviceType').value;
    const total = parseFloat(document.getElementById('totalCost').value) || 0;
    const anti = parseFloat(document.getElementById('anticipo').value) || 0;
    
    let payAmount = (service === 'peinado') 
        ? (parseFloat(document.getElementById('manualPay').value) || 0) 
        : (service === 'trenzas' ? 250 : 175);

    const docData = {
        cliente: document.getElementById('clientName').value,
        servicio: service,
        fecha: document.getElementById('appointmentDate').value,
        emma: document.getElementById('emma').checked,
        say: document.getElementById('say').checked,
        pagoTrabajador: payAmount,
        costoTotal: total,
        anticipo: anti,
        restante: total - anti,
        status: document.getElementById('status').value,
        timestamp: new Date()
    };

    try {
        await addDoc(appointmentsCol, docData);
        alert("¡Cita guardada con éxito!");
        document.getElementById('appointment-form').reset();
        document.getElementById('monto-restante').innerText = "$0";
        showSection('list');
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// --- CARGAR AGENDA (LISTA) ---
async function loadAppointments() {
    const container = document.getElementById('appointments-container');
    container.innerHTML = '<p style="text-align:center">Cargando agenda...</p>';
    
    const q = query(appointmentsCol, orderBy("fecha", "desc"));
    const snap = await getDocs(q);
    container.innerHTML = '';

    if(snap.empty) container.innerHTML = '<p style="text-align:center">No hay citas.</p>';

    snap.forEach(appointment => {
        const d = appointment.data();
        const id = appointment.id;
        const color = d.status === 'atendida' ? '#27ae60' : '#f39c12';
        
        const card = document.createElement('div');
        card.style = `border-left: 6px solid ${color}; padding: 12px; margin-bottom: 10px; background: white; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);`;
        card.innerHTML = `
            <span style="float:right; font-size:10px; color:${color}; font-weight:bold;">${(d.status || 'pendiente').toUpperCase()}</span>
            <strong style="color:#8e44ad; font-size:1.1rem;">${d.cliente}</strong><br>
            <small>📅 ${d.fecha.replace('T', ' ')}</small><br>
            <div style="background:#f9f9f9; padding:8px; border-radius:8px; margin: 5px 0; font-size:0.9rem;">
                <span style="color:#27ae60;">Total: $${d.costoTotal}</span> | 
                <span style="color:#f39c12;">Abonó: $${d.anticipo || 0}</span><br>
                <strong style="color:#e74c3c;">Resta: $${d.restante || 0}</strong>
            </div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                ${d.status !== 'atendida' ? `<button onclick="marcarAtendida('${id}')" style="flex:2; background:#27ae60; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold;">Finalizar ✅</button>` : ''}
                <button onclick="editarCita('${id}', '${d.cliente}', ${d.costoTotal})" style="flex:1; background:#3498db; color:white; border:none; border-radius:5px;">✎</button>
                <button onclick="eliminarCita('${id}')" style="flex:1; background:#e74c3c; color:white; border:none; border-radius:5px;">🗑</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- ACCIONES DE CITA ---
window.marcarAtendida = async (id) => {
    await updateDoc(doc(db, 'citas', id), { status: 'atendida', restante: 0 });
    loadAppointments();
};

window.eliminarCita = async (id) => {
    if(confirm("¿Eliminar esta cita permanentemente?")) {
        await deleteDoc(doc(db, 'citas', id));
        loadAppointments();
    }
};

window.editarCita = async (id, nombre, costo) => {
    const nN = prompt("Nombre de la clienta:", nombre);
    const nC = prompt("Costo total del servicio $:", costo);
    if(nN && nC) {
        await updateDoc(doc(db, 'citas', id), { cliente: nN, costoTotal: parseFloat(nC) });
        loadAppointments();
    }
};

// --- CORTE (DÍA Y MES) ---
window.calculateCorte = async (periodo) => {
    const snap = await getDocs(appointmentsCol);
    let vA = 0, vP = 0, e = 0, s = 0;
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];
    const mesAct = ahora.getMonth();
    const anioAct = ahora.getFullYear();

    snap.forEach(doc => {
        const d = doc.data();
        const fC = new Date(d.fecha);
        const fCStr = d.fecha.split('T')[0];

        let incluir = false;
        if (periodo === 'dia' && fCStr === hoy) incluir = true;
        if (periodo === 'mes' && fC.getMonth() === mesAct && fC.getFullYear() === anioAct) incluir = true;

        if (incluir) {
            if (d.status === 'atendida') {
                vA += (d.costoTotal || 0);
                if(d.emma) e += (d.pagoTrabajador || 0);
                if(d.say) s += (d.pagoTrabajador || 0);
            } else {
                vP += (d.restante || 0);
            }
        }
    });

    document.getElementById('corte-titulo').innerText = periodo === 'dia' ? "Corte de Hoy" : "Corte del Mes";
    document.getElementById('total-ventas').innerText = `$${vA}`;
    document.getElementById('total-pendiente').innerText = `$${vP}`;
    document.getElementById('total-emma').innerText = `$${e}`;
    document.getElementById('total-say').innerText = `$${s}`;
};

// --- CALENDARIO ---
async function initCalendar() {
    const snap = await getDocs(appointmentsCol);
    const eventos = snap.docs.map(doc => ({
        title: doc.data().cliente,
        start: doc.data().fecha,
        color: doc.data().status === 'atendida' ? '#27ae60' : '#ff6b9d'
    }));

    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
            initialView: 'dayGridMonth', locale: 'es', events: eventos, height: 'auto'
        });
        calendar.render();
    } else {
        calendar.removeAllEvents();
        calendar.addEventSource(eventos);
    }
}

// --- REPORTE WHATSAPP ---
window.exportarReporte = () => {
    const t = document.getElementById('corte-titulo').innerText;
    const v = document.getElementById('total-ventas').innerText;
    const e = document.getElementById('total-emma').innerText;
    const s = document.getElementById('total-say').innerText;
    const msg = `📊 ${t}\n💰 Cobrado: ${v}\n👩‍🦱 Emma: ${e}\n👩‍🦱 Say: ${s}\n📅 Generado: ${new Date().toLocaleDateString()}`;
    navigator.clipboard.writeText(msg);
    alert("Reporte copiado para WhatsApp ✅");
};

// --- SPLASH SCREEN ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }, 2000);
});

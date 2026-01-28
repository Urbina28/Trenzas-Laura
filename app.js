import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

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

// --- FUNCIÓN DE NAVEGACIÓN (FORZADA) ---
window.showSection = async (sectionId) => {
    // Ocultar todas las secciones
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    
    // Mostrar la elegida
    const target = document.getElementById(`sec-${sectionId}`);
    if (target) target.classList.remove('hidden');

    // Ejecutar lógica según la sección
    if (sectionId === 'list') {
        await loadAppointments();
    } else if (sectionId === 'resumen') {
        calculateCorte('dia');
    } else if (sectionId === 'calendario') {
        initCalendar();
    }
};

// --- CARGAR LISTA (CON CONTROL DE ERRORES) ---
async function loadAppointments() {
    const container = document.getElementById('appointments-container');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center;">Cargando citas...</p>';

    try {
        const q = query(appointmentsCol, orderBy("fecha", "desc"));
        const snap = await getDocs(q);
        container.innerHTML = '';

        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;">No hay citas registradas aún.</p>';
            return;
        }

        snap.forEach(appointment => {
            const d = appointment.data();
            const id = appointment.id;
            const color = d.status === 'atendida' ? '#27ae60' : '#f39c12';
            
            const card = document.createElement('div');
            card.style = `border-left: 6px solid ${color}; padding: 12px; margin-bottom: 10px; background: white; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position:relative;`;
            
            card.innerHTML = `
                <span style="float:right; font-size:10px; color:${color}; font-weight:bold; background:${color}15; padding:3px 8px; border-radius:10px;">
                    ${(d.status || 'pendiente').toUpperCase()}
                </span>
                <strong style="color:#8e44ad; font-size:1.1rem;">${d.cliente}</strong><br>
                <small>📅 ${d.fecha ? d.fecha.replace('T', ' ') : 'Sin fecha'}</small><br>
                <span>✨ ${d.servicio.toUpperCase()} ($${d.costoTotal})</span><br>
                
                <div style="margin-top:10px; display:flex; gap:5px;">
                    ${d.status !== 'atendida' ? `<button onclick="marcarAtendida('${id}')" style="flex:2; background:#27ae60; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">Finalizar ✅</button>` : ''}
                    <button onclick="editarCita('${id}', '${d.cliente}', ${d.costoTotal})" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">✎</button>
                    <button onclick="eliminarCita('${id}')" style="flex:1; background:#e74c3c; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">🗑</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
    }
}

// --- ACTUALIZAR PAGO PREVIO ---
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
    let payAmount = (service === 'peinado') ? (parseFloat(document.getElementById('manualPay').value) || 0) : (service === 'trenzas' ? 250 : 175);

    const docData = {
        cliente: document.getElementById('clientName').value,
        servicio: service,
        fecha: document.getElementById('appointmentDate').value,
        emma: document.getElementById('emma').checked,
        say: document.getElementById('say').checked,
        pagoTrabajador: payAmount,
        costoTotal: parseFloat(document.getElementById('totalCost').value),
        status: document.getElementById('status').value,
        timestamp: new Date()
    };

    try {
        await addDoc(appointmentsCol, docData);
        alert("¡Cita guardada!");
        document.getElementById('appointment-form').reset();
        window.showSection('list');
    } catch (err) {
        alert("Error al guardar: " + err.message);
    }
});

// --- FUNCIONES GLOBALES (ACCIONES) ---
window.marcarAtendida = async (id) => {
    await updateDoc(doc(db, 'citas', id), { status: 'atendida' });
    loadAppointments();
};

window.eliminarCita = async (id) => {
    if(confirm("¿Segura que quieres borrar esta cita?")) {
        await deleteDoc(doc(db, 'citas', id));
        loadAppointments();
    }
};

window.editarCita = async (id, nombre, costo) => {
    const nN = prompt("Nombre de la clienta:", nombre);
    const nC = prompt("Costo total $:", costo);
    if(nN && nC) {
        await updateDoc(doc(db, 'citas', id), { cliente: nN, costoTotal: parseFloat(nC) });
        loadAppointments();
    }
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

// --- CORTE ---
window.calculateCorte = async (periodo) => {
    const snap = await getDocs(appointmentsCol);
    let vA = 0, vP = 0, e = 0, s = 0;
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];

    snap.forEach(doc => {
        const d = doc.data();
        const fC = new Date(d.fecha);
        const fCStr = d.fecha.split('T')[0];
        let inc = (periodo === 'dia' && fCStr === hoy) || (periodo === 'mes' && fC.getMonth() === ahora.getMonth() && fC.getFullYear() === ahora.getFullYear());

        if (inc) {
            if (d.status === 'atendida') {
                vA += d.costoTotal;
                if(d.emma) e += d.pagoTrabajador;
                if(d.say) s += d.pagoTrabajador;
            } else { vP += d.costoTotal; }
        }
    });

    document.getElementById('corte-titulo').innerText = periodo === 'dia' ? "Corte de Hoy" : "Corte del Mes";
    document.getElementById('total-ventas').innerText = `$${vA}`;
    document.getElementById('total-pendiente').innerText = `$${vP}`;
    document.getElementById('total-emma').innerText = `$${e}`;
    document.getElementById('total-say').innerText = `$${s}`;
};

// --- EXPORTAR ---
window.exportarReporte = () => {
    const v = document.getElementById('total-ventas').innerText;
    const emma = document.getElementById('total-emma').innerText;
    const say = document.getElementById('total-say').innerText;
    const msg = `📊 Corte Laura Urbina\n💰 Total Cobrado: ${v}\n👩‍🦱 Emma: ${emma}\n👩‍🦱 Say: ${say}`;
    navigator.clipboard.writeText(msg);
    alert("Reporte copiado.");
};

// --- QUITAR SPLASH ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }, 2000);
});

// ==========================================
// AGRIMAP - SCRIPT UTAMA
// ==========================================
// Database petani dimuat dari data.js sebelum file ini.
// ==========================================


// ==========================================
// 1. PENYIMPANAN DATA
// ==========================================

const STORAGE_KEY = "agrimapFarmers";

function loadFarmers() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (!Array.isArray(saved)) {
            return initialFarmers.map(f => ({ ...f }));
        }

        // Data yang tersimpan akan menggantikan data awal
        // jika memiliki ID yang sama.
        const merged = initialFarmers.map(original => {
            const old = saved.find(f => f.id === original.id);
            return old ? { ...original, ...old } : { ...original };
        });

        // Tambahkan petani baru yang tidak ada di database awal.
        const additional = saved.filter(
            f => !initialFarmers.some(original => original.id === f.id)
        );

        return merged.concat(additional);

    } catch (error) {
        console.error("Gagal membaca data petani:", error);
        return initialFarmers.map(f => ({ ...f }));
    }
}

let farmers = loadFarmers();
let currentFarmer = null;
let editingId = null;

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(farmers));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        alert("Data gagal disimpan. Periksa penyimpanan browser Anda.");
        return false;
    }
}


// ==========================================
// 2. FORMAT DATA
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function rupiah(value) {
    return "Rp" + Number(value || 0).toLocaleString("id-ID");
}

function numberFormat(value) {
    return Number(value || 0).toLocaleString("id-ID");
}

function infoItem(label, value) {
    return `
        <div class="info-item">
            <small>${escapeHTML(label)}</small>
            <h3>${escapeHTML(value ?? "-")}</h3>
        </div>
    `;
}

function formatRupiahGrafik(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}


// ==========================================
// 3. WARNA PETAK LAHAN
// ==========================================

const parcelColors = {
    P0: "#e74c3c",
    P1: "#3498db",
    P2: "#2ecc71",
    P3: "#e6ad25",
    P4: "#9b59b6"
};

function getColor(kode) {
    const key = String(kode || "").toUpperCase();

    if (parcelColors[key]) {
        return parcelColors[key];
    }

    const match = key.match(/^P(\d+)$/);

    return match
        ? `hsl(${(Number(match[1]) * 47) % 360},60%,42%)`
        : "#176b3a";
}


// ==========================================
// 4. LOGIN DAN LOGOUT
// ==========================================

document.getElementById("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    login();
});

function login() {
    const username = document.getElementById("loginId").value
        .trim()
        .toLowerCase();

    const password = document.getElementById("loginPassword").value;

    // Login admin demo
    if (username === "admin" && password === "admin123") {
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("adminPage").classList.remove("hidden");
        document.getElementById("farmerPage").classList.add("hidden");
        document.getElementById("logoutButton").classList.remove("hidden");

        renderFarmers();
        return;
    }

    // Login petani
    const farmer = farmers.find(f =>
        String(f.username || "").trim().toLowerCase() === username &&
        String(f.password || "") === password
    );

    if (!farmer) {
        alert("Username atau password salah!");
        return;
    }

    if (farmer.status === "Nonaktif") {
        alert("Akun Anda sedang nonaktif. Silakan hubungi admin.");
        return;
    }

    currentFarmer = farmer;

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("adminPage").classList.add("hidden");
    document.getElementById("farmerPage").classList.remove("hidden");
    document.getElementById("logoutButton").classList.remove("hidden");

    renderFarmerDashboard();
}

function logout() {
    currentFarmer = null;

    document.getElementById("adminPage").classList.add("hidden");
    document.getElementById("farmerPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("logoutButton").classList.add("hidden");

    document.getElementById("loginForm").reset();

    resetForm();
}


// ==========================================
// 5. FORM TAMBAH DAN EDIT PETANI
// ==========================================

const fields = {
    id: "newId",
    username: "newUsername",
    name: "newName",
    location: "newLocation",
    area: "newArea",
    crop: "newCrop",
    variety: "newVariety",
    spacing: "newSpacing",
    plants: "newPlants",
    age: "newAge",
    planting: "newPlanting",
    firstHarvest: "newFirstHarvest",
    lastHarvest: "newLastHarvest",
    seedCost: "newSeedCost",
    ph: "newPH",
    production: "newProduction",
    frequency: "newFrequency",
    price: "newPrice",
    hpp: "newHPP",
    profit: "newProfit",
    partner: "newPartner",
    status: "newStatus",
    lat: "newLat",
    lng: "newLng"
};

function getInput(id) {
    return document.getElementById(id).value.trim();
}

document.getElementById("farmerForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = getInput("newId");
    const username = getInput("newUsername");
    const name = getInput("newName");
    const area = Number(getInput("newArea"));

    const latValue = getInput("newLat");
    const lngValue = getInput("newLng");

    const lat = latValue === "" ? null : Number(latValue);
    const lng = lngValue === "" ? null : Number(lngValue);

    // Validasi identitas dan luas lahan
    if (!id || !username || !name || !Number.isFinite(area) || area <= 0) {
        alert("Lengkapi data identitas dan luas lahan dengan benar.");
        return;
    }

    // Validasi koordinat
    if ((lat === null) !== (lng === null)) {
        alert("Latitude dan longitude harus diisi berpasangan.");
        return;
    }

    if (
        lat !== null &&
        (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        )
    ) {
        alert("Koordinat tidak valid.");
        return;
    }

    // Validasi ID
    const duplicateId = farmers.some(f =>
        String(f.id).toLowerCase() === id.toLowerCase() &&
        f.id !== editingId
    );

    if (duplicateId) {
        alert("ID petani sudah digunakan.");
        return;
    }

    // Validasi username
    const duplicateUsername = farmers.some(f =>
        String(f.username).toLowerCase() === username.toLowerCase() &&
        f.id !== editingId
    );

    if (duplicateUsername) {
        alert("Username sudah digunakan.");
        return;
    }

    const old = editingId
        ? farmers.find(f => f.id === editingId)
        : null;

    const password = getInput("newPassword");

    if (!old && !password) {
        alert("Masukkan password petani.");
        return;
    }

    if (password && password.length < 6) {
        alert("Password minimal 6 karakter.");
        return;
    }

    // Membaca seluruh input
    const farmer = {};

    Object.entries(fields).forEach(([key, inputId]) => {
        const value = getInput(inputId);

        const numericFields = [
            "area", "plants", "age", "seedCost", "ph",
            "production", "frequency", "price", "hpp", "profit"
        ];

        if (numericFields.includes(key)) {
            farmer[key] = value === "" ? 0 : Number(value);
        } else if (key === "lat" || key === "lng") {
            farmer[key] = value === "" ? null : Number(value);
        } else {
            farmer[key] = value;
        }
    });

    farmer.password = password || old?.password || "";
    farmer.kode = old?.kode || "";

    if (editingId) {
        const index = farmers.findIndex(f => f.id === editingId);

        if (index === -1) {
            alert("Data petani tidak ditemukan.");
            return;
        }

        farmers[index] = farmer;

        if (currentFarmer?.id === editingId) {
            currentFarmer = farmer;
        }

        alert("Data petani berhasil diperbarui.");

    } else {
        farmers.push(farmer);
        alert("Data petani berhasil ditambahkan.");
    }

    if (saveData()) {
        resetForm();
        renderFarmers();
    }
});

function resetForm() {
    document.getElementById("farmerForm").reset();

    editingId = null;

    document.getElementById("formTitle").innerText = "Tambah Data Petani";
    document.getElementById("saveButton").innerText = "Simpan Data";
    document.getElementById("cancelButton").classList.add("hidden");
}

function editFarmer(id) {
    const farmer = farmers.find(f => f.id === id);

    if (!farmer) {
        alert("Data petani tidak ditemukan.");
        return;
    }

    editingId = id;

    Object.entries(fields).forEach(([key, inputId]) => {
        document.getElementById(inputId).value = farmer[key] ?? "";
    });

    document.getElementById("newPassword").value = "";
    document.getElementById("formTitle").innerText = "Edit Data Petani";
    document.getElementById("saveButton").innerText = "Perbarui Data";
    document.getElementById("cancelButton").classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function deleteFarmer(id) {
    const farmer = farmers.find(f => f.id === id);

    if (!farmer) {
        alert("Data petani tidak ditemukan.");
        return;
    }

    if (!confirm(`Yakin ingin menghapus data ${farmer.name}?`)) {
        return;
    }

    farmers = farmers.filter(f => f.id !== id);

    if (currentFarmer?.id === id) {
        currentFarmer = null;

        document.getElementById("farmerPage").classList.add("hidden");
        document.getElementById("loginPage").classList.remove("hidden");
        document.getElementById("logoutButton").classList.add("hidden");
    }

    if (saveData()) {
        renderFarmers();
        alert("Data berhasil dihapus.");
    }
}


// ==========================================
// 6. TABEL DATA DAN STATISTIK PETANI
// ==========================================

function renderFarmers() {
    const search = (
        document.getElementById("searchFarmer")?.value || ""
    ).toLowerCase();

    const filtered = farmers.filter(f =>
        [f.id, f.username, f.name, f.location].some(value =>
            String(value || "").toLowerCase().includes(search)
        )
    );

    document.getElementById("farmerTable").innerHTML = filtered.map(f => `
        <tr>
            <td>${escapeHTML(f.id)}</td>
            <td>${escapeHTML(f.username)}</td>
            <td>${escapeHTML(f.name)}</td>
            <td>${escapeHTML(f.location)}</td>
            <td>${numberFormat(f.area)} ha</td>
            <td>${escapeHTML(f.crop)}</td>
            <td>${escapeHTML(f.variety)}</td>
            <td>${numberFormat(f.plants)} pohon</td>
            <td><span class="badge">${escapeHTML(f.status)}</span></td>
            <td>
                <button class="btn-edit" data-action="edit" data-id="${escapeHTML(f.id)}">Edit</button>
                <button class="btn-danger" data-action="delete" data-id="${escapeHTML(f.id)}">Hapus</button>
            </td>
        </tr>
    `).join("");

    // Statistik keseluruhan
    document.getElementById("totalFarmers").innerText =
        numberFormat(farmers.length);

    document.getElementById("totalArea").innerText =
        farmers.reduce((sum, f) => sum + Number(f.area || 0), 0).toFixed(2);

    document.getElementById("totalCrops").innerText =
        new Set(farmers.map(f => f.crop).filter(Boolean)).size;

    document.getElementById("totalPlants").innerText =
        numberFormat(farmers.reduce((sum, f) => sum + Number(f.plants || 0), 0));

    document.getElementById("totalProduction").innerText =
        numberFormat(farmers.reduce((sum, f) => sum + Number(f.production || 0), 0));

    document.getElementById("totalProfit").innerText =
        rupiah(farmers.reduce((sum, f) => sum + Number(f.profit || 0), 0));

    renderProduction();

    if (!document.getElementById("adminProduction").classList.contains("hidden")) {
        renderOmzetChart();
    }
}

// Event tombol edit dan hapus menggunakan event delegation.
document.getElementById("farmerTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
        editFarmer(id);
    }

    if (button.dataset.action === "delete") {
        deleteFarmer(id);
    }
});

// Pencarian data petani
document.getElementById("searchFarmer").addEventListener("input", renderFarmers);

function renderProduction() {
    document.getElementById("productionTable").innerHTML = farmers.map(f => `
        <tr>
            <td>${escapeHTML(f.name)}</td>
            <td>${numberFormat(f.production)} kg</td>
            <td>${numberFormat(f.frequency)} kali</td>
            <td>${rupiah(f.price)}</td>
            <td>${rupiah(f.hpp)}</td>
            <td>${rupiah(f.profit)}</td>
            <td>${escapeHTML(f.partner)}</td>
        </tr>
    `).join("");
}


// ==========================================
// 7. MANAJEMEN AKUN DAN PASSWORD
// ==========================================

function renderAccounts() {
    const search = (
        document.getElementById("searchAccount")?.value || ""
    ).toLowerCase();

    const filtered = farmers.filter(f =>
        [f.id, f.name, f.username].some(value =>
            String(value || "").toLowerCase().includes(search)
        )
    );

    document.getElementById("accountTable").innerHTML = filtered.map(f => `
        <tr>
            <td>${escapeHTML(f.id)}</td>
            <td>${escapeHTML(f.name)}</td>
            <td>${escapeHTML(f.username)}</td>
            <td>
                <span id="password-${escapeHTML(f.id)}">••••••••</span>
                <button class="btn-edit" data-action="toggle-password" data-id="${escapeHTML(f.id)}">Lihat</button>
            </td>
            <td><span class="badge">${escapeHTML(f.status)}</span></td>
            <td>
                <button class="btn-edit" data-action="change-password" data-id="${escapeHTML(f.id)}">Ganti Password</button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("accountTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "toggle-password") {
        togglePassword(id);
    }

    if (button.dataset.action === "change-password") {
        changeFarmerPassword(id);
    }
});

document.getElementById("searchAccount").addEventListener("input", renderAccounts);

function togglePassword(id) {
    const farmer = farmers.find(f => f.id === id);

    if (!farmer) return;

    const element = document.getElementById("password-" + id);

    if (!element) return;

    if (element.dataset.visible === "true") {
        element.innerText = "••••••••";
        element.dataset.visible = "false";
    } else {
        element.innerText = farmer.password || "-";
        element.dataset.visible = "true";
    }
}

function changeFarmerPassword(id) {
    const farmer = farmers.find(f => f.id === id);

    if (!farmer) {
        alert("Akun petani tidak ditemukan.");
        return;
    }

    const newPassword = prompt(
        "Masukkan password baru untuk " + farmer.name
    );

    if (newPassword === null) return;

    if (newPassword.trim().length < 6) {
        alert("Password minimal 6 karakter.");
        return;
    }

    farmer.password = newPassword.trim();

    if (saveData()) {
        renderAccounts();
        alert("Password akun " + farmer.name + " berhasil diperbarui.");
    }
}


// ==========================================
// 8. GRAFIK OMZET DAN LABA
// ==========================================

let omzetChart = null;
let labaChart = null;

function renderOmzetChart() {
    const omzetCanvas = document.getElementById("omzetChart");
    const labaCanvas = document.getElementById("labaChart");

    if (!omzetCanvas || !labaCanvas) return;

    if (typeof Chart === "undefined") {
        console.error("Chart.js belum berhasil dimuat.");
        return;
    }

    const labels = farmers.map(f => f.name);

    const omzetData = farmers.map(f =>
        Number(f.production || 0) * Number(f.price || 0)
    );

    const labaData = farmers.map(f => Number(f.profit || 0));

    const totalOmzet = omzetData.reduce((a, b) => a + b, 0);

    const rataOmzet = farmers.length
        ? totalOmzet / farmers.length
        : 0;

    const indexTertinggi = omzetData.length
        ? omzetData.indexOf(Math.max(...omzetData))
        : -1;

    document.getElementById("chartTotalOmzet").textContent =
        formatRupiahGrafik(totalOmzet);

    document.getElementById("chartOmzetTertinggi").textContent =
        formatRupiahGrafik(indexTertinggi >= 0 ? omzetData[indexTertinggi] : 0);

    document.getElementById("chartNamaTertinggi").textContent =
        indexTertinggi >= 0 ? farmers[indexTertinggi].name : "-";

    document.getElementById("chartRataOmzet").textContent =
        formatRupiahGrafik(rataOmzet);

    if (omzetChart) {
        omzetChart.destroy();
    }

    if (labaChart) {
        labaChart.destroy();
    }

    omzetChart = new Chart(omzetCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Omzet Bulanan",
                data: omzetData,
                backgroundColor: "#176b3a",
                borderRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context =>
                            "Omzet: " + formatRupiahGrafik(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value =>
                            "Rp" + (value / 1000000) + " juta"
                    }
                }
            }
        }
    });

    labaChart = new Chart(labaCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Laba Kotor Bulanan",
                data: labaData,
                backgroundColor: "#2e9d62",
                borderRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context =>
                            "Laba: " + formatRupiahGrafik(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value =>
                            "Rp" + (value / 1000000) + " juta"
                    }
                }
            }
        }
    });
}


// ==========================================
// 9. MENU ADMIN
// ==========================================

function showAdminTab(tab, button) {
    document.getElementById("adminData")
        .classList.toggle("hidden", tab !== "data");

    document.getElementById("adminMap")
        .classList.toggle("hidden", tab !== "peta");

    document.getElementById("adminProduction")
        .classList.toggle("hidden", tab !== "produksi");

    document.getElementById("adminPassword")
        .classList.toggle("hidden", tab !== "password");

    document.querySelectorAll("#adminPage .menu button")
        .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    if (tab === "peta") {
        setTimeout(renderAdminMap, 200);
    }

    if (tab === "produksi") {
        renderProduction();
        setTimeout(renderOmzetChart, 150);
    }

    if (tab === "password") {
        renderAccounts();
    }
}


// ==========================================
// 10. GEOJSON DAN PENCARIAN PETAK
// ==========================================

let geoJsonData = null;

async function getGeoJsonData() {
    if (geoJsonData) return geoJsonData;

    const response = await fetch("./data/petak_lahan_petani.geojson");

    if (!response.ok) {
        throw new Error("File petak_lahan_petani.geojson tidak ditemukan.");
    }

    const data = await response.json();

    if (
        data.type !== "FeatureCollection" ||
        !Array.isArray(data.features)
    ) {
        throw new Error("Format GeoJSON tidak valid.");
    }

    // Memuat GeoJSON tambahan jika tersedia.
    try {
        const extra = await fetch("./data/petak_lahan_petani_baru.geojson");

        if (extra.ok) {
            const more = await extra.json();

            if (
                more.type === "FeatureCollection" &&
                Array.isArray(more.features)
            ) {
                data.features = data.features.concat(more.features);
            }
        }
    } catch (error) {
        console.warn("GeoJSON tambahan tidak dimuat:", error);
    }

    geoJsonData = data;

    return data;
}

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function getFeatureKode(feature) {
    const properties = feature.properties || {};

    return (
        properties.kode ??
        properties.kode_petak ??
        properties.id_petak ??
        properties.KODE ??
        ""
    );
}

function getFeatureNama(feature) {
    const properties = feature.properties || {};

    return (
        properties.nama_petani ??
        properties.nama ??
        properties.pemilik ??
        properties.owner ??
        ""
    );
}

function findFarmerByFeature(feature) {
    const properties = feature.properties || {};

    const kode = normalizeText(getFeatureKode(feature));
    const nama = normalizeText(getFeatureNama(feature));

    const id = normalizeText(
        properties.id_anggota ??
        properties.id_petani ??
        ""
    );

    return farmers.find(f =>
        (kode && normalizeText(f.kode) === kode) ||
        (nama && normalizeText(f.name) === nama) ||
        (id && normalizeText(f.id) === id)
    ) || null;
}

function geoJsonStyle(feature) {
    const farmer = findFarmerByFeature(feature);
    const kode = farmer?.kode || getFeatureKode(feature);
    const color = getColor(kode);

    return {
        color,
        weight: 3,
        fillColor: color,
        fillOpacity: 0.45
    };
}

function geoJsonPopup(feature) {
    const properties = feature.properties || {};
    const farmer = findFarmerByFeature(feature);

    const luasHa = properties.luas_ha ?? farmer?.area ?? "-";

    const luasM2 = properties.luas_m2 ??
        (farmer ? Number(farmer.area) * 10000 : "-");

    return `
        <div style="min-width:230px">
            <h3 style="color:#176b3a;margin-bottom:8px">
                ${escapeHTML(farmer?.name || getFeatureNama(feature) || "Petak Lahan")}
            </h3>
            <hr>
            <b>ID Anggota:</b> ${escapeHTML(farmer?.id || properties.id_anggota || "-")}<br>
            <b>Kode Petak:</b> ${escapeHTML(getFeatureKode(feature) || "-")}<br>
            <b>Luas:</b> ${escapeHTML(luasHa)} Ha<br>
            <b>Luas m²:</b> ${
                typeof luasM2 === "number"
                    ? numberFormat(luasM2)
                    : escapeHTML(luasM2)
            } m²<br>
            <b>Username:</b> ${escapeHTML(farmer?.username || "-")}<br>
            <b>Komoditas:</b> ${escapeHTML(farmer?.crop || "-")}<br>
            <b>Varietas:</b> ${escapeHTML(farmer?.variety || "-")}<br>
            <b>Produksi:</b> ${numberFormat(farmer?.production)} kg/bulan<br>
            <b>pH Tanah:</b> ${escapeHTML(farmer?.ph ?? "-")}<br>
            <b>Status:</b> ${escapeHTML(farmer?.status || "-")}
        </div>
    `;
}


// ==========================================
// 11. PETA LEAFLET
// ==========================================

function createMap(elementId) {
    const map = L.map(elementId);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap"
        }
    ).addTo(map);

    return map;
}


// ==========================================
// 12. PETA ADMIN
// ==========================================

let adminMap = null;
let adminGeoJsonLayer = null;

function renderLegend() {
    document.getElementById("adminLegend").innerHTML = farmers.map(f => `
        <div class="legend-item">
            <span class="legend-color" style="background:${getColor(f.kode)}"></span>
            ${escapeHTML(f.name)}
        </div>
    `).join("");
}

async function renderAdminMap() {
    const status = document.getElementById("mapStatus");

    if (!adminMap) {
        adminMap = createMap("mapAdmin");
    }

    setTimeout(() => adminMap.invalidateSize(), 100);

    try {
        status.innerText = "Memuat petak lahan...";

        const data = await getGeoJsonData();

        if (adminGeoJsonLayer) {
            adminMap.removeLayer(adminGeoJsonLayer);
        }

        adminGeoJsonLayer = L.geoJSON(data, {
            style: geoJsonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(geoJsonPopup(feature));
            }
        }).addTo(adminMap);

        const bounds = adminGeoJsonLayer.getBounds();

        if (bounds.isValid()) {
            adminMap.fitBounds(bounds, {
                padding: [30, 30]
            });
        } else {
            adminMap.setView([0.5, 117.15], 8);
        }

        const luas = data.features.reduce((sum, feature) => {
            const farmer = findFarmerByFeature(feature);

            return sum + Number(
                feature.properties?.luas_ha ??
                farmer?.area ??
                0
            );
        }, 0);

        status.innerText =
            `Berhasil memuat ${data.features.length} petak. ` +
            `Total luas teridentifikasi: ${luas.toFixed(2)} hektare.`;

        renderLegend();

        setTimeout(() => adminMap.invalidateSize(), 200);

    } catch (error) {
        console.error(error);
        status.innerText = "Gagal memuat peta: " + error.message;
    }
}


// ==========================================
// 13. DASHBOARD PETANI
// ==========================================

function renderFarmerDashboard() {
    const farmer = currentFarmer;

    if (!farmer) return;

    document.getElementById("welcomeName").innerText =
        "Selamat Datang, " + farmer.name;

    const details = [
        ["ID Anggota", farmer.id],
        ["Username", farmer.username],
        ["Nama Petani", farmer.name],
        ["Wilayah Lahan", farmer.location],
        ["Luas Lahan", farmer.area + " Hektare"],
        ["Komoditas", farmer.crop],
        ["Varietas", farmer.variety],
        ["Jarak Tanam", farmer.spacing],
        ["Status", farmer.status]
    ];

    document.getElementById("farmerDetails").innerHTML =
        details.map(item => infoItem(item[0], item[1])).join("");

    const cultivation = [
        ["Jadwal Tanam", farmer.planting],
        ["Panen Pertama", farmer.firstHarvest],
        ["Panen Terakhir", farmer.lastHarvest],
        ["Jumlah Tanaman", numberFormat(farmer.plants) + " pohon"],
        ["Umur Tanaman", farmer.age + " bulan"],
        ["Biaya Bibit", rupiah(farmer.seedCost)],
        ["pH Tanah", farmer.ph ?? "-"],
        ["Jarak Tanam", farmer.spacing]
    ];

    document.getElementById("cultivationDetails").innerHTML =
        cultivation.map(item => infoItem(item[0], item[1])).join("");

    document.getElementById("myProduction").innerText =
        numberFormat(farmer.production);

    document.getElementById("myHPP").innerText =
        rupiah(farmer.hpp);

    document.getElementById("myProfit").innerText =
        rupiah(farmer.profit);

    const finance = [
        ["Frekuensi Panen", farmer.frequency + " kali/bulan"],
        ["Harga Jual per Kg", rupiah(farmer.price)],
        ["Produksi per Bulan", numberFormat(farmer.production) + " kg"],
        ["HPP per Bulan", rupiah(farmer.hpp)],
        ["Laba Kotor per Bulan", rupiah(farmer.profit)],
        ["Mitra Pemasaran", farmer.partner]
    ];

    document.getElementById("financialDetails").innerHTML =
        finance.map(item => infoItem(item[0], item[1])).join("");

    renderAnalysis();
    renderSolutions();
}


// ==========================================
// 14. MENU PETANI
// ==========================================

function showFarmerTab(tab, button) {
    const tabs = [
        "profil",
        "budidaya",
        "keuangan",
        "peta",
        "analisis",
        "solusi"
    ];

    tabs.forEach(name => {
        const id = "farmer" +
            name.charAt(0).toUpperCase() +
            name.slice(1);

        document.getElementById(id)
            .classList.toggle("hidden", name !== tab);
    });

    document.querySelectorAll("#farmerPage .menu button")
        .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    if (tab === "peta") {
        setTimeout(renderFarmerMap, 200);
    }
}


// ==========================================
// 15. PETA PETANI
// ==========================================

let farmerMap = null;
let farmerGeoJsonLayer = null;
let farmerCoordinateMarker = null;

async function renderFarmerMap() {
    if (!currentFarmer) return;

    const farmer = currentFarmer;
    const status = document.getElementById("farmerMapStatus");

    if (!farmerMap) {
        farmerMap = createMap("mapFarmer");
    }

    setTimeout(() => farmerMap.invalidateSize(), 100);

    try {
        status.innerText = "Memuat petak lahan Anda...";

        const data = await getGeoJsonData();

        const matchingFeatures = data.features.filter(feature => {
            const foundFarmer = findFarmerByFeature(feature);
            return foundFarmer && foundFarmer.id === farmer.id;
        });

        if (farmerGeoJsonLayer) {
            farmerMap.removeLayer(farmerGeoJsonLayer);
            farmerGeoJsonLayer = null;
        }

        if (farmerCoordinateMarker) {
            farmerMap.removeLayer(farmerCoordinateMarker);
            farmerCoordinateMarker = null;
        }

        if (matchingFeatures.length === 0) {
            status.innerText =
                "Petak GeoJSON belum ditemukan. Menampilkan koordinat lahan jika tersedia.";

            const hasCoordinates =
                farmer.lat !== null &&
                farmer.lat !== "" &&
                farmer.lng !== null &&
                farmer.lng !== "" &&
                Number.isFinite(Number(farmer.lat)) &&
                Number.isFinite(Number(farmer.lng));

            if (hasCoordinates) {
                const position = [
                    Number(farmer.lat),
                    Number(farmer.lng)
                ];

                farmerMap.setView(position, 16);

                farmerCoordinateMarker = L.marker(position)
                    .addTo(farmerMap)
                    .bindPopup(`
                        <b>${escapeHTML(farmer.name)}</b><br>
                        ${escapeHTML(farmer.location)}<br>
                        Luas: ${escapeHTML(farmer.area)} Ha
                    `);

                status.innerText =
                    "Koordinat lahan petani berhasil ditampilkan. " +
                    "Batas petak GeoJSON belum ditemukan.";
            } else {
                farmerMap.setView([0.5, 117.15], 8);

                status.innerText =
                    "Data petak dan koordinat lahan belum tersedia.";
            }

            return;
        }

        farmerGeoJsonLayer = L.geoJSON(
            {
                type: "FeatureCollection",
                features: matchingFeatures
            },
            {
                style: geoJsonStyle,
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(geoJsonPopup(feature));
                }
            }
        ).addTo(farmerMap);

        farmerMap.fitBounds(
            farmerGeoJsonLayer.getBounds(),
            { padding: [30, 30] }
        );

        status.innerText =
            "Petak lahan " + farmer.name + " berhasil ditampilkan.";

        setTimeout(() => farmerMap.invalidateSize(), 200);

    } catch (error) {
        console.error(error);
        status.innerText = "Gagal memuat peta: " + error.message;
    }
}


// ==========================================
// 16. ANALISIS LAHAN PERTANIAN
// ==========================================

function renderAnalysis() {
    const farmer = currentFarmer;

    if (!farmer) return;

    let phText = "Belum tersedia";
    const phValue = farmer.ph;

    // Memastikan nilai pH benar-benar tersedia.
    if (
        phValue !== null &&
        phValue !== undefined &&
        phValue !== "" &&
        Number.isFinite(Number(phValue)) &&
        Number(phValue) >= 0 &&
        Number(phValue) <= 14
    ) {
        const ph = Number(phValue);

        if (ph < 5.5) {
            phText = "Cenderung masam";
        } else if (ph <= 7) {
            phText = "Berada pada kisaran agak masam hingga netral";
        } else {
            phText = "Cenderung alkalis";
        }
    }

    document.getElementById("analysisContent").innerHTML = `
        <div class="solution">
            <h3>Identitas Komoditas</h3>
            <p>
                Komoditas <b>${escapeHTML(farmer.crop)}</b>,
                varietas <b>${escapeHTML(farmer.variety)}</b>.
            </p>
        </div>

        <div class="solution">
            <h3>Luas dan Populasi Tanaman</h3>
            <p>
                Luas lahan ${numberFormat(farmer.area)} hektare
                dengan populasi ${numberFormat(farmer.plants)} pohon.
            </p>
        </div>

        <div class="solution">
            <h3>Karakteristik pH Tanah</h3>
            <p>
                Nilai pH <b>${escapeHTML(phValue ?? "Belum tersedia")}</b>.
                Tanah ${escapeHTML(phText)}.
            </p>
        </div>

        <div class="solution">
            <h3>Potensi Produksi</h3>
            <p>
                Produksi tercatat sebesar
                <b>${numberFormat(farmer.production)} kg/bulan</b>.
            </p>
        </div>

        <div class="solution">
            <h3>Catatan Analisis</h3>
            <p>
                Data pH belum menggambarkan seluruh tingkat kesuburan tanah.
                Diperlukan pengujian bahan organik, unsur hara,
                tekstur tanah, dan drainase untuk memperoleh analisis
                kondisi lahan yang lebih lengkap.
            </p>
        </div>
    `;
}


// ==========================================
// 17. REKOMENDASI PERTANIAN
// ==========================================

function renderSolutions() {
    const farmer = currentFarmer;

    if (!farmer) return;

    const solutions = [
        {
            title: "Pengelolaan Tanah",
            description:
                "Lakukan pengamatan kondisi tanah dan pengujian pH secara berkala."
        },
        {
            title: "Pengelolaan Air",
            description:
                "Pastikan drainase berfungsi baik dan kebutuhan air tanaman terpenuhi."
        },
        {
            title: "Pemupukan",
            description:
                "Sesuaikan pemupukan dengan umur tanaman, kondisi lahan, dan hasil pengujian tanah."
        },
        {
            title: "Pengendalian OPT",
            description:
                "Lakukan pemantauan hama dan penyakit secara rutin serta terapkan pengendalian terpadu."
        },
        {
            title: "Pemeliharaan Tanaman",
            description:
                "Perhatikan sanitasi kebun, kondisi perakaran, pemeliharaan tanaman, dan penanganan buah."
        },
        {
            title: "Pemasaran",
            description:
                "Catat hasil panen, kualitas buah, dan distribusi kepada mitra pemasaran."
        }
    ];

    document.getElementById("solutionContent").innerHTML =
        solutions.map(solution => `
            <div class="solution">
                <h3>${escapeHTML(solution.title)}</h3>
                <p>${escapeHTML(solution.description)}</p>
            </div>
        `).join("");
}


// ==========================================
// 18. TAMPILAN AWAL
// ==========================================

renderFarmers();

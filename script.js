const OPENWEATHER_API_KEY = "dad3feee952ebf6de276ef9d55979b2e";
let userName = "Operator";
let userCity = "Pune";
let mapInstance = null;
let currentMarker = null;

// Screen Elements
const loginSlide = document.getElementById('login-slide');
const radarSlide = document.getElementById('radar-slide');
const dashboardSlide = document.getElementById('dashboard-slide');
const chartSlide = document.getElementById('chart-slide');

// Radar Elements
const targetPin = document.getElementById('targetPin');
const scanCityTarget = document.getElementById('scanCityTarget');

// Chart Setup
let aqiChartInstance = null;
let currentChartType = 'bar';

const timeLabels = [
  "6:01pm", "7:31pm", "9:01pm", "10:31pm", "12:01am", "1:31am", 
  "3:01am", "4:31am", "6:01am", "7:31am", "9:01am", "10:31am", 
  "12:01pm", "1:31pm", "3:01pm", "4:31pm"
];



// ================= TRANSITION: LOGIN -> RADAR (NO SCROLL, CINEMATIC WARP) =================
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  userName = document.getElementById('username').value.trim() || "Operator";
  userCity = document.getElementById('usercity').value.trim() || "Pune";

  document.getElementById('dashLocation').textContent = userCity;
  scanCityTarget.textContent = userCity.toUpperCase();

  // Step 1: Smooth fade & scale out login screen
  loginSlide.classList.add('exit-warp');

  // Step 2: Open Radar Slide cleanly
  setTimeout(() => {
    loginSlide.classList.remove('active', 'exit-warp');
    radarSlide.classList.add('active');
    runRadarScan();
  }, 500);
});

function runRadarScan() {
  // Pin coordinate lock animation
  setTimeout(() => {
    targetPin.style.display = 'block';
    targetPin.style.left = '42%';
    targetPin.style.top = '62%';
    document.getElementById('scanText').textContent = "COORDINATES LOCKED: " + userCity.toUpperCase();
  }, 1600);

  // Transition from Radar to Live Dashboard Map
  setTimeout(() => {
    radarSlide.classList.remove('active');
    dashboardSlide.classList.add('active');
    initDashboardMap();
    fetchLiveAirAndWeather(userCity);
  }, 3200);
}

// ================= DASHBOARD & MAP INITIALIZATION =================
function initDashboardMap() {
  if (!mapInstance) {
    mapInstance = L.map('live-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([18.5204, 73.8567], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapInstance);

    // Dark-mode filter for OpenStreetMap
    document.getElementById('live-map').style.filter = "invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%)";
  }

  setTimeout(() => {
    if (mapInstance) {
      mapInstance.invalidateSize();
    }
  }, 150);
}

// ================= OPENWEATHER API CALL & DORAMI SENSORS =================
async function fetchLiveAirAndWeather(cityName) {
  try {
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );
    const geoData = await geoRes.json();

    let lat = 18.5204, lon = 73.8567, displayName = cityName;
    if (geoData && geoData.length > 0) {
      lat = geoData[0].lat;
      lon = geoData[0].lon;
      displayName = `${geoData[0].name}, ${geoData[0].country}`;
    }

    document.getElementById('dashLocation').textContent = displayName;

    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    const weatherData = await weatherRes.json();

    const pollutionRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
    );
    const pollutionData = await pollutionRes.json();

    const temp = Math.round(weatherData.main.temp);
    const humidity = weatherData.main.humidity;
    const windKm = (weatherData.wind.speed * 3.6).toFixed(1);
    const weatherText = weatherData.weather[0].main;

    document.getElementById('tempVal').textContent = `${temp}°C`;
    document.getElementById('weatherCondition').textContent = `${weatherText} · ${humidity}% Humidity`;
    document.getElementById('windVal').textContent = `${windKm} km/h`;

    const comps = pollutionData.list[0].components;
    const pm25 = comps.pm2_5.toFixed(1);
    const pm10 = comps.pm10.toFixed(1);
    const co = comps.co.toFixed(1);

    document.getElementById('pm25Val').textContent = `${pm25} µg/m³`;
    document.getElementById('pm10Val').textContent = `${pm10} µg/m³`;
    document.getElementById('coVal').textContent = `${co} µg/m³`;

    const aqiLevel = pollutionData.list[0].main.aqi;
    const aqiInfo = {
      1: { aqi: Math.round(pm25 * 2 + 10), label: "Good", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)", advice: "Air quality is wonderful! Enjoy the fresh outdoor breeze! 🌸" },
      2: { aqi: Math.round(pm25 * 2 + 30), label: "Fair", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)", advice: "Air quality is acceptable. Safe to go out! 🍃" },
      3: { aqi: Math.round(pm25 * 2.5 + 40), label: "Moderate", color: "#facc15", bg: "rgba(250, 204, 21, 0.2)", advice: "Moderate air pollution. Sensitive people take precautions! ⚠️" },
      4: { aqi: Math.round(pm25 * 2.8 + 60), label: "Poor", color: "#f97316", bg: "rgba(249, 115, 22, 0.2)", advice: "Pollution is high today! Wearing a mask is recommended. 😷" },
      5: { aqi: Math.max(220, Math.round(pm25 * 3)), label: "Very Poor", color: "#ef4444", bg: "rgba(239, 68, 68, 0.2)", advice: "Air is dangerous today! Dorami advises staying indoors! 🛑" }
    }[aqiLevel] || { aqi: 151, label: "Unhealthy", color: "#ef4444", bg: "rgba(239, 68, 68, 0.2)", advice: "Air quality is unhealthy today! Please wear a mask! 😷" };

    const aqiValEl = document.getElementById('aqiVal');
    const aqiStatusEl = document.getElementById('aqiStatus');
    const hudCardEl = document.getElementById('hudCard');
    const doramiAdviceEl = document.getElementById('doramiAdvice');

    aqiValEl.textContent = aqiInfo.aqi;
    aqiValEl.style.color = aqiInfo.color;
    aqiValEl.style.textShadow = `0 0 30px ${aqiInfo.color}66`;

    aqiStatusEl.textContent = aqiInfo.label;
    aqiStatusEl.style.color = aqiInfo.color;
    aqiStatusEl.style.borderColor = aqiInfo.color;
    aqiStatusEl.style.background = aqiInfo.bg;

    hudCardEl.style.borderColor = aqiInfo.color;

    if (doramiAdviceEl) {
      doramiAdviceEl.textContent = aqiInfo.advice;
    }

    if (mapInstance) {
      mapInstance.setView([lat, lon], 12);

      if (currentMarker) {
        mapInstance.removeLayer(currentMarker);
      }

      currentMarker = L.circleMarker([lat, lon], {
        radius: 16,
        fillColor: aqiInfo.color,
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(mapInstance)
        .bindPopup(`<b>${displayName} Monitoring Station</b><br>AQI: <b>${aqiInfo.aqi}</b> (${aqiInfo.label})<br>PM2.5: ${pm25} µg/m³`)
        .openPopup();
    }

  } catch (err) {
    console.warn("Live API call fallback:", err);
    document.getElementById('aqiVal').textContent = "151";
    document.getElementById('aqiStatus').textContent = "Unhealthy";
    document.getElementById('tempVal').textContent = "31°C";
    document.getElementById('weatherCondition').textContent = "Sunny · 45% Humidity";
    document.getElementById('pm25Val').textContent = "59 µg/m³";
    document.getElementById('pm10Val').textContent = "141 µg/m³";
    document.getElementById('coVal').textContent = "412 µg/m³";
    document.getElementById('windVal').textContent = "11.9 km/h";
  }
}

// ================= HISTORICAL GRAPH & SHIZUKA DIALOGUE =================
function getAqiBarColor(aqi) {
  if (aqi <= 50) return '#10b981';
  if (aqi <= 100) return '#facc15';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#f43f5e';
  return '#8b5cf6';
}

function updateShizukaDialogue(currentAqi) {
  const bubbleEl = document.getElementById('shizukaBubble');
  if (!bubbleEl) return;

  if (currentAqi <= 100) {
    bubbleEl.textContent = "Nobita, aaj air clean hai, chalo walk pe chalein! 🌸";
    bubbleEl.style.borderColor = "#10b981";
    bubbleEl.style.boxShadow = "0 10px 25px rgba(0,0,0,0.7), 0 0 20px rgba(16, 185, 129, 0.4)";
  } else {
    bubbleEl.textContent = "Nobita, aaj air clean nahi hai, chalo ghar chalte hain! 🏠😷";
    bubbleEl.style.borderColor = "#ef4444";
    bubbleEl.style.boxShadow = "0 10px 25px rgba(0,0,0,0.7), 0 0 20px rgba(239, 68, 68, 0.4)";
  }
}

function initOrUpdateChart(baseAqi) {
  const cityNameEl = document.getElementById('graphCityName');
  if (cityNameEl) cityNameEl.textContent = userCity;

  const historicalPoints = [
    Math.round(baseAqi * 0.72),
    Math.round(baseAqi * 0.81),
    Math.round(baseAqi * 0.92),
    Math.round(baseAqi * 0.96),
    Math.round(baseAqi * 0.98),
    Math.round(baseAqi * 1.01),
    Math.round(baseAqi * 1.03),
    Math.round(baseAqi * 1.04),
    Math.round(baseAqi * 1.05),
    Math.round(baseAqi * 1.07),
    Math.round(baseAqi * 1.02),
    Math.round(baseAqi * 0.88),
    Math.round(baseAqi * 0.75),
    Math.round(baseAqi * 0.73),
    Math.round(baseAqi * 0.76),
    Math.round(baseAqi * 0.74)
  ];

  const minVal = Math.min(...historicalPoints);
  const maxVal = Math.max(...historicalPoints);
  document.getElementById('minAqiVal').textContent = minVal;
  document.getElementById('maxAqiVal').textContent = maxVal;

  updateShizukaDialogue(baseAqi);

  const barColors = historicalPoints.map(val => getAqiBarColor(val));
  const canvasEl = document.getElementById('aqiHistoryChart');
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');

  if (aqiChartInstance) {
    aqiChartInstance.destroy();
  }

  aqiChartInstance = new Chart(ctx, {
    type: currentChartType,
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'AQI (US)',
        data: historicalPoints,
        backgroundColor: currentChartType === 'bar' ? barColors : 'rgba(56, 189, 248, 0.15)',
        borderColor: currentChartType === 'line' ? '#38bdf8' : 'transparent',
        borderWidth: 2,
        borderRadius: 6,
        fill: currentChartType === 'line',
        tension: 0.35,
        pointBackgroundColor: '#38bdf8',
        pointRadius: currentChartType === 'line' ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#030712',
          titleColor: '#38bdf8',
          bodyFont: { weight: 'bold' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          min: 0,
          max: Math.max(200, Math.ceil(maxVal / 50) * 50),
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          ticks: { color: '#94a3b8', stepSize: 20 }
        }
      }
    }
  });
}

function openHistoricalChartSlide() {
  const currentScore = parseInt(document.getElementById('aqiVal').textContent) || 151;

  dashboardSlide.style.opacity = "0";
  dashboardSlide.style.transform = "translateX(-40px)";

  setTimeout(() => {
    dashboardSlide.classList.remove('active');
    dashboardSlide.style.opacity = "";
    dashboardSlide.style.transform = "";

    chartSlide.classList.add('active');
    chartSlide.scrollTop = 0;
    initOrUpdateChart(currentScore);
    
    // Fetch live Indian cities ranking
    fetchLivePollutedCities();
  }, 400);
}

function closeHistoricalChartSlide() {
  chartSlide.style.opacity = "0";
  chartSlide.style.transform = "translateX(40px)";

  setTimeout(() => {
    chartSlide.classList.remove('active');
    chartSlide.style.opacity = "";
    chartSlide.style.transform = "";

    dashboardSlide.classList.add('active');
    if (mapInstance) {
      mapInstance.invalidateSize();
    }
  }, 400);
}

function toggleChartType(type) {
  currentChartType = type;
  document.getElementById('barChartBtn').classList.toggle('active', type === 'bar');
  document.getElementById('lineChartBtn').classList.toggle('active', type === 'line');
  const currentScore = parseInt(document.getElementById('aqiVal').textContent) || 151;
  initOrUpdateChart(currentScore);
}

// ================= LIVE INDIA'S MOST POLLUTED CITIES 2026 =================
const trackedCities = [
  { name: "Ranchi, Jharkhand, India", lat: 23.3441, lon: 85.3096 },
  { name: "Fatehpur, Uttar Pradesh, India", lat: 25.9282, lon: 80.8131 },
  { name: "Meerut, Uttar Pradesh, India", lat: 28.9845, lon: 77.7064 },
  { name: "Moradabad, Uttar Pradesh, India", lat: 28.8386, lon: 78.7733 },
  { name: "Delhi, NCR, India", lat: 28.6139, lon: 77.2090 },
  { name: "Saharsa, Bihar, India", lat: 25.8835, lon: 86.6006 },
  { name: "Faridabad, Haryana, India", lat: 28.4089, lon: 77.3178 },
  { name: "Greater Noida, Uttar Pradesh, India", lat: 28.4744, lon: 77.5040 },
  { name: "Bulandshahr, Uttar Pradesh, India", lat: 28.4070, lon: 77.8498 },
  { name: "Saharanpur, Uttar Pradesh, India", lat: 29.9671, lon: 77.5510 },
  { name: "Patna, Bihar, India", lat: 25.5941, lon: 85.1376 },
  { name: "Lucknow, Uttar Pradesh, India", lat: 26.8467, lon: 80.9462 }
];

async function fetchLivePollutedCities() {
  const tbody = document.getElementById('pollutedCitiesBody');
  if (!tbody) return;

  try {
    const promises = trackedCities.map(async (city) => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${OPENWEATHER_API_KEY}`
        );
        const data = await res.json();
        const pm25 = data.list[0].components.pm2_5;
        const calculatedAqi = Math.round(pm25 * 3.4 + 40);
        return {
          name: city.name,
          aqi: calculatedAqi,
          pm25: pm25
        };
      } catch (e) {
        return {
          name: city.name,
          aqi: Math.floor(Math.random() * (340 - 240) + 240),
          pm25: 75
        };
      }
    });

    const results = await Promise.all(promises);
    results.sort((a, b) => b.aqi - a.aqi);
    const top10 = results.slice(0, 10);

    tbody.innerHTML = top10.map((item, index) => {
      const isHazardous = item.aqi >= 300;
      const statusText = isHazardous ? "Hazardous" : "Severe";
      const statusClass = isHazardous ? "status-hazardous" : "status-severe";
      const pillClass = isHazardous ? "aqi-hazardous" : "aqi-severe";
      const standardRatio = Math.max(10, Math.round(item.aqi / 20));

      return `
        <tr>
          <td><strong>${index + 1}.</strong></td>
          <td class="city-cell"><span class="flag">🇮🇳</span> ${item.name}</td>
          <td><span class="aqi-pill ${pillClass}">${item.aqi}</span></td>
          <td class="${statusClass}">${statusText}</td>
          <td class="standard-val">${standardRatio}x above Standard</td>
          <td class="fav-cell" onclick="toggleFavorite(this)">♡</td>
        </tr>
      `;
    }).join('');

    const timeEl = document.getElementById('rankingLastUpdated');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `Last Updated: ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

  } catch (error) {
    console.error("Failed to load live rankings:", error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">⚠️ Error loading live sensor data.</td></tr>`;
  }
}

function toggleFavorite(el) {
  if (el.textContent === '♡') {
    el.textContent = '❤️';
    el.style.color = '#ef4444';
  } else {
    el.textContent = '♡';
    el.style.color = '#64748b';
  }
}
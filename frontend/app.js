// Frontend app: fetch districts and district summary (table + chart + cards)
const districtSelect = document.getElementById('districtSelect');
const loadBtn = document.getElementById('loadBtn');
const detectBtn = document.getElementById('detectBtn');
const cards = document.getElementById('cards');
const notice = document.getElementById('notice');
const updated = document.getElementById('updated');
const tableSection = document.getElementById('tableSection');
const tableBody = document.querySelector('#dataTable tbody');
const chartSection = document.getElementById('chartSection');
const ctx = document.getElementById('barChart').getContext('2d');
let barChart = null;
let localData = null;

async function init(){
  showNotice('Loading districts...');
  try{
    const res = await fetch('/api/districts');
    if(res.ok){
      const list = await res.json();
      populate(list);
      const meta = await fetch('/api/meta').then(r=>r.ok? r.json(): null).catch(()=>null);
      if(meta && meta.updated) updated.textContent = 'Live data updated on: ' + new Date(meta.updated).toLocaleString();
    } else throw new Error('API failed');
  }catch(e){
    try{
      const r = await fetch('data.json');
      localData = await r.json();
      populate(Object.keys(localData));
      showNotice('Showing local cached data (API unavailable).');
    }catch(err){
      showNotice('Failed to load districts.');
    }
  }finally{
    setTimeout(()=>{ notice.hidden = true; notice.textContent = '' }, 2000);
  }
}

function populate(list){
  districtSelect.innerHTML = '<option value="">-- Select District --</option>';
  list.forEach(d=>{
    const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
    districtSelect.appendChild(opt);
  });
}

function showNotice(msg){ notice.hidden = false; notice.textContent = msg; }

loadBtn.addEventListener('click', async ()=>{
  const d = districtSelect.value;
  if(!d) return alert('Please select a district');
  showNotice('Loading data for ' + d + '...');
  try{
    const res = await fetch('/api/district/' + encodeURIComponent(d));
    if(res.ok){
      const j = await res.json();
      render(j.summary, d);
      updated.textContent = 'Live data updated on: ' + new Date(j.fetched_at || Date.now()).toLocaleString();
    } else {
      if(localData && localData[d]) render(localData[d], d);
      else showNotice('No data for ' + d);
    }
  }catch(err){
    if(localData && localData[d]) render(localData[d], d);
    else showNotice('Failed to load data.');
  }finally{ setTimeout(()=>{ notice.hidden = true; notice.textContent = '' }, 1500); }
});

function render(summary, district){
  cards.innerHTML = '';
  const items = [
    {label: 'People Worked', val: summary.people},
    {label: 'Total Days Paid', val: summary.mandays},
    {label: 'Wages Paid (₹)', val: summary.wages},
    {label: 'Projects', val: summary.projects}
  ];
  items.forEach(it=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<div class="label">${it.label}</div><div class="value">${it.val !== undefined ? Number(it.val).toLocaleString() : 'N/A'}</div>`;
    cards.appendChild(c);
  });
  // table
  tableBody.innerHTML = '';
  if(summary.trend && summary.trend_labels){
    tableSection.hidden = false;
    for(let i=0;i<summary.trend.length;i++){
      const tr = document.createElement('tr');
      const m = summary.trend_labels[i] || ('M' + (i+1));
      tr.innerHTML = `<td>${m}</td><td>${summary.trend[i]}</td><td>${summary.wages_trend ? summary.wages_trend[i] : 'N/A'}</td><td>${summary.works_trend ? summary.works_trend[i] : 'N/A'}</td>`;
      tableBody.appendChild(tr);
    }
    // chart
    chartSection.hidden = false;
    if(barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: summary.trend_labels, datasets: [{ label: 'Mandays', data: summary.trend, backgroundColor: '#0b6b3a' }] },
      options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  } else {
    tableSection.hidden = true; chartSection.hidden = true;
  }
}

// detect (demo)
detectBtn.addEventListener('click', () => {
  if(!navigator.geolocation) return alert('Geolocation not supported in this browser.');
  showNotice('Detecting your district...');

  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      const districtName = data.address.county || data.address.district || data.address.state_district;
      if(districtName) {
        const match = Array.from(districtSelect.options).find(opt => opt.textContent.toLowerCase().includes(districtName.toLowerCase()));
        if(match) {
          districtSelect.value = match.value;
          showNotice('Detected district: ' + match.value);
          loadBtn.click();
        } else {
          showNotice(' Detected District: ' + districtName);
        }
      } else {
        showNotice('District not found from your location.');
      }
    } catch(err) {
      showNotice('Error detecting district.');
    }
  }, err => showNotice('Location access denied or failed.'));
});

init();

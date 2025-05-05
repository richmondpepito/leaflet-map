const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0YzBM0KMyrNOC9sZ0KiLDwlk4kgVmjSxpls4k_aD-Wg9fbK2WYHUTstuI6XDqWSvHuy3gXtIz3l6g/pub?gid=542207452&single=true&output=csv';
const cebuIcon = L.icon({ iconUrl: 'https://www.gtcosmetics.com.ph/wp-content/uploads/2020/10/GT-Cosmetics.png', iconSize:[32,32], iconAnchor:[16,32], popupAnchor:[0,-32] });

const map = L.map('map').setView([10.3157, 123.8854], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let allData = [], lines = [], markers = [];
let currentRegion = 'all', currentProvince = 'all';

document.getElementById('loadingSpinner').style.display = 'block';
Papa.parse(sheetUrl, {
  download: true,
  header: true,
  complete: res => {
    allData = res.data.filter(r => r['Route ID']);
    document.getElementById('loadingSpinner').style.display = 'none';
    setup();
  }
});

function setup() {
  populateFilters();
  updateMap();
  addLegend();
}

function populateFilters(){
  const w = new Set(), s = new Set(), r = new Set(), pm = {};
  allData.forEach(d => {
    w.add(d['Warehouse Type']);
    s.add(d['Supervisor']);
    r.add(d['Regional Destination']);
    const reg = d['Regional Destination'], prov = d['Provincial Destination'];
    if (reg && prov) { pm[reg] = pm[reg] || new Set(); pm[reg].add(prov); }
  });

  document.getElementById('warehouseTypeFilter').innerHTML = '<option value="all">All</option>' + [...w].map(i => `<option>${i}</option>`).join('');
  document.getElementById('supervisorFilter').innerHTML = '<option value="all">All</option>' + [...s].map(i => `<option>${i}</option>`).join('');
  document.getElementById('regionFilter').innerHTML = '<option value="all">All</option>' + [...r].map(i => `<option>${i}</option>`).join('');
  document.getElementById('provinceFilter').innerHTML = '<option value="all">All</option>';

  document.getElementById('regionFilter').onchange = () => {
    currentRegion = regionFilter.value;
    const provOpts = [...(pm[currentRegion] || [])];
    document.getElementById('provinceFilter').innerHTML = '<option value="all">All</option>' + provOpts.map(p => `<option>${p}</option>`).join('');
    zoomToRegion(currentRegion);
    updateMap();
  };
  document.getElementById('provinceFilter').onchange = () => {
    currentProvince = provinceFilter.value;
    zoomToProvince(currentProvince);
    updateMap();
  };
  document.getElementById('warehouseTypeFilter').onchange = updateMap;
  document.getElementById('supervisorFilter').onchange = updateMap;
  document.getElementById('resetButton').onclick = resetView;
}

function updateMap() {
  lines.forEach(l => map.removeLayer(l)); lines = [];
  markers.forEach(m => map.removeLayer(m)); markers = [];

  const wf = document.getElementById('warehouseTypeFilter').value;
  const sf = document.getElementById('supervisorFilter').value;

  const filtered = allData.filter(d =>
    (wf === 'all' || d['Warehouse Type'] === wf) &&
    (sf === 'all' || d['Supervisor'] === sf) &&
    (currentRegion === 'all' || d['Regional Destination'] === currentRegion) &&
    (currentProvince === 'all' || d['Provincial Destination'] === currentProvince)
  );

  filtered.forEach(draw);
}

function draw(d) {
  const o = [+d['Origin Lat'], +d['Origin Long']], u = [+d['Destination Lat'], +d['Destination Long']];
  const txt = `Route Type: ${d['Route Type']}<br>From: ${d['Origin Name']}<br>To: ${d['Destination Name']}<br>Location: ${d['Destination Location']}<br>Supervisor: ${d['Supervisor']}`;
  const line = L.polyline([o, u], { color: getColor(d['Route Type']), weight: 1.5, dashArray: getDash(d['Route Type']) }).addTo(map).bindTooltip(txt);
  lines.push(line);

  const om = (Math.abs(o[0]-10.380134)<1e-4 && Math.abs(o[1]-123.995986)<1e-4)
    ? L.marker(o, { icon: cebuIcon }).bindTooltip('GTCosmetics Manufacturing Inc.<br>Main Plant<br>Tayud, Liloan, Cebu')
    : L.circleMarker(o, { radius: getSize(d['Route Type']), color: getColor(d['Route Type']) }).bindTooltip(txt);
  const dm = L.circleMarker(u, { radius: getSize(d['Route Type']), color: getColor(d['Route Type']) }).bindTooltip(txt);

  map.addLayer(om); map.addLayer(dm);
  markers.push(om, dm);
}

function getColor(t){ if(t.startsWith('Cebu Main')) return 'black'; if(t.includes('Satellite')) return 'green'; if(t.includes('Sub-warehouse')) return 'blue'; return 'gray'; }
function getDash(t){ return t.includes('to Bin')?'5,5':null; }
function getSize(t){ return {'Cebu Main':6,'Cebu Main to Sub-warehouse':6,'Cebu Main to Bin':5,'Sub-warehouse to Satellite Warehouse':5,'Sub-warehouse to Bin':4,'Satellite Warehouse to Bin':3}[t]||4; }

function resetView() {
  currentRegion='all'; currentProvince='all';
  document.getElementById('warehouseTypeFilter').value='all';
  document.getElementById('supervisorFilter').value='all';
  document.getElementById('regionFilter').value='all';
  document.getElementById('provinceFilter').innerHTML = '<option value="all">All</option>';
  map.fitBounds(provinceBounds['all']);
  updateMap();
}

function zoomToRegion(region) {
  if (provinceBounds[region]) map.fitBounds(provinceBounds[region]);
}

function zoomToProvince(province) {
  if (provinceBounds[province]) map.fitBounds(provinceBounds[province]);
}

function addLegend() {
  const legend = L.control({position:'bottomright'});
  legend.onAdd = () => {
    const div = L.DomUtil.create('div','legend');
    div.innerHTML = '<span style="background:black"></span> Cebu Main<br><span style="background:blue"></span> Sub-warehouse<br><span style="background:green"></span> Satellite Warehouse';
    return div;
  };
  legend.addTo(map);
}
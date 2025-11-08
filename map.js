const map = L.map('map').setView([19.076, 72.8777], 12)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

const spots = [
  { n: 'Marine Drive', a: [18.9429, 72.8236], d: 'Seaside promenade with sunset views.', cat: 'Scenic' },
  { n: 'Kala Ghoda', a: [18.9320, 72.8335], d: 'Art galleries and museums.', cat: 'Culture' },
  { n: 'Hanging Gardens', a: [18.9682, 72.8193], d: 'Terraced gardens with views.', cat: 'Park' },
  { n: 'Street Food Hub', a: [19.0035, 72.8401], d: 'Local snacks and street eats.', cat: 'Food' },
  { n: 'Maritime Museum', a: [18.9292, 72.8243], d: 'Naval history exhibits.', cat: 'Museum' }
]

const fixed = spots.map(s => {
  const m = L.marker(s.a).addTo(map).bindPopup(`<b>${s.n}</b><div style="font-size:.9rem;color:#444">${s.cat}</div><p>${s.d}</p>`)
  return { data: s, m }
})

const filterPanel = document.getElementById('filterPanel')
const placeList = document.getElementById('placeList')
const categories = ['Restaurant', 'Park', 'Theatre', 'Museum', 'Scenic',]
const tempPins = {}

categories.forEach(cat => {
  const label = document.createElement('label')
  label.className = 'filter-row'
  label.innerHTML = `<input type="checkbox" data-cat="${cat}"> <span>${cat}</span>`
  filterPanel.appendChild(label)
})

function bboxString() {
  const b = map.getBounds()
  const south = b.getSouth(), north = b.getNorth()
  const west = b.getWest(), east = b.getEast()
  return `${west},${south},${east},${north}`
}

function searchNearest(category, cb) {
  const viewbox = bboxString()
  const q = encodeURIComponent(category)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&viewbox=${viewbox}&bounded=1`
  fetch(url).then(r => r.json()).then(js => {
    if (js && js.length) return cb(null, js[0])
    // fallback: try without bounding to get any nearby match
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`
    fetch(url2).then(r2 => r2.json()).then(js2 => {
      if (js2 && js2.length) cb(null, js2[0])
      else cb('no-results')
    }).catch(() => cb('error'))
  }).catch(() => cb('error'))
}

function pinCategory(cat) {
  const checkbox = filterPanel.querySelector(`input[data-cat="${cat}"]`)
  if (!checkbox || !checkbox.checked) return
  searchNearest(cat, (err, res) => {
    if (err) {
      alert(cat + ' not found nearby')
      checkbox.checked = false
      return
    }
    const lat = parseFloat(res.lat), lon = parseFloat(res.lon)
    if (tempPins[cat]) map.removeLayer(tempPins[cat])
    const marker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${res.display_name}</b><div style="font-size:.9rem;color:#444">${cat}</div>`).openPopup()
    tempPins[cat] = marker
    map.setView([lat, lon], 14)
  })
}

function unpinCategory(cat) {
  if (tempPins[cat]) {
    map.removeLayer(tempPins[cat])
    delete tempPins[cat]
  }
}


function searchNearest(category, cb) {
  const viewbox = bboxString()
  const q = encodeURIComponent(category)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&viewbox=${encodeURIComponent(viewbox)}&bounded=1`
  fetch(url).then(r => r.json()).then(js => {
    if (js && js.length) cb(null, js[0])
    else cb('no-results')
  }).catch(() => cb('error'))
}

function pinCategory(cat) {
  const checkbox = filterPanel.querySelector(`input[data-cat="${cat}"]`)
  if (!checkbox || !checkbox.checked) return
  searchNearest(cat, (err, res) => {
    if (err) {
      alert(cat + ' not found in this area')
      checkbox.checked = false
      return
    }
    const lat = parseFloat(res.lat), lon = parseFloat(res.lon)
    if (tempPins[cat]) map.removeLayer(tempPins[cat])
    const marker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${res.display_name}</b><div style="font-size:.9rem;color:#444">${cat}</div>`).openPopup()
    tempPins[cat] = marker
    map.setView([lat, lon], 14)
  })
}

function unpinCategory(cat) {
  if (tempPins[cat]) {
    map.removeLayer(tempPins[cat])
    delete tempPins[cat]
  }
}

filterPanel.addEventListener('change', e => {
  const el = e.target
  if (!el || el.tagName !== 'INPUT') return
  const cat = el.dataset.cat
  if (el.checked) pinCategory(cat)
  else unpinCategory(cat)
})

function rebuildLocalList() {
  placeList.innerHTML = ''
  fixed.forEach(f => {
    const li = document.createElement('li')
    li.className = 'location-item'
    li.innerHTML = `<strong>${f.data.n}</strong><div style="font-size:.9rem;color:#475569">${f.data.cat}</div>`
    li.onclick = () => { map.setView(f.data.a, 15); f.m.openPopup() }
    placeList.appendChild(li)
  })
}
rebuildLocalList()

document.getElementById('searchBtn').onclick = () => {
  const q = document.getElementById('searchBox').value.trim()
  if (!q) return
  const lower = q.toLowerCase()
  const local = fixed.find(x => x.data.n.toLowerCase().includes(lower) || x.data.d.toLowerCase().includes(lower))
  if (local) { map.setView(local.data.a, 15); local.m.openPopup(); return }
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`)
    .then(r => r.json())
    .then(arr => {
      if (!arr || !arr.length) { alert('No results'); return }
      const first = arr[0]
      const lat = parseFloat(first.lat), lon = parseFloat(first.lon)
      const t = L.marker([lat, lon]).addTo(map).bindPopup(first.display_name).openPopup()
      setTimeout(() => map.removeLayer(t), 12000)
      map.setView([lat, lon], 13)
    })
    .catch(() => alert('Search failed'))
}

document.getElementById('locateBtn').onclick = () => {
  navigator.geolocation.getCurrentPosition(p => {
    const pos = [p.coords.latitude, p.coords.longitude]
    const me = L.marker(pos).addTo(map).bindPopup('You are here').openPopup()
    map.setView(pos, 13)
    setTimeout(() => map.removeLayer(me), 10000)
  }, () => alert('Unable to get location'))
}

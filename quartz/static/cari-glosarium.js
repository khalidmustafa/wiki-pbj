// Pencarian khusus glosarium (halaman /glosarium dan setiap halaman istilah).
// Data diambil dari static/contentIndex.json yang sudah dimuat Quartz (fetchData), disaring ke halaman glosarium/.
// Pencarian mencocokkan istilah dan singkatan lebih dulu, lalu isi definisi.
;(function () {
  var AWALAN = "glosarium/"
  var MAKS = 40
  var dataJanji = null

  function normal(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  }

  function aman(s) {
    return (s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    })
  }

  function muatData() {
    if (dataJanji) return dataJanji
    var sumber =
      typeof fetchData !== "undefined"
        ? fetchData
        : fetch("/static/contentIndex.json").then(function (r) {
            return r.json()
          })
    dataJanji = Promise.resolve(sumber).then(function (indeks) {
      var hasil = []
      Object.keys(indeks || {}).forEach(function (slug) {
        if (slug.indexOf(AWALAN) !== 0 || slug === AWALAN + "index") return
        var d = indeks[slug] || {}
        var judul = d.title || slug
        var isi = (d.content || "").replace(/\s+/g, " ")
        hasil.push({ slug: slug, judul: judul, nJudul: normal(judul), isi: isi, nIsi: normal(isi) })
      })
      hasil.sort(function (a, b) {
        return a.judul.localeCompare(b.judul, "id")
      })
      return hasil
    })
    return dataJanji
  }

  function peringkat(e, q) {
    var t = e.nJudul
    if (t === q) return 0
    // singkatan dalam kurung di judul, misalnya "Harga Perkiraan Sendiri (HPS)"
    var m = e.judul.match(/\(([^)]+)\)\s*$/)
    if (m && normal(m[1]) === q) return 0
    if (t.indexOf(q) === 0) return 1
    if ((" " + t).indexOf(" " + q) >= 0) return 2
    if (t.indexOf(q) >= 0) return 3
    var kata = q.split(" ")
    if (
      kata.length > 1 &&
      kata.every(function (k) {
        return t.indexOf(k) >= 0
      })
    )
      return 4
    if (e.nIsi.indexOf(q) >= 0) return 5
    if (
      kata.length > 1 &&
      kata.every(function (k) {
        return e.nIsi.indexOf(k) >= 0
      })
    )
      return 6
    return -1
  }

  function cuplikan(isi, kueri) {
    var kata = kueri.trim().split(/\s+/)[0]
    if (!kata) return ""
    var i = isi.toLowerCase().indexOf(kata.toLowerCase())
    if (i < 0) return aman(isi.slice(0, 150)) + (isi.length > 150 ? "…" : "")
    var awal = Math.max(0, i - 60)
    var potong = isi.slice(awal, i + 110)
    var j = i - awal
    return (
      (awal > 0 ? "…" : "") +
      aman(potong.slice(0, j)) +
      "<mark>" +
      aman(potong.slice(j, j + kata.length)) +
      "</mark>" +
      aman(potong.slice(j + kata.length)) +
      (i + 110 < isi.length ? "…" : "")
    )
  }

  function tautan(slug) {
    return "/" + slug.split("/").map(encodeURIComponent).join("/")
  }

  function pasang() {
    var slug = document.body && document.body.dataset.slug
    if (!slug || slug.indexOf(AWALAN) !== 0) return
    if (document.getElementById("cari-glosarium")) return
    var artikel = document.querySelector("article")
    if (!artikel) return

    var kotak = document.createElement("div")
    kotak.id = "cari-glosarium"
    kotak.setAttribute("role", "search")
    kotak.innerHTML =
      '<label for="cari-glosarium-masukan">Cari istilah dalam glosarium</label>' +
      '<input id="cari-glosarium-masukan" type="search" autocomplete="off" spellcheck="false" ' +
      'placeholder="Ketik istilah atau singkatan, misalnya HPS atau penyedia" aria-describedby="cari-glosarium-info" />' +
      '<p id="cari-glosarium-info" aria-live="polite"></p>' +
      '<ol id="cari-glosarium-hasil"></ol>'
    artikel.insertBefore(kotak, artikel.firstChild)

    var masukan = kotak.querySelector("input")
    var info = kotak.querySelector("#cari-glosarium-info")
    var daftar = kotak.querySelector("#cari-glosarium-hasil")
    var jeda = null

    function tampil() {
      var mentah = masukan.value
      var q = normal(mentah)
      if (q.length < 2) {
        info.textContent = q.length ? "Ketik paling sedikit 2 huruf." : ""
        daftar.innerHTML = ""
        return
      }
      info.textContent = "Mencari…"
      muatData()
        .then(function (data) {
          if (normal(masukan.value) !== q) return
          var hasil = []
          data.forEach(function (e) {
            var p = peringkat(e, q)
            if (p >= 0) hasil.push({ e: e, p: p })
          })
          hasil.sort(function (a, b) {
            return a.p - b.p || a.e.judul.localeCompare(b.e.judul, "id")
          })
          if (!hasil.length) {
            info.textContent = "Tidak ada istilah yang cocok dengan “" + mentah.trim() + "”."
            daftar.innerHTML = ""
            return
          }
          info.textContent =
            hasil.length +
            " istilah ditemukan" +
            (hasil.length > MAKS ? ", ditampilkan " + MAKS + " teratas" : "") +
            "."
          daftar.innerHTML = hasil
            .slice(0, MAKS)
            .map(function (h) {
              var dariIsi = h.p >= 5
              return (
                '<li><a class="internal" href="' +
                tautan(h.e.slug) +
                '">' +
                aman(h.e.judul) +
                "</a>" +
                (dariIsi
                  ? '<span class="cari-glosarium-cuplikan">' + cuplikan(h.e.isi, mentah) + "</span>"
                  : "") +
                "</li>"
              )
            })
            .join("")
        })
        .catch(function () {
          info.textContent = "Data glosarium gagal dimuat. Muat ulang halaman ini."
        })
    }

    masukan.addEventListener("input", function () {
      clearTimeout(jeda)
      jeda = setTimeout(tampil, 120)
    })
    masukan.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        var pertama = daftar.querySelector("a")
        if (pertama) {
          ev.preventDefault()
          pertama.click()
        }
      } else if (ev.key === "Escape") {
        masukan.value = ""
        tampil()
      }
    })

    var awal = new URLSearchParams(window.location.search).get("cari")
    if (awal) {
      masukan.value = awal
      tampil()
    }
  }

  document.addEventListener("nav", pasang)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pasang)
  } else {
    pasang()
  }
})()

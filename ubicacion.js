// Interpreta lo que se pega como ubicación de un envío: dirección escrita, coordenadas o enlace
// (Google Maps largo o corto, ubicación compartida de WhatsApp, Waze, Apple Maps).
// Lo usan la caja (index.html) y la página del cadete (cadete/index.html).
(function (g) {
  "use strict";
  const dec = t => { let s = String(t || ""); for (let i = 0; i < 2; i++) { try { const d = decodeURIComponent(s.replace(/\+/g, " ")); if (d === s) break; s = d; } catch (e) { break; } } return s; };
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const ll = (a, b) => {
    const la = Number(a), lo = Number(b);
    return isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0) ? {lat: +la.toFixed(6), lng: +lo.toFixed(6)} : null;
  };
  const N = "(-?\\d{1,3}\\.\\d+)";
  // Patrones con coordenadas dentro de enlaces de Google Maps, WhatsApp, Waze y Apple Maps.
  const PATS = [
    new RegExp("!3d" + N + "!4d" + N),
    new RegExp("@" + N + "," + N),
    new RegExp("[?&](?:q|ll|query|daddr|destination|center|sll|loc|coordinate)=(?:loc:)?" + N + "\\s*,\\s*" + N),
    new RegExp("/maps/(?:dir|search)/(?:[^/]*/)*?" + N + ",\\s*" + N),
    new RegExp("^\\s*" + N + "\\s*,\\s*" + N + "\\s*$")
  ];
  function coordsIn(text) {
    const t = dec(text);
    for (const p of PATS) { const m = t.match(p); if (m) { const v = ll(m[1], m[2]); if (v) return v; } }
    const m = t.match(/(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/); // "Ubicación: -34.72, -56.41"
    return m ? ll(m[1], m[2]) : null;
  }
  const SHORT = /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.google\.com\/\?cid=|share\.google)\//i;
  function addressFromUrl(url) {
    let u; try { u = new URL(url); } catch (e) { return ""; }
    const q = u.searchParams.get("q") || u.searchParams.get("query") || u.searchParams.get("daddr") || u.searchParams.get("address");
    if (q && !coordsIn(q)) return dec(q).replace(/^loc:/, "").trim();
    const m = u.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
    return m ? dec(m[1]).trim() : "";
  }
  // Agrega la ciudad a una dirección escrita si no la menciona (para que Waze no busque en otra ciudad).
  function withCity(text, city) {
    const c = String(city || "").trim(); if (!c) return text;
    const n = norm(text);
    const parts = c.split(",").map(norm).filter(Boolean).concat(["uruguay", "montevideo", "canelones", "libertad", "delta del tigre", "playa pascual", "rincon de la bolsa"]);
    return parts.some(p => p && n.includes(p)) ? text : `${text}, ${c}`;
  }
  /** parse(raw, city) → {raw, kind, lat, lng, text, url}
   *  kind: "coords" (exacta) · "address" (dirección escrita) · "short" (enlace corto: solo Google Maps) · "link" (otro enlace) · "empty" */
  function parse(raw, city) {
    const r = String(raw || "").trim();
    if (!r) return {raw: "", kind: "empty"};
    const urlM = r.match(/https?:\/\/\S+/i);
    const url = urlM ? urlM[0].replace(/[).,;]+$/, "") : "";
    const c = coordsIn(url || r) || (url ? coordsIn(r.replace(url, "")) : null);
    if (c) return {raw: r, kind: "coords", lat: c.lat, lng: c.lng, url, text: url ? r.replace(url, "").trim() : ""};
    if (url && SHORT.test(url)) return {raw: r, kind: "short", url, text: r.replace(url, "").trim()};
    if (url) {
      const a = addressFromUrl(url);
      if (a) return {raw: r, kind: "address", text: withCity(a, city), url};
      return {raw: r, kind: "link", url, text: r.replace(url, "").trim()};
    }
    return {raw: r, kind: "address", text: withCity(r.replace(/\s+/g, " "), city)};
  }
  function wazeUrl(L) {
    if (!L) return "";
    if (L.kind === "coords") return `https://waze.com/ul?ll=${L.lat}%2C${L.lng}&navigate=yes`;
    if (L.kind === "address") return `https://waze.com/ul?q=${encodeURIComponent(L.text)}&navigate=yes`;
    if (L.kind === "link" && /(^|\.)waze\.com\//i.test(L.url.replace(/^https?:\/\//, ""))) return L.url;
    return "";
  }
  function mapsUrl(L) {
    if (!L) return "";
    if (L.kind === "coords") return `https://www.google.com/maps/search/?api=1&query=${L.lat}%2C${L.lng}`;
    if (L.kind === "address") return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(L.text)}`;
    return L.url || "";
  }
  function describe(L) {
    switch (L && L.kind) {
      case "coords": return {ok: true, label: "Ubicación exacta", detail: `${L.lat}, ${L.lng}` + (L.text ? ` · ${L.text}` : "")};
      case "address": return {ok: true, label: "Dirección", detail: L.text};
      case "short": return {ok: false, label: "Enlace corto de Google Maps", detail: "Se abre en Google Maps; desde ahí el cadete puede pasar a Waze."};
      case "link": return {ok: false, label: "Enlace", detail: "No se reconocieron coordenadas ni dirección: se abre tal cual."};
      default: return {ok: false, label: "", detail: ""};
    }
  }
  g.Ubicacion = {parse, wazeUrl, mapsUrl, describe};
})(typeof window !== "undefined" ? window : globalThis);

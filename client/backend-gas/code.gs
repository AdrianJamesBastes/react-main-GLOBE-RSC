/**
 * backend-gas/code.gs
 * Authority: Original Logic + Industry Grade Fixes
 */
// 1. THE "FRONT DOOR"
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Globe RSC').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
// 2. THE ANCHOR PARSING ENGINE (Helper Function)
function extractBaseAndSuffix(nmsString) {
  if (!nmsString) return { cleanBase: "", displayBase: "", suffix: "", suffixSet: new Set() };
  let originalStr = String(nmsString).toUpperCase().trim();
  let displayBase = originalStr;
  let suffixLetters = "";
  const anchors = ["DDS", "AGUSAN", "AGUADA", "AFGA", "CDO", "DVO", "DDN", "DDO", "DVOR", "DVOC", "KUD", "MOR", "MISOCC", "CVLY", "NCOT", "SCOT", "MGDN", "LDN", "LDS", "BUK", "ZDS", "ZDN", "MISOR", "MOCC", "SDN", "SDS", "AGS", "AGN", "SAR", "COT", "MKLALA", "PANABO", "TAGUM", "DIGOS", "GENSAN", "ZAMBOA", "POLOMO", "MRAMAG", "KIDAP", "COTAB", "MATI", "GINGOO", "DIPOL", "OZAMIS", "OZM", "ILIGAN", "MARAWI", "BUTUAN", "CARMEN", "STOMAS", "KPALON", "SAMAL", "PANTUK", "MACO", "MALITA", "BANSAL", "PADADA", "SULOP", "SMARIA", "GLAN", "ALABEL", "MALAPAT", "SFRANC", "MIDSAY", "SFERN", "PGDIAN", "MFORT", "TACUROS", "BISLIG", "CLAVER", "BAYABS", "DAVAO"];
  let matched = false;
  for (const anchor of anchors) {
    let idx = originalStr.lastIndexOf(anchor);
    if (idx !== -1) {
      let potentialSuffix = originalStr.slice(idx + anchor.length);
      let suffixTest = potentialSuffix.match(/^([-_ ]*)((?:ID|AS|[XYLFWKHVZJBMNPRTD])*)$/i);
      if (suffixTest && suffixTest[0] === potentialSuffix) {
        displayBase = originalStr.slice(0, idx + anchor.length) + suffixTest[1];
        suffixLetters = suffixTest[2];
        matched = true;
        break;
      }
    }
  }
  if (!matched) {
    let fallbackMatch = originalStr.match(/([-_ ]*)((?:ID|AS|[XYLFWKHVZJBMNPRTD])+)$/i);
    if (fallbackMatch) {
      displayBase = originalStr.slice(0, -fallbackMatch[0].length) + fallbackMatch[1];
      suffixLetters = fallbackMatch[2];
    }
  }
  let cleanBase = displayBase.replace(/[^A-Z0-9]/g, "");
  let suffixSet = new Set(suffixLetters.split(''));
  return { cleanBase: cleanBase, displayBase: displayBase, suffix: suffixLetters, suffixSet: suffixSet };
}
// 3. THE ETL LOGIC (The Main Processor)
function processCSVComparison(nmsText, udmText) {
  try {
    var nmsData = Utilities.parseCsv(nmsText);
    var udmData = Utilities.parseCsv(udmText);
    if (nmsData.length < 2 || udmData.length < 2) throw new Error("File(s) empty.");
    var nmsHeaders = nmsData[0].map(h => cleanText(h));
    var udmHeaders = udmData[0].map(h => cleanText(h));
    function getIndex(headers, possibleNames) {
      for (var i = 0; i < headers.length; i++) {
        if (possibleNames.indexOf(headers[i]) > -1) return i;
      }
      return -1;
    }
    var uIdx = {
      name: getIndex(udmHeaders, ['BCF NAME', 'TECH NAME', 'BTS NAME', 'SITENAME']),
      id: getIndex(udmHeaders, ['PLA_ID', 'PLA ID']),
      lat: getIndex(udmHeaders, ['LATITUDE', 'LAT']),
      lng: getIndex(udmHeaders, ['LONGITUDE', 'LONG']),
      area: getIndex(udmHeaders, ['ASSIGNED_AREA', 'ASSIGN AREA', 'ASSIGNED AREA']),
      prov: getIndex(udmHeaders, ['PROVINCE']),
      city: getIndex(udmHeaders, ['ASSIGN_CITY/MUNICIPALITY']),
      add: getIndex(udmHeaders, ['SITE_ADDRESS', 'SITE ADD']),
      trt: getIndex(udmHeaders, ['TERRITORY']),
      hsvr: getIndex(udmHeaders, ['HIROSHIMA SEVERITY']),
      twr: getIndex(udmHeaders, ['TOWERCO'])
    };
    var nIdx = {
      g2: getIndex(nmsHeaders, ['2G', 'NAME']),
      g4: getIndex(nmsHeaders, ['4G', 'ENBNAME']),
      g5: getIndex(nmsHeaders, ['5G', 'GNBCUNAME'])
    };
    var udmRegistry = {};
    for (var j = 1; j < udmData.length; j++){
      var row = udmData[j];
      var rawName = row[uIdx.name];
      if (!rawName) continue;
      var parsedUdm = extractBaseAndSuffix(rawName);
      var province = uIdx.prov > -1 ? row[uIdx.prov] : "";
      udmRegistry[parsedUdm.cleanBase] = {
        plaId: uIdx.id > -1 ? row[uIdx.id] : "UNKNOWN",
        lat: Number(row[uIdx.lat]) || null,
        lng: Number(row[uIdx.lng]) || null,
        originalName: String(rawName).trim().toUpperCase(),
        allowedSuffixSet: parsedUdm.suffixSet,
        region: dict(province),
        sArea: uIdx.area > -1 ? row[uIdx.area] : "",
        prov: String(province).trim().toUpperCase(),
        mCity: uIdx.city > -1 ? row[uIdx.city] : "",
        sAdd: uIdx.add > -1 ? row[uIdx.add] : "",
        trt: uIdx.trt > -1 ? row[uIdx.trt] : "",
        hSvr: uIdx.hsvr > -1 ? row[uIdx.hsvr] : "",
        twrC: uIdx.twr > -1 ? row[uIdx.twr] : ""
      };
    }
    var report = [];
    var matchedBases = new Set(); 
    for (var j = 1; j < nmsData.length; j++){
      var row = nmsData[j];
      var namesToCheck = [{val: row[nIdx.g2], gen: "2G"}, {val: row[nIdx.g4], gen: "4G"}, {val: row[nIdx.g5], gen: "5G"}].filter(item => item.val);
      namesToCheck.forEach(item => {
        var parsedNms = extractBaseAndSuffix(item.val);
        var udmMatch = udmRegistry[parsedNms.cleanBase];
        let status = "NEW", remarks = "New string detected.";
        if (udmMatch) {
          matchedBases.add(parsedNms.cleanBase);
          var isSubset = Array.from(parsedNms.suffixSet).every(char => udmMatch.allowedSuffixSet.has(char));
          if (isSubset) { status = "UNCHANGED"; remarks = "Matches UDM Registry."; }
          else { status = "MISMATCH"; remarks = "Unregistered Suffix Letters. UDM: " + udmMatch.originalName; }
        }
        let techLabel = item.gen;
        const s = parsedNms.suffix.toUpperCase();
        if (item.gen === "4G") {
          let t = [];
          if (/[FLWY]/.test(s)) t.push("FDD");
          if (/H/.test(s)) t.push("TDD");
          if (/V/.test(s)) t.push("MM");
          if (t.length > 0) techLabel = `4G-${t.join("/")}`;
        } else if (item.gen === "5G") {
          let t = [];
          if (/M/.test(s)) t.push("MM");
          if (/[PN]/.test(s)) t.push("NMM");
          if (t.length > 0) techLabel = `5G-${t.join("/")}`;
        }
        report.push({
          plaId: udmMatch ? udmMatch.plaId : "",
          matchStatus: status,
          techName: item.val,
          baseLocation: parsedNms.displayBase,
          techGen: techLabel,
          region: udmMatch ? udmMatch.region : "UNKNOWN",
          prov: udmMatch ? udmMatch.prov : "",
          lat: udmMatch ? udmMatch.lat : null,
          lng: udmMatch ? udmMatch.lng : null,
          remarks: remarks,
          sArea: udmMatch ? udmMatch.sArea : "",
          mCity: udmMatch ? udmMatch.mCity : "",
          sAdd: udmMatch ? udmMatch.sAdd : "",
          trt: udmMatch ? udmMatch.trt : "",
          hSvr: udmMatch ? udmMatch.hSvr : "",
          twrC: udmMatch ? udmMatch.twrC : ""
        });
      });
    }
    for (var base in udmRegistry) {
      if (!matchedBases.has(base)) {
        var u = udmRegistry[base];
        report.push({
          plaId: u.plaId, 
          matchStatus: "REMOVED", 
          techName: u.originalName, 
          techGen: "UDM Registry",
          region: u.region,
          prov: u.prov, lat: u.lat, lng: u.lng, 
          remarks: "Registry missing from current NMS dump.",
          sArea: u.sArea, mCity: u.mCity, sAdd: u.sAdd, trt: u.trt, hSvr: u.hSvr, twrC: u.twrC
        });
      }
    }
    return JSON.stringify({ success: true, data: report, count: report.length });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  }
}
function cleanText(str) {
  if (!str) return "";
  return String(str).toUpperCase().replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
}
function dict(prov) {
  if (!prov) return "";
  prov = cleanText(prov);
  const regions = { "REGION IX (ZAMBOANGA PENINSULA)": ["ZAMBOANGA DEL NORTE", "ZAMBOANGA DEL SUR", "ZAMBOANGA SIBUGAY"], "REGION X (NORTHERN MINDANAO)": ["BUKIDNON", "CAMIGUIN", "LANAO DEL NORTE", "MISAMIS OCCIDENTAL", "MISAMIS ORIENTAL"], "REGION XI (DAVAO REGION)": ["DAVAO DE ORO", "DAVAO DEL NORTE", "DAVAO DEL SUR", "DAVAO OCCIDENTAL", "DAVAO ORIENTAL", "COMPOSTELA VALLEY"], "REGION XII (SOCCSKSARGEN)": ["COTABATO", "SARANGANI", "SOUTH COTABATO", "SULTAN KUDARAT", "NORTH COTABATO"], "REGION XIII (CARAGA)": ["AGUSAN DEL NORTE", "AGUSAN DEL SUR", "DINAGAT ISLANDS", "SURIGAO DEL NORTE", "SURIGAO DEL SUR"], "BARMM (BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO)": ["BASILAN", "LANAO DEL SUR", "MAGUINDANAO DEL NORTE", "MAGUINDANAO DEL SUR", "SULU", "TAWI TAWI"] };
  for (const [reg, pro] of Object.entries(regions)) { if (pro.includes(prov)) return reg; }
  return "";
}
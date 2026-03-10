// reusable telecom/location parsing helpers

import { provinces, cities, siteCodes, cityToProvinceMap, cityToBarangayMap, regionsToProvincesMap } from "../MainApp/MapDictionary/TelecomDictionaries";

export function parseLocationData(baseName) {
  if (!baseName) return { siteCode: "", place: "", city: "", province: "", region: "" };

  let remainingString = baseName.toUpperCase().trim();
  const provKeys = Object.keys(provinces).sort((a, b) => b.length - a.length);
  const cityKeys = Object.keys(cities).sort((a, b) => b.length - a.length);
  let extracted = { siteCode: "", place: "", city: "", province: "", region: "" };

  for (const prov of provKeys) {
    const regex = new RegExp(`${prov}(\\d+)?((?:IO|ID|AS|CO|[XYLFWKHVZJBMNPRT])*)$`, "i");
    const match = remainingString.match(regex);
    if (match) {
      extracted.province = provinces[prov];
      remainingString = remainingString.slice(0, remainingString.length - match[0].length);
      break;
    }
  }

  for (const cityKey of cityKeys) {
    const cityName = cities[cityKey];
    const provinceOfCity = cityToProvinceMap[cityName];
    if (!provinceOfCity || (extracted.province && provinceOfCity !== extracted.province)) continue;
    const regex = new RegExp(`${cityKey}(\\d+)?((?:IO|ID|AS|CO|[XYLFWKHVZJBMNPRT])*)$`, "i");
    const match = remainingString.match(regex);
    if (match) {
      extracted.city = cityName;
      remainingString = remainingString.slice(0, remainingString.length - match[0].length);
      break;
    }
  }

  const sortedCodes = [...siteCodes].sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (remainingString.startsWith(code)) {
      extracted.siteCode = code;
      remainingString = remainingString.slice(code.length);
      break;
    }
  }

  extracted.place = remainingString.trim();

  if (!extracted.city && extracted.place) {
    const cleanPlace = extracted.place.replace(/\d*(?:IO|ID|AS|CO|[XYLFWKHVZJBMNPRT])*$/i, "").trim().toUpperCase();
    for (const [city, barangays] of Object.entries(cityToBarangayMap)) {
      const provinceOfCity = cityToProvinceMap[city];
      if (extracted.province && provinceOfCity !== extracted.province) continue;
      if (barangays.map(b => b.toUpperCase()).includes(cleanPlace)) {
        extracted.city = city;
        extracted.place = cleanPlace;
        break;
      }
    }
  }

  if (!extracted.province && extracted.city) extracted.province = cityToProvinceMap[extracted.city] || "";
  if (extracted.province) {
    for (const [regionName, provinceArray] of Object.entries(regionsToProvincesMap)) {
      if (provinceArray.includes(extracted.province)) {
        extracted.region = regionName;
        break;
      }
    }
  }
  return extracted;
}

export function getTechSplits(suffix) {
  const s = (suffix || "").toUpperCase();
  let res = { g2: "", g4: "", g5: "" };

  if (!s || /^(?:ID|AS)+$/i.test(s)) res.g2 = "YES";

  for (let char of s) {
    if ("MNPRT".includes(char)) res.g5 += char;
    else if ("FHLKWYVB".includes(char)) res.g4 += char;
    else if (char === "X") res.g2 = "X";
  }
  return res;
}

export const getShortRegionByProvince = (province) => {
  if (!province) return "";
  
  const cleanProvince = String(province).toUpperCase().trim();

  for (const [region, provincesList] of Object.entries(regionsToProvincesMap)) {
    // Now it compares the cleaned string against your all-caps dictionary
    if (provincesList.includes(cleanProvince)) {
      return region;
    }
  }
  
  return ""; 
};

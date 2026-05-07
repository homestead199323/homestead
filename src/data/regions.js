/* CLIMATE REGIONS + lookup map. Phase A Commit 3, 2026-05-07 */

export const REGIONS = [
  {id:"western_europe",name:"Western Europe",emoji:"🌧️",desc:"Mild maritime climate, cool summers, rain year-round (USDA 7-9)",examples:"UK, Ireland, Belgium, Netherlands, NW France"},
  {id:"mediterranean",name:"Mediterranean",emoji:"🫒",desc:"Hot dry summers, mild wet winters (USDA 8b-10a)",examples:"Albania, S. Italy, Greece, Spain, Portugal"},
  {id:"northern_europe",name:"Northern Europe",emoji:"❄️",desc:"Cold winters, shorter growing season (USDA 5-7)",examples:"Germany, Scandinavia, Baltics, Poland, Czechia"},
  {id:"us_warm",name:"Southern & Western US",emoji:"☀️",desc:"Long warm summers, mild winters (USDA 7-10)",examples:"CA, TX, FL, AZ, GA, NC, Pacific NW lowlands, coastal BC"},
  {id:"us_cold",name:"Northern US & Canada",emoji:"🏔️",desc:"Harsh winters, warm short summers (USDA 3-6)",examples:"NY, MA, IL, MI, MN, CO, most of Canada"},
];
export const REGION_MAP = new Map(REGIONS.map(r => [r.id, r]));

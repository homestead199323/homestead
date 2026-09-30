import test from 'node:test';
import assert from 'node:assert/strict';
import {pickPlace} from '../src/lib/weather.js';
// Open-Meteo's search finds "London" but not "London, UK": the country part picks the right town.
test('Geocoding picks the town in the named country, and never a guess from another country',()=>{
  const r=[{name:'London',country:'Canada',country_code:'CA',latitude:42.98,longitude:-81.23},{name:'London',country:'United Kingdom',country_code:'GB',latitude:51.5,longitude:-0.12}];
  assert.equal(pickPlace(r,'UK').country_code,'GB');
  assert.equal(pickPlace(r,'Canada').country_code,'CA');
  assert.equal(pickPlace([{name:'Antalya',country:'Republic of Türkiye',country_code:'TR',latitude:36.9,longitude:30.7}],'Turkey').country_code,'TR');
  assert.equal(pickPlace([{name:'Amsterdam',country:'The Netherlands',country_code:'NL',latitude:52.4,longitude:4.9}],'Netherlands').country_code,'NL');
  assert.equal(pickPlace(r.slice(0,1),'UK'),null,'only a Canadian London → no weather rather than the wrong weather');
  assert.equal(pickPlace(r,'').country_code,'CA','no country given → first result');
  assert.equal(pickPlace([],'UK'),null);
});

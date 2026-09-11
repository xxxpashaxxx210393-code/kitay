const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "src", "app", "page.tsx");
const source = fs.readFileSync(file, "utf8");

const replacements = [
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,forWhom:e.currentTarget.value}:x))}',
    'onChange={e=>{const value=e.currentTarget.value;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,forWhom:value}:x))}}',
  ],
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,trackNumber:e.currentTarget.value}:x))}',
    'onChange={e=>{const value=e.currentTarget.value;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,trackNumber:value}:x))}}',
  ],
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,quantity:Number(e.currentTarget.value)||0}:x))}',
    'onChange={e=>{const value=Number(e.currentTarget.value)||0;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,quantity:value}:x))}}',
  ],
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,priceCny:Number(e.currentTarget.value)||0}:x))}',
    'onChange={e=>{const value=Number(e.currentTarget.value)||0;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,priceCny:value}:x))}}',
  ],
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,shippingBelarusByn:Number(e.currentTarget.value)||0}:x))}',
    'onChange={e=>{const value=Number(e.currentTarget.value)||0;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,shippingBelarusByn:value}:x))}}',
  ],
  [
    'onChange={e=>setOrders(prev=>prev.map(x=>x.id===o.id?{...x,weight:Number(e.currentTarget.value)||0}:x))}',
    'onChange={e=>{const value=Number(e.currentTarget.value)||0;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,weight:value}:x))}}',
  ],
  [
    'onChange={e=>applyCnyRateLive(e.target.value)} onBlur={e=>persistCnyRate(e.target.value)}',
    'onChange={e=>{const raw=e.currentTarget.value;setDefaultRateInput(raw);const value=Number(raw.replace(",","."));if(Number.isFinite(value)&&value>0){setDefaultRate(value);localStorage.setItem("cargo_cny_byn_rate",String(value));}}}',
  ],
  [
    'onChange={e=>saveCargoRates(Number(e.target.value), usdBynRate)}',
    'onChange={e=>{const raw=e.currentTarget.value;setCargoShippingUsdPerKgInput(raw);const value=Number(raw.replace(",","."));if(Number.isFinite(value)&&value>0){setCargoShippingUsdPerKg(value);localStorage.setItem("cargo_shipping_usd_per_kg",String(value));}}}',
  ],
  [
    'onChange={e=>saveCargoRates(cargoShippingUsdPerKg, Number(e.target.value))}',
    'onChange={e=>{const raw=e.currentTarget.value;setUsdBynRateInput(raw);const value=Number(raw.replace(",","."));if(Number.isFinite(value)&&value>0){setUsdBynRate(value);localStorage.setItem("cargo_usd_byn_rate",String(value));}}}',
  ],
];

let fixed = 0;
let output = source;
for (const [before, after] of replacements) {
  const count = output.split(before).length - 1;
  if (count > 0) {
    output = output.split(before).join(after);
    fixed += count;
  }
}

const rateStateAnchor = '  const [usdBynRate, setUsdBynRate] = useState<number>(3.25);';
const rateStateBlock = `  const [usdBynRate, setUsdBynRate] = useState<number>(3.25);
  const [defaultRateInput, setDefaultRateInput] = useState("0.4800");
  const [cargoShippingUsdPerKgInput, setCargoShippingUsdPerKgInput] = useState("5.5");
  const [usdBynRateInput, setUsdBynRateInput] = useState("3.25");`;

if (!output.includes('const [defaultRateInput, setDefaultRateInput]')) {
  if (!output.includes(rateStateAnchor)) throw new Error("Cargo rate state anchor was not found");
  output = output.replace(rateStateAnchor, rateStateBlock);
}

const rateStateHydration = `  // Restore saved cargo parameters without reloading the page.
  useEffect(() => {
    const readPositive = (key: string, fallback: number) => {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const cny = readPositive("cargo_cny_byn_rate", 0.4800);
    const usdKg = readPositive("cargo_shipping_usd_per_kg", 5.5);
    const usdByn = readPositive("cargo_usd_byn_rate", 3.25);
    setDefaultRate(cny);
    setCargoShippingUsdPerKg(usdKg);
    setUsdBynRate(usdByn);
    setDefaultRateInput(String(cny));
    setCargoShippingUsdPerKgInput(String(usdKg));
    setUsdBynRateInput(String(usdByn));
  }, []);`;

const hydrationStart = '  // Restore the three global cargo parameters without reloading the page.';
const hydrationEnd = '  }, []);';
if (!output.includes('setDefaultRateInput(String(cny))')) {
  const start = output.indexOf(hydrationStart);
  if (start >= 0) {
    const end = output.indexOf(hydrationEnd, start);
    if (end < 0) throw new Error("Cargo rate hydration block is incomplete");
    output = output.slice(0, start) + rateStateHydration + output.slice(end + hydrationEnd.length);
  } else {
    const stateEnd = output.indexOf(rateStateBlock) + rateStateBlock.length;
    output = output.slice(0, stateEnd) + "\n\n" + rateStateHydration + output.slice(stateEnd);
  }
}

output = output.replace('value={defaultRate} onChange={e=>{const raw=e.currentTarget.value;', 'value={defaultRateInput} onChange={e=>{const raw=e.currentTarget.value;');
output = output.replace('value={cargoShippingUsdPerKg} onChange={e=>{const raw=e.currentTarget.value;', 'value={cargoShippingUsdPerKgInput} onChange={e=>{const raw=e.currentTarget.value;');
output = output.replace('value={usdBynRate} onChange={e=>{const raw=e.currentTarget.value;', 'value={usdBynRateInput} onChange={e=>{const raw=e.currentTarget.value;');

const remainingUnsafe = /setOrders\(prev=>prev\.map\(x=>x\.id===o\.id\?\{\.\.\.x,[^}]*e\.currentTarget\.value/.test(output);
if (remainingUnsafe) throw new Error("Unsafe event access remains inside an orders state updater");
if (/applyCnyRateLive|persistCnyRate|saveCargoRates/.test(output)) throw new Error("Legacy cargo rate bridge calls remain in page.tsx");

const required = [
  'const [defaultRateInput, setDefaultRateInput]',
  'const [cargoShippingUsdPerKgInput, setCargoShippingUsdPerKgInput]',
  'const [usdBynRateInput, setUsdBynRateInput]',
  'value={defaultRateInput}',
  'value={cargoShippingUsdPerKgInput}',
  'value={usdBynRateInput}',
  'setDefaultRateInput(String(cny))',
  'setCargoShippingUsdPerKgInput(String(usdKg))',
  'setUsdBynRateInput(String(usdByn))',
];
if (!required.every(x => output.includes(x))) throw new Error("Cargo rate input migration is incomplete");

const allExpected = replacements.every(([, after]) => output.includes(after));
if (!allExpected) throw new Error("Expected inline or cargo-rate handlers were not found");

fs.writeFileSync(file, output, "utf8");
console.log(`Inline event fix: ${fixed === 0 ? "already applied" : `${fixed} handlers fixed`}`);

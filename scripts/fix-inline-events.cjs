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
    'onChange={e=>{const value=Number(e.currentTarget.value);if(Number.isFinite(value)&&value>0){setDefaultRate(value);localStorage.setItem("cargo_cny_byn_rate",String(value));}}}',
  ],
  [
    'onChange={e=>saveCargoRates(Number(e.target.value), usdBynRate)}',
    'onChange={e=>{const value=Number(e.currentTarget.value);if(Number.isFinite(value)&&value>0){setCargoShippingUsdPerKg(value);localStorage.setItem("cargo_shipping_usd_per_kg",String(value));}}}',
  ],
  [
    'onChange={e=>saveCargoRates(cargoShippingUsdPerKg, Number(e.target.value))}',
    'onChange={e=>{const value=Number(e.currentTarget.value);if(Number.isFinite(value)&&value>0){setUsdBynRate(value);localStorage.setItem("cargo_usd_byn_rate",String(value));}}}',
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
const rateStateHydration = `${rateStateAnchor}\n\n  // Restore the three global cargo parameters without reloading the page.\n  useEffect(() => {\n    const readPositive = (key: string, fallback: number) => {\n      const value = Number(localStorage.getItem(key));\n      return Number.isFinite(value) && value > 0 ? value : fallback;\n    };\n    setDefaultRate(readPositive("cargo_cny_byn_rate", 0.4800));\n    setCargoShippingUsdPerKg(readPositive("cargo_shipping_usd_per_kg", 5.5));\n    setUsdBynRate(readPositive("cargo_usd_byn_rate", 3.25));\n  }, []);`;

const hasHydration = output.includes('readPositive("cargo_cny_byn_rate"');
if (!hasHydration) {
  if (!output.includes(rateStateAnchor)) {
    throw new Error("Cargo rate state anchor was not found");
  }
  output = output.replace(rateStateAnchor, rateStateHydration);
}

const remainingUnsafe = /setOrders\(prev=>prev\.map\(x=>x\.id===o\.id\?\{\.\.\.x,[^}]*e\.currentTarget\.value/.test(output);
if (remainingUnsafe) {
  throw new Error("Unsafe event access remains inside an orders state updater");
}

const legacyRateCalls = /applyCnyRateLive|persistCnyRate|saveCargoRates/.test(output);
if (legacyRateCalls) {
  throw new Error("Legacy cargo rate bridge calls remain in page.tsx");
}

if (fixed === 0) {
  const inlineAlreadyFixed = replacements.slice(0, 6).every(([, after]) => output.includes(after));
  const rateAlreadyFixed = replacements.slice(6).every(([, after]) => output.includes(after));
  if (!inlineAlreadyFixed || !rateAlreadyFixed) {
    throw new Error("Expected inline or cargo-rate handlers were not found");
  }
} else if (fixed !== replacements.length) {
  throw new Error(`Inline event fix changed ${fixed} handlers; expected ${replacements.length}`);
}

fs.writeFileSync(file, output, "utf8");
console.log(`Inline event fix: ${fixed === 0 ? "already applied" : `${fixed} handlers fixed`}`);

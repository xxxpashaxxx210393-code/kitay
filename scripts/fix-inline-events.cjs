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

const remainingUnsafe = /setOrders\(prev=>prev\.map\(x=>x\.id===o\.id\?\{\.\.\.x,[^}]*e\.currentTarget\.value/.test(output);
if (remainingUnsafe) {
  throw new Error("Unsafe event access remains inside an orders state updater");
}

if (fixed === 0) {
  const alreadyFixed = replacements.every(([, after]) => output.includes(after));
  if (!alreadyFixed) {
    throw new Error("Inline event fix did not find the expected handlers");
  }
} else if (fixed !== replacements.length) {
  throw new Error(`Inline event fix changed ${fixed} handlers; expected ${replacements.length}`);
}

fs.writeFileSync(file, output, "utf8");
console.log(`Inline event fix: ${fixed === 0 ? "already applied" : `${fixed} handlers fixed`}`);

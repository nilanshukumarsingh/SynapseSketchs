import fs from 'fs';

const categories = [
  'airplane', 'banana', 'bicycle', 'bird', 'butterfly',
  'camel', 'coffee cup', 'cow', 'crab', 'dolphin',
  'duck', 'elephant', 'frog', 'giraffe', 'hamburger',
  'helicopter', 'horse', 'hot air balloon', 'ice cream', 'lion',
  'monkey', 'mushroom', 'octopus', 'owl', 'palm tree',
  'panda', 'penguin', 'pig', 'pizza', 'rabbit',
  'sailboat', 'scissors', 'shark', 'sheep', 'snail',
  'snake', 'snowflake', 'snowman', 'spider', 'strawberry',
  'sword', 'tiger', 'train', 'whale', 'windmill'
];

function strokesToSvg(drawing) {
  return drawing.map(stroke => {
    const [xs, ys] = stroke;
    if (!xs || xs.length === 0) return '';
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < xs.length; i++) {
      d += ` L ${xs[i]} ${ys[i]}`;
    }
    return d;
  }).filter(Boolean);
}

async function fetchCategory(cat) {
  const url = `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(cat)}.ndjson`;
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-15000' } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.recognized && data.drawing && data.drawing.length >= 2 && data.drawing.length <= 15) {
          const svgParts = strokesToSvg(data.drawing);
          const id = cat.toLowerCase().replace(/\s+/g, '_');
          const name = cat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return {
            id,
            name,
            keywords: [cat.toLowerCase(), `${cat.toLowerCase()}s`, `${cat.toLowerCase()} sketch`],
            description: `Authentic Quick, Draw! vector sketch of ${cat}`,
            viewBox: { width: 256, height: 256 },
            svgParts
          };
        }
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}

async function main() {
  console.log(`Parallel fetching ${categories.length} categories from Quick, Draw! dataset...`);
  const items = await Promise.all(categories.map(cat => fetchCategory(cat)));
  const results = items.filter(Boolean);
  fs.writeFileSync('./quickdraw-ingested.json', JSON.stringify(results, null, 2));
  console.log(`Successfully ingested and saved ${results.length} categories to quickdraw-ingested.json!`);
}

main();

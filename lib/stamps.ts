export type StampCategory = 'shapes' | 'symbols' | 'wireframe';

export interface StampDefinition {
  id: string;
  name: string;
  category: StampCategory;
  description: string;
  iconSvg: string; // Inner SVG path for 24x24 viewBox
  draw: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    filled: boolean,
    rotation?: number
  ) => void;
  toSvg: (
    x: number,
    y: number,
    size: number,
    color: string,
    filled: boolean,
    rotation?: number
  ) => string;
}

export const STAMP_DEFINITIONS: StampDefinition[] = [
  // =================== GEOMETRIC SHAPES ===================
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'shapes',
    description: 'Rounded rectangle or box container',
    iconSvg: '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 1.2;
      const h = size * 0.85;
      const r = Math.min(8, w * 0.1);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const w = size * 1.2;
      const h = size * 0.85;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'shapes',
    description: 'Smooth circle or ellipse',
    iconSvg: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const r = size / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const r = size / 2;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><circle cx="0" cy="0" r="${r}" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'shapes',
    description: 'Equilateral delta triangle',
    iconSvg: '<polygon points="12 3 22 21 2 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const h = size * 0.9;
      const w = size;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const h = size * 0.9;
      const w = size;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polygon points="0,${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}" fill="${fillAttr}" stroke="${color}" stroke-width="2" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'star',
    name: 'Star',
    category: 'shapes',
    description: 'Five-pointed geometric star',
    iconSvg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const outerR = size * 0.55;
      const innerR = outerR * 0.42;
      const spikes = 5;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(0, -outerR);
      for (let i = 0; i < spikes; i++) {
        let px = Math.cos(rot) * outerR;
        let py = Math.sin(rot) * outerR;
        ctx.lineTo(px, py);
        rot += step;

        px = Math.cos(rot) * innerR;
        py = Math.sin(rot) * innerR;
        ctx.lineTo(px, py);
        rot += step;
      }
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const outerR = size * 0.55;
      const innerR = outerR * 0.42;
      const spikes = 5;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      const pts: string[] = [];
      for (let i = 0; i < spikes; i++) {
        pts.push(`${(Math.cos(rot) * outerR).toFixed(1)},${(Math.sin(rot) * outerR).toFixed(1)}`);
        rot += step;
        pts.push(`${(Math.cos(rot) * innerR).toFixed(1)},${(Math.sin(rot) * innerR).toFixed(1)}`);
        rot += step;
      }
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polygon points="${pts.join(' ')}" fill="${fillAttr}" stroke="${color}" stroke-width="2" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'shapes',
    description: 'Decision rhombus block',
    iconSvg: '<polygon points="12 2 22 12 12 22 2 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = size * 0.55;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polygon points="0,${-s} ${s},0 0,${s} ${-s},0" fill="${fillAttr}" stroke="${color}" stroke-width="2" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'shapes',
    description: 'Smooth symmetrical heart',
    iconSvg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.045;
      ctx.scale(s, s);
      ctx.translate(-12, -12);
      ctx.beginPath();
      ctx.moveTo(12, 21.35);
      ctx.bezierCurveTo(3.5, 14, 0, 9.5, 0, 6);
      ctx.bezierCurveTo(0, 2.5, 2.5, 0, 6, 0);
      ctx.bezierCurveTo(8.5, 0, 10.5, 1.5, 12, 3.5);
      ctx.bezierCurveTo(13.5, 1.5, 15.5, 0, 18, 0);
      ctx.bezierCurveTo(21.5, 0, 24, 2.5, 24, 6);
      ctx.bezierCurveTo(24, 9.5, 20.5, 14, 12, 21.35);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M12 21.35 C3.5 14 0 9.5 0 6 C0 2.5 2.5 0 6 0 C8.5 0 10.5 1.5 12 3.5 C13.5 1.5 15.5 0 18 0 C21.5 0 24 2.5 24 6 C24 9.5 20.5 14 12 21.35 Z" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'shapes',
    description: 'Six-sided polygon',
    iconSvg: '<polygon points="21 16 12 21 3 16 3 8 12 3 21 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const r = size * 0.52;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = r * Math.cos(a);
        const py = r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const r = size * 0.52;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
      }
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polygon points="${pts.join(' ')}" fill="${fillAttr}" stroke="${color}" stroke-width="2" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    category: 'shapes',
    description: 'Callout and comic speech bubble',
    iconSvg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 1.15;
      const h = size * 0.75;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + r, -h / 2);
      ctx.lineTo(w / 2 - r, -h / 2);
      ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      ctx.lineTo(w / 2, h / 2 - r);
      ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      ctx.lineTo(-w / 8, h / 2);
      ctx.lineTo(-w / 4, h / 2 + size * 0.25);
      ctx.lineTo(-w / 4 + 6, h / 2);
      ctx.lineTo(-w / 2 + r, h / 2);
      ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      ctx.lineTo(-w / 2, -h / 2 + r);
      ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'shapes',
    description: 'Fluffy cloud boundary',
    iconSvg: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.045;
      ctx.scale(s, s);
      ctx.translate(-12, -12);
      ctx.beginPath();
      // SVG cloud path approximation
      ctx.arc(8, 14, 5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(12, 9, 5, Math.PI, Math.PI * 1.85);
      ctx.arc(17, 10, 4.5, Math.PI * 1.3, Math.PI * 2.1);
      ctx.arc(17.5, 15, 4, Math.PI * 1.8, Math.PI * 0.5);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },

  // =================== SYMBOLS & ICONS ===================
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'symbols',
    description: 'Directional block flow arrow',
    iconSvg: '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.55;
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.3);
      ctx.lineTo(s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.2, -s * 0.7);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.2, s * 0.7);
      ctx.lineTo(s * 0.2, s * 0.3);
      ctx.lineTo(-s, s * 0.3);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = size * 0.55;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><path d="M${-s} ${-s * 0.3} L${s * 0.2} ${-s * 0.3} L${s * 0.2} ${-s * 0.7} L${s} 0 L${s * 0.2} ${s * 0.7} L${s * 0.2} ${s * 0.3} L${-s} ${s * 0.3} Z" fill="${fillAttr}" stroke="${color}" stroke-width="2" /></g>`;
    }
  },
  {
    id: 'check',
    name: 'Checkmark',
    category: 'symbols',
    description: 'Task complete check badge',
    iconSvg: '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.1);
      ctx.lineTo(-s * 0.2, s * 0.6);
      ctx.lineTo(s * 0.9, -s * 0.7);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, size * 0.1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, _filled, rotation = 0) => {
      const s = size * 0.5;
      const deg = (rotation * 180) / Math.PI;
      const lw = Math.max(3, size * 0.1);
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polyline points="${-s * 0.8},${-s * 0.1} ${-s * 0.2},${s * 0.6} ${s * 0.9},${-s * 0.7}" fill="none" stroke="${color}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'cross',
    name: 'Cancel Cross',
    category: 'symbols',
    description: 'X delete / cancel badge',
    iconSvg: '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    draw: (ctx, x, y, size, color, _filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, size * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.moveTo(s, -s);
      ctx.lineTo(-s, s);
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, _filled, rotation = 0) => {
      const s = size * 0.45;
      const deg = (rotation * 180) / Math.PI;
      const lw = Math.max(3, size * 0.1);
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><line x1="${-s}" y1="${-s}" x2="${s}" y2="${s}" stroke="${color}" stroke-width="${lw}" stroke-linecap="round"/><line x1="${s}" y1="${-s}" x2="${-s}" y2="${s}" stroke="${color}" stroke-width="${lw}" stroke-linecap="round"/></g>`;
    }
  },
  {
    id: 'bolt',
    name: 'Lightning',
    category: 'symbols',
    description: 'Energy and electricity flash',
    iconSvg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.55;
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-s * 0.2, s);
      ctx.lineTo(s * 0.7, -s * 0.1);
      ctx.lineTo(0, -s * 0.1);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = size * 0.55;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><polygon points="${s * 0.1},${-s} ${-s * 0.7},0 0,0 ${-s * 0.2},${s} ${s * 0.7},${-s * 0.1} 0,${-s * 0.1}" fill="${fillAttr}" stroke="${color}" stroke-width="2" stroke-linejoin="round" /></g>`;
    }
  },
  {
    id: 'lightbulb',
    name: 'Lightbulb',
    category: 'symbols',
    description: 'Idea and inspiration lightbulb',
    iconSvg: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.045;
      ctx.scale(s, s);
      ctx.translate(-12, -12);
      ctx.beginPath();
      ctx.arc(12, 9, 6, Math.PI * 0.8, Math.PI * 0.2);
      ctx.lineTo(15, 17);
      ctx.lineTo(9, 17);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, 19);
      ctx.lineTo(14, 19);
      ctx.moveTo(11, 21);
      ctx.lineTo(13, 21);
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" fill="${fillAttr}" stroke="${color}" stroke-width="2" /><line x1="9" y1="18" x2="15" y2="18" stroke="${color}" stroke-width="2"/><line x1="10" y1="21" x2="14" y2="21" stroke="${color}" stroke-width="2"/></g>`;
    }
  },
  {
    id: 'pin',
    name: 'Location Pin',
    category: 'symbols',
    description: 'Map location pin marker',
    iconSvg: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.045;
      ctx.scale(s, s);
      ctx.translate(-12, -12);
      ctx.beginPath();
      ctx.arc(12, 9, 6.5, Math.PI * 0.75, Math.PI * 0.25, true);
      ctx.lineTo(12, 22);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 9, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = filled ? '#ffffff' : color;
      ctx.fill();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${fillAttr}" stroke="${color}" stroke-width="2" /><circle cx="12" cy="10" r="3" fill="${filled ? '#ffffff' : color}" /></g>`;
    }
  },
  {
    id: 'user',
    name: 'User Person',
    category: 'symbols',
    description: 'User profile avatar icon',
    iconSvg: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const r = size * 0.22;
      ctx.beginPath();
      ctx.arc(0, -size * 0.2, r, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, size * 0.5, size * 0.45, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke="${color}" stroke-width="2"/><circle cx="12" cy="7" r="4" fill="${fillAttr}" stroke="${color}" stroke-width="2"/></g>`;
    }
  },
  {
    id: 'flag',
    name: 'Flag Milestone',
    category: 'symbols',
    description: 'Milestone marker flag',
    iconSvg: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const s = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.9);
      ctx.lineTo(-s * 0.5, -s * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.9);
      ctx.bezierCurveTo(-s * 0.2, -s * 1.1, s * 0.2, -s * 0.7, s * 0.8, -s * 0.8);
      ctx.lineTo(s * 0.8, -s * 0.1);
      ctx.bezierCurveTo(s * 0.2, 0, -s * 0.2, -s * 0.4, -s * 0.5, -s * 0.2);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const s = (size * 0.045).toFixed(3);
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)}) scale(${s}) translate(-12,-12)"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="${fillAttr}" stroke="${color}" stroke-width="2"/><line x1="4" y1="22" x2="4" y2="15" stroke="${color}" stroke-width="2"/></g>`;
    }
  },

  // =================== WIREFRAME & UI COMPONENTS ===================
  {
    id: 'browser-ui',
    name: 'Browser Window',
    category: 'wireframe',
    description: 'Web page mockup frame with title bar',
    iconSvg: '<rect width="20" height="16" x="2" y="4" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 9h20"/><circle cx="5.5" cy="6.5" r=".75" fill="currentColor"/><circle cx="8" cy="6.5" r=".75" fill="currentColor"/><circle cx="10.5" cy="6.5" r=".75" fill="currentColor"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 1.3;
      const h = size * 0.9;
      const r = 6;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      if (filled) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = color;
      ctx.stroke();

      // Top bar line
      const barY = -h / 2 + h * 0.22;
      ctx.beginPath();
      ctx.moveTo(-w / 2, barY);
      ctx.lineTo(w / 2, barY);
      ctx.stroke();

      // 3 dots
      const dotR = Math.max(1.5, size * 0.035);
      const dotY = -h / 2 + h * 0.11;
      const startX = -w / 2 + 10;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * (dotR * 3.5), dotY, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();
    },
    toSvg: (x, y, size, color, _filled, rotation = 0) => {
      const w = size * 1.3;
      const h = size * 0.9;
      const deg = (rotation * 180) / Math.PI;
      const barY = -h / 2 + h * 0.22;
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="none" stroke="${color}" stroke-width="2"/><line x1="${-w / 2}" y1="${barY}" x2="${w / 2}" y2="${barY}" stroke="${color}" stroke-width="1.5"/><circle cx="${-w / 2 + 10}" cy="${-h / 2 + 7}" r="2" fill="${color}"/><circle cx="${-w / 2 + 17}" cy="${-h / 2 + 7}" r="2" fill="${color}"/><circle cx="${-w / 2 + 24}" cy="${-h / 2 + 7}" r="2" fill="${color}"/></g>`;
    }
  },
  {
    id: 'mobile-ui',
    name: 'Mobile Phone',
    category: 'wireframe',
    description: 'Smartphone frame with speaker notch',
    iconSvg: '<rect width="14" height="20" x="5" y="2" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 18h.01"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 0.65;
      const h = size * 1.25;
      const r = 8;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      if (filled) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = color;
      ctx.stroke();

      // Top speaker pill
      ctx.beginPath();
      ctx.roundRect(-w * 0.2, -h / 2 + 6, w * 0.4, 2.5, 1.2);
      ctx.fillStyle = color;
      ctx.fill();

      // Bottom home indicator bar
      ctx.beginPath();
      ctx.roundRect(-w * 0.25, h / 2 - 8, w * 0.5, 2.5, 1.2);
      ctx.fill();
      ctx.restore();
    },
    toSvg: (x, y, size, color, _filled, rotation = 0) => {
      const w = size * 0.65;
      const h = size * 1.25;
      const deg = (rotation * 180) / Math.PI;
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="none" stroke="${color}" stroke-width="2"/><rect x="${-w * 0.2}" y="${-h / 2 + 6}" width="${w * 0.4}" height="2.5" rx="1.2" fill="${color}"/><rect x="${-w * 0.25}" y="${h / 2 - 8}" width="${w * 0.5}" height="2.5" rx="1.2" fill="${color}"/></g>`;
    }
  },
  {
    id: 'button-ui',
    name: 'Button Pill',
    category: 'wireframe',
    description: 'Interactive button component with placeholder text line',
    iconSvg: '<rect width="18" height="10" x="3" y="7" rx="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    draw: (ctx, x, y, size, color, filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 1.35;
      const h = size * 0.55;
      const r = h / 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.stroke();

      // Center text line
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, 0);
      ctx.lineTo(w * 0.25, 0);
      ctx.strokeStyle = filled ? '#ffffff' : color;
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, filled, rotation = 0) => {
      const w = size * 1.35;
      const h = size * 0.55;
      const r = h / 2;
      const deg = (rotation * 180) / Math.PI;
      const fillAttr = filled ? color : 'none';
      const textStroke = filled ? '#ffffff' : color;
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}" fill="${fillAttr}" stroke="${color}" stroke-width="2"/><line x1="${-w * 0.25}" y1="0" x2="${w * 0.25}" y2="0" stroke="${textStroke}" stroke-width="2" stroke-linecap="round"/></g>`;
    }
  },
  {
    id: 'card-ui',
    name: 'Card Container',
    category: 'wireframe',
    description: 'Wireframe card with image box and text lines',
    iconSvg: '<rect width="18" height="18" x="3" y="3" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="7" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width="2"/><line x1="7" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="2"/>',
    draw: (ctx, x, y, size, color, _filled, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const w = size * 1.1;
      const h = size * 1.25;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.strokeStyle = color;
      ctx.stroke();

      // Top media block
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.4, 3);
      ctx.stroke();

      // Text line 1
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 8, h * 0.1);
      ctx.lineTo(w / 2 - 8, h * 0.1);
      ctx.stroke();

      // Text line 2
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 8, h * 0.25);
      ctx.lineTo(w / 2 - 24, h * 0.25);
      ctx.stroke();
      ctx.restore();
    },
    toSvg: (x, y, size, color, _filled, rotation = 0) => {
      const w = size * 1.1;
      const h = size * 1.25;
      const deg = (rotation * 180) / Math.PI;
      return `<g transform="translate(${x},${y}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="none" stroke="${color}" stroke-width="2"/><rect x="${-w / 2 + 6}" y="${-h / 2 + 6}" width="${w - 12}" height="${h * 0.4}" rx="3" fill="none" stroke="${color}" stroke-width="1.5"/><line x1="${-w / 2 + 8}" y1="${h * 0.1}" x2="${w / 2 - 8}" y2="${h * 0.1}" stroke="${color}" stroke-width="1.5"/><line x1="${-w / 2 + 8}" y1="${h * 0.25}" x2="${w / 2 - 24}" y2="${h * 0.25}" stroke="${color}" stroke-width="1.5"/></g>`;
    }
  }
];

export const STAMP_MAP = new Map<string, StampDefinition>(
  STAMP_DEFINITIONS.map(stamp => [stamp.id, stamp])
);

export function getStampDefinition(id?: string): StampDefinition {
  if (!id) return STAMP_DEFINITIONS[0];
  return STAMP_MAP.get(id) || STAMP_DEFINITIONS[0];
}

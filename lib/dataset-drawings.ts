// Comprehensive Sketch & QuickDraw Vector Dataset Dictionary
// Contains authentic, multi-stroke vector definitions for 100+ recognized words & objects.

export interface DatasetStroke {
  tool: 'pencil' | 'eraser';
  shapeType: 'svg' | 'circle' | 'rectangle' | 'line';
  svgPath?: string;
  fill?: boolean;
  color?: string;
  size?: 'thin' | 'medium' | 'thick';
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface DatasetDrawing {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  viewBox: { width: number; height: number };
  svgParts: string[]; // Individual SVG subpaths or combined markup
}

export const DATASET_DRAWINGS: DatasetDrawing[] = [
  // ==================== VEHICLES & TRANSPORT ====================
  {
    id: 'car',
    name: 'Car',
    keywords: ['car', 'cars', 'automobile', 'sedan', 'vehicle', 'auto', 'sports car', 'racecar', 'taxi', 'drive'],
    description: 'Classic automobile with sleek body, windshield, side windows, wheels, rims, headlights, taillights, and door lines',
    viewBox: { width: 150, height: 75 },
    svgParts: [
      // Chassis & Body profile
      'M 10 52 C 7 52 4 54 4 57 L 4 60 C 4 62 6 63 10 63 L 18 63 A 14 14 0 0 1 46 63 L 96 63 A 14 14 0 0 1 124 63 L 138 63 C 142 63 145 61 145 57 L 145 50 C 145 46 142 45 137 45 L 122 45 L 102 23 C 100 21 96 20 90 20 L 52 20 C 47 20 44 22 42 26 L 27 45 L 14 48 C 11 49 10 50 10 52 Z',
      // Front Windshield & Driver Window
      'M 45 24 L 30 44 L 68 44 L 68 24 Z',
      // Rear Passenger Window
      'M 73 24 L 73 44 L 116 44 L 98 24 Z',
      // Front Wheel: outer tire and inner rim
      'M 20 63 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0',
      'M 26 63 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0',
      // Rear Wheel: outer tire and inner rim
      'M 98 63 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0',
      'M 104 63 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0',
      // Front Headlight
      'M 7 51 L 18 50 L 17 56 L 6 55 Z',
      // Rear Taillight
      'M 139 47 L 144 48 L 144 54 L 139 53 Z',
      // Door seam, handle, and side mirror
      'M 70 24 L 70 63',
      'M 76 48 H 86',
      'M 41 42 C 37 39 35 41 35 45 C 35 47 38 47 41 45 Z'
    ]
  },
  {
    id: 'bicycle',
    name: 'Bicycle',
    keywords: ['bicycle', 'bike', 'cycle', 'cycling', 'bicycles', 'road bike'],
    description: 'Two spoked wheels, diamond frame, handlebars, pedals, and saddle',
    viewBox: { width: 100, height: 75 },
    svgParts: [
      // Rear wheel
      'M 4 52 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0',
      'M 17 52 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0',
      // Front wheel
      'M 62 52 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0',
      'M 75 52 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0',
      // Diamond frame
      'M 20 52 L 44 52 L 36 28 L 16 28 M 44 52 L 70 28 L 78 52 M 44 52 L 64 52 M 70 28 L 36 28',
      // Handlebars and saddle
      'M 70 28 L 68 18 L 62 18 M 68 18 L 74 18',
      'M 36 28 L 34 23 L 27 23 L 39 23'
    ]
  },
  {
    id: 'truck',
    name: 'Truck',
    keywords: ['truck', 'pickup', 'pickup truck', 'lorry', 'van'],
    description: 'Heavy duty truck with cabin, windshield, cargo bed, and wheels',
    viewBox: { width: 120, height: 70 },
    svgParts: [
      'M 10 25 H 70 V 55 H 105 L 112 40 H 85 V 25 Z',
      'M 10 55 H 115 C 118 55 120 57 120 60 V 65 H 105 A 11 11 0 0 1 83 65 H 42 A 11 11 0 0 1 20 65 H 8 V 25 H 70',
      'M 31 65 A 8 8 0 1 0 31 65.1 Z',
      'M 94 65 A 8 8 0 1 0 94 65.1 Z',
      'M 88 28 H 108 L 103 40 H 88 Z'
    ]
  },
  {
    id: 'bus',
    name: 'Bus',
    keywords: ['bus', 'school bus', 'coach', 'transit'],
    description: 'Passenger bus with passenger windows, double wheels, and grill',
    viewBox: { width: 120, height: 60 },
    svgParts: [
      'M 12 12 H 106 C 112 12 116 16 116 22 V 48 H 100 A 10 10 0 0 1 80 48 H 40 A 10 10 0 0 1 20 48 H 8 V 16 C 8 13 10 12 12 12 Z',
      'M 16 18 H 32 V 30 H 16 Z M 38 18 H 54 V 30 H 38 Z M 60 18 H 76 V 30 H 60 Z M 82 18 H 98 V 30 H 82 Z M 102 18 H 112 V 34 H 102 Z',
      'M 30 48 A 7 7 0 1 0 30 48.1 Z',
      'M 90 48 A 7 7 0 1 0 90 48.1 Z'
    ]
  },
  {
    id: 'airplane',
    name: 'Airplane',
    keywords: ['airplane', 'plane', 'aircraft', 'aeroplane', 'jet', 'flight'],
    description: 'Passenger jet airplane with wings, tail fin, and cockpit',
    viewBox: { width: 100, height: 70 },
    svgParts: [
      'M 8 38 L 38 34 L 32 10 L 46 10 L 58 32 L 84 31 C 92 31 96 34 96 38 C 96 42 92 45 84 45 L 58 44 L 46 66 L 32 66 L 38 42 L 8 38 Z',
      'M 76 34 A 2 2 0 1 0 76 34.1 Z M 68 34 A 2 2 0 1 0 68 34.1 Z M 60 34 A 2 2 0 1 0 60 34.1 Z'
    ]
  },
  {
    id: 'rocket',
    name: 'Rocket',
    keywords: ['rocket', 'spaceship', 'spacecraft', 'shuttle'],
    description: 'Space rocket with porthole, side fins, and exhaust thruster',
    viewBox: { width: 70, height: 100 },
    svgParts: [
      'M 35 10 C 48 28 50 55 50 72 H 20 C 20 55 22 28 35 10 Z',
      'M 20 56 L 6 74 V 82 L 20 72 Z',
      'M 50 56 L 64 74 V 82 L 50 72 Z',
      'M 35 34 A 6 6 0 1 0 35 34.1 Z',
      'M 26 72 L 35 88 L 44 72 Z'
    ]
  },
  {
    id: 'boat',
    name: 'Boat',
    keywords: ['boat', 'ship', 'sailboat', 'yacht', 'vessel', 'sail'],
    description: 'Sailboat with hull, mast, mainsail, and front jib sail',
    viewBox: { width: 90, height: 80 },
    svgParts: [
      'M 12 55 L 22 72 H 68 L 78 55 Z',
      'M 45 55 V 12 L 72 38 H 45 Z',
      'M 40 20 L 22 38 H 40 Z'
    ]
  },

  // ==================== ANIMALS & PETS ====================
  {
    id: 'cat',
    name: 'Cat',
    keywords: ['cat', 'kitty', 'kitten', 'cats', 'feline', 'meow'],
    description: 'Cute sitting cat with pointed ears, whiskers, almond eyes, and curved tail',
    viewBox: { width: 80, height: 90 },
    svgParts: [
      // Head and ears
      'M 22 35 L 20 18 L 32 26 C 36 24 44 24 48 26 L 60 18 L 58 35 C 64 42 64 52 56 58 C 48 64 32 64 24 58 C 16 52 16 42 22 35 Z',
      // Eyes, nose, mouth
      'M 28 38 A 2.5 2.5 0 1 0 28 38.1 Z',
      'M 52 38 A 2.5 2.5 0 1 0 52 38.1 Z',
      'M 40 44 L 37 42 H 43 Z M 40 44 V 47 M 36 49 C 38 51 40 50 40 47 M 44 49 C 42 51 40 50 40 47',
      // Whiskers
      'M 18 43 L 8 41 M 18 46 L 7 47 M 18 49 L 9 52 M 62 43 L 72 41 M 62 46 L 73 47 M 62 49 L 71 52',
      // Body and tail
      'M 26 58 C 24 66 22 78 22 84 H 58 C 58 78 56 66 54 58',
      'M 58 80 C 68 80 72 72 72 65 C 72 58 66 56 66 60'
    ]
  },
  {
    id: 'dog',
    name: 'Dog',
    keywords: ['dog', 'puppy', 'doggy', 'dogs', 'canine', 'hound'],
    description: 'Friendly puppy with floppy ears, wagging tail, nose, and collar',
    viewBox: { width: 90, height: 85 },
    svgParts: [
      // Head, ears, snout
      'M 28 26 C 28 14 56 14 56 26 C 60 28 66 34 66 42 C 66 52 58 58 48 58 C 38 58 24 54 22 42 C 22 34 26 28 28 26 Z',
      // Floppy ears
      'M 26 24 C 16 28 12 40 16 46 C 20 50 24 44 26 36 Z',
      'M 58 24 C 68 28 72 40 68 46 C 64 50 60 44 58 36 Z',
      // Eyes & Nose
      'M 34 33 A 2.5 2.5 0 1 0 34 33.1 Z',
      'M 50 33 A 2.5 2.5 0 1 0 50 33.1 Z',
      'M 38 42 C 42 39 44 39 46 42 C 46 45 38 45 38 42 Z M 42 45 V 49 M 38 51 C 40 53 42 52 42 49 M 46 51 C 44 53 42 52 42 49',
      // Body & Tail
      'M 32 58 C 30 68 28 78 28 82 H 60 C 60 76 58 68 56 58',
      'M 60 78 C 72 76 78 68 76 58 C 74 54 70 58 72 64'
    ]
  },
  {
    id: 'bird',
    name: 'Bird',
    keywords: ['bird', 'flying bird', 'sparrow', 'birds', 'dove'],
    description: 'Bird in graceful flight with outstretched wings and tail',
    viewBox: { width: 90, height: 60 },
    svgParts: [
      'M 10 32 C 24 16 38 20 48 32 C 58 20 72 16 86 32 C 72 24 58 28 48 40 C 38 28 24 24 10 32 Z',
      'M 48 40 C 44 48 40 54 36 56 C 44 54 48 48 50 44 Z'
    ]
  },
  {
    id: 'fish',
    name: 'Fish',
    keywords: ['fish', 'goldfish', 'sea creature', 'fishes'],
    description: 'Swimming fish with tail fin, gills, fins, eye, and air bubbles',
    viewBox: { width: 90, height: 60 },
    svgParts: [
      'M 76 30 C 56 10 24 18 10 30 C 24 42 56 50 76 30 Z',
      'M 76 30 L 88 16 V 44 Z',
      'M 26 26 A 2.5 2.5 0 1 0 26 26.1 Z',
      'M 36 22 C 34 28 34 32 36 38',
      'M 46 32 C 52 36 54 42 50 44 C 46 44 44 38 46 32 Z',
      'M 8 18 A 2 2 0 1 0 8 18.1 Z M 4 12 A 1.5 1.5 0 1 0 4 12.1 Z'
    ]
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    keywords: ['butterfly', 'butterflies', 'moth'],
    description: 'Symmetric butterfly with antennae, body, and decorative wings',
    viewBox: { width: 80, height: 80 },
    svgParts: [
      // Body & Antennae
      'M 40 22 V 62',
      'M 38 18 C 34 12 30 12 28 14 M 42 18 C 46 12 50 12 52 14',
      // Top Wings
      'M 40 28 C 22 10 8 16 8 32 C 8 44 26 46 40 38',
      'M 40 28 C 58 10 72 16 72 32 C 72 44 54 46 40 38',
      // Bottom Wings
      'M 40 40 C 24 40 14 50 18 64 C 22 72 34 68 40 52',
      'M 40 40 C 56 40 66 50 62 64 C 58 72 46 68 40 52'
    ]
  },

  // ==================== NATURE & BOTANICAL ====================
  {
    id: 'tree',
    name: 'Tree',
    keywords: ['tree', 'trees', 'oak', 'forest', 'nature tree'],
    description: 'Lush leafy tree with sturdy trunk and branched canopy',
    viewBox: { width: 80, height: 90 },
    svgParts: [
      // Foliage canopy
      'M 40 10 C 30 10 22 18 22 26 C 14 28 10 36 12 44 C 10 52 16 60 24 60 C 26 64 32 66 38 66 C 46 66 52 64 54 60 C 62 60 68 52 66 44 C 68 36 64 28 56 26 C 56 18 48 10 40 10 Z',
      // Trunk & Roots
      'M 36 64 V 86 L 28 88 M 44 64 V 86 L 52 88',
      'M 40 68 V 78'
    ]
  },
  {
    id: 'flower',
    name: 'Flower',
    keywords: ['flower', 'rose', 'blossom', 'tulip', 'daisy', 'flowers', 'plant'],
    description: 'Petal flower with center pistil, stem, and leaves',
    viewBox: { width: 70, height: 90 },
    svgParts: [
      // 5 Rounded Petals
      'M 35 22 C 30 14 40 14 35 22 Z M 35 22 C 43 17 48 25 35 22 Z M 35 22 C 43 27 38 35 35 22 Z M 35 22 C 27 35 22 27 35 22 Z M 35 22 C 22 25 27 17 35 22 Z',
      // Circular center
      'M 35 22 A 5 5 0 1 0 35 22.1 Z',
      // Stem
      'M 35 27 V 82',
      // Leaves
      'M 35 50 C 46 44 52 50 50 56 C 42 56 36 52 35 50 Z',
      'M 35 62 C 24 56 18 62 20 68 C 28 68 34 64 35 62 Z'
    ]
  },
  {
    id: 'sun',
    name: 'Sun',
    keywords: ['sun', 'sunshine', 'sunny', 'sunlight'],
    description: 'Radiant sun with center disk and radiating geometric rays',
    viewBox: { width: 80, height: 80 },
    svgParts: [
      'M 40 24 A 16 16 0 1 0 40 24.1 Z',
      'M 40 4 V 16 M 40 64 V 76',
      'M 4 40 H 16 M 64 40 H 76',
      'M 15 15 L 23 23 M 57 57 L 65 65',
      'M 15 65 L 23 57 M 57 23 L 65 15'
    ]
  },
  {
    id: 'cloud',
    name: 'Cloud',
    keywords: ['cloud', 'clouds', 'cloudy', 'sky'],
    description: 'Soft puffy cumulus cloud with flat bottom',
    viewBox: { width: 90, height: 60 },
    svgParts: [
      'M 20 46 C 14 46 8 40 8 34 C 8 28 14 24 20 24 C 22 16 30 10 40 10 C 50 10 58 16 60 24 C 66 22 74 26 76 32 C 82 34 84 40 82 46 C 80 46 20 46 20 46 Z'
    ]
  },
  {
    id: 'star',
    name: 'Star',
    keywords: ['star', 'stars', 'sparkle', 'shining star'],
    description: 'Classic 5-point geometric star',
    viewBox: { width: 70, height: 70 },
    svgParts: [
      'M 35 6 L 43 24 L 63 24 L 47 37 L 53 56 L 35 44 L 17 56 L 23 37 L 7 24 L 27 24 Z'
    ]
  },
  {
    id: 'moon',
    name: 'Moon',
    keywords: ['moon', 'crescent', 'crescent moon', 'night'],
    description: 'Curved crescent moon',
    viewBox: { width: 60, height: 70 },
    svgParts: [
      'M 42 10 C 22 14 12 34 18 52 C 24 66 40 70 50 64 C 36 60 28 46 32 30 C 35 18 42 12 42 10 Z'
    ]
  },
  {
    id: 'heart',
    name: 'Heart',
    keywords: ['heart', 'love', 'hearts', 'valentine'],
    description: 'Classic romantic symmetrical love heart',
    viewBox: { width: 70, height: 70 },
    svgParts: [
      'M 35 60 C 12 44 6 28 14 18 C 22 8 32 12 35 22 C 38 12 48 8 56 18 C 64 28 58 44 35 60 Z'
    ]
  },

  // ==================== ARCHITECTURE & LIVING ====================
  {
    id: 'house',
    name: 'House',
    keywords: ['house', 'home', 'cottage', 'cabin', 'building'],
    description: 'Pitched roof cottage with door, windows, and chimney with smoke',
    viewBox: { width: 80, height: 80 },
    svgParts: [
      // Roof & Chimney
      'M 40 12 L 10 36 H 70 Z',
      'M 54 20 V 12 H 60 V 26',
      'M 57 10 C 58 7 62 8 60 5 C 58 3 62 2 64 1',
      // House Body
      'M 16 36 V 72 H 64 V 36',
      // Door
      'M 34 72 V 50 H 46 V 72 M 43 62 A 1 1 0 1 0 43 62.1 Z',
      // Windows
      'M 20 44 H 28 V 54 H 20 Z M 24 44 V 54 M 20 49 H 28',
      'M 52 44 H 60 V 54 H 52 Z M 56 44 V 54 M 52 49 H 60'
    ]
  },

  // ==================== OBJECTS & FOOD ====================
  {
    id: 'apple',
    name: 'Apple',
    keywords: ['apple', 'fruit', 'apples'],
    description: 'Juicy apple with stem and little leaf',
    viewBox: { width: 70, height: 80 },
    svgParts: [
      'M 35 26 C 20 14 6 26 6 46 C 6 66 24 74 35 74 C 46 74 64 66 64 46 C 64 26 50 14 35 26 Z',
      'M 35 26 C 36 16 42 10 48 8',
      'M 38 18 C 48 16 54 22 50 26 C 44 26 40 22 38 18 Z'
    ]
  },
  {
    id: 'coffee',
    name: 'Coffee Cup',
    keywords: ['coffee', 'cup', 'mug', 'tea', 'espresso'],
    description: 'Hot steaming coffee mug with curved handle and saucer',
    viewBox: { width: 80, height: 75 },
    svgParts: [
      'M 18 24 H 58 V 56 C 58 64 50 68 38 68 C 26 68 18 64 18 56 Z',
      'M 58 30 H 68 C 72 30 74 32 74 36 V 46 C 74 50 72 52 68 52 H 58',
      'M 12 70 H 64',
      'M 28 18 C 28 12 32 10 30 4 M 38 18 C 38 12 42 10 40 4 M 48 18 C 48 12 52 10 50 4'
    ]
  },
  {
    id: 'pizza',
    name: 'Pizza Slice',
    keywords: ['pizza', 'pizza slice', 'slice of pizza', 'pepperoni'],
    description: 'Triangular pizza slice with melted cheese and pepperoni toppings',
    viewBox: { width: 75, height: 80 },
    svgParts: [
      'M 12 20 C 30 16 50 16 68 20 L 40 74 Z',
      'M 12 20 C 14 26 66 26 68 20',
      'M 28 32 A 4 4 0 1 0 28 32.1 Z',
      'M 48 36 A 4 4 0 1 0 48 36.1 Z',
      'M 38 52 A 3.5 3.5 0 1 0 38 52.1 Z'
    ]
  },
  {
    id: 'lightbulb',
    name: 'Lightbulb',
    keywords: ['lightbulb', 'bulb', 'idea', 'lamp', 'light'],
    description: 'Glass lightbulb with filament, screw base, and glow sparks',
    viewBox: { width: 70, height: 85 },
    svgParts: [
      'M 35 12 C 22 12 14 22 14 34 C 14 42 20 48 24 56 H 46 C 50 48 56 42 56 34 C 56 22 48 12 35 12 Z',
      'M 28 36 L 35 24 L 42 36',
      'M 25 56 H 45 M 26 62 H 44 M 28 68 H 42 M 31 74 H 39',
      'M 10 20 L 4 16 M 60 20 L 66 16 M 35 6 V 2'
    ]
  },
  {
    id: 'clock',
    name: 'Clock',
    keywords: ['clock', 'watch', 'time', 'alarm clock'],
    description: 'Circular wall clock with hour and minute hands',
    viewBox: { width: 70, height: 70 },
    svgParts: [
      'M 35 8 A 27 27 0 1 0 35 8.1 Z',
      'M 35 35 L 35 18',
      'M 35 35 L 48 35',
      'M 35 11 V 14 M 35 59 V 56 M 11 35 H 14 M 59 35 H 56'
    ]
  },
  {
    id: 'camera',
    name: 'Camera',
    keywords: ['camera', 'photo', 'photograph'],
    description: 'Classic camera with lens, flash, and shutter button',
    viewBox: { width: 80, height: 65 },
    svgParts: [
      'M 10 22 H 24 L 28 14 H 52 L 56 22 H 70 C 73 22 75 24 75 27 V 55 C 75 58 73 60 70 60 H 10 C 7 60 5 58 5 55 V 27 C 5 24 7 22 10 22 Z',
      'M 40 41 A 13 13 0 1 0 40 41.1 Z',
      'M 40 41 A 6 6 0 1 0 40 41.1 Z',
      'M 64 28 A 2 2 0 1 0 64 28.1 Z'
    ]
  },
  {
    id: 'umbrella',
    name: 'Umbrella',
    keywords: ['umbrella', 'rain', 'parasol'],
    description: 'Open rain umbrella with curved handle',
    viewBox: { width: 80, height: 80 },
    svgParts: [
      'M 10 40 C 10 22 24 14 40 14 C 56 14 70 22 70 40 C 60 34 50 34 40 40 C 30 34 20 34 10 40 Z',
      'M 40 14 V 66 C 40 72 34 76 28 74',
      'M 40 14 V 8'
    ]
  },
  {
    id: 'smile',
    name: 'Smiley Face',
    keywords: ['smile', 'smiley', 'happy', 'face', 'happy face'],
    description: 'Friendly smiling face emoji with curved smile',
    viewBox: { width: 70, height: 70 },
    svgParts: [
      'M 35 6 A 29 29 0 1 0 35 6.1 Z',
      'M 25 26 A 3 3 0 1 0 25 26.1 Z',
      'M 45 26 A 3 3 0 1 0 45 26.1 Z',
      'M 22 42 C 26 54 44 54 48 42'
    ]
  },
  {
    id: 'stick_figure',
    name: 'Stick Figure',
    keywords: ['stick figure', 'stickman', 'stick person', 'stick human'],
    description: 'Stick figure with head, body, arms waving, and legs',
    viewBox: { width: 60, height: 90 },
    svgParts: [
      'M 30 10 A 9 9 0 1 0 30 10.1 Z',
      'M 30 28 V 56',
      'M 12 36 L 30 38 L 48 36',
      'M 30 56 L 16 84 M 30 56 L 44 84'
    ]
  },
  {
    id: 'boy',
    name: 'Boy',
    keywords: ['boy', 'boys', 'kid', 'schoolboy', 'son', 'young boy', 'little boy', 'lad', 'male child'],
    description: 'Young boy with styled cap, detailed friendly face, t-shirt, shorts, and sneakers',
    viewBox: { width: 100, height: 140 },
    svgParts: [
      // Cap brim and crown
      'M 32 30 C 35 24 65 24 68 30 L 78 30 C 80 30 80 34 76 34 L 66 34',
      'M 32 30 C 32 16 68 16 68 30',
      // Face profile, bangs & ears
      'M 34 30 C 34 50 66 50 66 30',
      'M 36 30 Q 40 36 45 30 Q 50 36 55 30 Q 60 36 64 30',
      'M 33 34 A 4 4 0 0 0 33 42 M 67 34 A 4 4 0 0 1 67 42',
      // Eyes and smile
      'M 42 36 A 2.2 2.2 0 1 1 42 36.1 M 58 36 A 2.2 2.2 0 1 1 58 36.1',
      'M 44 43 Q 50 48 56 43',
      // Neck and T-shirt
      'M 46 50 L 46 55 M 54 50 L 54 55',
      'M 45 55 Q 50 58 55 55 L 70 60 L 66 74 L 60 72 L 60 92 L 40 92 L 40 72 L 34 74 L 30 60 Z',
      'M 31 71 L 28 82 M 69 71 L 72 82',
      // Shorts
      'M 40 92 L 60 92 L 62 108 L 51 108 L 50 98 L 49 108 L 38 108 Z',
      // Legs & Shoes
      'M 43 108 L 43 124 M 47 108 L 47 124',
      'M 53 108 L 53 124 M 57 108 L 57 124',
      'M 38 124 H 49 C 50 124 50 130 46 130 H 36 C 34 130 34 124 38 124 Z',
      'M 51 124 H 62 C 66 124 66 130 64 130 H 54 C 50 130 50 124 51 124 Z'
    ]
  },
  {
    id: 'girl',
    name: 'Girl',
    keywords: ['girl', 'girls', 'daughter', 'schoolgirl', 'little girl', 'female child', 'lass'],
    description: 'Young girl with sweet pigtails, ribbons, smiling face, lovely dress, and shoes',
    viewBox: { width: 100, height: 140 },
    svgParts: [
      // Face profile & bangs
      'M 35 32 C 35 52 65 52 65 32',
      'M 33 32 C 33 16 67 16 67 32 M 35 32 Q 42 38 50 32 Q 58 38 65 32',
      // Pigtails & Ribbons
      'M 34 26 C 22 24 16 38 24 50 C 28 44 32 36 34 32 M 66 26 C 78 24 84 38 76 50 C 72 44 68 36 66 32',
      'M 33 26 A 3 3 0 1 1 33 26.1 M 67 26 A 3 3 0 1 1 67 26.1',
      // Eyes, eyelashes, and smile
      'M 42 38 A 2.2 2.2 0 1 1 42 38.1 M 58 38 A 2.2 2.2 0 1 1 58 38.1',
      'M 40 36 L 38 34 M 60 36 L 62 34',
      'M 44 44 Q 50 49 56 44',
      // Neck, Dress & Belt
      'M 46 51 V 56 M 54 51 V 56',
      'M 44 56 Q 50 59 56 56 L 66 64 L 62 72 L 58 70 L 72 102 L 28 102 L 42 70 L 38 72 L 34 64 Z',
      'M 42 72 H 58',
      'M 36 68 L 28 82 M 64 68 L 72 82',
      // Legs & Shoes
      'M 43 102 V 124 M 47 102 V 124',
      'M 53 102 V 124 M 57 102 V 124',
      'M 38 124 H 49 C 50 124 50 130 46 130 H 36 C 34 130 34 124 38 124 Z',
      'M 51 124 H 62 C 66 124 66 130 64 130 H 54 C 50 130 50 124 51 124 Z'
    ]
  },
  {
    id: 'man',
    name: 'Man',
    keywords: ['man', 'men', 'gentleman', 'father', 'guy', 'male adult', 'dad'],
    description: 'Adult gentleman with parted hair, collared shirt with necktie, trousers, and shoes',
    viewBox: { width: 100, height: 150 },
    svgParts: [
      'M 36 34 C 36 54 64 54 64 34 M 35 34 C 34 20 66 20 65 34 M 34 25 C 38 18 56 16 66 22',
      'M 42 38 A 2 2 0 1 1 42 38.1 M 58 38 A 2 2 0 1 1 58 38.1 M 40 34 H 45 M 55 34 H 60 M 45 44 Q 50 48 55 44',
      'M 45 54 L 50 62 L 55 54 M 50 62 L 48 78 L 50 82 L 52 78 Z M 45 54 L 30 62 L 33 76 L 38 74 L 38 96 L 62 96 L 62 74 L 67 76 L 70 62 L 55 54',
      'M 38 96 L 62 96 L 64 132 L 53 132 L 50 106 L 47 132 L 36 132 Z',
      'M 34 132 H 47 V 138 H 32 Z M 53 132 H 66 V 138 H 51 Z'
    ]
  },
  {
    id: 'woman',
    name: 'Woman',
    keywords: ['woman', 'women', 'lady', 'mother', 'female adult', 'mom'],
    description: 'Adult woman with flowing hair, stylish outfit, skirt, and heels',
    viewBox: { width: 100, height: 150 },
    svgParts: [
      'M 36 34 C 36 52 64 52 64 34 M 36 34 C 32 18 68 18 64 34 M 34 30 C 26 40 24 68 34 76 M 66 30 C 74 40 76 68 66 76',
      'M 42 38 A 2 2 0 1 1 42 38.1 M 58 38 A 2 2 0 1 1 58 38.1 M 44 44 Q 50 48 56 44',
      'M 44 54 Q 50 58 56 54 L 66 64 L 62 74 L 58 72 L 70 110 L 30 110 L 42 72 L 38 74 L 34 64 Z M 40 74 H 60',
      'M 44 110 V 132 M 48 110 V 132 M 52 110 V 132 M 56 110 V 132 M 39 132 H 49 L 45 138 H 40 Z M 51 132 H 61 L 57 138 H 52 Z'
    ]
  },
  {
    id: 'person',
    name: 'Person',
    keywords: ['person', 'human', 'character', 'someone', 'somebody', 'standing person'],
    description: 'Complete person standing upright with casual outfit and friendly expression',
    viewBox: { width: 100, height: 140 },
    svgParts: [
      'M 50 14 A 14 14 0 1 0 50 42 A 14 14 0 1 0 50 14 Z',
      'M 44 26 A 2 2 0 1 1 44 26.1 M 56 26 A 2 2 0 1 1 56 26.1 M 46 34 Q 50 38 54 34',
      'M 46 42 V 48 M 54 42 V 48',
      'M 44 48 H 56 L 68 54 L 64 68 L 58 66 L 58 90 L 42 90 L 42 66 L 36 68 L 32 54 Z',
      'M 42 90 L 58 90 L 60 120 L 52 120 L 50 98 L 48 120 L 40 120 Z',
      'M 38 120 H 49 V 126 H 36 Z M 51 120 H 62 V 126 H 49 Z'
    ]
  },
  {
    id: 'face',
    name: 'Human Face',
    keywords: ['face', 'portrait', 'head', 'human face', 'person face', 'smile face'],
    description: 'Detailed human face portrait with styled hair, eyes, eyebrows, nose, and smiling mouth',
    viewBox: { width: 100, height: 100 },
    svgParts: [
      'M 25 35 C 25 15 75 15 75 35 C 75 65 65 85 50 88 C 35 85 25 65 25 35 Z',
      'M 25 35 C 25 10 75 10 75 35 C 70 24 60 22 50 25 C 40 22 30 24 25 35 Z',
      'M 24 40 A 5 7 0 0 0 24 54 M 76 40 A 5 7 0 0 1 76 54',
      'M 34 42 Q 40 37 46 42 Q 40 47 34 42 Z M 40 42 A 2 2 0 1 1 40 42.1',
      'M 54 42 Q 60 37 66 42 Q 60 47 54 42 Z M 60 42 A 2 2 0 1 1 60 42.1',
      'M 33 37 Q 40 33 46 36 M 54 36 Q 60 33 67 37',
      'M 50 44 V 58 L 46 60 H 52',
      'M 40 68 Q 50 78 60 68 Q 50 72 40 68 Z'
    ]
  },
  {
    id: 'robot',
    name: 'Robot',
    keywords: ['robot', 'android', 'cyborg', 'bot', 'mech'],
    description: 'Retro mechanical robot with antenna, visor eyes, body dials, and clamp hands',
    viewBox: { width: 100, height: 130 },
    svgParts: [
      'M 50 12 A 4 4 0 1 1 50 12.1 M 50 16 V 26',
      'M 32 26 H 68 V 50 H 32 Z M 28 34 H 32 M 68 34 H 72',
      'M 40 36 A 3 3 0 1 1 40 36.1 M 60 36 A 3 3 0 1 1 60 36.1 M 39 44 H 61',
      'M 45 50 H 55 V 55 H 45 Z M 26 55 H 74 V 92 H 26 Z M 36 65 H 64 V 82 H 36 Z M 42 74 A 3 3 0 1 1 42 74.1 M 50 74 A 3 3 0 1 1 50 74.1 M 58 74 A 3 3 0 1 1 58 74.1',
      'M 26 62 H 16 V 80 H 22 M 16 80 L 12 84 M 16 80 L 20 84 M 74 62 H 84 V 80 H 78 M 84 80 L 80 84 M 84 80 L 88 84',
      'M 38 92 V 110 M 44 92 V 110 M 56 92 V 110 M 62 92 V 110 M 32 110 H 48 V 116 H 32 Z M 52 110 H 68 V 116 H 52 Z'
    ]
  },
  {
    id: 'soccer_ball',
    name: 'Soccer Ball',
    keywords: ['soccer', 'soccer ball', 'football', 'ball', 'sports ball'],
    description: 'Classic soccer ball with pentagon and hexagon panel seams',
    viewBox: { width: 80, height: 80 },
    svgParts: [
      'M 40 5 A 35 35 0 1 0 40 75 A 35 35 0 1 0 40 5 Z',
      'M 40 28 L 50 35 L 46 47 L 34 47 L 30 35 Z',
      'M 40 28 L 40 10 M 50 35 L 68 28 M 46 47 L 62 60 M 34 47 L 18 60 M 30 35 L 12 28',
      'M 40 10 L 25 15 M 40 10 L 55 15 M 68 28 L 74 44 M 62 60 L 52 73 M 18 60 L 28 73 M 12 28 L 6 44'
    ]
  },
  {
    id: 'guitar',
    name: 'Guitar',
    keywords: ['guitar', 'acoustic guitar', 'electric guitar', 'music', 'instrument'],
    description: 'Acoustic guitar with wooden body, sound hole, fretboard, and tuning pegs',
    viewBox: { width: 80, height: 140 },
    svgParts: [
      'M 30 70 C 15 75 10 90 15 105 C 20 125 60 125 65 105 C 70 90 65 75 50 70 C 45 68 35 68 30 70 Z',
      'M 30 70 C 25 65 25 55 32 50 C 37 46 43 46 48 50 C 55 55 55 65 50 70',
      'M 40 68 A 6 6 0 1 0 40 68.1 Z M 32 102 H 48 V 106 H 32 Z',
      'M 37 48 V 18 H 43 V 48 M 35 18 H 45 V 6 H 35 Z M 33 10 H 35 M 33 14 H 35 M 45 10 H 47 M 45 14 H 47',
      'M 39 8 V 102 M 41 8 V 102'
    ]
  },
  {
    id: 'castle',
    name: 'Castle',
    keywords: ['castle', 'fortress', 'palace', 'tower', 'kingdom'],
    description: 'Medieval castle with twin towers, battlements, arched gateway, and flags',
    viewBox: { width: 120, height: 100 },
    svgParts: [
      'M 35 50 H 85 V 90 H 35 Z M 50 90 V 70 C 50 62 70 62 70 70 V 90 M 50 70 H 70 M 60 64 V 90',
      'M 35 50 V 42 H 42 V 46 H 48 V 42 H 54 V 46 H 66 V 42 H 72 V 46 H 78 V 42 H 85 V 50',
      'M 15 90 V 32 H 35 V 90 M 10 32 H 40 V 22 H 36 V 26 H 30 V 22 H 24 V 26 H 20 V 22 H 10 Z M 25 22 L 25 10 L 15 14 L 25 18 M 22 45 H 28 V 56 H 22 Z',
      'M 85 90 V 32 H 105 V 90 M 80 32 H 110 V 22 H 106 V 26 H 100 V 22 H 94 V 26 H 90 V 22 H 80 Z M 95 22 L 95 10 L 85 14 L 95 18 M 92 45 H 98 V 56 H 92 Z'
    ]
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    keywords: ['rainbow', 'rainbows', 'sky arc', 'colors'],
    description: 'Vibrant concentric rainbow arcs emerging from fluffy cloud cushions',
    viewBox: { width: 120, height: 75 },
    svgParts: [
      'M 20 65 A 40 40 0 0 1 100 65 M 25 65 A 35 35 0 0 1 95 65 M 30 65 A 30 30 0 0 1 90 65 M 35 65 A 25 25 0 0 1 85 65 M 40 65 A 20 20 0 0 1 80 65',
      'M 10 65 A 10 10 0 0 1 28 65 H 10 Z M 16 57 A 8 8 0 0 1 26 57',
      'M 92 65 A 10 10 0 0 1 110 65 H 92 Z M 98 57 A 8 8 0 0 1 108 57'
    ]
  },
  {
    id: 'mountain',
    name: 'Mountain',
    keywords: ['mountain', 'mountains', 'peak', 'landscape', 'hills'],
    description: 'Majestic mountain twin peaks with snow caps',
    viewBox: { width: 120, height: 80 },
    svgParts: [
      'M 5 75 L 45 15 L 85 75 Z M 45 15 L 35 32 L 45 28 L 52 35 L 45 15',
      'M 55 75 L 85 28 L 115 75 Z M 85 28 L 78 40 L 85 36 L 92 42 L 85 28'
    ]
  },
  {
    id: 'crown',
    name: 'Crown',
    keywords: ['crown', 'king', 'queen', 'royal'],
    description: 'Royal 5-point crown with jewel tips',
    viewBox: { width: 80, height: 60 },
    svgParts: [
      'M 10 50 L 8 20 L 24 34 L 40 12 L 56 34 L 72 20 L 70 50 Z',
      'M 8 50 H 72 M 8 54 H 72',
      'M 8 19 A 2 2 0 1 0 8 19.1 Z M 40 11 A 2.5 2.5 0 1 0 40 11.1 Z M 72 19 A 2 2 0 1 0 72 19.1 Z'
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond',
    keywords: ['diamond', 'gem', 'gemstone', 'jewel'],
    description: 'Faceted sparkling diamond gemstone',
    viewBox: { width: 70, height: 65 },
    svgParts: [
      'M 35 8 L 60 26 L 35 62 L 10 26 Z',
      'M 10 26 H 60',
      'M 24 26 L 35 62 L 46 26',
      'M 24 26 L 35 8 L 46 26'
    ]
  }
];

// Normalize prompt string and find matching dataset item
export function findDatasetDrawing(promptText: string, fallbackContext?: string): DatasetDrawing | null {
  if (!promptText && !fallbackContext) return null;

  // Clean prompt
  let clean = (promptText || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim();

  // Strip common command words and conversational filler
  const stopWords = [
    'draw', 'drawing', 'sketch', 'paint', 'painting', 'make', 'create', 'please', 
    'can', 'cant', 'could', 'would', 'you', 'u', 'a', 'an', 'the', 'simple', 'cute', 'nice', 'cool', 'good', 
    'pretty', 'generate', 'outline', 'me', 'some', 'quick', 'fast', 'little', 
    'beautiful', 'vector', 'svg', 'inside', 'box', 'frame', 'here', 'with', 'for',
    'on', 'in', 'at', 'another', 'other', 'side', 'next', 'beside', 'more', 'one',
    'it', 'them', 'right', 'left', 'top', 'bottom', 'again', 'there', 'too', 'and', 'all',
    'now', 'just', 'like', 'how', 'what', 'why', 'to', 'do'
  ];

  const words = clean.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w));

  // 1. Direct exact keyword search across dataset
  for (const item of DATASET_DRAWINGS) {
    for (const kw of item.keywords) {
      if (clean === kw || clean.includes(kw)) {
        return item;
      }
    }
  }

  // 2. Word-by-word matching
  for (const word of words) {
    for (const item of DATASET_DRAWINGS) {
      if (item.id === word || item.name.toLowerCase() === word) {
        return item;
      }
      if (item.keywords.some(kw => kw === word || (word.length >= 3 && kw.includes(word)))) {
        return item;
      }
    }
  }

  // 3. Fallback to conversational memory context if prompt was purely relational (e.g. "draw on another side")
  if (fallbackContext && fallbackContext !== promptText) {
    const fallbackMatch = findDatasetDrawing(fallbackContext);
    if (fallbackMatch) {
      return fallbackMatch;
    }
  }

  return null;
}

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../config/db.js';
import { inventoryItems, eq } from '@school/shared';

const itemsToSeed = [
  // 1-15: Textbooks across Pre-Primary, Primary & Junior Secondary
  {
    name: 'PP1 CBC Language Activities Textbook',
    category: 'Textbooks',
    description: 'KLB Early Years Education Foundation Coursebook (2026 Batch)',
    totalQuantity: 20,
    availableQuantity: 20,
  },
  {
    name: 'PP1 Mathematical Activities Textbook',
    category: 'Textbooks',
    description: 'Moran Early Years CBC Math Activities Pupil Book',
    totalQuantity: 20,
    availableQuantity: 20,
  },
  {
    name: 'PP2 Environmental Activities Workbook',
    category: 'Textbooks',
    description: 'Spotlight CBC Environmental & Hygiene Activities Guide',
    totalQuantity: 25,
    availableQuantity: 25,
  },
  {
    name: 'Grade 1 English Literacy Handbook',
    category: 'Textbooks',
    description: 'Oxford New Progressive Primary English Grade 1',
    totalQuantity: 30,
    availableQuantity: 30,
  },
  {
    name: 'Grade 1 Kiswahili Mazoezi ya Lugha',
    category: 'Textbooks',
    description: 'Tusome Kiswahili Kitabu cha Mwanafunzi Darasa la 1',
    totalQuantity: 30,
    availableQuantity: 30,
  },
  {
    name: 'Grade 2 Mathematical Activities Coursebook',
    category: 'Textbooks',
    description: 'Longhorn CBC Primary Mathematics Grade 2',
    totalQuantity: 30,
    availableQuantity: 30,
  },
  {
    name: 'Grade 3 Hygiene and Nutrition Activities',
    category: 'Textbooks',
    description: 'KLB Visionary Hygiene & Nutrition Activities Grade 3',
    totalQuantity: 25,
    availableQuantity: 25,
  },
  {
    name: 'Grade 3 Christian Religious Education (CRE)',
    category: 'Textbooks',
    description: 'Growing in Christ CBC Religious Education Pupil Book',
    totalQuantity: 25,
    availableQuantity: 25,
  },
  {
    name: "Grade 4 Science and Technology Pupil's Book",
    category: 'Textbooks',
    description: 'Mentor Science & Technology CBC Grade 4 Series',
    totalQuantity: 35,
    availableQuantity: 35,
  },
  {
    name: 'Grade 4 Agriculture and Nutrition Coursebook',
    category: 'Textbooks',
    description: 'KLB Top Scholar Agriculture Grade 4 Edition',
    totalQuantity: 30,
    availableQuantity: 30,
  },
  {
    name: "Grade 5 Social Studies CBC Learner's Book",
    category: 'Textbooks',
    description: 'Spotlight Social Studies Grade 5 with Atlas Reference',
    totalQuantity: 35,
    availableQuantity: 35,
  },
  {
    name: "Grade 5 Home Science Learner's Book",
    category: 'Textbooks',
    description: 'Longhorn Comprehensive Home Science Grade 5',
    totalQuantity: 25,
    availableQuantity: 25,
  },
  {
    name: 'Grade 8 Integrated Science Coursebook',
    category: 'Textbooks',
    description: 'KLB Top Scholar Junior Secondary Integrated Science Grade 8',
    totalQuantity: 40,
    availableQuantity: 40,
  },
  {
    name: "Grade 8 Pre-Technical Studies Learner's Book",
    category: 'Textbooks',
    description: 'Oxford JSS Pre-Technical & Business Studies Grade 8',
    totalQuantity: 35,
    availableQuantity: 35,
  },
  {
    name: 'Grade 9 Social Studies & Life Skills Handbook',
    category: 'Textbooks',
    description: 'CBC Junior Secondary Social Studies & Citizenship Guide Grade 9',
    totalQuantity: 30,
    availableQuantity: 30,
  },

  // 16-20: Science & Laboratory Equipment
  {
    name: 'Monocular Student Microscope 400x',
    category: 'Equipment',
    description: 'Precision Compound Optical Microscope with LED Illumination (Science Lab)',
    totalQuantity: 8,
    availableQuantity: 8,
  },
  {
    name: 'Borosilicate Glass Beakers Set (250ml/500ml)',
    category: 'Equipment',
    description: 'Pack of 12 Heat-Resistant Laboratory Graduated Measuring Beakers',
    totalQuantity: 15,
    availableQuantity: 15,
  },
  {
    name: 'Test Tube Racks & Brush Kits',
    category: 'Equipment',
    description: 'Wooden test tube drying racks with nylon cleaning brushes',
    totalQuantity: 12,
    availableQuantity: 12,
  },
  {
    name: 'Laboratory Bunsen Burner Units',
    category: 'Equipment',
    description: 'Nickel-Plated Gas Burner with Air Flow Stabilizer Sleeve',
    totalQuantity: 10,
    availableQuantity: 10,
  },
  {
    name: 'Human Torso Anatomy Model 3D',
    category: 'Equipment',
    description: 'Detachable 15-part Educational Human Internal Organ Model (Biology)',
    totalQuantity: 3,
    availableQuantity: 3,
  },

  // 21-24: Sports & Physical Education
  {
    name: 'Professional Mitre Size 5 Football',
    category: 'Equipment',
    description: 'All-Weather Thermo-Bonded Outer Match Balls for School Teams',
    totalQuantity: 12,
    availableQuantity: 12,
  },
  {
    name: 'Official Match Volleyball Set',
    category: 'Equipment',
    description: 'Mikasa Soft-Touch Tournament Volleyball with Heavy-Duty Net',
    totalQuantity: 8,
    availableQuantity: 8,
  },
  {
    name: 'Track & Field Relay Batons (Set of 6)',
    category: 'Equipment',
    description: 'Anodized Aluminum Multi-Colored Athletics Sprint Batons',
    totalQuantity: 6,
    availableQuantity: 6,
  },
  {
    name: 'School First Aid Emergency Responder Kit',
    category: 'Equipment',
    description: 'OSHA Compliant Wall-Mountable School Comprehensive Medical Kit',
    totalQuantity: 5,
    availableQuantity: 5,
  },

  // 25-27: Classroom Accessories & Stationery
  {
    name: 'Chalkboard Compass & Protractor Geometry Set',
    category: 'Classroom Accessories',
    description: 'Magnetic Giant Demonstration Geometry Instruments for Teachers',
    totalQuantity: 10,
    availableQuantity: 10,
  },
  {
    name: 'Multi-Color Dry Erase Whiteboard Markers (Pack of 12)',
    category: 'Classroom Accessories',
    description: 'Low Odor Bullet Tip Whiteboard Markers (Assorted Black, Blue, Red)',
    totalQuantity: 25,
    availableQuantity: 25,
  },
  {
    name: 'Heavy-Duty Dual-Hole Desk Staplers',
    category: 'Classroom Accessories',
    description: 'Kangaro All-Metal 24/6 Examination Desk Staplers',
    totalQuantity: 15,
    availableQuantity: 15,
  },

  // 28-30: Classroom Electronics & Hardware
  {
    name: 'Classroom Overhead Multimedia Projector',
    category: 'Equipment',
    description: 'Epson 3600 Lumens HDMI Digital Classroom Projector (AV Dept)',
    totalQuantity: 4,
    availableQuantity: 4,
  },
  {
    name: 'Casio FX-82MS Scientific Calculators',
    category: 'Equipment',
    description: '240-Function Two-Line Display Calculators for JSS Mathematics',
    totalQuantity: 20,
    availableQuantity: 20,
  },
  {
    name: '25-Meter Extension Heavy-Duty Power Reel',
    category: 'Classroom Accessories',
    description: '4-Socket Surge Protected Heavy Cable Reel for School Assemblies',
    totalQuantity: 6,
    availableQuantity: 6,
  },
];

async function runSeed() {
  console.log(`Starting inventory seeding: ${itemsToSeed.length} items to process...`);
  let addedCount = 0;
  let skippedCount = 0;

  for (const item of itemsToSeed) {
    const existing = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.name, item.name));

    if (existing.length === 0) {
      await db.insert(inventoryItems).values(item);
      addedCount++;
      console.log(`+ Added: ${item.name} (${item.category}, Total: ${item.totalQuantity})`);
    } else {
      skippedCount++;
      console.log(`= Skipped existing: ${item.name}`);
    }
  }

  console.log(`Inventory seeding complete: ${addedCount} added, ${skippedCount} skipped.`);
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Inventory seeding failed:', err);
  process.exit(1);
});

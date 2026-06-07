const dotenv = require('dotenv');
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  console.error('[SEEDER] Cannot run in production environment. Set NODE_ENV to development or test.');
  process.exit(1);
}

const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Province = require('./models/Province');
const TargetSector = require('./models/TargetSector');

// Generates a random password that satisfies the app's complexity rules
// (8+ chars, upper, lower, digit, symbol) so seeded accounts never ship with
// a guessable default like "Admin@123" — printed once at seed time and the
// account is flagged mustChangePassword so it can't be reused long-term.
const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[crypto.randomInt(set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  return [...required, ...rest].sort(() => crypto.randomInt(3) - 1).join('');
};

const provinces = [
  { name: 'Marinduque', code: 'MAR', region: 'MIMAROPA' },
  { name: 'Occidental Mindoro', code: 'OCM', region: 'MIMAROPA' },
  { name: 'Oriental Mindoro', code: 'ORM', region: 'MIMAROPA' },
  { name: 'Palawan', code: 'PAL', region: 'MIMAROPA' },
  { name: 'Romblon', code: 'ROM', region: 'MIMAROPA' },
];

const targetSectors = ['New Hires', 'MSME', 'PWD', 'WOMEN'];

const seed = async () => {
  await connectDB();

  try {
    await Province.deleteMany();
    await TargetSector.deleteMany();
    await User.deleteMany();

    const createdProvinces = await Province.insertMany(provinces);
    console.log(`Created ${createdProvinces.length} provinces`);

    const createdSectors = await TargetSector.insertMany(targetSectors.map(name => ({ name })));
    console.log(`Created ${createdSectors.length} target sectors`);

    const credentials = [];

    const sparkPassword = generatePassword();
    const sparkFocal = await User.create({
      username: 'spark_admin',
      email: 'spark.admin@mimaropa.gov.ph',
      password: sparkPassword,
      firstName: 'Regional',
      lastName: 'SPARK Focal',
      role: 'spark_focal',
      mustChangePassword: true,
    });
    credentials.push({ username: sparkFocal.username, password: sparkPassword });
    console.log(`Created SPARK Focal: ${sparkFocal.username}`);

    for (let i = 0; i < createdProvinces.length; i++) {
      const prov = createdProvinces[i];
      const focalPassword = generatePassword();
      const focal = await User.create({
        username: `focal_${prov.code.toLowerCase()}`,
        email: `focal.${prov.code.toLowerCase()}@mimaropa.gov.ph`,
        password: focalPassword,
        firstName: prov.name.split(' ')[0],
        lastName: 'Focal',
        role: 'province_focal',
        assignedProvince: prov._id,
        mustChangePassword: true,
      });
      credentials.push({ username: focal.username, password: focalPassword });
      console.log(`Created Province Focal: ${focal.username} → ${prov.name}`);
    }

    console.log('\n=== SEED COMPLETE ===');
    console.log('Generated credentials (each account must change its password on first login):');
    credentials.forEach(c => console.log(`  ${c.username} / ${c.password}`));
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
};

seed();

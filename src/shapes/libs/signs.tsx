/**
 * Signs & Clipart: pictogram tiles (lucide glyphs) for people, transport,
 * finance, technology, safety, nature and amenities.
 */
import type { ComponentType } from 'react';
import {
  Accessibility, Baby, Ban, Banknote, Bike, Biohazard, Bus, Camera, Car, ChartLine, CigaretteOff, Cloud, Coffee, Coins, Cpu,
  CreditCard, Database, DollarSign, Droplet, Flame, Fuel, GraduationCap, Headset, HeartPulse, Hospital, Info, Landmark, Laptop,
  Leaf, Mountain, PiggyBank, Plane, Printer, Radiation, Recycle, Ship, ShoppingCart, Skull, Smartphone, Snowflake, SquareParking,
  Sun, TrainFront, TreePine, TriangleAlert, Truck, User, Users, Utensils, Wallet, Wifi, Zap, type LucideProps,
} from 'lucide-react';
import { iconTile } from '../kit';
import type { ShapeDef, ShapeLibrary } from '../types';
import { TONE, item } from './_kit2';

type Group = keyof typeof GROUP_TONE;
const GROUP_TONE = {
  people: TONE.blue,
  transport: TONE.indigo,
  finance: TONE.green,
  tech: TONE.violet,
  safety: TONE.amber,
  danger: TONE.red,
  nature: TONE.teal,
  amenity: TONE.slate,
};

/** [name, label, icon, group, mxGraph stencil, keywords] */
const SIGNS: Array<[string, string, ComponentType<LucideProps>, Group, string, string]> = [
  ['person', 'Person', User, 'people', 'people.man_1', 'man woman user human'],
  ['group', 'Group', Users, 'people', 'people.meeting', 'people team users'],
  ['baby', 'Baby', Baby, 'people', 'people.baby', 'child infant'],
  ['accessible', 'Accessible', Accessibility, 'people', 'healthcare.wheelchair', 'wheelchair disability'],
  ['support', 'Support', Headset, 'people', 'people.telephone', 'helpdesk call center'],
  ['student', 'Student', GraduationCap, 'people', 'people.graduate', 'education school'],

  ['car', 'Car', Car, 'transport', 'transportation.car_1', 'vehicle auto'],
  ['bus', 'Bus', Bus, 'transport', 'transportation.bus_1', 'public transit'],
  ['train', 'Train', TrainFront, 'transport', 'transportation.train_1', 'rail metro subway'],
  ['plane', 'Airplane', Plane, 'transport', 'transportation.airplane_1', 'flight airport travel'],
  ['ship', 'Ship', Ship, 'transport', 'transportation.ship_1', 'boat ferry port'],
  ['bike', 'Bicycle', Bike, 'transport', 'transportation.bicycle', 'cycle bike'],
  ['truck', 'Truck', Truck, 'transport', 'transportation.truck_1', 'delivery lorry shipping'],
  ['fuel', 'Fuel station', Fuel, 'transport', 'transportation.gas_1', 'gas petrol'],
  ['parking', 'Parking', SquareParking, 'transport', 'travel.parking', 'car park'],

  ['dollar', 'Dollar', DollarSign, 'finance', 'travel.money', 'money currency usd'],
  ['cash', 'Cash', Banknote, 'finance', 'travel.money', 'money banknote bill'],
  ['card', 'Credit card', CreditCard, 'finance', 'travel.credit_card', 'payment debit'],
  ['piggy', 'Savings', PiggyBank, 'finance', 'travel.money', 'piggy bank save'],
  ['wallet', 'Wallet', Wallet, 'finance', 'travel.money', 'purse payment'],
  ['bank', 'Bank', Landmark, 'finance', 'travel.bank', 'finance institution'],
  ['coins', 'Coins', Coins, 'finance', 'travel.money', 'money change'],
  ['chart', 'Chart', ChartLine, 'finance', 'tech.chart', 'growth stats trend'],
  ['cart', 'Shopping cart', ShoppingCart, 'finance', 'travel.shopping_cart', 'shop ecommerce buy'],

  ['laptop', 'Laptop', Laptop, 'tech', 'tech.laptop', 'computer notebook'],
  ['phone', 'Smartphone', Smartphone, 'tech', 'tech.cell_phone', 'mobile cell'],
  ['chip', 'Processor', Cpu, 'tech', 'tech.chip', 'cpu chip hardware'],
  ['wifi', 'Wi-Fi', Wifi, 'tech', 'tech.wifi', 'wireless internet'],
  ['database', 'Database', Database, 'tech', 'tech.database', 'storage data'],
  ['cloud', 'Cloud', Cloud, 'tech', 'tech.cloud', 'internet saas'],
  ['printer', 'Printer', Printer, 'tech', 'tech.printer', 'print'],
  ['camera', 'Camera', Camera, 'tech', 'tech.camera_1', 'photo cctv'],

  ['warning', 'Warning', TriangleAlert, 'safety', 'safety.warning', 'caution alert hazard'],
  ['voltage', 'High voltage', Zap, 'safety', 'safety.high_voltage', 'electric shock lightning'],
  ['fire', 'Fire', Flame, 'danger', 'safety.fire', 'flammable flame'],
  ['toxic', 'Toxic', Skull, 'danger', 'safety.poison', 'poison danger'],
  ['biohazard', 'Biohazard', Biohazard, 'danger', 'safety.biohazard', 'biological hazard'],
  ['radiation', 'Radiation', Radiation, 'danger', 'safety.radiation', 'radioactive nuclear'],
  ['noEntry', 'No entry', Ban, 'danger', 'safety.no', 'forbidden prohibited stop'],
  ['noSmoking', 'No smoking', CigaretteOff, 'danger', 'safety.no_smoking', 'cigarette forbidden'],
  ['firstAid', 'First aid', HeartPulse, 'danger', 'healthcare.first_aid', 'medical health'],
  ['hospital', 'Hospital', Hospital, 'danger', 'healthcare.hospital', 'medical clinic'],

  ['leaf', 'Leaf', Leaf, 'nature', 'nature.leaf', 'eco green plant'],
  ['tree', 'Tree', TreePine, 'nature', 'nature.tree_1', 'forest park'],
  ['sun', 'Sun', Sun, 'nature', 'nature.sun', 'weather sunny'],
  ['water', 'Water', Droplet, 'nature', 'nature.water', 'drop rain liquid'],
  ['mountain', 'Mountain', Mountain, 'nature', 'nature.mountain', 'landscape hiking'],
  ['snow', 'Snow', Snowflake, 'nature', 'nature.snow', 'winter cold weather'],
  ['recycle', 'Recycle', Recycle, 'nature', 'safety.recycle', 'eco environment'],

  ['info', 'Information', Info, 'amenity', 'travel.information', 'help desk'],
  ['coffee', 'Coffee', Coffee, 'amenity', 'food.coffee', 'cafe drink'],
  ['restaurant', 'Restaurant', Utensils, 'amenity', 'food.restaurant', 'food dining eat'],
];

const shapes: ShapeDef[] = SIGNS.map(([name, label, Icon, , stencil]) => ({
  kind: `sign.${name}`,
  label,
  rounded: true,
  textPlacement: 'below',
  render: iconTile(Icon),
  drawio: `shape=mxgraph.signs.${stencil};verticalLabelPosition=bottom;verticalAlign=top;html=1;`,
}));

const libraries: ShapeLibrary[] = [
  {
    id: 'signs',
    name: 'Signs & Clipart',
    items: SIGNS.map(([name, label, , group, , keywords]) =>
      item(`sign.${name}`, label, 56, 56, {
        style: { ...GROUP_TONE[group], radius: 12, fontSize: 12 },
        keywords: `${group} sign clipart pictogram ${keywords}`,
      }),
    ),
  },
];

export { shapes, libraries };

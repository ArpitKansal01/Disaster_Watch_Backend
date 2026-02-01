const mongoose = require("mongoose");
const Report = require("./models/Report");
const User = require("./models/user");
const bcrypt = require("bcryptjs");

mongoose.connect(
  "mongodb+srv://kansalarpit06_db_user:Guh4yYTcMOrIRVaj@cluster0.92otl78.mongodb.net/Disaster_DB?retryWrites=true&w=majority&appName=Cluster0",
);

// ===== IMAGE DATA =====
const imageData = [
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842233/disaster-reports/fb2nlfm6emdim8o2yfoe.jpg",
    classify: "damaged buildings",
    severity: "medium",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842280/disaster-reports/svyqtiezdjgwjtgqmkmw.jpg",
    classify: "damaged buildings",
    severity: "severe",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842338/disaster-reports/llfvawilvkqx97oquqvv.jpg",
    classify: "fallen trees",
    severity: "medium",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842355/disaster-reports/kcitzu2otfywxgqq2xb2.png",
    classify: "fallen trees",
    severity: "severe",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842410/disaster-reports/jzbx9fifqfpohoqsergr.jpg",
    classify: "fire",
    severity: "low",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842422/disaster-reports/h7yvphii4tzcotw9dwzb.jpg",
    classify: "fire",
    severity: "medium",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842437/disaster-reports/pi86xgdyjwrac0s0jzcu.jpg",
    classify: "fire",
    severity: "severe",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842463/disaster-reports/p8z18elborgpcdziirg6.jpg",
    classify: "flood",
    severity: "medium",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842470/disaster-reports/rjrtegh8qqii4rruf9vj.jpg",
    classify: "flood",
    severity: "severe",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842525/disaster-reports/cpvajt8xdzdthdxyw90y.jpg",
    classify: "landslide",
    severity: "low",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842598/disaster-reports/hkjxygtkksp9xauztzuj.jpg",
    classify: "landslide",
    severity: "medium",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dmystwuo5/image/upload/v1769842613/disaster-reports/ijnuy8oqkbdfol8p7vs7.jpg",
    classify: "landslide",
    severity: "severe",
  },
];

// ===== LAND REGIONS =====
const LAND_REGIONS = [
  { name: "India", box: [8, 37, 68, 97] },
  { name: "USA", box: [24, 49, -125, -66] },
  { name: "Brazil", box: [-33, 5, -74, -34] },
  { name: "UK", box: [49, 59, -8, 2] },
  { name: "Germany", box: [47, 55, 5, 15] },
  { name: "Japan", box: [30, 45, 129, 146] },
];

function randomLandLocation() {
  const region = LAND_REGIONS[Math.floor(Math.random() * LAND_REGIONS.length)];
  const [minLat, maxLat, minLng, maxLng] = region.box;

  return {
    region: region.name,
    lat: +(minLat + Math.random() * (maxLat - minLat)).toFixed(6),
    lng: +(minLng + Math.random() * (maxLng - minLng)).toFixed(6),
  };
}

// ✅ VALID ENUM-ONLY STATUS
function randomStatus() {
  const statuses = [
    "submitted",
    "pending",
    "verified",
    "responding",
    "resolved",
    "false",
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// ===== SEED =====
async function seed() {
  try {
    await Report.deleteMany();
    await User.deleteMany({ email: "seed.user@demo.com" });
    const hashedPassword = await bcrypt.hash("seed_password_123", 10);

    // ✅ CREATE VALID USER
    const seedUser = await User.create({
      name: "Seed User",
      email: "seed.user@demo.com",
      password: hashedPassword, // 🔐 REQUIRED
      role: "user",
    });
    console.log("👤 Seed user:", seedUser._id.toString());

    const bulk = [];
    const TOTAL_REPORTS = 5000;

    for (let i = 0; i < TOTAL_REPORTS; i++) {
      const img = imageData[Math.floor(Math.random() * imageData.length)];
      const { region, lat, lng } = randomLandLocation();
      const status = randomStatus();

      bulk.push({
        imageUrl: img.imageUrl,
        classify: img.classify,
        severity: img.severity,
        status,
        reportedBy: seedUser._id, // ✅ GUARANTEED
        note:
          status === "false"
            ? `False report detected in ${region}`
            : `Reported ${img.severity} ${img.classify} incident in ${region}`,
        location: `${region} (${lat}, ${lng})`,
      });
    }

    await Report.insertMany(bulk, { ordered: false });
    console.log(`✅ Inserted ${bulk.length} reports successfully`);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();

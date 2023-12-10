const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { faker } = require("@faker-js/faker");

const ONE_SECOND_COST = 30; // Coût par seconde pour les appels
const ONE_SMS_COST = 25; // Coût par SMS

console.log(
  faker.date.between({
    from: "2022-01-01",
    to: "2023-12-31",
  })
);

// (806) 642-6947
// 2023-12-07T04:15:32.809Z

const app = express();
const port = 3000;

mongoose
  .connect(
    "mongodb+srv://lazare:lazare@cluster0.xymug.mongodb.net/facturation_db"
  )
  .then((cnx) => {
    console.log(`Database connected : ${cnx.connection.host}`);
  });

// mongoose.connect('mongodb://localhost/cdr-api', { useNewUrlParser: true, useUnifiedTopology: true });

const cdrSchema = new mongoose.Schema({
  callingNumber: String, // Numéro de l'appelant
  calledNumber: String, // Numéro de l'appelé
  imsi: String,
  date: Date,
  duration: Number,
  callType: {
    type: String,
    enum: ["CALL", "VOICE"],
  },
  type: {
    type: String,
    enum: ["PREPAID", "POSTPAID"],
  },
});

const CDR = mongoose.model("CDR", cdrSchema);

app.use(bodyParser.json());

app.post("/generate-invoices", async (req, res) => {
  const phones = req.body;


  try {
    let result = [];
    if (!Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Le corps de la requête doit contenir un tableau de phone number valides.",
      });
    }
  
    for (const phone of phones) {  
      // check if phone number exist
      result.push(await generateInvoice(phone));
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
 
});

app.get("/get-invoice/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;
  try {
    res.json(await generateInvoice(phoneNumber));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const generateInvoice = async (phoneNumber) => {
  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  try {
    const cdrData = await CDR.find({
      $and: [
        { callingNumber: phoneNumber },
        { date: { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    });

    // Calculer la somme des durations pour les appels et des SMS
    const totalCallDuration = cdrData
      .filter((cdr) => cdr.callType === "CALL")
      .reduce((acc, cdr) => acc + cdr.duration, 0);

    const totalSmsCount = cdrData
      .filter((cdr) => cdr.callType === "VOICE") // Je suppose que 'VOICE' correspond aux SMS
      .reduce((acc, cdr) => acc + cdr.duration, 0);

    // Calculer les montants pour les appels et les SMS
    const callAmount = totalCallDuration * ONE_SECOND_COST;
    const smsAmount = totalSmsCount * ONE_SMS_COST;

    // Calculer le montant total
    const totalAmount = callAmount + smsAmount;

    return {
      phoneNumber: phoneNumber,
      totalCallDuration: totalCallDuration,
      totalSmsCount: totalSmsCount,
      callAmount: callAmount,
      smsAmount: smsAmount,
      totalAmount: totalAmount,
    };
  } catch (error) {
    throw error;
  }
};

app.post("/save-cdr", async (req, res) => {
  try {
    const cdrs = req.body;

    // Assurez-vous que l'objet 'cdrs' est un tableau d'objets CDR valides
    if (!Array.isArray(cdrs) || cdrs.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Le corps de la requête doit contenir un tableau d'objets CDR valides.",
      });
    }

    // Validez chaque objet CDR avant l'enregistrement
    for (const cdr of cdrs) {
      // Ajoutez vos validations ici
      if (!isValidCdr(cdr)) {
        return res.status(400).json({
          success: false,
          message: "Les objets CDR doivent avoir des propriétés valides.",
        });
      }
    }

    // Enregistrez les CDRs dans la base de données
    await CDR.insertMany(cdrs);
    // Utilisez une structure d'API Response pour retourner une réponse formatée
    res.json({
      success: true,
      message: "Opération effectuée avec succès.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fonction de validation pour un objet CDR
function isValidCdr(cdr) {
  // Ajoutez vos validations spécifiques ici
  return (
    cdr &&
    cdr.callingNumber &&
    cdr.calledNumber &&
    cdr.imsi &&
    cdr.date &&
    cdr.duration !== undefined &&
    cdr.type &&
    cdr.callType
  );
}

app.post("/generate-cdr", async (req, res) => {
  try {
    const { phoneNumber, imsi, type } = req.body;

    // Générez et enregistrez 100 CDR
    for (let i = 0; i < 100; i++) {
      // Générez un CDR aléatoire avec une date aléatoire
      const randomCDR = {
        callingNumber: phoneNumber,
        calledNumber: faker.phone.number(),
        imsi: imsi,
        date: faker.date.between({
          from: "2022-01-01",
          to: "2023-12-31",
        }),
        duration: Math.floor(Math.random() * 600) + 1,
        type: type,
      };

      // Enregistrez le CDR dans la base de données
      await CDR.create(randomCDR);
    }

    // Utilisez une structure d'API Response pour retourner une réponse formatée
    res.json({
      success: true,
      message: "Opération effectuée avec succès.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

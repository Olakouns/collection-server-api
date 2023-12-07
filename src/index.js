const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { faker } = require('@faker-js/faker');

console.log(faker.date.between({
    from: '2022-01-01', 
    to: '2023-12-31'
}));

// (806) 642-6947
// 2023-12-07T04:15:32.809Z

const app = express();
const port = 3000;

mongoose.connect("mongodb+srv://lazare:lazare@cluster0.xymug.mongodb.net/facturation_db").then((cnx) => {
    console.log(`Database connected : ${cnx.connection.host}`);
  });

// mongoose.connect('mongodb://localhost/cdr-api', { useNewUrlParser: true, useUnifiedTopology: true });

const cdrSchema = new mongoose.Schema({
    callingNumber: String,  // Numéro de l'appelant
    calledNumber: String,   // Numéro de l'appelé
    imsi: String,
    date: Date,
    duration: Number,
    type: {
        type: String,
        enum: ['PREPAID', 'POSTPAID'],
    },
});

const CDR = mongoose.model('CDR', cdrSchema);

app.use(bodyParser.json());

app.get('/cdr/:phoneNumber/:startDate/:endDate', async (req, res) => {
    const { phoneNumber, startDate, endDate } = req.params;

    try {
        const cdrData = await CDR.find({
            $and: [
                { callingNumber: phoneNumber },
                { date: { $gte: new Date(startDate), $lte: new Date(endDate) } },
            ],
        });

        res.json(cdrData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/generate-cdr', async (req, res) => {
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
                    from: '2022-01-01', 
                    to: '2023-12-31'
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
            message: 'Opération effectuée avec succès.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

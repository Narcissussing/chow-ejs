import express from "express";
import pg from "pg";
import "dotenv/config";

const app = express();
const port = process.env.PORT;
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

await db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());


app.set("view engine", "ejs");

const uniteParType = { unite: 'unités', pack: 'packs', cl: 'cl' };

//Function

async function chercherAliments() {
    const result = await db.query("SELECT * FROM foods");
    return result.rows
}

async function chercherStock() {
    const result = await db.query("SELECT stock.*, foods.nom, foods.emoji, foods.tracking_type FROM stock JOIN foods ON stock.food_id = foods.id");
    const aujourdhui = new Date();
    result.rows.forEach(row => {
        const diff = aujourdhui - new Date(row.date_maj);
        row.jours_depuis = Math.floor(diff / (1000 * 60 * 60 * 24));
    });
    return result.rows
}

async function chercherCourses() {
    const result = await db.query("SELECT courses.*, COALESCE(foods.nom, courses.nom_libre) AS nom, COALESCE(foods.emoji, '🆕') AS emoji, foods.unite AS food_unite, foods.tracking_type, foods.categorie FROM courses LEFT JOIN foods ON courses.food_id = foods.id WHERE achete = false");
    return result.rows
}

app.get("/", async (req, res) => {
    try {
        res.render("index.ejs", { title: "Accueil" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/aliments", async (req, res) => {
    try {
        const aliments = await chercherAliments()
        res.render("aliments.ejs", {
            title: "Aliments",
            aliments: aliments

        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/stock", async (req, res) => {
    try {
        const stock = await chercherStock()
        const aliments = await chercherAliments()
        res.render("stock.ejs", {
            title: "Stock",
            stock: stock,
            aliments: aliments,


        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/stock/ajouter", async (req, res) => {
    const idAliment = req.body.idAliment;
    const quantiteAliment = req.body.quantiteAliment;
    try {
        if (!idAliment || !quantiteAliment) {
            throw new Error("Champs requis.");
        }
        const result = await db.query("SELECT tracking_type, nom FROM foods WHERE id = $1", [idAliment]);
        if (result.rows.length === 0) {
            throw new Error("Article introuvable.");
        }
        const tracking_type = result.rows[0].tracking_type;
        const nom = result.rows[0].nom;
        const unite = uniteParType[tracking_type];

        const existeDeja = await db.query(
            "SELECT 1 FROM stock WHERE food_id = $1",
            [idAliment]
        );
        if (existeDeja.rows.length > 0) {
            throw new Error(`L'article ${nom} est déjà dans le stock.`);
        }

        await db.query(
            "INSERT INTO stock (food_id, quantite, unite, date_maj) VALUES ($1, $2, $3, NOW())",
            [idAliment, quantiteAliment, unite]
        );

        res.redirect("/stock");
    } catch (err) {
        console.log("ERREUR:", err.message);
        const stock = await chercherStock()
        const aliments = await chercherAliments()

        res.render("stock.ejs", {
            error: err.message,
            stock: stock,
            aliments: aliments,
        });
    }
});


app.post("/stock/modifier", async (req, res) => {
    try {
        const nouvelleQuantite = req.body.nouvelleQuantite;
        const idStock = req.body.idStock;

        if (!nouvelleQuantite) {
            throw new Error("Champs requis.");
        }

        await db.query("UPDATE stock SET quantite = $1, date_maj = NOW() WHERE id = $2", [nouvelleQuantite, idStock]);
        res.redirect("/stock");
    } catch (err) {
        console.log("ERREUR:", err.message);
        const stock = await chercherStock()
        const aliments = await chercherAliments()

        res.render("stock.ejs", {
            error: err.message,
            stock: stock,
            aliments: aliments,
        });
    }
});


app.post("/stock/supprimer", async (req, res) => {
    try {
        const idStock = req.body.idStock;
        if (!idStock) {
            throw new Error("Aucune ligne sélectionnée");
        }

        await db.query("DELETE FROM stock WHERE id = $1", [idStock]);
        res.redirect("/stock");
    } catch (err) {
        console.log("ERREUR:", err.message);
        const stock = await chercherStock()
        const aliments = await chercherAliments()

        res.render("stock.ejs", {
            error: err.message,
            stock: stock,
            aliments: aliments,
        });
    }
});

app.get("/courses", async (req, res) => {
    try {
        const courses = await chercherCourses()
        const aliments = await chercherAliments()
        const stock = await chercherStock()

        res.render("courses.ejs", {
            title: "Courses",
            courses: courses,
            aliments: aliments,
            stock: stock
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/courses/ajouter", async (req, res) => {
    const idAliment = req.body.idAliment || null;
    const texteTape = req.body.rechercheAliment;
    try {
        if (!idAliment && !texteTape) {
            return res.status(400).json({ erreur: "Champs requis." });
        }

        const insertResult = await db.query(
            "INSERT INTO courses (food_id, nom_libre) VALUES ($1, $2) RETURNING id",
            [idAliment || null, idAliment ? null : texteTape]
        );
        const nouvelId = insertResult.rows[0].id;

        const itemResult = await db.query(
            "SELECT courses.*, COALESCE(foods.nom, courses.nom_libre) AS nom, COALESCE(foods.emoji, '🆕') AS emoji, foods.unite AS food_unite, foods.tracking_type, foods.categorie FROM courses LEFT JOIN foods ON courses.food_id = foods.id WHERE courses.id = $1",
            [nouvelId]
        );

        res.json({ succes: true, item: itemResult.rows[0] });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

app.post("/courses/commentaire", async (req, res) => {
    try {
        const idCourse = req.body.idCourse;
        const commentaire = req.body.commentaire;

        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucun article sélectionné." });
        }

        await db.query("UPDATE courses SET commentaire = $1 WHERE id = $2", [commentaire, idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

app.post("/courses/supprimer", async (req, res) => {
    try {
        const idCourse = req.body.idCourse;
        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucune ligne sélectionnée" });
        }

        await db.query("DELETE FROM courses WHERE id = $1", [idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

app.post("/courses/acheter", async (req, res) => {
    try {
        let tracking_type = null;
        const idCourse = req.body.idCourse;
        const quantiteAchetee = req.body.quantiteAchetee;

        if (!idCourse) {
            return res.status(400).json({ erreur: "Aucun article sélectionné." });
        }

        const courseResult = await db.query("SELECT food_id FROM courses WHERE id = $1", [idCourse]);
        if (courseResult.rows.length === 0) {
            return res.status(400).json({ erreur: "Article introuvable." });
        }
        const foodId = courseResult.rows[0].food_id;

        if (foodId) {
            const resultFood = await db.query("SELECT tracking_type FROM foods WHERE id = $1", [foodId]);
            tracking_type = resultFood.rows[0].tracking_type;

            if (tracking_type === 'cl') {
                await db.query(
                    "INSERT INTO stock (food_id, quantite, date_maj) VALUES ($1, 'plein', NOW()) ON CONFLICT (food_id) DO UPDATE SET quantite = 'plein', date_maj = NOW()",
                    [foodId]
                );
            } else {
                if (!quantiteAchetee) {
                    return res.status(400).json({ erreur: "Quantité requise." });
                }
                await db.query(
                    "INSERT INTO stock (food_id, quantite, date_maj) VALUES ($1, $2, NOW()) ON CONFLICT (food_id) DO UPDATE SET quantite = (stock.quantite::integer + $2::integer)::text, date_maj = NOW()",
                    [foodId, quantiteAchetee]
                );
            }
        }

        await db.query("UPDATE courses SET achete = true WHERE id = $1", [idCourse]);
        res.json({ succes: true });
    } catch (err) {
        console.log("ERREUR:", err.message);
        res.status(500).json({ erreur: err.message });
    }
});

app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
});
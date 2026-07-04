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

db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


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
    const result = await db.query("SELECT courses.*, foods.nom, foods.emoji, foods.unite AS food_unite FROM courses JOIN foods ON courses.food_id = foods.id");
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

app.get("/courses", async (req, res) => {
    try {
        const aliments = await chercherCourses()
        res.render("courses.ejs", {
            title: "Courses",
            courses: aliments

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
        // const aliments = await chercherStock()
        const result = await db.query("SELECT tracking_type FROM foods WHERE id = $1", [idAliment]);
        const tracking_type = result.rows[0].tracking_type;
        const unite = uniteParType[tracking_type];

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
        const updatedItem = req.body.updatedItemTitle;
        const itemId = req.body.updatedItemId;


        if (!updatedItem) {
            throw new Error("Field cannot be empty");
        }


        await db.query("UPDATE items SET title = $1 WHERE id = $2", [updatedItem, itemId]);
        res.redirect("/");
    } catch (err) {
        console.log("ERREUR:", err.message);
        const items = await getItems()


        res.render("index.ejs", {
            error: err.message,
            listTitle: "Today",
            listItems: items,
        });
    }
});


app.post("/stock/supprimer", async (req, res) => {
    try {
        const itemId = req.body.deleteItemId;
        await db.query("DELETE FROM items WHERE id = $1", [itemId]);
        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong, please try again.");
    }
});





app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
});
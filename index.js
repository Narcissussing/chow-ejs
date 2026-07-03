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
        const aliments = await chercherStock()
        res.render("stock.ejs", {
            title: "Stock",
            stock: aliments

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



app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
});